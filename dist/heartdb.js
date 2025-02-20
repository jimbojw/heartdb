/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * @fileoverview HeartDB.
 */
// Internal modules.
import { InternalError } from "./errors";
import { ChangeEvent, } from "./events";
import { Subscription } from "./subscription";
import { wrapWithFindPlugin } from "./wrap-with-find-plugin";
/**
 * Prefix string for broadcast channel names.
 */
const BROADTAST_CHANNEL_NAME_PREFIX = "heartdb_";
/**
 * HeartDB is a subscription-based, type-safe wrapper around PouchDB (with
 * pouch-find). It uses BroadcastChannels to ensure that changed documents in
 * one execution context (e.g. tab) are detected in all other contexts.
 */
export class HeartDB {
    /**
     * @param pouchDb PouchDB instance to wrap.
     */
    constructor(pouchDb) {
        /**
         * Set of change event listeners registered with `onChange()`.
         */
        this.changeEventListeners = new Set();
        // Ensure that our pouchDb object has the pouchdb-find plugin methods.
        this.pouchDb = wrapWithFindPlugin(pouchDb);
        this.eventTarget = new EventTarget();
        this.channelName = `${BROADTAST_CHANNEL_NAME_PREFIX}${this.pouchDb.name}`;
        // Handle all incoming change messages.
        this.channel = new BroadcastChannel(this.channelName);
        this.channelEventListener = (messageEvent) => {
            this.eventTarget.dispatchEvent(new ChangeEvent(messageEvent.data));
        };
        this.channel.onmessage = this.channelEventListener;
        // Setup PouchDB changes feed.
        this.changes = this.pouchDb.changes({
            since: "now",
            live: true,
            include_docs: true,
        });
        // Reflect PouchDB changes to channel, and emit.
        this.dbChangeEventListener = (change) => {
            this.channel.postMessage(change);
            this.eventTarget.dispatchEvent(new ChangeEvent(change));
        };
        this.changes.on("change", this.dbChangeEventListener);
    }
    /**
     * Close all connections and remove all listeners.
     */
    close() {
        this.channel.onmessage = null;
        this.channel.close();
        this.changes.removeListener("change", this.dbChangeEventListener);
        this.changes.cancel();
        for (const listener of this.changeEventListeners) {
            this.eventTarget.removeEventListener("change", listener);
            this.changeEventListeners.delete(listener);
        }
    }
    /**
     * Subscsribe to changes.
     * @param listener Callback function to invoke on change.
     * @return Function to call to unsubscribe.
     */
    onChange(listener) {
        if (this.changeEventListeners.has(listener)) {
            throw new Error("Listener already registered.");
        }
        this.changeEventListeners.add(listener);
        this.eventTarget.addEventListener("change", listener);
        return () => {
            this.eventTarget.removeEventListener("change", listener);
            this.changeEventListeners.delete(listener);
        };
    }
    /**
     * Put a document into the database, but instead of returning the PouchDB
     * response, listen for the associated change and return that instead. This
     * ensures that the document has been fully settled, and subscribers notified.
     * @param doc Document to put.
     * @returns Promise that resolves with the change event.
     */
    put(doc) {
        return new Promise((resolve, reject) => {
            const disconnect = this.onChange((changeEvent) => {
                if (changeEvent.detail.id === doc._id) {
                    resolve(changeEvent.detail);
                    disconnect();
                }
            });
            this.pouchDb.put(doc).catch(reject);
        });
    }
    /**
     * Post a document into the database, but instead of returning the PouchDB
     * response, listen for the associated change and return that instead. This
     * ensures that the document has been fully settled, and subscribers notified.
     * @param doc Document to post.
     * @returns Promise that resolves with the change event.
     */
    post(doc) {
        return new Promise((resolve, reject) => {
            // A post operation necessarily doesn't have an _id until it resolves. So
            // we'll need to keep track of the response, and we need to have that
            // variable in scope before setting up event handlers.
            let postResponse = undefined;
            // It's possible that the change broadcasting implementation could produce
            // the change for our post even before we get the response back. But since
            // we won't know the doc id until then, we may potentially have to queue
            // change events to process.
            const changeQueue = [];
            // Like the postResponse, we'll need the disconnect callback function
            // variable to be in scope before we can set it.
            let disconnect = undefined;
            // Handle change events by resolving the promise if we found the change
            // matching our post response. Note that this method, while defined early,
            // will not be invoked until the postResponse is available.
            const handleChange = (changeEvent) => {
                if (!postResponse) {
                    throw new InternalError("Post response not yet available.");
                }
                if (!disconnect) {
                    throw new InternalError("Disconnect function missing.");
                }
                if (changeEvent.detail.id === postResponse.id) {
                    disconnect();
                    disconnect = undefined;
                    resolve(changeEvent.detail);
                }
            };
            // On change, either handle it if we have the post response, or queue it
            // for later processing.
            disconnect = this.onChange((changeEvent) => {
                if (postResponse) {
                    handleChange(changeEvent);
                }
                else {
                    changeQueue.push(changeEvent);
                }
            });
            this.pouchDb
                .post(doc)
                .then((response) => {
                // Set the post response and process any queued change events.
                postResponse = response;
                for (const changeEvent of changeQueue) {
                    handleChange(changeEvent);
                }
            })
                .catch(reject);
        });
    }
    /**
     * Create a new subscription instance. If a query is provided, it will be set
     * on the subscription, and the Promise returned will not resolve until the
     * `setQuery()` is finished finding initial documents.
     * @param query Optional query to filter subscription results.
     * @returns A new subscription instance bound to this HeartDB instance.
     */
    subscription(query) {
        return __awaiter(this, void 0, void 0, function* () {
            const subscription = new Subscription(this);
            if (query) {
                yield subscription.setQuery(query);
            }
            return subscription;
        });
    }
}

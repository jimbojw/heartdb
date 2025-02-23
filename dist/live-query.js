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
 * @fileoverview HeartDB live query object.
 */
// Internal dependencies.
import { CloseableEventTarget } from "./closeable-event-target";
import { InternalError } from "./errors";
import { AfterChangeEvent, EnterEvent, ExitEvent, UpdateEvent, } from "./events";
/**
 * A LiveQuery follows a query and tracks documents that enter, update, or exit.
 *
 * Usage:
 *
 * ```
 *   // Create live query. Initially disconnected.
 *   const liveQuery = new LiveQuery(heartDb);
 *
 *   // Subscribe to live query events. Returned value is a callback function
 *   // to disconnect the event listener.
 *   const disconnect = liveQuery.onEnter((enterEvent) => {
 *     // Handle entering documents in enterEvent.detail.
 *   });
 *
 *   // Setting the query will cause the LiveQuery object to begin listening for
 *   // changes on HeartDB. Returned promise will resolve when the initial query
 *   // is finished.
 *   await liveQuery.setQuery({
 *    selector: { type: "thing" },
 *   });
 *
 *   // ...
 *
 *   // Disconnect the event listener.
 *   disconnect();
 *
 *   // Stop LiveQuery from following the query by setting it to undefined.
 *   await liveQuery.setQuery(undefined);
 *
 *   // Close connection (stop following the query). Irreversible.
 *   liveQuery.close();
 * ```
 *
 * @emits enter When a document enters the result set.
 * @emits update When a document updates in the result set.
 * @emits exit When a document exits the result set.
 * @emits afterchange After any enter/update/exit events.
 * @template DocType Type of document in the HeartDB.
 * @template LiveQueryDocType Type of document returned by query.
 * @see https://pouchdb.com/guides/mango-queries.html
 */
export class LiveQuery extends CloseableEventTarget {
    /**
     * @param heartDb HeartDB instance to use for communication.
     */
    constructor(heartDb) {
        super();
        /**
         * Record of query-matching documents.
         */
        this.docs = {};
        this.heartDb = heartDb;
        const closeDisconnect = heartDb.addEventListener("close", () => {
            this.close();
            closeDisconnect();
        });
    }
    close() {
        var _a;
        if (this.closed) {
            return;
        }
        (_a = this.disconnect) === null || _a === void 0 ? void 0 : _a.call(null);
        this.disconnect = undefined;
        super.close();
    }
    /**
     * Set the query to follow. This is an asynchronous function which will return
     * when all existing matching docs have been added to the result set. After
     * return changed docs will trigger additional events.
     *
     * Note that PouchDB follows CouchDB's default limit of 25 results per query.
     * So if your query should return more than 25 documenets, and you don't
     * specify a limit, then it will take multiple requsests to fetch all the
     * documents.
     * @param query Query to find and follow.
     */
    setQuery(query) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (query === this.query) {
                // Query is already set. Nothing to do.
                return;
            }
            // Disconnect any existing onChange() listener.
            (_a = this.disconnect) === null || _a === void 0 ? void 0 : _a.call(null);
            this.disconnect = undefined;
            this.query = query;
            // If the query has been unset, then replace all docs with none.
            if (!query) {
                this.processDocs([], true);
                return;
            }
            let done = false;
            let requestCount = 0;
            let skip = (_b = query.skip) !== null && _b !== void 0 ? _b : 0;
            while (!done) {
                requestCount++;
                const results = yield this.heartDb.pouchDb.find(Object.assign(Object.assign({}, query), { skip }));
                if (this.closed || this.query !== query) {
                    // Preempted by another call.
                    return;
                }
                const docs = results.docs;
                skip += docs.length;
                // Process this round of docs, replacing if it's the first round.
                this.processDocs(docs, requestCount === 1);
                // We're done when there were no docs returned, or fewer than the limit.
                if (!docs.length || (query.limit && docs.length < query.limit)) {
                    done = true;
                    break;
                }
            }
            // Subscribe to all HeartDB changes to perform updates.
            this.disconnect = this.heartDb.onChange(this.createQueryListener(query));
        });
    }
    /**
     * Wrap a query object with a change event listener that will update the local
     * docs set as changes occur.
     * @param query Query for which to create a change listener.
     * @returns Change event listener.
     */
    createQueryListener(query) {
        return (changeEvent) => __awaiter(this, void 0, void 0, function* () {
            if (this.closed || this.query !== query) {
                // Preepmeted. Should have been disconnected.
                throw new InternalError("Unexpected change event from replaced query");
            }
            const { id, deleted, doc: changedDoc } = changeEvent.detail;
            // If the document is in our results and has been deleted, then we can
            // process the deletion as is.
            if (id in this.docs && deleted) {
                this.dispatchEvent(new ExitEvent({ id: changedDoc }));
                delete this.docs[id];
                this.dispatchEvent(new AfterChangeEvent(this.docs));
                return;
            }
            // Otherwise, we need to attempt to fetch the document using a modified,
            // id-specific query to see if it matches.
            const response = yield this.heartDb.pouchDb.find(Object.assign(Object.assign({}, query), { selector: Object.assign(Object.assign({}, query.selector), { _id: changeEvent.detail.id }) }));
            // Recheck query is still live.
            if (this.closed || this.query !== query) {
                // Preepmeted during find request.
                return;
            }
            // If no docs were returned, then the changed document no longer matches
            // the query and should be removed from the result set.
            if (!response.docs.length) {
                this.dispatchEvent(new ExitEvent({ id: changedDoc }));
                delete this.docs[id];
                this.dispatchEvent(new AfterChangeEvent(this.docs));
                return;
            }
            // If more than one doc was returned, then something went wrong.
            if (response.docs.length > 1) {
                throw new InternalError("Unexpected multiple doc response to id-specific query");
            }
            const responseDoc = response.docs[0];
            // If the response doc's id doesn't match the changed doc, then something
            // went wrong.
            if (responseDoc._id !== id) {
                throw new InternalError("Unexpected mismatched id in response to id-specific query");
            }
            const existingDoc = this.docs[id];
            // If we don't already have a doc with this id, then it's entering.
            if (!existingDoc) {
                this.dispatchEvent(new EnterEvent({ [id]: responseDoc }));
                this.docs[id] = responseDoc;
                this.dispatchEvent(new AfterChangeEvent(this.docs));
                return;
            }
            // If the response doc's rev matches the existing doc's rev, then there's
            // nothing to do.
            if (responseDoc._rev === existingDoc._rev) {
                return;
            }
            // Otherwise, the document has been updated.
            this.dispatchEvent(new UpdateEvent({ [id]: responseDoc }));
            this.docs[id] = responseDoc;
            this.dispatchEvent(new AfterChangeEvent(this.docs));
        });
    }
    /**
     * Replace the current set of docs with the provided replacement array.
     * @param incomingDocs List of docs to replace the current set.
     * @param replace Whether to replace the current set of docs.
     */
    processDocs(incomingDocs, replace) {
        const enterDocs = {};
        let enterCount = 0;
        const updateDocs = {};
        let updateCount = 0;
        const exitDocs = {};
        let exitCount = 0;
        const unchangedDocs = {};
        // Categorize incoming documents as enter/update/exit/unchanged.
        for (const doc of incomingDocs) {
            if (!(doc._id in this.docs)) {
                // Ignore deleted documents that we don't already know about.
                if (doc._deleted) {
                    continue;
                }
                // Add new documents to the enter set.
                enterDocs[doc._id] = doc;
                enterCount++;
                continue;
            }
            // Existing documents with _deleted set should be added to the exit set.
            if (doc._deleted) {
                exitDocs[doc._id] = doc;
                exitCount++;
                continue;
            }
            // Retained, changed documents should be added to the update set.
            if (doc._rev !== this.docs[doc._id]._rev) {
                updateDocs[doc._id] = doc;
                updateCount++;
                continue;
            }
            // Retained, unchanged documents should be added to the unchanged set.
            unchangedDocs[doc._id] = doc;
        }
        // If we're performing a replacement, then any known documents that are not
        // update/unchanged should be added to the exit set for removal.
        if (replace) {
            for (const id in this.docs) {
                if (!(id in updateDocs) && !(id in unchangedDocs)) {
                    exitDocs[id] = this.docs[id];
                    exitCount++;
                }
            }
        }
        // Short-circuit if no documents entered, updated or exited.
        if (!enterCount && !updateCount && !exitCount) {
            return;
        }
        // Emit exit, enter and update events.
        if (exitCount) {
            this.dispatchEvent(new ExitEvent(exitDocs));
        }
        if (enterCount) {
            this.dispatchEvent(new EnterEvent(enterDocs));
        }
        if (updateCount) {
            this.dispatchEvent(new UpdateEvent(updateDocs));
        }
        // Update the internal document record by adding/removing documents.
        for (const id in enterDocs) {
            this.docs[id] = enterDocs[id];
        }
        for (const id in updateDocs) {
            this.docs[id] = updateDocs[id];
        }
        for (const id in exitDocs) {
            delete this.docs[id];
        }
        // Emit a catch-all afterchange event.
        this.dispatchEvent(new AfterChangeEvent(this.docs));
    }
    /**
     * Listen for entering docs.
     * @param enterListener Enter event listener to add.
     * @returns Disconnect function to unsubscribe the listener.
     */
    onEnter(enterListener) {
        return this.addEventListener("enter", enterListener);
    }
    /**
     * Listen for updating docs.
     * @param updateListener Update event listener to add.
     * @returns Disconnect function to unsubscribe the listener.
     */
    onUpdate(updateListener) {
        return this.addEventListener("update", updateListener);
    }
    /**
     * Listen for exiting docs.
     * @param exitListener Exit event listener to add.
     * @returns Disconnect function to unsubscribe the listener.
     */
    onExit(exitListener) {
        return this.addEventListener("exit", exitListener);
    }
    /**
     * Listen for the afterchange event, which is dispatched after
     * enter/update/exit events.
     * @param afterChangeListener AfterChange event listener to add.
     * @returns Disconnect function to unsubscribe the listener.
     */
    onAfterChange(afterChangeListener) {
        return this.addEventListener("afterchange", afterChangeListener);
    }
}

/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview HeartDB live document.
 */
// Internal dependencies.
import { CloseableEventTarget } from "./closeable-event-target";
import { SetEvent } from "./events";
/**
 * A LiveDoc follows a specific document by its id.
 *
 * Usage:
 *
 * ```
 *   // Create LiveDoc following a specific document by its id.
 *   const liveDoc = new LiveDoc(heartDb, docId);
 *
 *   // Subscribe to change events. Returned value is a callback function
 *   // to disconnect the event listener.
 *   const disconnect = liveDoc.onSet((setEvent) => {
 *     const doc = setEvent.detail;
 *     // ...do something with the document...
 *   });
 *
 *   // ...
 *
 *   // Disconnect the event listener.
 *   disconnect();
 *
 *   // Close connection (stop following the document). Irreversible.
 *   liveDoc.close();
 * ```
 *
 * @emits set When the document is set.
 * @emits error When an error occurs.
 * @template DocType Type of document in the HeartDB.
 * @template LiveDocType Type of document in the LiveDoc.
 */
export class LiveDoc extends CloseableEventTarget {
    /**
     * @param heartDb HeartDB instance to use for communication.
     * @param docId Document ID to follow.
     */
    constructor(heartDb, docId) {
        super();
        this.heartDb = heartDb;
        this.docId = docId;
        // Subscribe to changes feed.
        this.disconnect = this.heartDb.onChange((changeEvent) => {
            const { id, doc, deleted } = changeEvent.detail;
            if (id === docId) {
                this.setDoc(deleted ? undefined : doc);
            }
        });
        // Set the initial document value.
        this.heartDb
            .get(docId)
            .then((doc) => {
            this.setDoc(doc);
        })
            .catch((error) => {
            this.dispatchEvent(new ErrorEvent("error", { error }));
        });
    }
    /**
     * @param listener SetEvent listener.
     * @returns Disconnect callback.
     */
    onSet(listener) {
        return this.addEventListener("set", listener);
    }
    /**
     * Set the document and dispatch a SetEvent.
     * @param doc Document value to set.
     * @throws {Error} If the LiveDoc is closed.
     */
    setDoc(doc) {
        if (this.closed) {
            throw new Error("LiveDoc is closed.");
        }
        if (this.doc === doc) {
            return;
        }
        this.dispatchEvent(new SetEvent(doc));
        this.doc = doc;
    }
    /**
     * Disconnect from HeartDB and remove all listeners.
     */
    close() {
        if (this.closed) {
            return;
        }
        if (this.disconnect) {
            this.disconnect();
            this.disconnect = undefined;
        }
        super.close();
    }
}

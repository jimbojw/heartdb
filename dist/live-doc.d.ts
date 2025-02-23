/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview HeartDB live document.
 */
import { CloseableEventTarget } from "./closeable-event-target";
import { SetEventListener } from "./events";
import { HeartDB } from "./heartdb";
import { Document, Existing } from "./types";
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
export declare class LiveDoc<DocType extends Document = Document, LiveDocType extends DocType = DocType> extends CloseableEventTarget {
    /**
     * HeartDB instance to use for communication.
     */
    readonly heartDb: HeartDB<DocType>;
    /**
     * Bound document ID to follow.
     */
    readonly docId: PouchDB.Core.DocumentId;
    /**
     * Latest document value.
     */
    doc?: (LiveDocType & Existing) | undefined;
    /**
     * Disconnect function for HeartDB changes feed (when connected).
     */
    disconnect?: () => void;
    /**
     * @param heartDb HeartDB instance to use for communication.
     * @param docId Document ID to follow.
     */
    constructor(heartDb: HeartDB<DocType>, docId: PouchDB.Core.DocumentId);
    /**
     * @param listener SetEvent listener.
     * @returns Disconnect callback.
     */
    onSet(listener: SetEventListener<LiveDocType>): () => void;
    /**
     * Set the document and dispatch a SetEvent.
     * @param doc Document value to set.
     * @throws {Error} If the LiveDoc is closed.
     */
    private setDoc;
    /**
     * Disconnect from HeartDB and remove all listeners.
     */
    close(): void;
}

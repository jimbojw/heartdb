/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { ChangeEventListener, ChangesResponseChange } from "./events";
import { Subscription } from "./subscription";
import { Document, Existing, UpdateCallbackFunction } from "./types";
/**
 * HeartDB is a subscription-based, type-safe wrapper around PouchDB (with
 * pouch-find). It uses BroadcastChannels to ensure that changed documents in
 * one execution context (e.g. tab) are detected in all other contexts.
 *
 * @template DocType Base type of documents stored in the HeartDB.
 */
export declare class HeartDB<DocType extends Document = Document> {
    /**
     * PouchDB database instance wrapped by HeartDB.
     */
    readonly pouchDb: PouchDB.Database<DocType>;
    /**
     * Event emitter for change events.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget
     */
    readonly eventTarget: EventTarget;
    /**
     * Channel name used for inter-instance communication.
     */
    readonly channelName: string;
    /**
     * Broadcast channel for communicating change events across contexts.
     */
    readonly channel: BroadcastChannel;
    /**
     * Bound listener for handling incoming messages from the channel.
     */
    private channelEventListener;
    /**
     * PouchDB changes object.
     */
    readonly changes: PouchDB.Core.Changes<DocType>;
    /**
     * Listener function for change events from wrapped PouchDB instance.
     */
    private dbChangeEventListener;
    /**
     * Set of change event listeners registered with `onChange()`.
     */
    private readonly changeEventListeners;
    /**
     * @param pouchDb PouchDB instance to wrap.
     */
    constructor(pouchDb: PouchDB.Database<DocType>);
    /**
     * Close all connections and remove all listeners.
     */
    close(): void;
    /**
     * Subscsribe to changes.
     * @param listener Callback function to invoke on change.
     * @return Function to call to unsubscribe.
     */
    onChange(listener: ChangeEventListener<DocType>): () => void;
    /**
     * Put a document into the database, but instead of returning the PouchDB
     * response, listen for the associated change and return that instead. This
     * ensures that the document has been fully settled, and subscribers notified.
     * @param doc Document to put.
     * @returns Promise that resolves with the change event.
     */
    put(doc: DocType & PouchDB.Core.IdMeta): Promise<ChangesResponseChange<DocType>>;
    /**
     * Post a document into the database, but instead of returning the PouchDB
     * response, listen for the associated change and return that instead. This
     * ensures that the document has been fully settled, and subscribers notified.
     * @param doc Document to post.
     * @returns Promise that resolves with the change event.
     */
    post(doc: DocType): Promise<ChangesResponseChange<DocType>>;
    /**
     * Get a document and return it, or undefined if not found.
     * @param docId Id of document to retrieve.
     * @returns Either the document, or undefined if not found.
     */
    get<GetDocType extends DocType = DocType>(docId: PouchDB.Core.DocumentId): Promise<(GetDocType & Existing) | undefined>;
    /**
     * Update a document in the database. The update callback is passed the
     * existing document (or undefined if missing), and should return the updated
     * document. If the update callback returns undefined, the update is aborted.
     * @param docId Id of the document to update.
     * @param updateCallback Callback function to update the document.
     * @returns Promise with the change event, or undefined if aborted.
     */
    update<UpdateDocType extends DocType = DocType>(docId: PouchDB.Core.DocumentId, updateCallback: UpdateCallbackFunction<UpdateDocType>): Promise<ChangesResponseChange<DocType> | undefined>;
    /**
     * Create a new subscription instance. If a query is provided, it will be set
     * on the subscription, and the Promise returned will not resolve until the
     * `setQuery()` is finished finding initial documents.
     * @param query Optional query to filter subscription results.
     * @returns A new subscription instance bound to this HeartDB instance.
     */
    subscription<SubscriptionDocType extends DocType = DocType>(query?: PouchDB.Find.FindRequest<SubscriptionDocType>): Promise<Subscription<DocType, SubscriptionDocType>>;
}

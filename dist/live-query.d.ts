/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview HeartDB live query object.
 */
import { CloseableEventTarget } from "./closeable-event-target";
import { AfterChangeEventListener, ChangeEventListener, EnterEventListener, ExitEventListener, UpdateEventListener } from "./events";
import { HeartDB } from "./heartdb";
import { Docs, Document, Existing } from "./types";
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
export declare class LiveQuery<DocType extends Document = Document, LiveQueryDocType extends DocType = DocType> extends CloseableEventTarget {
    /**
     * HeartDB instance to query and subscribe to.
     */
    readonly heartDb: HeartDB<DocType>;
    /**
     * PouchDB query object. If unset, then subscription is disconnected.
     */
    query?: PouchDB.Find.FindRequest<LiveQueryDocType>;
    /**
     * Record of query-matching documents.
     */
    readonly docs: Docs<LiveQueryDocType>;
    /**
     * Disconnect function for HeartDB changes feed (when connected).
     */
    disconnect?: () => void;
    /**
     * @param heartDb HeartDB instance to use for communication.
     */
    constructor(heartDb: HeartDB<DocType>);
    close(): void;
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
    setQuery(query?: PouchDB.Find.FindRequest<LiveQueryDocType>): Promise<void>;
    /**
     * Wrap a query object with a change event listener that will update the local
     * docs set as changes occur.
     * @param query Query for which to create a change listener.
     * @returns Change event listener.
     */
    createQueryListener(query: PouchDB.Find.FindRequest<LiveQueryDocType>): ChangeEventListener<DocType>;
    /**
     * Replace the current set of docs with the provided replacement array.
     * @param incomingDocs List of docs to replace the current set.
     * @param replace Whether to replace the current set of docs.
     */
    processDocs(incomingDocs: (LiveQueryDocType & Existing)[], replace: boolean): void;
    /**
     * Listen for entering docs.
     * @param enterListener Enter event listener to add.
     * @returns Disconnect function to unsubscribe the listener.
     */
    onEnter(enterListener: EnterEventListener<LiveQueryDocType>): () => void;
    /**
     * Listen for updating docs.
     * @param updateListener Update event listener to add.
     * @returns Disconnect function to unsubscribe the listener.
     */
    onUpdate(updateListener: UpdateEventListener<LiveQueryDocType>): () => void;
    /**
     * Listen for exiting docs.
     * @param exitListener Exit event listener to add.
     * @returns Disconnect function to unsubscribe the listener.
     */
    onExit(exitListener: ExitEventListener<LiveQueryDocType>): () => void;
    /**
     * Listen for the afterchange event, which is dispatched after
     * enter/update/exit events.
     * @param afterChangeListener AfterChange event listener to add.
     * @returns Disconnect function to unsubscribe the listener.
     */
    onAfterChange(afterChangeListener: AfterChangeEventListener<LiveQueryDocType>): () => void;
}

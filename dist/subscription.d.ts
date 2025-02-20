/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { AfterChangeEventListener, ChangeEventListener, EnterEventListener, ExitEventListener, UpdateEventListener } from "./events";
import { HeartDB } from "./heartdb";
import { Docs, Document, Existing } from "./types";
/**
 * A Subscription follows a query and tracks documents that enter, update, or
 * exit.
 *
 * Usage:
 *
 * ```
 *   // Create subscription. Initially disconnected.
 *   const subscription = new Subscription(heartDb);
 *
 *   // Subscribe to subscription events.
 *
 *   subscription.setQuery({
 *    selector: { type: "thing" },
 *   });
 *
 * ```
 *
 * @see https://pouchdb.com/guides/mango-queries.html
 */
export declare class Subscription<DocType extends Document = Document, SubscriptionDocType extends DocType = DocType> {
    /**
     * HeartDB instance to query and subscribe to.
     */
    readonly heartDb: HeartDB<DocType>;
    /**
     * PouchDB query object. If unset, then subscription is disconnected.
     */
    query?: PouchDB.Find.FindRequest<SubscriptionDocType>;
    /**
     * Record of query-matching documents.
     */
    readonly docs: Docs<SubscriptionDocType>;
    /**
     * Event target for dispatching events.
     */
    eventTarget: EventTarget;
    /**
     * Disconnect function for HeartDB changes feed (when connected).
     */
    disconnect?: () => void;
    /**
     * Event listeners set by respective on*() methods.
     */
    readonly eventListeners: Readonly<{
        enter: Set<EnterEventListener<SubscriptionDocType>>;
        update: Set<UpdateEventListener<SubscriptionDocType>>;
        exit: Set<ExitEventListener<SubscriptionDocType>>;
        afterChange: Set<AfterChangeEventListener<SubscriptionDocType>>;
    }>;
    constructor(heartDb: HeartDB<DocType>);
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
    setQuery(query?: PouchDB.Find.FindRequest<SubscriptionDocType>): Promise<void>;
    /**
     * Wrap a query object with a change event listener that will update the local
     * docs set as changes occur.
     * @param query Query for which to create a change listener.
     * @returns Change event listener.
     */
    createQueryListener(query: PouchDB.Find.FindRequest<SubscriptionDocType>): ChangeEventListener<DocType>;
    /**
     * Replace the current set of docs with the provided replacement array.
     * @param incomingDocs List of docs to replace the current set.
     * @param replace Whether to replace the current set of docs.
     */
    processDocs(incomingDocs: (SubscriptionDocType & Existing)[], replace: boolean): void;
    /**
     * Listen for entering docs.
     * @param enterListener Enter event listener to add.
     * @returns Disconnect function to unsubscribe the listener.
     */
    onEnter(enterListener: EnterEventListener<SubscriptionDocType>): () => void;
    /**
     * Listen for updating docs.
     * @param updateListener Update event listener to add.
     * @returns Disconnect function to unsubscribe the listener.
     */
    onUpdate(updateListener: UpdateEventListener<SubscriptionDocType>): () => void;
    /**
     * Listen for exiting docs.
     * @param exitListener Exit event listener to add.
     * @returns Disconnect function to unsubscribe the listener.
     */
    onExit(exitListener: ExitEventListener<SubscriptionDocType>): () => void;
    /**
     * Listen for the afterchange event, which is dispatched after
     * enter/update/exit events.
     * @param afterChangeListener AfterChange event listener to add.
     * @returns Disconnect function to unsubscribe the listener.
     */
    onAfterChange(afterChangeListener: AfterChangeEventListener<SubscriptionDocType>): () => void;
}

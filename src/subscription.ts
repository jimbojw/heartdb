/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview HeartDB query subscription object.
 */

// Internal dependencies.
import { InternalError } from "./errors";
import {
  AfterChangeEvent,
  AfterChangeEventListener,
  ChangeEventListener,
  EnterEvent,
  EnterEventListener,
  ExitEvent,
  ExitEventListener,
  UpdateEvent,
  UpdateEventListener,
} from "./events";
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
export class Subscription<
  DocType extends Document = Document,
  SubscriptionDocType extends DocType = DocType,
> {
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
  readonly docs: Docs<SubscriptionDocType> = {};

  /**
   * Event target for dispatching events.
   */
  eventTarget = new EventTarget();

  /**
   * Disconnect function for HeartDB changes feed (when connected).
   */
  disconnect?: () => void;

  /**
   * Event listeners set by respective on*() methods.
   */
  readonly eventListeners = Object.freeze({
    enter: new Set<EnterEventListener<SubscriptionDocType>>(),
    update: new Set<UpdateEventListener<SubscriptionDocType>>(),
    exit: new Set<ExitEventListener<SubscriptionDocType>>(),
    afterChange: new Set<AfterChangeEventListener<SubscriptionDocType>>(),
  });

  /**
   * @param heartDb HeartDB instance to use for communication.
   */
  constructor(heartDb: HeartDB<DocType>) {
    this.heartDb = heartDb;
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
  async setQuery(query?: PouchDB.Find.FindRequest<SubscriptionDocType>) {
    if (query === this.query) {
      // Query is already set. Nothing to do.
      return;
    }

    // Disconnect any existing onChange() listener.
    this.disconnect?.call(null);
    this.disconnect = undefined;

    this.query = query;

    // If the query has been unset, then replace all docs with none.
    if (!query) {
      this.processDocs([], true);
      return;
    }

    let done = false;
    let requestCount = 0;
    let skip = query.skip ?? 0;
    while (!done) {
      requestCount++;
      const results = await this.heartDb.pouchDb.find({ ...query, skip });

      if (this.query !== query) {
        // Preempted by another call.
        return;
      }

      const docs = results.docs as (SubscriptionDocType & Existing)[];

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
  }

  /**
   * Wrap a query object with a change event listener that will update the local
   * docs set as changes occur.
   * @param query Query for which to create a change listener.
   * @returns Change event listener.
   */
  createQueryListener(
    query: PouchDB.Find.FindRequest<SubscriptionDocType>,
  ): ChangeEventListener<DocType> {
    return async (changeEvent) => {
      if (this.query !== query) {
        // Preepmeted. Should have been disconnected.
        throw new InternalError("Unexpected change event from replaced query");
      }

      const { id, deleted, doc: changedDoc } = changeEvent.detail;

      // If the document is in our results and has been deleted, then we can
      // process the deletion as is.
      if (id in this.docs && deleted) {
        this.eventTarget.dispatchEvent(new ExitEvent({ id: changedDoc }));
        delete this.docs[id];
        this.eventTarget.dispatchEvent(new AfterChangeEvent(this.docs));
        return;
      }

      // Otherwise, we need to attempt to fetch the document using a modified,
      // id-specific query to see if it matches.
      const response = await this.heartDb.pouchDb.find({
        ...query,
        selector: { ...query.selector, _id: changeEvent.detail.id },
      });

      // Recheck query is still live.
      if (this.query !== query) {
        // Preepmeted during find request.
        return;
      }

      // If no docs were returned, then the changed document no longer matches
      // the query and should be removed from the result set.
      if (!response.docs.length) {
        this.eventTarget.dispatchEvent(new ExitEvent({ id: changedDoc }));
        delete this.docs[id];
        this.eventTarget.dispatchEvent(new AfterChangeEvent(this.docs));
        return;
      }

      // If more than one doc was returned, then something went wrong.
      if (response.docs.length > 1) {
        throw new InternalError(
          "Unexpected multiple doc response to id-specific query",
        );
      }

      const responseDoc = response.docs[0] as SubscriptionDocType & Existing;

      // If the response doc's id doesn't match the changed doc, then something
      // went wrong.
      if (responseDoc._id !== id) {
        throw new InternalError(
          "Unexpected mismatched id in response to id-specific query",
        );
      }

      const existingDoc = this.docs[id];

      // If we don't already have a doc with this id, then it's entering.
      if (!existingDoc) {
        this.eventTarget.dispatchEvent(
          new EnterEvent<SubscriptionDocType>({ [id]: responseDoc }),
        );
        this.docs[id] = responseDoc;
        this.eventTarget.dispatchEvent(new AfterChangeEvent(this.docs));
        return;
      }

      // If the response doc's rev matches the existing doc's rev, then there's
      // nothing to do.
      if (responseDoc._rev === existingDoc._rev) {
        return;
      }

      // Otherwise, the document has been updated.
      this.eventTarget.dispatchEvent(
        new UpdateEvent<SubscriptionDocType>({ [id]: responseDoc }),
      );
      this.docs[id] = responseDoc;
      this.eventTarget.dispatchEvent(new AfterChangeEvent(this.docs));
    };
  }

  /**
   * Replace the current set of docs with the provided replacement array.
   * @param incomingDocs List of docs to replace the current set.
   * @param replace Whether to replace the current set of docs.
   */
  processDocs(
    incomingDocs: (SubscriptionDocType & Existing)[],
    replace: boolean,
  ) {
    const enterDocs: Docs<SubscriptionDocType> = {};
    let enterCount = 0;

    const updateDocs: Docs<SubscriptionDocType> = {};
    let updateCount = 0;

    const exitDocs: Docs<SubscriptionDocType> = {};
    let exitCount = 0;

    const unchangedDocs: Docs<SubscriptionDocType> = {};

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
      this.eventTarget.dispatchEvent(
        new ExitEvent<SubscriptionDocType>(exitDocs),
      );
    }
    if (enterCount) {
      this.eventTarget.dispatchEvent(
        new EnterEvent<SubscriptionDocType>(enterDocs),
      );
    }
    if (updateCount) {
      this.eventTarget.dispatchEvent(
        new UpdateEvent<SubscriptionDocType>(updateDocs),
      );
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
    this.eventTarget.dispatchEvent(
      new AfterChangeEvent<SubscriptionDocType>(this.docs),
    );
  }

  /**
   * Listen for entering docs.
   * @param enterListener Enter event listener to add.
   * @returns Disconnect function to unsubscribe the listener.
   */
  onEnter(enterListener: EnterEventListener<SubscriptionDocType>): () => void {
    if (this.eventListeners.enter.has(enterListener)) {
      throw new Error("Listener already registered");
    }
    this.eventListeners.enter.add(enterListener);
    this.eventTarget.addEventListener("enter", enterListener as EventListener);
    return () => {
      this.eventTarget.removeEventListener(
        "enter",
        enterListener as EventListener,
      );
      this.eventListeners.enter.delete(enterListener);
    };
  }

  /**
   * Listen for updating docs.
   * @param updateListener Update event listener to add.
   * @returns Disconnect function to unsubscribe the listener.
   */
  onUpdate(
    updateListener: UpdateEventListener<SubscriptionDocType>,
  ): () => void {
    if (this.eventListeners.update.has(updateListener)) {
      throw new Error("Listener already registered");
    }
    this.eventListeners.update.add(updateListener);
    this.eventTarget.addEventListener(
      "update",
      updateListener as EventListener,
    );
    return () => {
      this.eventTarget.removeEventListener(
        "update",
        updateListener as EventListener,
      );
      this.eventListeners.update.delete(updateListener);
    };
  }

  /**
   * Listen for exiting docs.
   * @param exitListener Exit event listener to add.
   * @returns Disconnect function to unsubscribe the listener.
   */
  onExit(exitListener: ExitEventListener<SubscriptionDocType>): () => void {
    if (this.eventListeners.exit.has(exitListener)) {
      throw new Error("Listener already registered");
    }
    this.eventListeners.exit.add(exitListener);
    this.eventTarget.addEventListener("exit", exitListener as EventListener);
    return () => {
      this.eventTarget.removeEventListener(
        "exit",
        exitListener as EventListener,
      );
      this.eventListeners.exit.delete(exitListener);
    };
  }

  /**
   * Listen for the afterchange event, which is dispatched after
   * enter/update/exit events.
   * @param afterChangeListener AfterChange event listener to add.
   * @returns Disconnect function to unsubscribe the listener.
   */
  onAfterChange(
    afterChangeListener: AfterChangeEventListener<SubscriptionDocType>,
  ): () => void {
    if (this.eventListeners.afterChange.has(afterChangeListener)) {
      throw new Error("Listener already registered");
    }
    this.eventListeners.afterChange.add(afterChangeListener);
    this.eventTarget.addEventListener(
      "afterchange",
      afterChangeListener as EventListener,
    );
    return () => {
      this.eventTarget.removeEventListener(
        "afterchange",
        afterChangeListener as EventListener,
      );
      this.eventListeners.afterChange.delete(afterChangeListener);
    };
  }
}

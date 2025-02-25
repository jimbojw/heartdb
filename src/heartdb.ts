/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview HeartDB.
 */

// Internal dependencies.
import { CloseableEventTarget } from "./closeable-event-target";
import { InternalError } from "./errors";
import {
  ChangeEvent,
  ChangeEventListener,
  ChangesResponseChange,
} from "./events";
import { LiveDoc } from "./live-doc";
import { LiveQuery } from "./live-query";
import { Document, Existing, UpdateCallbackFunction } from "./types";
import { wrapWithFindPlugin } from "./wrap-with-find-plugin";

/**
 * Prefix string for broadcast channel names.
 */
const BROADTAST_CHANNEL_NAME_PREFIX = "heartdb_";

/**
 * HeartDB is a subscription-based, type-safe wrapper around PouchDB (with
 * pouch-find). It uses BroadcastChannels to ensure that changed documents in
 * one execution context (e.g. tab) are detected in all other contexts.
 *
 * @template DocType Base type of documents stored in the HeartDB.
 * @emits change When a document changes.
 */
export class HeartDB<
  DocType extends Document = Document,
> extends CloseableEventTarget {
  /**
   * PouchDB database instance wrapped by HeartDB.
   */
  readonly pouchDb: PouchDB.Database<DocType>;

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
  private channelEventListener: (
    messageEvent: MessageEvent<ChangesResponseChange<DocType>>,
  ) => void;

  /**
   * PouchDB changes object.
   */
  readonly changes: PouchDB.Core.Changes<DocType>;

  /**
   * Listener function for change events from wrapped PouchDB instance.
   */
  private dbChangeEventListener: (
    changeResponse: ChangesResponseChange<DocType>,
  ) => void;

  /**
   * @param pouchDb PouchDB instance to wrap.
   */
  constructor(pouchDb: PouchDB.Database<DocType>) {
    super();

    // Ensure that our pouchDb object has the pouchdb-find plugin methods.
    this.pouchDb = wrapWithFindPlugin(pouchDb);

    this.channelName = `${BROADTAST_CHANNEL_NAME_PREFIX}${this.pouchDb.name}`;

    // Handle all incoming change messages.
    this.channel = new BroadcastChannel(this.channelName);
    this.channelEventListener = (messageEvent) => {
      this.dispatchEvent(new ChangeEvent(messageEvent.data));
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
      this.dispatchEvent(new ChangeEvent(change));
    };
    this.changes.on(
      "change",
      this.dbChangeEventListener as (
        changeResponse: PouchDB.Core.ChangesResponseChange<DocType>,
      ) => void,
    );
  }

  /**
   * Close all connections and remove all listeners.
   */
  close() {
    if (this.closed) {
      return;
    }

    this.channel.onmessage = null;
    this.channel.close();

    this.changes.removeListener("change", this.dbChangeEventListener);
    this.changes.cancel();

    super.close();
  }

  /**
   * Subscsribe to changes.
   * @param listener Callback function to invoke on change.
   * @return Function to call to unsubscribe.
   */
  onChange<ChangeDocType extends DocType>(
    callback: ChangeEventListener<ChangeDocType>,
  ): () => void {
    return this.addEventListener("change", callback);
  }

  /**
   * Put a document into the database, but instead of returning the PouchDB
   * response, listen for the associated change and return that instead. This
   * ensures that the document has been fully settled, and subscribers notified.
   * @param doc Document to put.
   * @returns Promise that resolves with the change event.
   */
  put(
    doc: DocType & PouchDB.Core.IdMeta,
  ): Promise<ChangesResponseChange<DocType>> {
    return new Promise<ChangesResponseChange<DocType>>((resolve, reject) => {
      const disconnect = this.onChange((changeEvent) => {
        if (changeEvent.detail.id === doc._id) {
          resolve(changeEvent.detail);
          disconnect();
        }
      });
      this.pouchDb.put(doc).catch((error) => {
        disconnect();
        reject(error);
      });
    });
  }

  /**
   * Post a document into the database, but instead of returning the PouchDB
   * response, listen for the associated change and return that instead. This
   * ensures that the document has been fully settled, and subscribers notified.
   * @param doc Document to post.
   * @returns Promise that resolves with the change event.
   */
  post(doc: DocType): Promise<ChangesResponseChange<DocType>> {
    return new Promise<ChangesResponseChange<DocType>>((resolve, reject) => {
      // A post operation necessarily doesn't have an _id until it resolves. So
      // we'll need to keep track of the response, and we need to have that
      // variable in scope before setting up event handlers.
      let postResponse: PouchDB.Core.Response | undefined = undefined;

      // It's possible that the change broadcasting implementation could produce
      // the change for our post even before we get the response back. But since
      // we won't know the doc id until then, we may potentially have to queue
      // change events to process.
      const changeQueue: ChangeEvent<DocType>[] = [];

      // Like the postResponse, we'll need the disconnect callback function
      // variable to be in scope before we can set it.
      let disconnect: (() => void) | undefined = undefined;

      // Handle change events by resolving the promise if we found the change
      // matching our post response. Note that this method, while defined early,
      // will not be invoked until the postResponse is available.
      const handleChange = (changeEvent: ChangeEvent<DocType>) => {
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
        } else {
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
        .catch((error) => {
          disconnect?.();
          disconnect = undefined;
          reject(error);
        });
    });
  }

  /**
   * Get a document and return it, or undefined if not found.
   * @param docId Id of document to retrieve.
   * @returns Either the document, or undefined if not found.
   */
  async get<GetDocType extends DocType = DocType>(
    docId: PouchDB.Core.DocumentId,
  ): Promise<(GetDocType & Existing) | undefined> {
    let existingDoc: (GetDocType & Existing) | undefined = undefined;

    try {
      existingDoc = await this.pouchDb.get<GetDocType>(docId);
    } catch (error) {
      if (
        !error ||
        !(typeof error === "object") ||
        !("status" in error) ||
        error.status !== 404
      ) {
        // Re-throw the error if it's anything other than 404 not found.
        throw error;
      }
    }

    return existingDoc;
  }

  /**
   * Update a document in the database. The update callback is passed the
   * existing document (or undefined if missing), and should return the updated
   * document. If the update callback returns undefined, the update is aborted.
   * @param docId Id of the document to update.
   * @param updateCallback Callback function to update the document.
   * @returns Promise with the change event, or undefined if aborted.
   */
  async update<UpdateDocType extends DocType = DocType>(
    docId: PouchDB.Core.DocumentId,
    updateCallback: UpdateCallbackFunction<UpdateDocType>,
  ): Promise<ChangesResponseChange<DocType> | undefined> {
    const existingDoc = await this.get<UpdateDocType>(docId);

    const resultDoc = await updateCallback(existingDoc);

    if (!resultDoc) {
      // Update aborted.
      return undefined;
    }

    if (resultDoc._id !== undefined && resultDoc._id !== docId) {
      throw new Error("document _id cannot be changed.");
    }

    if (resultDoc._rev !== undefined && resultDoc._rev !== existingDoc?._rev) {
      throw new Error("document _rev cannot be changed.");
    }

    // Return the result of putting the updated document.
    const updatedDoc = {
      ...resultDoc,
      _id: docId,
      _rev: existingDoc?._rev,
    };
    return this.put(updatedDoc);
  }

  /**
   * Create a new LiveQuery instance. If a query is provided, it will be set on
   * the LiveQuery, and the Promise returned will not resolve until the
   * `setQuery()` is finished finding initial documents.
   * @param query Optional query to filter subscription results.
   * @returns A new LiveQuery instance bound to this HeartDB instance.
   * @template LiveQueryDocType Type of documents in the subscription.
   */
  liveQuery<LiveQueryDocType extends DocType = DocType>(
    query?: PouchDB.Find.FindRequest<LiveQueryDocType>,
  ): LiveQuery<DocType, LiveQueryDocType> {
    const liveQuery = new LiveQuery<DocType, LiveQueryDocType>(this);
    liveQuery.setQuery(query);
    return liveQuery;
  }

  /**
   * Create a new LiveDoc instance following the provided id.
   * @param docId Id of document to follow.
   * @returns A new LiveDoc instance.
   */
  liveDoc<LiveDocType extends DocType = DocType>(
    docId: PouchDB.Core.DocumentId,
  ): LiveDoc<DocType, LiveDocType> {
    return new LiveDoc<DocType, LiveDocType>(this, docId);
  }
}

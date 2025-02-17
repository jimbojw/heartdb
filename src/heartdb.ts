/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview HeartDB.
 */

// External dependencies.
import PouchDB from "pouchdb";
import PouchDBFindPlugin from "pouchdb-find";

// Internal modules.
import { Document } from "./types";

// Register pouchdb-find plugin. Note that PouchDB's static `plugin()` method
// will copy properites to the PouchDB prototype object (monkey patching). So it
// is not necessary for users of HeartDB to provide previously find-plugged
// instances.
PouchDB.plugin(PouchDBFindPlugin);

/**
 * Prefix string for broadcast channel names.
 */
const BC_PREFIX = "heartdb_";

/**
 * HeartDB is a subscription-based, type-safe wrapper around PouchDB (with
 * pouch-find). It uses BroadcastChannels to ensure that changed documents in
 * one execution context (e.g. tab) are detected in all other contexts.
 */
export class HeartDB<DocType extends Document = Document> {
  /**
   * PouchDB database instance wrapped by HeartDB.
   */
  readonly db: PouchDB.Database<DocType>;

  /**
   * Channel name used for inter-instance communication.
   */
  readonly channelName: string;

  /**
   * Broadcast channel for incoming messages.
   */
  readonly inbox: BroadcastChannel;

  /**
   * Broadcast channel for outgoing messages.
   */
  readonly outbox: BroadcastChannel;

  /**
   * Bound listener function registered with the inbox channel.
   */
  private messageEventListener = this.handleInboxMessage.bind(this);

  /**
   * PouchDB changes object.
   */
  readonly changes: PouchDB.Core.Changes<DocType>;

  /**
   * Listener function for change events from wrapped PouchDB instance.
   */
  private changeEventListener: (
    change: PouchDB.Core.ChangesResponseChange<DocType>,
  ) => void;

  /**
   * @param db PouchDB instance to wrap.
   */
  constructor(db: PouchDB.Database<DocType>) {
    this.db = db;

    this.channelName = `${BC_PREFIX}${this.db.name}`;

    // Handle all incoming change messages.
    this.inbox = new BroadcastChannel(this.channelName);
    this.inbox.addEventListener("message", this.messageEventListener);

    // Setup PouchDB changes feed.
    this.changes = this.db.changes({
      since: "now",
      live: true,
      include_docs: true,
    });

    // Reflect PouchDB changes to outbox channel.
    this.outbox = new BroadcastChannel(this.channelName);
    this.changeEventListener = (change) => {
      this.outbox.postMessage(change);
    };
    this.changes.on("change", this.changeEventListener);
  }

  /**
   * Close channels and PouchDB connections.
   */
  close() {
    this.inbox.removeEventListener("message", this.messageEventListener);
    this.inbox.close();

    this.changes.removeListener("change", this.changeEventListener);
    this.changes.cancel();

    this.outbox.close();
  }

  /**
   * Handle any incoming message from the inbox channel. This may be a local
   * change from the wrapped PouchDB instance, or it could be a change from
   * another execution context (tab, frame, worker).
   * @param changeEvent Incoming change event.
   */
  handleInboxMessage(
    changeEvent: MessageEvent<PouchDB.Core.ChangesResponseChange<DocType>>,
  ): void {
    // TODO(jimbo): Inform subscribers.
    console.log("Inbox message", changeEvent);
  }
}

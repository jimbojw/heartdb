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
   * Broadcast channel for incoming messages.
   */
  readonly inbox: BroadcastChannel;

  /**
   * Broadcast channel for outgoing messages.
   */
  readonly outbox: BroadcastChannel;

  /**
   * @param dbOrName PouchDB database instance or name to use.
   */
  constructor(dbOrName: PouchDB.Database<DocType> | string) {
    this.db = typeof dbOrName === "string" ? new PouchDB(dbOrName) : dbOrName;

    // Handle all incoming change messages.
    this.inbox = new BroadcastChannel(`${BC_PREFIX}${this.db.name}`);
    this.inbox.addEventListener("message", (event) => {
      this.handleInboxMessage(event);
    });

    // Reflect database changes to outbox channel.
    this.outbox = new BroadcastChannel(`${BC_PREFIX}${this.db.name}`);
    this.db
      .changes({ since: "now", live: true, include_docs: true })
      .on("change", (change) => {
        this.outbox.postMessage(change);
      });
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

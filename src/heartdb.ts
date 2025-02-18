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
import {
  ChangeEvent,
  ChangeEventListener,
  ChangesResponseChange,
} from "./events";
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
   * Set of change event listeners registered with `onChange()`.
   */
  private readonly changeEventListeners = new Set<
    ChangeEventListener<DocType>
  >();

  /**
   * @param pouchDb PouchDB instance to wrap.
   */
  constructor(pouchDb: PouchDB.Database<DocType>) {
    this.pouchDb = pouchDb;
    this.eventTarget = new EventTarget();
    this.channelName = `${BC_PREFIX}${this.pouchDb.name}`;

    // Handle all incoming change messages.
    this.channel = new BroadcastChannel(this.channelName);
    this.channelEventListener = (messageEvent) => {
      this.eventTarget.dispatchEvent(new ChangeEvent(messageEvent.data));
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
      this.eventTarget.dispatchEvent(new ChangeEvent(change));
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
    this.channel.onmessage = null;
    this.channel.close();

    this.changes.removeListener("change", this.dbChangeEventListener);
    this.changes.cancel();

    for (const listener of this.changeEventListeners) {
      this.eventTarget.removeEventListener("change", listener as EventListener);
      this.changeEventListeners.delete(listener);
    }
  }

  /**
   * Subscsribe to changes.
   * @param listener Callback function to invoke on change.
   * @return Function to call to unsubscribe.
   */
  onChange(listener: ChangeEventListener<DocType>): () => void {
    if (this.changeEventListeners.has(listener)) {
      throw new Error("Listener already registered.");
    }
    this.changeEventListeners.add(listener);
    this.eventTarget.addEventListener("change", listener as EventListener);
    return () => {
      this.eventTarget.removeEventListener("change", listener as EventListener);
      this.changeEventListeners.delete(listener);
    };
  }
}

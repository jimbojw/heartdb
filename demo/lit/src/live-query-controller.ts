/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Lit reactive controller for managing a HeartDB LiveQuery.
 */

// External dependencies.
import { Docs, Document, HeartDB, LiveQuery } from "heartdb";
import { ReactiveController, ReactiveControllerHost } from "lit";

/**
 * Lit reactive controller for managing a HeartDB LiveQuery.
 */
export class LiveQueryController<
  DocType extends Document = Document,
  LiveQueryDocType extends DocType = DocType,
> implements ReactiveController
{
  /**
   * Lit host element for this controller.
   */
  readonly host: ReactiveControllerHost;

  /**
   * HeartDB instance to which to connect when host is connected.
   */
  private heartDb?: HeartDB<DocType>;

  /**
   * Query to follow.
   */
  private query?: PouchDB.Find.FindRequest<LiveQueryDocType>;

  /**
   * HeartDB LiveQuery to manage.
   */
  private liveQuery?: LiveQuery<LiveQueryDocType>;

  /**
   * Whether the host is connected.
   */
  private isHostConnected = false;

  /**
   * @param host Host Lit element to which to bind.
   * @param heartDb HeartDB instance to use for communication.
   */
  constructor(host: ReactiveControllerHost) {
    this.host = host;
    host.addController(this);
  }

  /**
   * Setter for HeartDB instance. Set to undefined to disconnect.
   * @param heartDb HeartDB instance to use for communication.
   */
  setHeartDb(heartDb: HeartDB<DocType> | undefined) {
    if (heartDb === this.heartDb) {
      return;
    }

    this.liveQuery?.close();
    this.liveQuery = undefined;

    this.heartDb = heartDb;

    if (!heartDb) {
      return;
    }

    this.liveQuery = heartDb.liveQuery<LiveQueryDocType>();

    this.liveQuery.onAfterChange(() => {
      this.host.requestUpdate();
    });

    if (this.isHostConnected) {
      this.liveQuery.setQuery(this.query);
    }
  }

  /**
   * Setter for internal PouchDB query.
   */
  setQuery(query: PouchDB.Find.FindRequest<LiveQueryDocType>) {
    if (this.query === query) {
      return;
    }
    this.query = query;
    if (this.isHostConnected) {
      this.liveQuery?.setQuery(query);
    }
  }

  /**
   * Passthrough accessor for LiveQuery received docs.
   */
  getDocs(): Docs<LiveQueryDocType> | undefined {
    return this.liveQuery?.docs;
  }

  /**
   * When the host is connected, set the query on the LiveQuery.
   */
  hostConnected(): void {
    this.isHostConnected = true;
    this.liveQuery?.setQuery(this.query);
  }

  /**
   * When the host is disconnected, clear the query on the LiveQuery.
   */
  hostDisconnected(): void {
    this.isHostConnected = false;
    this.liveQuery?.setQuery(undefined);
  }
}

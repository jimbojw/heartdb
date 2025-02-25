/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview HeartDB Lit demo application context.
 */

// External dependencies.
import { createContext } from "@lit/context";
import PouchDBAdapterIndexedDBPlugin from "pouchdb-adapter-indexeddb";
import PouchDB from "pouchdb-browser";

// Internal dependencies.
import { HeartDB } from "heartdb";
import { Task } from "./types";

PouchDB.plugin(PouchDBAdapterIndexedDBPlugin);

/**
 * @returns Initialized AppContext object.
 */
export function makeAppContext() {
  const pouchDb = new PouchDB<Task>("HEARTDB_DEMO", { adapter: "indexeddb" });

  const heartDb = new HeartDB(pouchDb);

  return {
    heartDb,
  };
}

export type AppContext = ReturnType<typeof makeAppContext>;

export const appContext = createContext<AppContext>("appContext");

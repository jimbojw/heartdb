/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Factory for creating HeartDBs for testing.
 */

// External dependencies.
import PouchDB from "pouchdb";
import PouchDBPluginAdapterMemory from "pouchdb-adapter-memory";

// Internal dependencies.
import { HeartDB } from "../src/heartdb";
import { Document } from "../src/types";
import { createPromise } from "./create-promise";

// Register memory adapter.
PouchDB.plugin(PouchDBPluginAdapterMemory);

/**
 * Parameters for creating a new Test HeartDB instance.
 */
export interface TestDbFactoryParams<DocType extends Document = Document> {
  /**
   * Optional initial documents to insert into the database at creation.
   */
  docs?: DocType[];

  /**
   * Optional prefix for the database name.
   */
  dbNamePrefix?: string;
}

export class TestDbFactory<DocType extends Document = Document> {
  dbCount = 0;

  constructor(readonly factoryParams?: TestDbFactoryParams<DocType>) {}

  /**
   * Create a new HeartDB instance wrapping a PouchDB instance using the
   * in-memory adapter.
   * @returns A new HeartDB instance.
   */
  async createDb(): Promise<HeartDB<DocType>> {
    this.dbCount++;
    const dbNamePrefix = this.factoryParams?.dbNamePrefix || "TEST_DB";
    const dbName = `${dbNamePrefix}_${this.dbCount}`;
    const pouchDb = new PouchDB<DocType>(dbName, { adapter: "memory" });
    const heartDb = new HeartDB(pouchDb);

    // Insert initial documents if any.
    const initialDocs = this.factoryParams?.docs;
    if (initialDocs && initialDocs.length) {
      // Monitor HeartDB changes until we've consumed one per test doc.
      const insertedPromise = createPromise<void>();
      let docsInserted = 0;
      const countChange = () => {
        docsInserted++;
        if (docsInserted === initialDocs.length) {
          insertedPromise.resolve();
        }
      };
      const disconnect = heartDb.onChange(countChange);

      // Insert all test docs.
      await heartDb.pouchDb.bulkDocs(initialDocs);

      // Await all change notifications, then disconnect.
      await insertedPromise.promise;
      disconnect();
    }

    return heartDb;
  }
}

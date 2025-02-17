/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Jasmine tests for HeartDB.
 */

// External dependencies.
import PouchDBPluginAdapterMemory from "pouchdb-adapter-memory";
import PouchDB from "pouchdb-node";

// Internal dependencies.
import { HeartDB } from "../src/heartdb";

// Register memory adapter.
PouchDB.plugin(PouchDBPluginAdapterMemory);

describe("HeartDB", () => {
  it("should be a constructor function", () => {
    expect(HeartDB).toBeInstanceOf(Function);
  });

  describe("constructor", () => {
    it("should create a new HeartDB instance", () => {
      const db = new HeartDB(new PouchDB("TEST_DB", { adapter: "memory" }));
      expect(db).toBeDefined();
      db.close();
    });
  });

  describe("channels", () => {
    let heartdb: HeartDB;

    beforeEach(() => {
      heartdb = new HeartDB(new PouchDB("TEST_DB", { adapter: "memory" }));
    });

    afterEach(() => {
      heartdb.close();
    });

    it("should be defined", () => {
      expect(heartdb.channelName).toBe("heartdb_TEST_DB");
      expect(heartdb.inbox).toBeDefined();
      expect(heartdb.outbox).toBeDefined();
    });

    it("should reflect messages from outbox to inbox", (done) => {
      const testMessage = { testField: "test value" };

      function handleMessage(event: MessageEvent) {
        expect(event.data.testField).toEqual("test value");
        heartdb.inbox.removeEventListener("message", handleMessage);
        done();
      }

      heartdb.inbox.addEventListener("message", handleMessage);
      heartdb.outbox.postMessage(testMessage);
    });
  });
});

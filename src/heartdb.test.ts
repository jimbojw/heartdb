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
import { ChangeEvent } from "./change-event";

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

  describe("channel", () => {
    let heartdb: HeartDB;

    beforeEach(() => {
      heartdb = new HeartDB(new PouchDB("TEST_DB", { adapter: "memory" }));
    });

    afterEach(() => {
      heartdb.close();
    });

    it("should be defined", () => {
      expect(heartdb.channelName).toBe("heartdb_TEST_DB");
      expect(heartdb.channel).toBeDefined();
    });

    it("should emit changes incoming on the channel", (done) => {
      const testDoc = {
        _id: "TEST_ID",
        _rev: "1-abc",
        testField: "test value",
      };

      const testChange: PouchDB.Core.ChangesResponseChange<typeof testDoc> = {
        id: testDoc._id,
        seq: 1,
        changes: [{ rev: testDoc._rev }],
        doc: testDoc,
      };

      const testChannel = new BroadcastChannel(heartdb.channelName);

      function handleChangeEvent(event: Event) {
        const changeEvent = event as ChangeEvent<typeof testDoc>;
        expect(changeEvent.detail.doc?.testField).toEqual("test value");
        heartdb.eventTarget.removeEventListener("change", handleChangeEvent);
        testChannel.close();
        done();
      }

      heartdb.eventTarget.addEventListener("change", handleChangeEvent);

      testChannel.postMessage(testChange);
    });
  });

  describe("onChange()", () => {
    let heartdb: HeartDB;

    beforeEach(() => {
      heartdb = new HeartDB(new PouchDB("TEST_DB", { adapter: "memory" }));
    });

    afterEach(() => {
      heartdb.close();
    });

    it("should register listener for incoming channel messages", (done) => {
      const testDoc = {
        _id: "TEST_ID",
        _rev: "1-abc",
        testField: "test value",
      };

      const testChange: PouchDB.Core.ChangesResponseChange<typeof testDoc> = {
        id: testDoc._id,
        seq: 1,
        changes: [{ rev: testDoc._rev }],
        doc: testDoc,
      };

      const testChannel = new BroadcastChannel(heartdb.channelName);

      let disconnect: (() => void) | undefined = undefined;

      function handleChangeEvent(event: ChangeEvent) {
        const changeEvent = event as ChangeEvent<typeof testDoc>;
        expect(changeEvent.detail.doc?.testField).toEqual("test value");
        disconnect?.();
        disconnect = undefined;
        testChannel.close();
        done();
      }

      disconnect = heartdb.onChange(handleChangeEvent);

      testChannel.postMessage(testChange);
    });
  });
});

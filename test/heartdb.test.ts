/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Jest tests for HeartDB.
 */

// External dependencies.
import PouchDBPluginAdapterMemory from "pouchdb-adapter-memory";
import PouchDB from "pouchdb-node";

// Internal dependencies.
import { ChangeEvent, ChangesResponseChange } from "../src/events";
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

  describe("channel", () => {
    let heartDb: HeartDB;

    beforeEach(() => {
      heartDb = new HeartDB(new PouchDB("TEST_DB", { adapter: "memory" }));
    });

    afterEach(() => {
      heartDb.close();
    });

    it("should be defined", () => {
      expect(heartDb.channelName).toBe("heartdb_TEST_DB");
      expect(heartDb.channel).toBeDefined();
    });

    it("should emit changes incoming on the channel", (done) => {
      const testDoc = {
        _id: "TEST_ID",
        _rev: "1-abc",
        testField: "test value",
      };

      const testChange: ChangesResponseChange<typeof testDoc> = {
        id: testDoc._id,
        seq: 1,
        changes: [{ rev: testDoc._rev }],
        doc: testDoc,
      };

      const testChannel = new BroadcastChannel(heartDb.channelName);

      function handleChangeEvent(event: Event) {
        const changeEvent = event as ChangeEvent<typeof testDoc>;
        expect(changeEvent.detail.doc?.testField).toEqual("test value");
        heartDb.eventTarget.removeEventListener("change", handleChangeEvent);
        testChannel.close();
        done();
      }

      heartDb.eventTarget.addEventListener("change", handleChangeEvent);

      testChannel.postMessage(testChange);
    });
  });

  describe("onChange()", () => {
    let heartdb: HeartDB;
    let testCount = 0;

    beforeEach(() => {
      testCount++;
      heartdb = new HeartDB(
        new PouchDB(`TEST_onChange_${testCount}`, { adapter: "memory" }),
      );
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

      const testChange: ChangesResponseChange<typeof testDoc> = {
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

  describe("put()", () => {
    it("should resolve with the change event on insertion", async () => {
      const heartDb = new HeartDB(
        new PouchDB("TEST_put_insert", { adapter: "memory" }),
      );

      const initialTestDoc = {
        _id: "TEST_ID",
        testField: "test value",
      };

      const initialChange = await heartDb.put(initialTestDoc);

      expect(initialChange.id).toBe(initialTestDoc._id);
      expect(initialChange.doc._rev).toMatch(/^1-/);

      heartDb.close();
    });

    it("should resolve with the change event on update", async () => {
      const heartDb = new HeartDB(
        new PouchDB("TEST_put_update", { adapter: "memory" }),
      );

      const initialTestDoc = {
        _id: "TEST_ID",
        testField: "test value",
      };

      const initialChange = await heartDb.put(initialTestDoc);

      const updatedTestDoc = {
        ...initialChange.doc,
        testField: "updated value",
      };

      const updatedChange = await heartDb.put(updatedTestDoc);

      expect(updatedChange.id).toBe(initialTestDoc._id);
      expect(updatedChange.doc._rev).toMatch(/^2-/);

      heartDb.close();
    });
  });
});

/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Tests for HeartDB.
 */

// External dependencies.
import pDefer from "p-defer";
import PouchDBPluginAdapterMemory from "pouchdb-adapter-memory";
import PouchDB from "pouchdb-node";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Internal dependencies.
import { Subscription } from "../src";
import { ChangeEvent, ChangesResponseChange } from "../src/events";
import { HeartDB } from "../src/heartdb";
import { Document } from "../src/types";

// Test dependencies.
import { TestDoc } from "./test-docs";

// Register memory adapter.
PouchDB.plugin(PouchDBPluginAdapterMemory);

describe("HeartDB", () => {
  it("should be a constructor function", () => {
    expect(HeartDB).toBeInstanceOf(Function);
  });

  describe("constructor", () => {
    it("should create a new HeartDB instance", () => {
      const heartDb = new HeartDB(
        new PouchDB("TEST_DB", { adapter: "memory" }),
      );
      expect(heartDb).toBeDefined();
      heartDb.close();
    });

    it("should have a pouchDb member with find plugin methods", () => {
      const heartDb = new HeartDB(
        new PouchDB("TEST_DB", { adapter: "memory" }),
      );
      expect(heartDb.pouchDb.find).toBeInstanceOf(Function);
      heartDb.close();
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

    it("should emit changes incoming on the channel", async () => {
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

      const deferred = pDefer<void>();

      function handleChangeEvent(event: Event) {
        const changeEvent = event as ChangeEvent<typeof testDoc>;
        expect(changeEvent.detail.doc?.testField).toEqual("test value");
        heartDb.eventTarget.removeEventListener("change", handleChangeEvent);
        testChannel.close();
        deferred.resolve();
      }

      heartDb.eventTarget.addEventListener("change", handleChangeEvent);

      testChannel.postMessage(testChange);

      await deferred.promise;
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

    it("should register listener for incoming channel messages", async () => {
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

      const deferred = pDefer<void>();

      function handleChangeEvent(event: ChangeEvent) {
        const changeEvent = event as ChangeEvent<typeof testDoc>;
        expect(changeEvent.detail.doc?.testField).toEqual("test value");
        disconnect?.();
        disconnect = undefined;
        testChannel.close();
        deferred.resolve();
      }

      disconnect = heartdb.onChange(handleChangeEvent);

      testChannel.postMessage(testChange);

      await deferred.promise;
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

  describe("post()", () => {
    it("should resolve with the change event on insertion", async () => {
      const testDoc = {
        testField: "UNIQUE TEST VALUE",
      };

      const heartDb = new HeartDB(
        new PouchDB<typeof testDoc & Document>("TEST_post_insert", {
          adapter: "memory",
        }),
      );

      const changeEvent = await heartDb.post(testDoc);

      expect(changeEvent.seq).toBe(1);
      expect(changeEvent.doc._rev).toMatch(/^1-/);
      expect(changeEvent.doc.testField).toBe("UNIQUE TEST VALUE");

      heartDb.close();
    });
  });

  describe("get()", () => {
    it("should return undefind for missing document", async () => {
      const heartDb = new HeartDB(
        new PouchDB("TEST_get_missing", { adapter: "memory" }),
      );
      const doc = await heartDb.get("MISSING_DOC");
      expect(doc).toBeUndefined();
    });

    it("should return a found focument", async () => {
      const heartDb = new HeartDB(
        new PouchDB<TestDoc>("TEST_get_found", { adapter: "memory" }),
      );

      const testDoc = {
        _id: "TEST_ID",
        testField: "test value",
      };

      await heartDb.put(testDoc);

      const doc = await heartDb.get("TEST_ID");

      expect(doc).toBeDefined();
      expect(doc?._id).toBe(testDoc._id);
      expect(doc?.testField).toBe(testDoc.testField);
    });
  });

  describe("update()", () => {
    it("should resolve with undefined when aborted", async () => {
      const heartDb = new HeartDB(
        new PouchDB<TestDoc>("TEST_update_abort", { adapter: "memory" }),
      );

      const testDoc = {
        _id: "TEST_ID",
        testField: "test value",
      };

      await heartDb.put(testDoc);

      let callCount = 0;

      const updateChangeEvent = await heartDb.update(
        "TEST_ID",
        (existingDoc) => {
          callCount++;

          expect(existingDoc).toBeDefined();
          expect(existingDoc?._id).toBe(testDoc._id);
          expect(existingDoc?.testField).toBe(testDoc.testField);

          // Abort the update.
          return undefined;
        },
      );

      expect(callCount).toBe(1);
      expect(updateChangeEvent).toBeUndefined();
    });

    it("should resolve with the change event on update", async () => {
      const heartDb = new HeartDB(
        new PouchDB<TestDoc>("TEST_update_success", { adapter: "memory" }),
      );

      const testDoc = {
        _id: "TEST_ID",
        testField: "test value",
      };

      await heartDb.put(testDoc);

      let callCount = 0;

      const updateChangeEvent = await heartDb.update(
        "TEST_ID",
        (existingDoc) => {
          callCount++;

          expect(existingDoc).toBeDefined();
          expect(existingDoc?._id).toBe(testDoc._id);
          expect(existingDoc?.testField).toBe(testDoc.testField);

          // Change the test field.
          return { testField: "updated value" };
        },
      );

      expect(callCount).toBe(1);
      expect(updateChangeEvent).toBeDefined();
      expect(updateChangeEvent?.id).toBe(testDoc._id);
      expect(updateChangeEvent?.doc._rev).toMatch(/^2-/);
      expect(updateChangeEvent?.doc.testField).toBe("updated value");
    });
  });

  describe("subscription()", () => {
    it("should create a Subscription instance", async () => {
      const heartDb = new HeartDB(
        new PouchDB("TEST_subscription", { adapter: "memory" }),
      );
      const subscription = await heartDb.subscription();
      expect(subscription).toBeDefined();
      expect(subscription).toBeInstanceOf(Subscription);
      heartDb.close();
    });

    it("should pass optional query", async () => {
      const heartDb = new HeartDB(
        new PouchDB("TEST_subscription", { adapter: "memory" }),
      );
      const query = { selector: { testField: "test value" } };
      const subscription = await heartDb.subscription(query);
      expect(subscription).toBeDefined();
      expect(subscription).toBeInstanceOf(Subscription);
      expect(subscription.query).toBe(query);
      heartDb.close();
    });
  });
});

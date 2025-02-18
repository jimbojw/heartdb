/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Jest tests for Subscription.
 */

// External dependencies.
import PouchDB from "pouchdb";
import PouchDBPluginAdapterMemory from "pouchdb-adapter-memory";

// Internal dependencies.
import { HeartDB } from "./heartdb";
import { Subscription } from "./subscription";
import { Document } from "./types";

// Register memory adapter.
PouchDB.plugin(PouchDBPluginAdapterMemory);

interface TestDoc extends Document {
  testField: string;
}

describe("Subscription", () => {
  it("should be a constructor function", () => {
    expect(Subscription).toBeInstanceOf(Function);
  });

  describe("constructor", () => {
    it("should create a new Subscription instance", () => {
      const subscription = new Subscription({} as unknown as HeartDB);
      expect(subscription).toBeDefined();
    });
  });

  describe("setQuery", () => {
    let heartDb: HeartDB<TestDoc>;

    const TEST_DOCS: TestDoc[] = new Array(100).fill(null).map((_, index) => ({
      _id: `TEST_DOC_${`${index}`.padStart(4, "0")}`,
      testField: `test value ${index}`,
    }));

    beforeEach(async () => {
      heartDb = new HeartDB(
        new PouchDB<TestDoc>("TEST_DB", { adapter: "memory" }),
      );

      await heartDb.pouchDb.bulkDocs(TEST_DOCS);
    });

    afterEach(() => {
      heartDb.close();
    });

    it("should find few matching docs", async () => {
      const subscription = new Subscription(heartDb);
      expect(subscription.query).toBeUndefined();

      let callCount = 0;

      const disconnect = subscription.onEnter((enterEvent) => {
        callCount++;

        const docs = enterEvent.detail;

        expect(Object.keys(docs).length).toBe(10);

        for (let index = 10; index < 20; index++) {
          const doc = docs[`TEST_DOC_${`${index}`.padStart(4, "0")}`];
          expect(doc).toBeDefined();
        }
      });

      const query = {
        selector: {
          _id: {
            $gte: "TEST_DOC_0010",
            $lt: "TEST_DOC_0020",
          },
        },
      };

      await subscription.setQuery(query);

      expect(subscription.query).toBe(query);
      expect(callCount).toBe(1);
      disconnect();
    });

    it("should find docs up to limit", async () => {
      const subscription = new Subscription(heartDb);
      expect(subscription.query).toBeUndefined();

      let callCount = 0;

      const disconnect = subscription.onEnter((enterEvent) => {
        callCount++;

        const docs = enterEvent.detail;

        expect(Object.keys(docs).length).toBe(50);

        for (let index = 10; index < 60; index++) {
          const doc = docs[`TEST_DOC_${`${index}`.padStart(4, "0")}`];
          expect(doc).toBeDefined();
        }
      });

      const query: PouchDB.Find.FindRequest<TestDoc> = {
        selector: {
          _id: {
            $gte: "TEST_DOC_0010",
            $lt: "TEST_DOC_0060",
          },
        },
        limit: 50,
      };

      await subscription.setQuery(query);
      expect(subscription.query).toBe(query);
      expect(callCount).toBe(1);
      disconnect();
    });

    it("should continue finding docs until all found", async () => {
      const subscription = new Subscription(heartDb);
      expect(subscription.query).toBeUndefined();

      let callCount = 0;

      const disconnect = subscription.onEnter((enterEvent) => {
        callCount++;

        const docs = enterEvent.detail;

        // Expect batches of 10 results, 5 times.
        expect(Object.keys(docs).length).toBe(10);
      });

      const query: PouchDB.Find.FindRequest<TestDoc> = {
        selector: {
          _id: {
            $gte: "TEST_DOC_0010",
            $lt: "TEST_DOC_0060",
          },
        },
        limit: 10,
      };

      await subscription.setQuery(query);
      expect(subscription.query).toBe(query);
      expect(callCount).toBe(5);
      disconnect();
    });
  });
});

/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Jest tests for Subscription.
 */

// Internal dependencies.
import { HeartDB } from "../src/heartdb";
import { Subscription } from "../src/subscription";

// Test dependencies.
import { createPromise } from "./create-promise";
import { TestDbFactory } from "./test-db-factory";
import { TEST_DOCS_0100, TestDoc } from "./test-docs";

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
    const testDbFactory = new TestDbFactory({ docs: TEST_DOCS_0100 });

    let heartDb: HeartDB<TestDoc>;

    beforeEach(async () => {
      heartDb = await testDbFactory.createDb();
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
      // This test creates a query with a limit of 10 documents that matches 50
      // docuents from the test set. Accordingly, we expect 5 calls to
      // onEnter(). The implementation will actually perform a 6th find()
      // request, which will return no documents and thus not trigger a 6th
      // onEnter() call.

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

    it("should find later added docs", async () => {
      // This test subscribes to a query for docs beyond the initial 100, then
      // adds a new doc that matches the query. We expect the onEnter() callback
      // to be invoked only once because the initial query finds no documents.

      const subscription = new Subscription(heartDb);
      expect(subscription.query).toBeUndefined();

      const deferred = createPromise<void>();

      const disconnect = subscription.onEnter((enterEvent) => {
        const docs = enterEvent.detail;
        expect(Object.keys(docs).length).toBe(1);
        deferred.resolve();
      });

      // Note: Initial query is beyond the 100 initial docs.
      const query: PouchDB.Find.FindRequest<TestDoc> = {
        selector: { _id: { $gte: "TEST_DOC_0100" } },
      };

      await subscription.setQuery(query);

      heartDb.pouchDb.put({
        _id: "TEST_DOC_0101",
        testField: "test value 101",
      });

      await deferred.promise;
      disconnect();
    });

    it("should detect updated docs", async () => {
      // This test modifies test docs 98 and 99 and expects the onUpdate()
      // callback to be invoked once for each.

      const subscription = new Subscription(heartDb);

      // Track call to entering documents.
      const enterDeferred = createPromise<void>();
      const enterDisconnect = subscription.onEnter((enterEvent) => {
        // Expect initial query to find documents 98 and 99.
        const docs = enterEvent.detail;
        expect(Object.keys(docs).length).toBe(2);

        // Expect docs' _rev field to start with "1-".
        for (const id in docs) {
          expect(docs[id]._rev).toMatch(/^1-/);
        }

        enterDeferred.resolve();
        enterDisconnect();
      });

      let updateCallCount = 0;
      const updateDeferred = createPromise<void>();

      const updateDisconnect = subscription.onUpdate((updateEvent) => {
        updateCallCount++;
        const docs = updateEvent.detail;

        expect(Object.keys(docs).length).toBe(1);

        const doc = docs[Object.keys(docs)[0]];

        switch (updateCallCount) {
          case 1:
            // First update call should find modified doc 98.
            expect(doc._rev).toMatch(/^2-/);
            expect(doc.testField).toBe("updated value 98");
            break;
          case 2:
            // Second and final update call should find updated doc 99.
            expect(doc._rev).toMatch(/^2-/);
            expect(doc.testField).toBe("updated value 99");
            updateDeferred.resolve();
            updateDisconnect();
            break;
          default:
            // No further calls expected.
            throw new Error("Unexpected call to onUpdate");
        }
      });

      const query: PouchDB.Find.FindRequest<TestDoc> = {
        selector: { _id: { $gte: "TEST_DOC_0098" } },
      };

      await subscription.setQuery(query);

      // Wait for the entering docs to be notified.
      await enterDeferred.promise;

      // Modify TEST_DOC_098.
      const testDoc98Orig = await heartDb.pouchDb.get("TEST_DOC_0098");
      await heartDb.pouchDb.put({
        ...testDoc98Orig,
        testField: "updated value 98",
      });

      // Modify TEST_DOC_099.
      const testDoc99Orig = await heartDb.pouchDb.get("TEST_DOC_0099");
      await heartDb.pouchDb.put({
        ...testDoc99Orig,
        testField: "updated value 99",
      });

      await updateDeferred.promise;
    });
  });
});

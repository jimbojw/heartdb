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
import { HeartDB } from "../src/heartdb";
import { Subscription } from "../src/subscription";
import { Document } from "../src/types";

// Register memory adapter.
PouchDB.plugin(PouchDBPluginAdapterMemory);

interface TestDoc extends Document {
  testField: string;
}

// TODO(jimbo): Swap for p-defer library and fix jest config to work with it.
function createPromise<ValueType = unknown>(): {
  promise: Promise<ValueType>;
  resolve: (value: ValueType) => void;
  reject: (reason: unknown) => void;
} {
  let resolve: (value: ValueType) => void;
  let reject: (reason: unknown) => void;
  const promise = new Promise<ValueType>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { promise, resolve: resolve!, reject: reject! };
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
    let testNumber = 0;

    const TEST_DOCS: TestDoc[] = new Array(100).fill(null).map((_, index) => ({
      _id: `TEST_DOC_${`${index}`.padStart(4, "0")}`,
      testField: `test value ${index}`,
    }));

    beforeEach(async () => {
      // Create a HeartDB instance with an in-memory PouchDB instance. Then
      // insert all TEST_DOCS and wait for all of their change notifications.
      // This ensures that there are no lingering change notifications in the
      // pipeline before the tests begin.

      // Note: PouchDB's memory adapter seems to be shared by name. So here we
      // give each PouchDB test database a different name, monotonically
      // increasing with test number.
      testNumber++;
      heartDb = new HeartDB(
        new PouchDB<TestDoc>(`TEST_DB_${testNumber}`, { adapter: "memory" }),
      );

      // Monitor HeartDB changes until we've consumed one per test doc.
      const insertedPromise = createPromise<void>();
      let docsInserted = 0;
      const countChange = () => {
        docsInserted++;
        if (docsInserted === TEST_DOCS.length) {
          insertedPromise.resolve();
        }
      };
      const disconnect = heartDb.onChange(countChange);

      // Insert all test docs.
      await heartDb.pouchDb.bulkDocs(TEST_DOCS);

      // Await all change notifications, then disconnect.
      await insertedPromise.promise;
      disconnect();
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

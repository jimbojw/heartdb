/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Jest tests for Subscription's onExit() method.
 */

// Internal dependencies.
import { HeartDB } from "../src/heartdb";
import { Subscription } from "../src/subscription";

// Test dependencies.
import { createPromise } from "./create-promise";
import { TestDbFactory } from "./test-db-factory";
import { TEST_DOCS_0100, TestDoc } from "./test-docs";

describe("Subscription::onExit()", () => {
  const testDbFactory = new TestDbFactory({
    dbNamePrefix: "TEST_Subscription_onExit",
    initialDocs: TEST_DOCS_0100,
  });

  let heartDb: HeartDB<TestDoc>;

  beforeEach(async () => {
    heartDb = await testDbFactory.createDb();
  });

  afterEach(() => {
    heartDb.close();
  });

  it("should detect deleted docs", async () => {
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

    let exitCallCount = 0;
    const exitDeferred = createPromise<void>();

    const exitDisconnect = subscription.onExit((exitEvent) => {
      exitCallCount++;
      const exitingDocs = exitEvent.detail;

      expect(Object.keys(exitingDocs).length).toBe(1);

      const doc = exitingDocs[Object.keys(exitingDocs)[0]];

      switch (exitCallCount) {
        case 1:
          // First update call should find deleted doc 98.
          expect(doc._id).toBe("TEST_DOC_0098");
          expect(doc._rev).toMatch(/^2-/);
          expect(doc._deleted).toBe(true);
          break;
        case 2:
          // Second and final update call should find updated doc 99.
          expect(doc._id).toBe("TEST_DOC_0099");
          expect(doc._rev).toMatch(/^2-/);
          expect(doc._deleted).toBe(true);
          exitDeferred.resolve();
          exitDisconnect();
          break;
        default:
          // No further calls expected.
          throw new Error("Unexpected call to onExit");
      }
    });

    const query: PouchDB.Find.FindRequest<TestDoc> = {
      selector: { _id: { $gte: "TEST_DOC_0098" } },
    };

    await subscription.setQuery(query);

    // Wait for the entering docs to be notified.
    await enterDeferred.promise;

    // Delete TEST_DOC_098.
    const testDoc98Orig = await heartDb.pouchDb.get("TEST_DOC_0098");
    await heartDb.pouchDb.put({
      ...testDoc98Orig,
      _deleted: true,
    });

    // Modify TEST_DOC_099.
    const testDoc99Orig = await heartDb.pouchDb.get("TEST_DOC_0099");
    await heartDb.pouchDb.put({
      ...testDoc99Orig,
      _deleted: true,
    });

    await exitDeferred.promise;
  });
});

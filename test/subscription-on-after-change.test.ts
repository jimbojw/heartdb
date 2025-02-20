/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Jest tests for Subscription's onAfterChange() method.
 */

// Internal dependencies.
import { HeartDB } from "../src/heartdb";
import { Subscription } from "../src/subscription";

// Test dependencies.
import { createPromise } from "./create-promise";
import { TestDbFactory } from "./test-db-factory";
import { TEST_DOCS_0100, TestDoc } from "./test-docs";

describe("Subscription::onAfterChange()", () => {
  const testDbFactory = new TestDbFactory({
    dbNamePrefix: "TEST_Subscription_onAfterChange",
    initialDocs: TEST_DOCS_0100,
  });

  let heartDb: HeartDB<TestDoc>;

  beforeEach(async () => {
    heartDb = await testDbFactory.createDb();
  });

  afterEach(() => {
    heartDb.close();
  });

  it("should respond to each change", async () => {
    // This test modifies test docs 98 and 99 and expects the onUpdate()
    // callback to be invoked once for each.

    const subscription = new Subscription(heartDb);

    let callCount = 0;
    const initialDeferred = createPromise<void>();
    const deletionDeferred = createPromise<void>();
    const modifiedDeferred = createPromise<void>();
    const recreationDeferred = createPromise<void>();

    const disconnect = subscription.onAfterChange((afterChangeEvent) => {
      callCount++;
      const docs = afterChangeEvent.detail;

      switch (callCount) {
        case 1:
          // First call should have 30 of the 40 matching docs.
          expect(Object.keys(docs).length).toBe(30);
          break;
        case 2:
          // Second call should have all 40 matching docs.
          expect(Object.keys(docs).length).toBe(40);
          expect(docs["TEST_DOC_0054"]).toBeDefined();
          expect(docs["TEST_DOC_0073"]._rev).toMatch(/^1-/);
          initialDeferred.resolve();
          break;
        case 3:
          // Third call should have 39 matching docs.
          expect(docs["TEST_DOC_0054"]).toBeUndefined();
          expect(docs["TEST_DOC_0073"]._rev).toMatch(/^1-/);
          expect(Object.keys(docs).length).toBe(39);
          deletionDeferred.resolve();
          break;
        case 4:
          // Fourth call should have 39 matching docs, but one changed.
          expect(Object.keys(docs).length).toBe(39);
          expect(docs["TEST_DOC_0054"]).toBeUndefined();
          expect(docs["TEST_DOC_0073"]._rev).toMatch(/^2-/);
          modifiedDeferred.resolve();
          break;
        case 5:
          // Fifth call should again have 40 matching docs.
          expect(Object.keys(docs).length).toBe(40);
          expect(docs["TEST_DOC_0054"]).toBeDefined();
          expect(docs["TEST_DOC_0054"]._rev).toMatch(/^3-/);
          recreationDeferred.resolve();
          break;
        default:
          // No further calls expected.
          throw new Error("Unexpected call to onExit");
      }
    });

    const query: PouchDB.Find.FindRequest<TestDoc> = {
      selector: { _id: { $gte: "TEST_DOC_0050", $lt: "TEST_DOC_0090" } },
      limit: 30,
    };

    await subscription.setQuery(query);

    // Wait for initial change.
    await initialDeferred.promise;

    // Delete TEST_DOC_054.
    const testDoc54Orig = await heartDb.pouchDb.get("TEST_DOC_0054");
    await heartDb.pouchDb.put({
      ...testDoc54Orig,
      _deleted: true,
    });

    // Wait for deletion change.
    await deletionDeferred.promise;

    // Modify TEST_DOC_073.
    const testDoc73Orig = await heartDb.pouchDb.get("TEST_DOC_0073");
    await heartDb.pouchDb.put({
      ...testDoc73Orig,
      testField: "MODIFIED TEST VALUE 73",
    });

    // Wait for modification change.
    await modifiedDeferred.promise;

    // Re-create TEST_DOC_054.
    await heartDb.pouchDb.put({
      _id: "TEST_DOC_0054",
      testField: "RECREATED TEST VALUE 54",
    });

    // Wait for recreation change.
    await recreationDeferred.promise;

    disconnect();
  });
});

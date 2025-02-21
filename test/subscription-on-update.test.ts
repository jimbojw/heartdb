/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Tests for Subscription's onUpdate() method.
 */

// External dependencies.
import pDefer from "p-defer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Internal dependencies.
import { HeartDB } from "../src/heartdb";
import { Subscription } from "../src/subscription";

// Test dependencies.
import { TestDbFactory } from "./test-db-factory";
import { TEST_DOCS_0100, TestDoc } from "./test-docs";

describe("Subscription::onUpdate()", () => {
  const testDbFactory = new TestDbFactory({
    dbNamePrefix: "TEST_Subscription_onUpdate",
    initialDocs: TEST_DOCS_0100,
  });

  let heartDb: HeartDB<TestDoc>;

  beforeEach(async () => {
    heartDb = await testDbFactory.createDb();
  });

  afterEach(() => {
    heartDb.close();
  });

  it("should detect updated docs", async () => {
    // This test modifies test docs 98 and 99 and expects the onUpdate()
    // callback to be invoked once for each.

    const subscription = new Subscription(heartDb);

    // Track call to entering documents.
    const enterDeferred = pDefer<void>();
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
    const updateDeferred = pDefer<void>();

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

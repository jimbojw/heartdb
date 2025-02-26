/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Tests for LiveQuery's onEnter() method.
 */

// External dependencies.
import pDefer from "p-defer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Internal dependencies.
import { HeartDB } from "../src/heartdb";
import { LiveQuery } from "../src/live-query";

// Test dependencies.
import { TestDbFactory } from "./test-db-factory";
import { TEST_DOCS_0100, TestDoc } from "./test-docs";

describe("LiveQuery::onEnter()", () => {
  const testDbFactory = new TestDbFactory({
    dbNamePrefix: "TEST_LiveQuery_onEnter",
    initialDocs: TEST_DOCS_0100,
  });

  let heartDb: HeartDB<TestDoc>;

  beforeEach(async () => {
    heartDb = await testDbFactory.createDb();
  });

  afterEach(() => {
    heartDb.close();
  });

  it("should find few matching docs", async () => {
    const liveQuery = new LiveQuery(heartDb);
    expect(liveQuery.query).toBeUndefined();

    let callCount = 0;

    const disconnect = liveQuery.onEnter((enterEvent) => {
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

    await liveQuery.setQuery(query);

    expect(liveQuery.query).toBe(query);
    expect(callCount).toBe(1);
    disconnect();
  });

  it("should find docs up to limit", async () => {
    const liveQuery = new LiveQuery(heartDb);
    expect(liveQuery.query).toBeUndefined();

    let callCount = 0;

    const disconnect = liveQuery.onEnter((enterEvent) => {
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

    await liveQuery.setQuery(query);
    expect(liveQuery.query).toBe(query);
    expect(callCount).toBe(1);
    disconnect();
  });

  it("should continue finding docs until all found", async () => {
    // This test creates a query with a limit of 10 documents that matches 50
    // docuents from the test set. Accordingly, we expect 5 calls to
    // onEnter(). The implementation will actually perform a 6th find()
    // request, which will return no documents and thus not trigger a 6th
    // onEnter() call.

    const liveQuery = new LiveQuery(heartDb);
    expect(liveQuery.query).toBeUndefined();

    let callCount = 0;

    const disconnect = liveQuery.onEnter((enterEvent) => {
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

    await liveQuery.setQuery(query);
    expect(liveQuery.query).toBe(query);
    expect(callCount).toBe(5);
    disconnect();
  });

  it("should find later added docs", async () => {
    // This test subscribes to a query for docs beyond the initial 100, then
    // adds a new doc that matches the query. We expect the onEnter() callback
    // to be invoked only once because the initial query finds no documents.

    const liveQuery = new LiveQuery(heartDb);
    expect(liveQuery.query).toBeUndefined();

    const deferred = pDefer<void>();

    let callCount = 0;
    const disconnect = liveQuery.onEnter((enterEvent) => {
      callCount++;
      const docs = enterEvent.detail;
      expect(Object.keys(docs).length).toBe(1);
      deferred.resolve();
    });

    // Note: Initial query is beyond the 100 initial docs.
    const query: PouchDB.Find.FindRequest<TestDoc> = {
      selector: { _id: { $gte: "TEST_DOC_0100" } },
    };

    await liveQuery.setQuery(query);

    await heartDb.pouchDb.put({
      _id: "TEST_DOC_0101",
      testField: "test value 101",
    });

    await deferred.promise;

    expect(callCount).toBe(1);

    disconnect();
  });
});

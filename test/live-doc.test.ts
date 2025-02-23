/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Tests for LiveDoc.
 */

// External dependencies.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Internal dependencies.
import { HeartDB } from "../src";
import { LiveDoc } from "../src/live-doc";
import { Existing } from "../src/types";
import { TestDbFactory } from "./test-db-factory";
import { TEST_DOCS_0100, TestDoc } from "./test-docs";

describe("LiveDoc", () => {
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

  it("should be a constructor function", () => {
    expect(LiveDoc).toBeInstanceOf(Function);
  });

  it("should follow a document", async () => {
    const liveDoc = new LiveDoc(heartDb, "TEST_DOC_0001");

    expect(liveDoc).toBeDefined();
    expect(liveDoc.doc).toBeUndefined();

    await new Promise((resolve) => {
      const disconnect = liveDoc.onSet(() => {
        disconnect();
        resolve(undefined);
      });
    });

    expect(liveDoc.doc).toBeDefined();
    expect(liveDoc.doc?._id).toBe("TEST_DOC_0001");

    await heartDb.update("TEST_DOC_0001", (doc) => {
      return { ...doc, testField: "new value" };
    });

    expect(liveDoc.doc).toBeDefined();
    expect(liveDoc.doc?._id).toBe("TEST_DOC_0001");
    expect(liveDoc.doc?._rev).toMatch(/^2-/);
    expect(liveDoc.doc?.testField).toBe("new value");

    await heartDb.update("TEST_DOC_0001", (doc) => {
      return { ...(doc as TestDoc & Existing), _deleted: true };
    });

    expect(liveDoc.doc).toBeUndefined();

    await heartDb.put({ _id: "TEST_DOC_0001", testField: "revived value" });

    expect(liveDoc.doc).toBeDefined();
    expect(liveDoc.doc?._id).toBe("TEST_DOC_0001");
    expect(liveDoc.doc?._rev).toMatch(/^4-/);
    expect(liveDoc.doc?.testField).toBe("revived value");
  });
});

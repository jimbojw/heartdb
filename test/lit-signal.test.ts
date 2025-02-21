/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Tests for LitSignal.
 */

// External dependencies.
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// Internal dependencies.
import { HeartDB } from "../src/heartdb";
import { LitSignal } from "../src/lit-signal";
import { Subscription } from "../src/subscription";

// Test dependencies.
import { TestDbFactory } from "./test-db-factory";
import { TEST_DOCS_0100, TestDoc } from "./test-docs";

describe("LitSignal()", () => {
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

  it("should yield empty docs record initially", async () => {
    // Before a query is set on the subscription, the LitSignal should yield an
    // empty record set.

    const subscription = new Subscription(heartDb);
    const litSignal = new LitSignal(subscription);

    expect(Object.keys(litSignal.get()).length).toBe(0);
  });

  it("should yield subscription values", async () => {
    // This test asserts that the LitSignal values match an initial subscription
    // query.

    const subscription = new Subscription(heartDb);
    const litSignal = new LitSignal(subscription);

    // Subscribe to docs 1-3 inclusive.
    await subscription.setQuery({
      selector: { _id: { $gt: "TEST_DOC_0000", $lte: "TEST_DOC_0003" } },
    });

    expect(Object.keys(litSignal.get()).length).toBe(3);
    expect(litSignal.get()["TEST_DOC_0001"]).toBeDefined();
    expect(litSignal.get()["TEST_DOC_0002"]).toBeDefined();
    expect(litSignal.get()["TEST_DOC_0003"]).toBeDefined();
  });

  it("should yield updated values after subscription change", async () => {
    // This test asserts that after the subscription query changes, the
    // LitSignal yields the updated matching values.

    const subscription = new Subscription(heartDb);
    const litSignal = new LitSignal(subscription);

    // Subscribe to docs 1-3 inclusive.
    await subscription.setQuery({
      selector: { _id: { $gt: "TEST_DOC_0000", $lte: "TEST_DOC_0003" } },
    });

    expect(Object.keys(litSignal.get()).length).toBe(3);

    // Change subscription to docs 3-4 inclusive.
    await subscription.setQuery({
      selector: { _id: { $gt: "TEST_DOC_0002", $lte: "TEST_DOC_0004" } },
    });

    expect(Object.keys(litSignal.get()).length).toBe(2);
    expect(litSignal.get()["TEST_DOC_0003"]).toBeDefined();
    expect(litSignal.get()["TEST_DOC_0004"]).toBeDefined();
  });

  it("should yield empty set after query is cleared", async () => {
    const subscription = new Subscription(heartDb);
    const litSignal = new LitSignal(subscription);

    // Subscribe to docs 1-3 inclusive.
    await subscription.setQuery({
      selector: { _id: { $gt: "TEST_DOC_0000", $lte: "TEST_DOC_0003" } },
    });

    expect(Object.keys(litSignal.get()).length).toBe(3);

    // Change subscription to docs 3-4 inclusive.
    await subscription.setQuery(undefined);

    expect(Object.keys(litSignal.get()).length).toBe(0);
  });
});

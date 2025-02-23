/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Tests for Subscription.
 */

// External dependencies.
import { describe, expect, it } from "vitest";

// Internal dependencies.
import { CloseableEventTarget } from "../src/closeable-event-target";
import { HeartDB } from "../src/heartdb";
import { Subscription } from "../src/subscription";

describe("Subscription", () => {
  it("should be a constructor function", () => {
    expect(Subscription).toBeInstanceOf(Function);
  });

  describe("constructor", () => {
    it("should create a new Subscription instance", () => {
      // Note: By passing an empty object, this test also checks implicitly that
      // no methods are called on the object.
      const subscription = new Subscription(
        new CloseableEventTarget() as unknown as HeartDB,
      );
      expect(subscription).toBeDefined();
      subscription.heartDb.close();
    });
  });
});

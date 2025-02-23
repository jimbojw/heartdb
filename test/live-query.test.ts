/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Tests for LiveQuery.
 */

// External dependencies.
import { describe, expect, it } from "vitest";

// Internal dependencies.
import { CloseableEventTarget } from "../src/closeable-event-target";
import { HeartDB } from "../src/heartdb";
import { LiveQuery } from "../src/live-query";

describe("LiveQuery", () => {
  it("should be a constructor function", () => {
    expect(LiveQuery).toBeInstanceOf(Function);
  });

  describe("constructor", () => {
    it("should create a new LiveQuery instance", () => {
      // Note: By passing an empty object, this test also checks implicitly that
      // no methods are called on the object.
      const liveQuery = new LiveQuery(
        new CloseableEventTarget() as unknown as HeartDB,
      );
      expect(liveQuery).toBeDefined();
      liveQuery.heartDb.close();
    });
  });
});

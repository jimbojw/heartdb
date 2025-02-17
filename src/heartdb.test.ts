/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Jasmine tests for HeartDB.
 */

import { HeartDB } from "../src/heartdb";

describe("HeartDB", () => {
  it("should be a constructor function", () => {
    expect(HeartDB).toBeInstanceOf(Function);
  });
});

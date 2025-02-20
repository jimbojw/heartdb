/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Jest config.
 */

/** @type {import('ts-jest').JestConfigWithTsJest} **/
export default {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
};

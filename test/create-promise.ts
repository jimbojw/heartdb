/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Create a Promise and expose its resolve and reject functions.
 */

// TODO(jimbo): Swap for p-defer library and fix jest config to work with it.
/**
 * @returns A Promise and its resolve and reject functions.
 */
export function createPromise<ValueType = unknown>(): {
  promise: Promise<ValueType>;
  resolve: (value: ValueType) => void;
  reject: (reason: unknown) => void;
} {
  let resolve: (value: ValueType) => void;
  let reject: (reason: unknown) => void;
  const promise = new Promise<ValueType>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return { promise, resolve: resolve!, reject: reject! };
}

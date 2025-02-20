/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Custom Error subclasses.
 */
/**
 * Internal error signifying a bug. Not recoverable.
 */
export declare class InternalError extends Error {
    constructor(message?: string);
}

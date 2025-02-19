/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Static test documents for seeding test databases.
 */

// Internal dependencies.
import { Document } from "../src/types";

/**
 * Minimalist test document interface.
 */
export interface TestDoc extends Document {
  testField: string;
}

/**
 * Set of 100 initial test documents.
 */
export const TEST_DOCS_0100: (TestDoc & PouchDB.Core.IdMeta)[] = new Array(100)
  .fill(null)
  .map((_, index) => ({
    _id: `TEST_DOC_${`${index}`.padStart(4, "0")}`,
    testField: `test value ${index}`,
  }));

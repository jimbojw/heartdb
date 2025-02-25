/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview HeartDB demo app types.
 */

/**
 * Task to store in HeartDB.
 */
export interface Task {
  /**
   * Type string for matching documents.
   */
  type: "task";

  /**
   * Task description string.
   */
  description: string;

  /**
   * Status of task.
   */
  status: "open" | "closed";
}

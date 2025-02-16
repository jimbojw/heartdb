/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * An Existing document has an `_id` string field, a `_rev` string field and may
 * have a `_deleted` boolean field.
 */
export type Existing = PouchDB.Core.IdMeta &
  PouchDB.Core.RevisionIdMeta & { _deleted?: boolean };

/**
 * A Document may have the properties of an Existing document. Other,
 * application-specific document types should extend this.
 */
export type Document = Partial<Existing>;

/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Type definitions.
 */

/**
 * An Existing document has an `_id` string field, a `_rev` string field and may
 * have a changes meta fields such as the `_deleted` boolean field.
 */
export type Existing = PouchDB.Core.IdMeta &
  PouchDB.Core.RevisionIdMeta &
  PouchDB.Core.ChangesMeta;

/**
 * A Document may have the properties of an Existing document. Other,
 * application-specific document types should extend this.
 */
export type Document = Partial<Existing>;

/**
 * Collection of existing documents, keyed by id.
 */
export type Docs<DocType extends Document> = Record<
  PouchDB.Core.DocumentId,
  DocType & Existing
>;

/**
 * Simple union type for promises or values they yield.
 */
export type PromiseOrValue<ValueType> = ValueType | Promise<ValueType>;

/**
 * Callback function signature for HeartDB's `update()` method. The function may
 * be asynchronous, so it may return a Promise, or simply the value to use. If
 * it returns undefined, or the Promise it returns yields undefined, the
 * update() method that invoked the callback will abort the update.
 * @template UpdateDocType Type of document to update.
 */
export type UpdateCallbackFunction<UpdateDocType extends Document> = (
  doc: (UpdateDocType & Existing) | undefined,
) => PromiseOrValue<UpdateDocType | undefined>;

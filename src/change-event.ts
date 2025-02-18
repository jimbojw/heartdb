/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Custom ChangeEvent.
 */

import { Document } from "./types";

/**
 * ChangeEvent is a subclass of the native `CustomEvent` for wrapping PouchDB
 * changes responses.
 */
export class ChangeEvent<
  DocType extends Document = Document,
> extends CustomEvent<PouchDB.Core.ChangesResponseChange<DocType>> {
  constructor(change: PouchDB.Core.ChangesResponseChange<DocType>) {
    super("change", { detail: change });
  }
}

/**
 * ChangeEventListener is a type alias for functions that listen for changes.
 */
export type ChangeEventListener<DocType extends Document> = (
  changeEvent: ChangeEvent<DocType>,
) => void;

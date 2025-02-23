/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Custom Events and related types.
 */

import { Docs, Document, Existing } from "./types";

/**
 * Since our change queries always include docs, we extend the
 * ChangesResponseChange type here to make doc mandatory.
 */
export type ChangesResponseChange<DocType extends Document = Document> =
  PouchDB.Core.ChangesResponseChange<DocType> & {
    doc: PouchDB.Core.ExistingDocument<DocType & PouchDB.Core.ChangesMeta>;
  };

/**
 * ChangeEvent is a subclass of the native `CustomEvent` for wrapping PouchDB
 * changes responses.
 */
export class ChangeEvent<
  DocType extends Document = Document,
> extends CustomEvent<ChangesResponseChange<DocType>> {
  constructor(change: ChangesResponseChange<DocType>) {
    super("change", { detail: change });
  }
}

/**
 * ChangeEventListener is a type alias for functions that listen for changes.
 */
export type ChangeEventListener<DocType extends Document> = (
  changeEvent: ChangeEvent<DocType>,
) => void;

/**
 * Event dispatched by a LiveQuery when documents enter the result set.
 */
export class EnterEvent<LiveQueryDocType extends Document> extends CustomEvent<
  Docs<LiveQueryDocType>
> {
  constructor(detail: Docs<LiveQueryDocType>) {
    super("enter", { detail });
  }
}

/**
 * Listener for enter events.
 */
export type EnterEventListener<DocType extends Document> = (
  enterEvent: EnterEvent<DocType>,
) => void;

/**
 * Event dispatched by a LiveQuery when documents are updated.
 */
export class UpdateEvent<LiveQueryDocType extends Document> extends CustomEvent<
  Docs<LiveQueryDocType>
> {
  constructor(detail: Docs<LiveQueryDocType>) {
    super("update", { detail });
  }
}

/**
 * Listener for update events.
 */
export type UpdateEventListener<DocType extends Document> = (
  updateEvent: UpdateEvent<DocType>,
) => void;

/**
 * Event dispatched by a LiveQuery when documents leave the result set.
 */
export class ExitEvent<LiveQueryDocType extends Document> extends CustomEvent<
  Docs<LiveQueryDocType>
> {
  constructor(detail: Docs<LiveQueryDocType>) {
    super("exit", { detail });
  }
}

/**
 * Listener for exit events.
 */
export type ExitEventListener<DocType extends Document> = (
  exitEvent: ExitEvent<DocType>,
) => void;

/**
 * Event dispatched by a LiveQuery after any change occurs.
 */
export class AfterChangeEvent<
  LiveQueryDocType extends Document,
> extends CustomEvent<Docs<LiveQueryDocType>> {
  constructor(detail: Docs<LiveQueryDocType>) {
    super("afterchange", { detail });
  }
}

/**
 * Listener for afterchange events.
 */
export type AfterChangeEventListener<DocType extends Document> = (
  afterChangeEvent: AfterChangeEvent<DocType>,
) => void;

/**
 * Event dispatched by a LiveDoc when its doc is set.
 */
export class SetEvent<LiveDocType extends Document> extends CustomEvent<
  (LiveDocType & Existing) | undefined
> {
  constructor(detail: (LiveDocType & Existing) | undefined) {
    super("set", { detail });
  }
}

/**
 * Listener for SetEvents.
 */
export type SetEventListener<DocType extends Document> = (
  setEvent: SetEvent<DocType>,
) => void;

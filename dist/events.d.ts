/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Custom Events and related types.
 */
import { Docs, Document } from "./types";
/**
 * Since our change queries always include docs, we extend the
 * ChangesResponseChange type here to make doc mandatory.
 */
export type ChangesResponseChange<DocType extends Document = Document> = PouchDB.Core.ChangesResponseChange<DocType> & {
    doc: PouchDB.Core.ExistingDocument<DocType & PouchDB.Core.ChangesMeta>;
};
/**
 * ChangeEvent is a subclass of the native `CustomEvent` for wrapping PouchDB
 * changes responses.
 */
export declare class ChangeEvent<DocType extends Document = Document> extends CustomEvent<ChangesResponseChange<DocType>> {
    constructor(change: ChangesResponseChange<DocType>);
}
/**
 * ChangeEventListener is a type alias for functions that listen for changes.
 */
export type ChangeEventListener<DocType extends Document> = (changeEvent: ChangeEvent<DocType>) => void;
/**
 * Event dispatched by a subscription when documents enter the result set.
 */
export declare class EnterEvent<SubscriptionDocType extends Document> extends CustomEvent<Docs<SubscriptionDocType>> {
    constructor(detail: Docs<SubscriptionDocType>);
}
/**
 * Listener for enter events.
 */
export type EnterEventListener<DocType extends Document> = (enterEvent: EnterEvent<DocType>) => void;
/**
 * Event dispatched by a subscription when documents are updated.
 */
export declare class UpdateEvent<SubscriptionDocType extends Document> extends CustomEvent<Docs<SubscriptionDocType>> {
    constructor(detail: Docs<SubscriptionDocType>);
}
/**
 * Listener for update events.
 */
export type UpdateEventListener<DocType extends Document> = (updateEvent: UpdateEvent<DocType>) => void;
/**
 * Event dispatched by a subscription when documents leave the result set.
 */
export declare class ExitEvent<SubscriptionDocType extends Document> extends CustomEvent<Docs<SubscriptionDocType>> {
    constructor(detail: Docs<SubscriptionDocType>);
}
/**
 * Listener for exit events.
 */
export type ExitEventListener<DocType extends Document> = (exitEvent: ExitEvent<DocType>) => void;
/**
 * Event dispatched by a subscription after any change occurs.
 */
export declare class AfterChangeEvent<SubscriptionDocType extends Document> extends CustomEvent<Docs<SubscriptionDocType>> {
    constructor(detail: Docs<SubscriptionDocType>);
}
/**
 * Listener for afterchange events.
 */
export type AfterChangeEventListener<DocType extends Document> = (afterChangeEvent: AfterChangeEvent<DocType>) => void;

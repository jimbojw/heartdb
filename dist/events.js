/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * ChangeEvent is a subclass of the native `CustomEvent` for wrapping PouchDB
 * changes responses.
 */
export class ChangeEvent extends CustomEvent {
    constructor(change) {
        super("change", { detail: change });
    }
}
/**
 * Event dispatched by a subscription when documents enter the result set.
 */
export class EnterEvent extends CustomEvent {
    constructor(detail) {
        super("enter", { detail });
    }
}
/**
 * Event dispatched by a subscription when documents are updated.
 */
export class UpdateEvent extends CustomEvent {
    constructor(detail) {
        super("update", { detail });
    }
}
/**
 * Event dispatched by a subscription when documents leave the result set.
 */
export class ExitEvent extends CustomEvent {
    constructor(detail) {
        super("exit", { detail });
    }
}
/**
 * Event dispatched by a subscription after any change occurs.
 */
export class AfterChangeEvent extends CustomEvent {
    constructor(detail) {
        super("afterchange", { detail });
    }
}

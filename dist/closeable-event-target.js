/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview CloseableEventTarget class.
 */
/**
 * A CloseableEventTarget is an EventTarget that can be closed.
 *
 * @emits close When the event target is closed.
 */
export class CloseableEventTarget extends EventTarget {
    constructor() {
        super(...arguments);
        /**
         * Whether the event target is closed.
         */
        this.closed = false;
        /**
         * Event listeners by event type.
         */
        this.listeners = new Map();
    }
    /**
     * @param type Event type.
     * @param callback EventListener callback.
     * @returns Disconnect callback function.
     * @throws {Error} If the event target is closed.
     * @throws {Error} If the callback is null.
     * @throws {Error} If the listener is already added.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
     */
    addEventListener(type, callback) {
        if (this.closed) {
            throw new Error("Event target is closed.");
        }
        let listeners = this.listeners.get(type);
        if (listeners === null || listeners === void 0 ? void 0 : listeners.has(callback)) {
            throw new Error("Listener already added.");
        }
        if (!listeners) {
            listeners = new Set();
            this.listeners.set(type, listeners);
        }
        listeners.add(callback);
        super.addEventListener(type, callback);
        return () => {
            this.removeEventListener(type, callback);
        };
    }
    /**
     * @param type Event type.
     * @param callback Event listener callback function.
     * @throws {Error} If the event target is closed.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener
     */
    removeEventListener(type, callback) {
        if (this.closed) {
            throw new Error("Event target is closed.");
        }
        const listeners = this.listeners.get(type);
        if (!listeners || !listeners.has(callback)) {
            return;
        }
        listeners.delete(callback);
        if (listeners.size === 0) {
            this.listeners.delete(type);
        }
        super.removeEventListener(type, callback);
    }
    /**
     * Remove all previously added event listeners.
     */
    removeAllEventListeners() {
        for (const [type, listeners] of this.listeners) {
            for (const listener of listeners) {
                this.removeEventListener(type, listener);
            }
        }
    }
    /**
     * Close the event target by removing all event listeners and preventing
     * further listeners from being added.
     */
    close() {
        if (!this.closed) {
            this.dispatchEvent(new Event("close"));
            this.removeAllEventListeners();
            this.closed = true;
        }
    }
}

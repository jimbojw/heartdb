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
export declare class CloseableEventTarget extends EventTarget {
    /**
     * Whether the event target is closed.
     */
    closed: boolean;
    /**
     * Event listeners by event type.
     */
    readonly listeners: Map<string, Set<EventListener>>;
    /**
     * @param type Event type.
     * @param callback EventListener callback.
     * @returns Disconnect callback function.
     * @throws {Error} If the event target is closed.
     * @throws {Error} If the callback is null.
     * @throws {Error} If the listener is already added.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
     */
    addEventListener<EventType extends Event>(type: string, callback: (event: EventType) => void): () => void;
    /**
     * @param type Event type.
     * @param callback Event listener callback function.
     * @throws {Error} If the event target is closed.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener
     */
    removeEventListener(type: string, callback: EventListener): void;
    /**
     * Remove all previously added event listeners.
     */
    removeAllEventListeners(): void;
    /**
     * Close the event target by removing all event listeners and preventing
     * further listeners from being added.
     */
    close(): void;
    /**
     * Register an event listener for close events.
     * @param callback Event listener callback function.
     */
    onClose(callback: EventListener): () => void;
}

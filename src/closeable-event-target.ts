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
  /**
   * Whether the event target is closed.
   */
  closed = false;

  /**
   * Event listeners by event type.
   */
  readonly listeners = new Map<string, Set<EventListener>>();

  /**
   * @param type Event type.
   * @param callback EventListener callback.
   * @returns Disconnect callback function.
   * @throws {Error} If the event target is closed.
   * @throws {Error} If the callback is null.
   * @throws {Error} If the listener is already added.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener
   */
  override addEventListener<EventType extends Event>(
    type: string,
    callback: (event: EventType) => void,
  ): () => void {
    if (this.closed) {
      throw new Error("Event target is closed.");
    }
    let listeners = this.listeners.get(type);
    if (listeners?.has(callback as EventListener)) {
      throw new Error("Listener already added.");
    }
    if (!listeners) {
      listeners = new Set();
      this.listeners.set(type, listeners);
    }
    listeners.add(callback as EventListener);
    super.addEventListener(type, callback as EventListener);
    return () => {
      this.removeEventListener(type, callback as EventListener);
    };
  }

  /**
   * @param type Event type.
   * @param callback Event listener callback function.
   * @throws {Error} If the event target is closed.
   * @see https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/removeEventListener
   */
  override removeEventListener(type: string, callback: EventListener): void {
    if (this.closed) {
      throw new Error("Event target is closed.");
    }
    const listeners = this.listeners.get(type);
    if (!listeners || !listeners.has(callback as EventListener)) {
      return;
    }
    listeners.delete(callback as EventListener);
    if (listeners.size === 0) {
      this.listeners.delete(type);
    }
    super.removeEventListener(type, callback);
  }

  /**
   * Remove all previously added event listeners.
   */
  removeAllEventListeners(): void {
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
  close(): void {
    if (!this.closed) {
      this.dispatchEvent(new Event("close"));
      this.removeAllEventListeners();
      this.closed = true;
    }
  }

  /**
   * Register an event listener for close events.
   * @param callback Event listener callback function.
   */
  onClose(callback: EventListener): () => void {
    return this.addEventListener("close", callback);
  }
}

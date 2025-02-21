/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview LitSignal class.
 */

// External dependencies.
import { Signal } from "@lit-labs/signals";

// Internal dependencies.
import { Subscription } from "./subscription";
import { Docs, Document } from "./types";

/**
 * LitSignal is a wrapper around a HeartDB Subscription that provides a
 * computed signal for reacting to changes in subscription result values.
 */
export class LitSignal<
  SubscriptionDocType extends Document = Document,
> extends Signal.Computed<Docs<SubscriptionDocType>> {
  /**
   * When listening for Subscription events, this is the disconnect callback.
   */
  private disconnect?: () => void;

  /**
   * Internal signal updated by afterChange events on the subscription.
   */
  private readonly valueSignal = new Signal.State<Docs<SubscriptionDocType>>(
    {},
  );

  /**
   *
   * @param subscription HeartDB Subscription to wrap.
   */
  constructor(readonly subscription: Subscription<SubscriptionDocType>) {
    super(() => this.valueSignal.get());
    this.disconnect = subscription.onAfterChange((afterChangeEvent) => {
      this.valueSignal.set({ ...afterChangeEvent.detail });
    });
  }

  /**
   * Disconnect subscription afterChange event listener.
   */
  close(): void {
    this.disconnect?.();
    this.disconnect = undefined;
  }
}

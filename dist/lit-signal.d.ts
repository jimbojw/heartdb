/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview LitSignal class.
 */
import { Signal } from "@lit-labs/signals";
import { Subscription } from "./subscription";
import { Docs, Document } from "./types";
/**
 * LitSignal is a wrapper around a HeartDB Subscription that provides a
 * computed signal for reacting to changes in subscription result values.
 *
 * Usage consists of three steps: setup, rendering, and cleanup.
 *
 * To set up a LitSignal, create a new Subscription and pass it to the
 * LitSignal constructor. If the Subscription already has docs, those will be
 * used to populate the initial signal value.
 *
 * ```
 *   // Create subscription. Initially disconnected.
 *   const subscription = new Subscription(heartDb);
 *
 *   // Create LitSignal from subscription.
 *   const litSignal = new LitSignal(subscription);
 *
 *   // Set subscription query.
 *   await subscription.setQuery({
 *    selector: { type: "thing" },
 *   });
 * ```
 *
 * To render the LitSignal value in a LitElement's render() method, use its
 * `get()` method to retriev the set of docs, then perform regular LitElement
 * rendering steps.
 *
 * ```
 *   // Render the LitSignal value in a LitElement's render() method.
 *   render() {
 *     const docs = Object.values(litSignal.get());
 *     return docs.map((doc) => html`<p>${doc._id}: ${doc.type}</p>`);
 *   }
 * ```
 *
 * To clean up resources related to the LitSignal, call its `close()` method.
 *
 * ```
 *   // Close the signal to stop listening for events.
 *   litSignal.close();
 *
 *   // Stop subscription from following the query by setting it to undefined.
 *   await subscription.setQuery(undefined);
 * ```
 *
 * Note that in a LitElement context, the time to clean up is in the
 * `disconnectedCallback()`. However, once closed, the LitSignal will no longer
 * update. So in the `connectedCallback()` you'll need to recreate the signal.
 * Generally this means that an `@state()` member is the appropraite way to
 * store the signal on the element.
 *
 * @template DocType Type of document in the HeartDB.
 * @template SubscriptionDocType Type of document in the Subscription.
 */
export declare class LitSignal<DocType extends Document = Document, SubscriptionDocType extends DocType = DocType> extends Signal.Computed<Docs<SubscriptionDocType>> {
    readonly subscription: Subscription<DocType, SubscriptionDocType>;
    /**
     * When listening for Subscription events, this is the disconnect callback.
     */
    private disconnect?;
    /**
     * Internal signal updated by afterChange events on the subscription.
     */
    private readonly valueSignal;
    /**
     * @param subscription HeartDB Subscription to wrap.
     */
    constructor(subscription: Subscription<DocType, SubscriptionDocType>);
    /**
     * Disconnect subscription afterChange event listener.
     */
    close(): void;
}

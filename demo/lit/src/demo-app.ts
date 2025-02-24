/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview HeartDB Lit demo application element.
 */

// External dependencies.
import { provide } from "@lit/context";
import { LitElement, css, html } from "lit";
import { customElement } from "lit/decorators.js";

// Internal dependencies.
import { appContext, makeAppContext } from "./app-context";

declare global {
  interface HTMLElementTagNameMap {
    "hdb-demo-app": DemoAppElement;
  }
}

/**
 * HeartDB Lit demo application element.
 *
 * @slot - This element has a slot
 * @csspart button - The button
 */
@customElement("hdb-demo-app")
export class DemoAppElement extends LitElement {
  @provide({ context: appContext })
  readonly appContext = makeAppContext();

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      margin: 0 auto;
      max-width: 800px;
    }
  `;

  render() {
    return html` <h1>HeartDB Lit Demo App</h1> `;
  }
}

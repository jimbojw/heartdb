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

// Internal elements.
import "./create-task-form";
import "./task-list";

declare global {
  interface HTMLElementTagNameMap {
    "hdb-demo-app": DemoAppElement;
  }
}

/**
 * HeartDB Lit demo application element.
 */
@customElement("hdb-demo-app")
export class DemoAppElement extends LitElement {
  @provide({ context: appContext })
  readonly appContext = makeAppContext();

  static styles = css`
    :host {
      margin: 0 auto;
      max-width: 800px;
    }

    button {
      cursor: pointer;
    }
  `;

  render() {
    const handleReset = () => {
      this.appContext.heartDb.pouchDb.destroy();
      window.location.reload();
    };

    return html`
      <h1>HeartDB Lit Demo App</h1>
      <main>
        <p>
          Simple task manager application using HeartDB for reactive, persistent
          storage.
        </p>
        <section>
          <h2>Create a new task</h2>
          <hdb-create-task-form></hdb-create-task-form>
        </section>
        <section>
          <h2>List of open Tasks</h2>
          <hdb-task-list status="open"></hdb-task-list>
        </section>
        <section>
          <h2>List of closed Tasks</h2>
          <hdb-task-list status="closed"></hdb-task-list>
        </section>
        <section>
          <h2>Reset</h2>
          <button @click=${handleReset}>Destroy PouchDB and reload</button>
        </section>
      </main>
    `;
  }
}

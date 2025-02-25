/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Create task form.
 */

// External dependencies.
import { consume } from "@lit/context";
import { LitElement, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";

// Internal dependencies.
import { AppContext, appContext } from "./app-context";

declare global {
  interface HTMLElementTagNameMap {
    "hdb-create-task-form": CreateTaskFormElement;
  }
}

/**
 * Create a new task.
 */
@customElement("hdb-create-task-form")
export class CreateTaskFormElement extends LitElement {
  @consume({ context: appContext })
  @property({ attribute: false })
  appContext!: AppContext;

  @query("input")
  private input!: HTMLInputElement;

  render() {
    const handleSumbit = (event: Event) => {
      event.preventDefault();
      if (this.input.value) {
        this.appContext.heartDb.put({
          _id: `task:${Date.now()}`,
          type: "task",
          description: this.input.value,
          status: "open",
        });
      }
      this.input.value = "";
    };

    return html`
      <form @submit=${handleSumbit}>
        <p>
          <label><span>Description:</span> <input type="text" /></label>
          <button type="submit">Create task</button>
        </p>
      </form>
    `;
  }
}

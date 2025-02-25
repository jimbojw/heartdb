/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Display a list of tasks based on status.
 */

// External dependencies.
import { consume } from "@lit/context";
import { Existing } from "heartdb";
import { LitElement, PropertyValues, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";

// Internal dependencies.
import { AppContext, appContext } from "./app-context";
import { LiveQueryController } from "./live-query-controller";
import { Task } from "./types";

declare global {
  interface HTMLElementTagNameMap {
    "hdb-task-list": TaskListElement;
  }
}

/**
 * List of tasks by status.
 */
@customElement("hdb-task-list")
export class TaskListElement extends LitElement {
  @consume({ context: appContext })
  @property({ attribute: false })
  appContext?: AppContext;

  @property({ type: String })
  status: Task["status"] = "open";

  /**
   * Reactive controller for managing a HeartDB LiveQuery.
   */
  private taskQuery = new LiveQueryController<Task>(this);

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
    }

    li {
      align-items: center;
      cursor: pointer;
      display: flex;
      flex-direction: row;
      gap: 1em;
      padding: 0.25em;
      transition: background-color 200ms;

      &:hover {
        background-color: rgba(0, 0, 0, 0.1);
      }
    }
  `;

  protected willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);

    if (changedProperties.has("status")) {
      this.taskQuery.setQuery({
        selector: {
          status: this.status,
          type: "task",
        },
      });
    }

    if (changedProperties.has("appContext")) {
      this.taskQuery.setHeartDb(this.appContext?.heartDb);
    }
  }

  render() {
    const tasks: Task[] = Object.values(this.taskQuery.getDocs() ?? {});

    if (!tasks.length) {
      return html` <p><em>No ${this.status} tasks found.</em></p> `;
    }

    return html`
      <ul>
        ${tasks.map((task) => this.taskTemplate(task))}
      </ul>
    `;
  }

  taskTemplate(task: Task & Existing) {
    const handleClick = () => {
      this.appContext?.heartDb?.put({
        ...task,
        status: task.status === "open" ? "closed" : "open",
      });
    };

    return html`
      <li @click=${handleClick}>
        <span>${task.status === "open" ? "○" : "✔"}</span>
        <span>${task.description}</span>
      </li>
    `;
  }
}

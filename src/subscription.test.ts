/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Jest tests for Subscription.
 */

// External dependencies.
import PouchDB from "pouchdb";
import PouchDBPluginAdapterMemory from "pouchdb-adapter-memory";

// Internal dependencies.
import { HeartDB } from "./heartdb";
import { Subscription } from "./subscription";
import { Document } from "./types";

// Register memory adapter.
PouchDB.plugin(PouchDBPluginAdapterMemory);

interface TestDoc extends Document {
  testField: string;
}

describe("Subscription", () => {
  it("should be a constructor function", () => {
    expect(Subscription).toBeInstanceOf(Function);
  });

  describe("constructor", () => {
    it("should create a new Subscription instance", () => {
      const subscription = new Subscription({} as unknown as HeartDB);
      expect(subscription).toBeDefined();
    });
  });

  describe("integration tests", () => {
    let heartDb: HeartDB<TestDoc>;

    beforeEach(async () => {
      heartDb = new HeartDB(
        new PouchDB<TestDoc>("TEST_DB", { adapter: "memory" }),
      );

      for (let index = 0; index < 100; index++) {
        await heartDb.pouchDb.put({
          _id: `TEST_DOC_${`${index}`.padStart(4, "0")}`,
          testField: `test value ${index}`,
        });
      }
    });

    afterEach(() => {
      heartDb.close();
    });

    describe("setQuery", () => {
      it("should find matching docs", (done) => {
        const subscription = new Subscription(heartDb);
        expect(subscription.query).toBeUndefined();

        let disconnect: undefined | (() => void) = undefined;

        disconnect = subscription.onEnter((enterEvent) => {
          if (!disconnect) {
            throw new Error('Unexpected second "enter" event');
          }

          disconnect();
          disconnect = undefined;

          const docs = enterEvent.detail;

          expect(Object.keys(docs).length).toBe(10);

          for (let index = 10; index < 20; index++) {
            const doc = docs[`TEST_DOC_${`${index}`.padStart(4, "0")}`];
            expect(doc).toBeDefined();
          }

          done();
        });

        subscription.setQuery({
          selector: {
            _id: {
              $gte: "TEST_DOC_0010",
              $lt: "TEST_DOC_0020",
            },
          },
        });
      });
    });
  });
});

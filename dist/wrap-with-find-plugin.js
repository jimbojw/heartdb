/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview Wrapper to ensure that a PouchDB instance has pouchdb-find.
 */
// External dependencies.
import PouchDBFindPlugin from "pouchdb-find";
/**
 * Given a PouchDB instance that may or may not have pouchdb-find plugin
 * capability, return an object which does have these methods.
 * @param pouchDb PouchDB instance to potentially wrap.
 * @returns The provided instance, or a new instance with the find plugin.
 */
export function wrapWithFindPlugin(pouchDb) {
    // If the provided PouchDB instance already has the find method, then there's
    // nothing to do and we can just return it.
    if (typeof pouchDb.find === "function") {
        return pouchDb;
    }
    // Use low-level JavaScript inheritance to create a prototype chain. The
    // synthetic PouchDBWithFindPlugin "class" has the methods from the
    // pouchdb-find library, but inherits from the passed in PouchDB instance.
    const PouchDBWithFindPlugin = Object.assign({}, PouchDBFindPlugin);
    Object.setPrototypeOf(PouchDBWithFindPlugin, pouchDb);
    // Then we return a new object that inherits from the synthetic class. This
    // may be unnecessary, but it ensures that methods like "find" are not on the
    // object itself and so would not satisfy `Object.hasOwnProperty()` checks.
    return Object.create(PouchDBWithFindPlugin);
}

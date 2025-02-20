/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
import { Document } from "./types";
/**
 * Given a PouchDB instance that may or may not have pouchdb-find plugin
 * capability, return an object which does have these methods.
 * @param pouchDb PouchDB instance to potentially wrap.
 * @returns The provided instance, or a new instance with the find plugin.
 */
export declare function wrapWithFindPlugin<DocType extends Document>(pouchDb: PouchDB.Database<DocType>): PouchDB.Database<DocType>;

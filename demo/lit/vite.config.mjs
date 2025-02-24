/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Vite configuration.
 */

// @ts-check

export default {
  build: {
    rollupOptions: {
      // @see https://github.com/vitejs/vite/discussions/2400#discussioncomment-435489
      optimizeDeps: {
        allowNodeBuiltins: ["pouchdb-browser", "pouchdb-utils"],
      },
    },
  },
};

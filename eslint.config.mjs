/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview ESLint configuration.
 */

// @ts-check

import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    files: ["**/*.ts", "**/*.mjs", "**/*.js"],
  },
  {
    ignores: ["dist"],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettier,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "error",
    },
  },
);

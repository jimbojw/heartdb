/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview ESLint configuration.
 */

// @ts-check

import eslint from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import licenseHeader from "eslint-plugin-license-header";
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
  // @ts-expect-error Prettier config contains legacy string rules.
  eslintConfigPrettier,
  {
    plugins: {
      prettier: prettierPlugin,
      "license-header": licenseHeader,
    },
    rules: {
      "prettier/prettier": "error",
      "license-header/header": [
        "error",
        ["/**", " * @license SPDX-License-Identifier: Apache-2.0", " */"],
      ],
    },
  },
);

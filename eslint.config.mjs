/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
/**
 * @fileoverview ESLint configuration.
 */

// @ts-check

import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended
);

/**
 * @license SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview semantic-release configuration.
 */

// @ts-check

/**
 * @see https://semantic-release.gitbook.io/semantic-release/usage/configuration
 */
export default {
  branches: ["main"],
  plugins: [
    ["@semantic-release/commit-analyzer"],
    ["@semantic-release/release-notes-generator"],
    [
      "@semantic-release/changelog",
      {
        changelogFile: "CHANGELOG.md",
      },
    ],
    ["@semantic-release/npm"],
    [
      "@semantic-release/git",
      {
        assets: [
          "CHANGELOG.md",
          "dist/**",
          "package.json",
          "package-lock.json",
        ],
        message:
          "chore(release): Set `package.json` to ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}",
      },
    ],
    ["@semantic-release/github"],
  ],
};

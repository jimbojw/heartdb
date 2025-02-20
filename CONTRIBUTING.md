# How to contribute

We'd love to accept your patches and contributions to this project.

## Contribution process

This section describes how to set up your environment and perform code checks
and tests.

### Environment

HeartDB is a library written in TypeScript and released through npm.

You'll need Node.js installed locally. Then download dependencies:

```sh
npm clean-install
```

After this, you'll be able to run `npm` commands.

We recommend using [Visual Studio Code](https://code.visualstudio.com/) for
development.

### Testing

Tests for this library use [vitest](https://vitest.dev/). To run unit tests:

- `npm test` - Single run of vitest suitable for CI.
- `npm run test:dev` - Continuous vitest run, watching files for changes.

### License: Apache 2.0

Source code for this library is released under the [Apache 2.0
license](https://spdx.org/licenses/Apache-2.0.html). Each source code file MUST
start with an [SPDX](https://spdx.dev/) license header at the top of the file
like this:

```js
/**
 * @license SPDX-License-Identifier: Apache-2.0
 */
```

To check whether all source files have such a header, you can run:

```sh
npm run lint
```

The full text of the Apache-2.0 license is available in the accompanying
`LICENSE` file.

### Linting

This project uses [ESLint](https://eslint.org/) and
[Prettier](https://prettier.io/) to enforce code style. To run the linter:

```sh
npm run lint
```

The output will tell you if there are any errors or files missing the license
header. If there are no lint errors, the command will produce no output. To
automatically fix errors, including adding license headers, you can run:

```sh
npm run lint -- --fix
```

If you are using Visual Stuido Code with the official [Microsoft ESLint
extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint),
files will be automatically checked as you edit them.

### Commit messages

Commits to this codebase should follow the [conventional
commits](https://www.conventionalcommits.org/en/v1.0.0/) format:

```
<type>[<scope>]: <short summary>
  │       │             │
  │       │             └─⫸ Summary in present tense. Not capitalized. No period at the end.
  │       │
  │       └─⫸ Commit Scope: optional short phrase of scope
  │
  └─⫸ Commit Type: build|ci|docs|feat|fix|perf|refactor|test

[optional body]

[optional footer(s)]
```

The `<type>` should be one of the types specified by the [Angular Commit Message
Format](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#-commit-message-format):

- `build`: Changes that affect the build system or external dependencies.
- `ci`: Changes to our CI configuration files and scripts (semantic-release, GitHub Actions).
- `docs`: Documentation only changes.
- `feat`: A new feature.
- `fix`: A bug fix.
- `perf`: A code change that improves performance.
- `refactor`: A code change that neither fixes a bug nor adds a feature.
- `test`: Adding missing tests or correcting existing tests.

The `<description>` should be a sentence describing the change (capitalized
first word, trailing punctuation).

For example, if you fixed a bug in the way `reaction events are handled`, your
commit message might look like this:

```sh
git commit -m "fix: Correct reaction event handling."
```

Our release process uses these commit messages to determine the next version
number and to automatically generate the release `CHANGELOG.md` file. So it's
important that your commit messages are clear and meaningful.

## GitHub Actions

There are two GitHub workflows defined in this project:

- [`.github/workflows/dev_workflow.yaml`](.github/workflows/dev_workflow.yaml) -
  Triggered for every pushed commit to a non-`main` branch.
- [`.github/workflows/release_workflow.yaml`](.github/workflows/release_workflow.yaml) -
  Tiggered on every merge into the `main` branch.

Both workflows will lint the code, run tests, and perform a build. As you're
working on a feature branch, pushing to GitHub will trigger the dev workflow
which will surface any errors.

Merging into `main` indicates intent to release and triggers the release
workflow as described in the next section..

## Releasing

New releases are made by merging the a development branch into `main`. Once
merged, GitHub will initiate the release workflow.

Secret variables used for release:

- `GH_TOKEN` - GitHub
  [personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
  with permissions as specified in semantic-release's [minimum required
  permissions](https://github.com/semantic-release/github?tab=readme-ov-file#github-authentication).
- `NPM_TOKEN` - npmjs.com
  [access token](https://docs.npmjs.com/about-access-tokens) that allows writing
  to the [`heartdb` npm package](https://www.npmjs.com/package/heartdb).

After regular linting, testing and building, the release workflow uses
[semantic-release](https://github.com/semantic-release/semantic-release) to push
updates to GitHub and npm. The config file for relasing is:
[`.release.json`](.release.json).

The semantic-release configuration uses
[@semantic-release/commit-analyzer](https://github.com/semantic-release/commit-analyzer)
to review commit messages, which are assumed to be formatted according to
[convensional commits](https://www.conventionalcommits.org/en/v1.0.0/). Commit
messages determine how semantic version numbers change from release to release.

The semantic-release flow also closes GitHub bugs, makes a GitHub
release, and adds labels to pull requests on GitHub.

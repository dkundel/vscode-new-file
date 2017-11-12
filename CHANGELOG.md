# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

## [4.0.0] - 2017-11-12
### Changed
- Move to using the new multi-folder workspace API instead `workspace.rootPath`

### Removed
- Fully removed support for `extension.newFile` command

## [3.2.2] - 2017-11-04
### Changed
- Fixed "Cannot read property 'message' of undefined" prompt. Thanks @Telokis [#31](https://github.com/dkundel/vscode-new-file/issues/31)
- Using correct path separator for Windows. Thanks @Telokis [#32](https://github.com/dkundel/vscode-new-file/issues/32)

## [3.2.1] - 2017-10-22
### Changed
- Fixed unnecessary deprecation warning. Thanks @davidkpiano [#30](https://github.com/dkundel/vscode-new-file/pull/30)

## [3.2.0] - 2017-10-21
### Added
- Added TSLint, Prettier and linting rules to the project for easier contributing
- Added new contributors to README

### Changed
- New File dialog now selects on the filename by default. Thanks @thechriswalker [#27](https://github.com/dkundel/vscode-new-file/pull/27)
- Deprecation message for `showFullPath` shows now correctly. Thanks @Telokis [#28](https://github.com/dkundel/vscode-new-file/pull/28)

## [3.1.1] - 2017-07-17
### Changed
- Fixed wrong setting name in package.json

## [3.1.0] - 2017-06-19
### Added
- Added new option to expand braces notation for multi-file creation

## [3.0.2] - 2017-05-18
### Changed
- Added missing description to `newFile.showPathRelativeTo`

## [3.0.1] - 2017-05-18
### Changed
- Typo in README

## [3.0.0] - 2017-05-18
### Added
- Added CHANGELOG.md
- New option to create files through explorer menu
- Feature to use `./` in a `./path/to/file.js` to create a file relative to the current regardless of settings
- Added new setting `newFile.showPathRelativeTo` in replacement of `newFile.showAbsolutePath`
- Added yarn support
- Added mocha for testing
- Added CI

### Changed
- Minimum VS Code version to 1.0.0
- Split extension code into two files
- Refactor some functions for easier extension
- Updated TypeScript version from 1.8 to 2.3
- Switched default Mac keybinding back to <kbd>cmd</kbd>+<kbd>alt</kbd>+<kbd>N</kbd> after VS Code fixed bug
- Change namespace for extension command from `extension` to `newFile`
- Deprecated `extension.createNewFile` in favor of `newFile.createNewFile`
- Deprecated `newFile.showAbsolutePath` setting in favor of `newFile.showPathRelativeTo`
- Modified config for `newFile.relativeTo` setting to only allow 'project', 'root', 'file' as valid values

## Removed
- `expect.js` dependency
- Reliance on `typings` in favor of `@types/`

## [2.1.0] - 2016-12-19
### Changed
- Fixed minor bug in determineRoot()

## [2.0.0] - 2016-12-13

MISSING CHANGELOG

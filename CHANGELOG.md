# Change Log
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/)
and this project adheres to [Semantic Versioning](http://semver.org/).

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

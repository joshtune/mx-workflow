# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2026-02-28

### Fixed

- Replace non-standard "ultrathink" language with clear instructions in check-ignores command (EIT-26)
- Standardize `.agents/` output directory naming to all-lowercase-hyphenated format (EIT-34)

### Changed

- Document output directory convention in CLAUDE.md

## [1.0.0] - 2026-02-27

### Added

- 15 slash commands for the full dev lifecycle: ticket intake, planning, implementation, quality checks, conventional commits, MR creation, batch AI implementation, and multi-agent team builds
- 6 specialized agents for code review, testing, debugging, and analysis
- Plugin manifest (`plugin.json`) and marketplace configuration
- CLAUDE.md with project development guidelines
- Scope mappings and agent browser references

[Unreleased]: https://github.com/joshtune/mx-workflow/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/joshtune/mx-workflow/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/joshtune/mx-workflow/releases/tag/v1.0.0

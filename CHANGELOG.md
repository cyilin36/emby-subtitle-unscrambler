# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Added a tag-driven GitHub Actions workflow that builds and publishes release
  assets automatically.

## [1.0.0] - 2026-10-20

### Added

- Initial public release.
- Converts direct SRT subtitle tracks to UTF-8 WebVTT in Emby Web.
- Supports UTF-8, UTF-16LE, and UTF-16BE subtitle decoding.
- Removes basic SRT display tags.
- Restores the original subtitle request when conversion fails.

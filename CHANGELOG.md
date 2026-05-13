# Changelog

All notable changes to `@sifix/agent` will be documented in this file.

## [1.6.0] - 2026-05-14

### Added
- Real transaction simulation hardening with better gas, transfer, and state-diff compatibility fields.
- Rule engine pipeline so deterministic security rules can raise final risk beyond AI-only output.
- Signature guard coverage for `permit`, typed-data, unlimited approval, risky domains, and suspicious contract patterns.
- 4byte selector lookup cache for richer signature classification.
- Contract allow/block registry hooks for stronger action protection policies.
- Vitest coverage for core signature-guard behavior.

### Changed
- Standardized package behavior around 0G Galileo Testnet (`chainId: 16602`).
- Improved merge strategy between AI analysis and deterministic rule results.
- Improved compatibility with SIFIX dApp runtime prediction tracking and action-protection pipeline.

### Packaging
- Added `prepublishOnly` build guard.
- Added explicit published files list for safer npm release contents.

## [1.5.0] - 2026-05-13

### Added
- Multi-provider AI security analysis SDK baseline for SIFIX.
- 0G Compute and 0G Storage integration paths.
- Threat-intel provider injection pattern.
- Agentic ID support and storage explorer metadata.

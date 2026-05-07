# Changelog

## [1.3.0] - 2026-05-07

### Fixed
- **0G Storage Integration**: Implemented robust fallback for unstable 0G testnet
  - Auto-fallback to working RPC endpoint (`evmrpc-testnet.0g.ai`)
  - Retry logic with exponential backoff (3 attempts, 2s/4s delays)
  - Enhanced mock mode with clear production notes
  
### Changed
- **Mock Mode**: Enhanced logging for demo/development clarity
  - Clear indication when mock mode is active
  - Deterministic hash generation for consistent testing
  - Production-ready fallback when 0G network is unstable

### Technical
- SDK: `@0glabs/0g-ts-sdk@0.2.9` (0.3.3 deprecated by upstream)
- RPC: Auto-detect and replace broken endpoints
- Storage: Graceful degradation to mock mode when network fails

### Known Issues
- 0G Storage testnet experiencing contract revert errors (`execution reverted`)
- SDK v0.3.3 marked as deprecated by npm
- Recommended: Use `mockMode: true` for demos until network stabilizes

## [1.2.1] - 2026-05-06

### Added
- Initial 0G Storage integration
- StorageClient with upload/retrieve capabilities
- Mock mode for development

## [1.0.0] - 2026-05-05

### Added
- Initial release
- Transaction simulation
- AI-powered risk analysis
- OpenAI integration

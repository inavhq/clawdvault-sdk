# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-02-05

### Added
- Comprehensive README documentation for SDK and CLI
- CONTRIBUTING.md with development guidelines
- Troubleshooting sections in all READMEs
- Error handling examples
- TypeScript usage examples

### Fixed
- Documentation inconsistencies between SDK and CLI
- Missing API method documentation

## [0.1.0] - 2026-02-01

### Added
- Initial release of `@clawdvault/sdk`
  - Full TypeScript client for ClawdVault API
  - Token listing, creation, and management
  - Trading operations (buy/sell on bonding curve)
  - Smart routing to Jupiter for graduated tokens
  - Wallet integration (KeypairSigner, PhantomSigner)
  - Chat and social features
  - File upload support

- Initial release of `@clawdvault/cli`
  - `tokens` - List and filter tokens
  - `token` - Get details, create, stats, holders
  - `trade` - Buy, sell, quote, history
  - `wallet` - Init, info, balance, address

### Technical
- Monorepo setup with npm workspaces
- TypeScript with full type definitions
- Support for both CommonJS and ESM

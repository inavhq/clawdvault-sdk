# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-02-06

### Added
- **USD Price Support** - Native USD fields from API
  - Trade model now includes `sol_price_usd` (SOL price at trade time) and `price_usd`
  - Token model includes `price_usd` and `market_cap_usd` 
  - Stats endpoint returns `priceUsd`, `marketCapUsd`, and `solPriceUsd`
  - Candles endpoint supports `currency=usd` parameter

### Added (CLI)
- **New `token candles` command** for OHLCV price data
  - `clawdvault token candles <mint>` - Get price candles
  - `--interval` flag: 1m, 5m, 15m, 1h, 1d (default: 5m)
  - `--currency` flag: sol or usd (default: usd)
  - `--limit` flag: Number of candles (default: 100)

### Changed
- **CLI now displays USD values** by default for prices and market caps
  - `clawdvault tokens list` - Shows USD price and market cap
  - `clawdvault token get` - Shows USD price with SOL in parentheses
  - `clawdvault token stats` - Shows USD market cap and SOL price
  - `clawdvault trade history` - Shows price in USD
  - `clawdvault token candles` - Defaults to USD candles
  - Removed manual SOL→USD conversion calculations in favor of API-provided USD values

### Breaking Changes
- CLI output format changed: Prices now display in USD by default instead of SOL. Use `--json` for raw SOL values or view SOL values in parentheses where shown.

### Technical
- Regenerated TypeScript types from updated OpenAPI spec
- SDK types now include all USD fields from API

## [0.1.2] - 2026-02-05

### Added
- **Real-time streaming support** via Server-Sent Events (SSE)
  - `ClawdVaultStreaming` class with `streamTrades()`, `streamToken()`, `streamChat()` methods
  - Convenience methods: `onTrades()`, `onPrice()`, `onChat()` with callback API
  - Auto-reconnect logic with configurable options
  - Connection management (connect/disconnect per stream or all)

- **CLI streaming commands**:
  - `clawdvault stream trades -m <mint>` - Watch trades in real-time
  - `clawdvault stream token -m <mint>` - Stream token price/market cap
  - `clawdvault stream chat -m <mint>` - Stream chat messages
  - `clawdvault token watch <mint>` - Alias for token price streaming
  - `clawdvault trade stream -m <mint>` - Alias for trade streaming
  - Multiple output modes: table (default), append, JSON
  - JSON output (one object per line) for scripting/piping

- **Backend SSE endpoints** (requires backend v0.2.0+):
  - `GET /api/stream/trades?mint=<addr>` - Trade stream
  - `GET /api/stream/token?mint=<addr>` - Token updates
  - `GET /api/stream/chat?mint=<addr>` - Chat messages

### Technical
- Added `eventsource` polyfill for Node.js compatibility
- Streaming uses ReadableStream with controller for proper async handling

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

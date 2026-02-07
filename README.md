# ClawdVault SDK & CLI

[![npm version](https://img.shields.io/npm/v/@clawdvault/sdk.svg)](https://www.npmjs.com/package/@clawdvault/sdk)
[![npm version](https://img.shields.io/npm/v/@clawdvault/cli.svg)](https://www.npmjs.com/package/@clawdvault/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript SDK and command-line interface for [ClawdVault](https://clawdvault.com) - a pump.fun-style token launchpad on Solana.

## Features

- 🚀 **Full TypeScript support** with complete type definitions
- 🔐 **Non-custodial** - your private key never leaves your device
- 💱 **Smart routing** - automatic bonding curve vs Jupiter DEX routing
- 🛠️ **CLI tool** - create tokens and trade from the command line
- 📦 **Monorepo** - SDK and CLI in separate packages

## Installation

```bash
# Install SDK
npm install @clawdvault/sdk

# Install CLI globally
npm install -g @clawdvault/cli
```

## Quick Start

### SDK Usage

```typescript
import { createClient, KeypairSigner } from '@clawdvault/sdk';

// Create client (no auth needed for read operations)
const client = createClient();

// List tokens
const { tokens } = await client.listTokens({ sort: 'market_cap', limit: 10 });

// Get token details (includes USD prices)
const { token, trades } = await client.getToken('TOKEN_MINT_ADDRESS');
console.log(token.price_usd);        // Price in USD
console.log(token.market_cap_usd);   // Market cap in USD

// Get candles in USD
const { candles } = await client.getCandles({
  mint: 'TOKEN_MINT_ADDRESS',
  interval: '5m',
  currency: 'usd'  // or 'sol'
});

// For trading, add a wallet signer
const signer = KeypairSigner.fromFile('/path/to/wallet.json');
// or from environment variable
const signer = KeypairSigner.fromEnv('SOLANA_PRIVATE_KEY');
// or directly from a private key string
const signer = new KeypairSigner('base58_private_key');

const client = createClient({ signer });
// or add later: client.setSigner(signer);

// Buy tokens (0.1 SOL)
const buyResult = await client.buy('TOKEN_MINT_ADDRESS', 0.1);

// Sell 50% of holdings
const sellResult = await client.sellPercent('TOKEN_MINT_ADDRESS', 50);

// Smart trade - auto-routes to Jupiter for graduated tokens
const smartBuy = await client.smartBuy('TOKEN_MINT_ADDRESS', 0.5);
```

### CLI Usage

```bash
# Initialize wallet
clawdvault wallet init

# List tokens (shows USD prices by default)
clawdvault tokens list

# Get token details
clawdvault token get <mint>

# Get price candles in USD
clawdvault token candles <mint> --currency usd

# Buy tokens (requires wallet)
clawdvault trade buy --mint <address> --sol 0.1

# Sell 50% of holdings
clawdvault trade sell --mint <address> --percent 50

# Create a new token
clawdvault token create --name "My Token" --symbol "MTK" --image ./logo.png

# Get quote without executing
clawdvault trade quote --mint <address> --type buy --amount 1
```

## Configuration

### Wallet Setup

The CLI looks for wallets in this order:

1. `--wallet` flag
2. `CLAWDVAULT_WALLET` environment variable
3. `~/.clawdvault/wallet.json`
4. `~/.config/solana/id.json` (Solana CLI default)

```bash
# Generate new wallet
clawdvault wallet init

# Use existing Solana wallet
export CLAWDVAULT_WALLET=~/.config/solana/id.json
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CLAWDVAULT_WALLET` | Path to wallet JSON file | `~/.clawdvault/wallet.json` |
| `SOLANA_PRIVATE_KEY` | Private key (base58 encoded) | - |
| `CLAWDVAULT_API_URL` | Custom API endpoint | `https://clawdvault.com/api` |
| `SOLANA_RPC_URL` | Solana RPC endpoint | Mainnet |

## SDK Reference

### Client Methods

#### Tokens

| Method | Description |
|--------|-------------|
| `listTokens(params)` | List all tokens with filtering |
| `getToken(mint)` | Get token details and recent trades |
| `getMetadata(mint)` | Get Metaplex metadata |
| `createToken(params)` | Create new token (requires signer) |

#### Trading

| Method | Description |
|--------|-------------|
| `getQuote(params)` | Get price quote |
| `buy(mint, sol, slippage?)` | Buy tokens on bonding curve |
| `sell(mint, tokens, slippage?)` | Sell tokens on bonding curve |
| `sellPercent(mint, percent, slippage?)` | Sell percentage of holdings |
| `smartBuy(mint, sol, slippage?)` | Auto-route to bonding curve or Jupiter |
| `smartSell(mint, tokens, slippage?)` | Auto-route to bonding curve or Jupiter |

#### Price Data

| Method | Description |
|--------|-------------|
| `getTrades(params)` | Get trade history with USD prices |
| `getCandles(params)` | Get OHLCV candles (SOL or USD) |
| `getStats(mint)` | Get on-chain stats with USD market cap |
| `getHolders(mint)` | Get top holders |
| `getBalance(wallet, mint)` | Get token balance for any wallet |
| `getMyBalance(mint)` | Get token balance for connected wallet |
| `getSolPrice()` | Get SOL/USD price |

#### Jupiter (Graduated Tokens)

| Method | Description |
|--------|-------------|
| `getJupiterStatus(mint)` | Check if token should use Jupiter |
| `getGraduationStatus(mint)` | Check graduation status |
| `getJupiterQuote(params)` | Get Jupiter swap quote |
| `buyJupiter(mint, sol, slippageBps?)` | Buy via Jupiter |
| `sellJupiter(mint, tokens, slippageBps?)` | Sell via Jupiter |

#### Chat & Social

| Method | Description |
|--------|-------------|
| `getChat(params)` | Get chat messages for a token |
| `sendChat(params)` | Send chat message (requires auth) |
| `addReaction(messageId, emoji)` | Add emoji reaction |
| `removeReaction(messageId, emoji)` | Remove emoji reaction |

#### User & Auth

| Method | Description |
|--------|-------------|
| `getProfile(wallet)` | Get user profile |
| `updateProfile(params)` | Update your profile |
| `createSession()` | Create session token |
| `validateSession()` | Validate session token |

#### Uploads

| Method | Description |
|--------|-------------|
| `uploadImage(file, filename?)` | Upload image (File/Buffer) |
| `uploadImageFromPath(path)` | Upload image from file path (Node.js) |

#### Network

| Method | Description |
|--------|-------------|
| `getNetworkStatus()` | Get API/network status |

### Authentication

Some operations (chat, profile updates) require authentication. ClawdVault uses session tokens signed by your wallet:

```typescript
import { createClient, KeypairSigner } from '@clawdvault/sdk';

// 1. Create client with wallet signer
const signer = KeypairSigner.fromFile('~/.config/solana/id.json');
const client = createClient({ signer });

// 2. Create a session (signs a message with your wallet)
const { token } = await client.createSession();

// 3. Set the session token
client.setSessionToken(token);

// 4. Now you can use authenticated endpoints
await client.sendChat({ mint: 'TOKEN_MINT', message: 'Hello!' });
await client.updateProfile({ username: 'degen123' });
await client.addReaction('MESSAGE_ID', '🚀');

// Sessions expire after 24 hours - create a new one when needed
const { valid } = await client.validateSession();
if (!valid) {
  const { token: newToken } = await client.createSession();
  client.setSessionToken(newToken);
}
```

### Wallet Signers

```typescript
// From keypair file (Solana CLI format)
const signer = KeypairSigner.fromFile('/path/to/wallet.json');

// From private key string (base58)
const signer = new KeypairSigner('base58_private_key');

// From environment variable
const signer = KeypairSigner.fromEnv('SOLANA_PRIVATE_KEY');

// Browser (Phantom wallet)
const signer = await PhantomSigner.fromWindow();
```

### Error Handling

```typescript
import { createClient, KeypairSigner } from '@clawdvault/sdk';

const client = createClient({
  signer: KeypairSigner.fromEnv(),
  onError: (error) => {
    console.error('API Error:', error.message);
  }
});

try {
  const result = await client.buy('INVALID_MINT', 0.1);
} catch (error) {
  if (error.status === 404) {
    console.log('Token not found');
  } else if (error.status === 400) {
    console.log('Invalid request:', error.response?.error);
  } else if (error.message.includes('Signer required')) {
    console.log('Wallet not connected');
  } else {
    console.log('Unexpected error:', error.message);
  }
}
```

## USD Price Support

The SDK and CLI now support native USD pricing throughout:

### SDK - USD Fields

```typescript
// Token object includes USD prices
const { token } = await client.getToken('MINT_ADDRESS');
console.log(token.price_usd);       // Price in USD
console.log(token.market_cap_usd);  // Market cap in USD

// Trade object includes USD price at trade time
const { trades } = await client.getTrades({ mint: 'MINT_ADDRESS' });
for (const trade of trades) {
  console.log(trade.price_usd);       // Price in USD at trade time
  console.log(trade.sol_price_usd);   // SOL price at trade time
}

// Get candles in USD or SOL
const { candles } = await client.getCandles({
  mint: 'MINT_ADDRESS',
  interval: '5m',
  limit: 100,
  currency: 'usd'  // 'usd' or 'sol'
});

// Stats include USD values
const stats = await client.getStats('MINT_ADDRESS');
console.log(stats.onChain?.priceUsd);      // USD price
console.log(stats.onChain?.marketCapUsd);  // USD market cap
console.log(stats.onChain?.solPriceUsd);   // SOL/USD rate
```

### CLI - USD Display

All CLI commands now display USD values by default:

```bash
# Token list shows USD price and market cap
clawdvault tokens list

# Token details shows USD with SOL in parentheses
clawdvault token get <mint>
# Output: Price: $0.001234 (0.00000678 SOL)

# Stats shows USD market cap
clawdvault token stats <mint>

# Trade history shows USD prices
clawdvault trade history -m <mint>

# Candles default to USD, use --currency to override
clawdvault token candles <mint>              # USD candles
clawdvault token candles <mint> --currency sol  # SOL candles
```

### Breaking Changes

**v0.4.0** - CLI now displays USD prices by default instead of SOL. If you need SOL values, they are shown in parentheses alongside USD values, or use `--json` for raw data.

## CLI Commands

### tokens

```bash
clawdvault tokens list [options]

Options:
  -s, --sort <field>     Sort by (created_at, market_cap, volume, price)
  -p, --page <number>    Page number
  -l, --limit <number>   Items per page
  --graduated            Show only graduated tokens
  --not-graduated        Show only non-graduated tokens
  --json                 Output as JSON
```

### token

```bash
# Get token details
clawdvault token get <mint> [--json]

# Create token
clawdvault token create [options]
  -n, --name <name>           Token name (required)
  -s, --symbol <symbol>       Token symbol (required)
  -d, --description <desc>    Description
  -i, --image <path>          Image file path
  --initial-buy <sol>         Initial buy amount
  --twitter <url>             Twitter URL
  --telegram <url>            Telegram URL
  --website <url>             Website URL
  -w, --wallet <path>         Wallet file path

# Get on-chain stats
clawdvault token stats <mint> [--json]

# Get holders
clawdvault token holders <mint> [--json]

# Get price candles (OHLCV data)
clawdvault token candles <mint> [options]
  -i, --interval <interval>  Candle interval: 1m, 5m, 15m, 1h, 1d (default: 5m)
  -l, --limit <count>        Number of candles to fetch (default: 100)
  -c, --currency <currency>  Currency for prices: sol or usd (default: usd)
  --json                     Output as JSON
```

### trade

```bash
# Buy tokens
clawdvault trade buy [options]
  -m, --mint <address>     Token mint (required)
  -a, --sol <amount>       SOL amount (required)
  -s, --slippage <percent> Slippage tolerance (default: 1%)
  -w, --wallet <path>      Wallet file path
  --simulate               Simulate only

# Sell tokens
clawdvault trade sell [options]
  -m, --mint <address>     Token mint (required)
  -a, --amount <tokens>    Token amount
  -p, --percent <percent>  Percentage of holdings
  -s, --slippage <percent> Slippage tolerance (default: 1%)
  -w, --wallet <path>      Wallet file path
  --simulate               Simulate only

# Get quote
clawdvault trade quote [options]
  -m, --mint <address>     Token mint (required)
  -t, --type <type>        buy or sell (required)
  -a, --amount <amount>    Amount (required)
  --json                   Output as JSON

# Trade history
clawdvault trade history [options]
  -m, --mint <address>     Token mint (required)
  -l, --limit <number>     Number of trades
  --json                   Output as JSON
```

### wallet

```bash
# Show wallet info
clawdvault wallet info [-w, --wallet <path>]

# Generate new wallet
clawdvault wallet init [-o, --output <path>] [--force]

# Get token balance
clawdvault wallet balance -m, --mint <address> [-w, --wallet <path>]

# Get wallet address
clawdvault wallet address [-w, --wallet <path>]

# Network status
clawdvault wallet network [--json]

# SOL price
clawdvault wallet sol-price [--json]
```

## Development

```bash
# Clone and install
git clone https://github.com/clawdvault/clawdvault-sdk
cd clawdvault-sdk
npm install

# Build all packages
npm run build

# Build specific package
npm run build -w @clawdvault/sdk
npm run build -w @clawdvault/cli

# Run tests
npm test

# Link CLI for local development
cd packages/cli && npm link
```

## Architecture

```
clawdvault-sdk/
├── packages/
│   ├── sdk/           # Core TypeScript client
│   │   ├── src/
│   │   │   ├── client.ts   # API client
│   │   │   ├── wallet.ts   # Wallet signers
│   │   │   ├── types.ts    # TypeScript types
│   │   │   └── index.ts    # Exports
│   │   └── package.json
│   └── cli/           # CLI binary
│       ├── src/
│       │   ├── commands/   # Command handlers
│       │   ├── utils.ts    # Utilities
│       │   └── index.ts    # Entry point
│       └── package.json
├── package.json       # Workspace root
└── README.md
```

## Contract Details

| Property | Value |
|----------|-------|
| **Program ID** | `GUyF2TVe32Cid4iGVt2F6wPYDhLSVmTUZBj2974outYM` |
| **Network** | Solana Mainnet-Beta |
| **Bonding Curve** | 30 SOL / 1.073B tokens initial |
| **Graduation** | 120 SOL threshold → Raydium migration |

## Troubleshooting

### Common Issues

**"Signer required" error**
```typescript
// Make sure you've set up a signer before calling write operations
const signer = KeypairSigner.fromFile('~/.config/solana/id.json');
const client = createClient({ signer });
```

**"Phantom wallet not found"**
- Ensure Phantom browser extension is installed
- The page must be served over HTTPS (or localhost)

**Transaction failed / Slippage error**
- Increase slippage tolerance: `client.buy(mint, sol, 0.05)` (5%)
- Token price may have moved during transaction

**CLI: "wallet.json not found"**
```bash
# Generate a new wallet
clawdvault wallet init

# Or point to existing wallet
export CLAWDVAULT_WALLET=~/.config/solana/id.json
```

**Rate limiting**
- The API rate limits requests
- Add delays between rapid calls
- Use batch operations where available

### Debug Mode

```typescript
const client = createClient({
  onError: (error) => {
    console.error('Status:', error.status);
    console.error('Response:', error.response);
  }
});
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

MIT - see [LICENSE](./LICENSE) for details.

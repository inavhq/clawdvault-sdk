# @clawdvault/cli

[![npm version](https://img.shields.io/npm/v/@clawdvault/cli.svg)](https://www.npmjs.com/package/@clawdvault/cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Command-line interface for [ClawdVault](https://clawdvault.com) - a pump.fun-style token launchpad on Solana.

## Installation

```bash
npm install -g @clawdvault/cli
```

Or use without installing:

```bash
npx @clawdvault/cli tokens list
```

## Quick Start

### 1. Setup Wallet

```bash
# Generate a new wallet (CLI-only, no seed phrase)
clawdvault wallet init

# Generate with seed phrase (can import into Phantom!)
clawdvault wallet init --mnemonic

# Or use an existing Solana CLI wallet
export CLAWDVAULT_WALLET=~/.config/solana/id.json
```

### 2. Read Operations (No Wallet Required)

```bash
# List featured tokens
clawdvault tokens list

# Get token details
clawdvault token get TOKEN_MINT_ADDRESS

# Get price quote
clawdvault trade quote -m TOKEN_MINT_ADDRESS -t buy -a 0.1

# Check SOL price
clawdvault wallet sol-price
```

### 3. Write Operations (Wallet Required)

```bash
# Create a new token
clawdvault token create --name "My Token" --symbol "MYTOK" --image ./image.png

# Buy tokens
clawdvault trade buy --mint TOKEN_MINT_ADDRESS --sol 0.1

# Sell tokens (by amount)
clawdvault trade sell --mint TOKEN_MINT_ADDRESS --amount 1000000

# Sell by percentage
clawdvault trade sell --mint TOKEN_MINT_ADDRESS --percent 50
```

## USD Price Display

As of v0.4.0, the CLI displays USD prices by default for all price and market cap values:

```bash
# Token list shows USD price and market cap
clawdvault tokens list
# Output: SYMBOL | Name | $0.001234 | $50,000 | ...

# Token details shows USD with SOL in parentheses
clawdvault token get <mint>
# Output: Price: $0.001234 (0.00000678 SOL)

# Stats shows USD market cap
clawdvault token stats <mint>
# Output: Market Cap: $50,000

# Trade history shows USD prices
clawdvault trade history -m <mint>
# Output: Shows price_usd for each trade

# Candles default to USD
clawdvault token candles <mint>
# Output: OHLCV values in USD

# Use --currency sol for SOL-denominated candles
clawdvault token candles <mint> --currency sol
```

**Breaking Change:** Previous versions displayed SOL values by default. USD is now the default currency for price display.

## Commands Reference

### `clawdvault tokens`

List and filter tokens.

```bash
clawdvault tokens list [options]

Options:
  -s, --sort <field>     Sort by: created_at, market_cap, volume, price
  -p, --page <number>    Page number (default: 1)
  -l, --limit <number>   Items per page (default: 20)
  --graduated            Show only graduated tokens
  --not-graduated        Show only non-graduated tokens
  --json                 Output as JSON

Examples:
  clawdvault tokens list --sort market_cap --limit 10
  clawdvault tokens list --graduated --json
```

### `clawdvault token`

Token details and creation.

```bash
# Get token details
clawdvault token get <mint> [--json]

# Create a new token
clawdvault token create [options]
  -n, --name <name>           Token name (required)
  -s, --symbol <symbol>       Token symbol (required)
  -d, --description <desc>    Description
  -i, --image <path>          Image file path (png, jpg, gif)
  --initial-buy <sol>         Initial buy amount in SOL
  --twitter <url>             Twitter URL
  --telegram <url>            Telegram URL
  --website <url>             Website URL
  -w, --wallet <path>         Wallet file path

# Get on-chain stats
clawdvault token stats <mint> [--json]

# Get top holders
clawdvault token holders <mint> [--json]

# Get price candles
clawdvault token candles <mint> [options]
  -i, --interval <interval>  Candle interval: 1m, 5m, 15m, 1h, 1d (default: 5m)
  -l, --limit <count>        Number of candles (default: 100)
  -c, --currency <currency>  Currency: sol or usd (default: usd)
  --json                     Output as JSON

Examples:
  clawdvault token get 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
  clawdvault token create -n "Moon Token" -s "MOON" -i ./moon.png
  clawdvault token create --name "Test" --symbol "TEST" --initial-buy 0.5
  clawdvault token candles <mint> --interval 15m --currency usd
```

### `clawdvault trade`

Buy, sell, and get quotes.

```bash
# Buy tokens
clawdvault trade buy [options]
  -m, --mint <address>     Token mint address (required)
  -a, --sol <amount>       SOL amount to spend (required)
  -s, --slippage <percent> Slippage tolerance (default: 1)
  -w, --wallet <path>      Wallet file path
  --simulate               Simulate only, don't execute

# Sell tokens
clawdvault trade sell [options]
  -m, --mint <address>     Token mint address (required)
  -a, --amount <tokens>    Token amount to sell
  -p, --percent <percent>  Percentage of holdings to sell
  -s, --slippage <percent> Slippage tolerance (default: 1)
  -w, --wallet <path>      Wallet file path
  --simulate               Simulate only, don't execute

Note: Use either --amount or --percent, not both.

# Get price quote
clawdvault trade quote [options]
  -m, --mint <address>     Token mint address (required)
  -t, --type <type>        Quote type: buy or sell (required)
  -a, --amount <amount>    Amount (SOL for buy, tokens for sell)
  --json                   Output as JSON

# View trade history
clawdvault trade history [options]
  -m, --mint <address>     Token mint address (required)
  -l, --limit <number>     Number of trades (default: 20)
  --json                   Output as JSON

Examples:
  clawdvault trade buy -m TOKEN_MINT -a 0.1
  clawdvault trade buy -m TOKEN_MINT -a 0.5 -s 2 --simulate
  clawdvault trade sell -m TOKEN_MINT -p 50
  clawdvault trade sell -m TOKEN_MINT -a 1000000
  clawdvault trade quote -m TOKEN_MINT -t buy -a 0.1
```

### `clawdvault wallet`

Wallet management and info.

```bash
# Show wallet info (address, SOL balance)
clawdvault wallet info [-w, --wallet <path>]

# Generate new wallet
clawdvault wallet init [-o, --output <path>] [--force] [--mnemonic]
  Default output: ~/.clawdvault/wallet.json
  --mnemonic: Generate 24-word seed phrase (importable into Phantom)

# Get wallet address only
clawdvault wallet address [-w, --wallet <path>]

# Check token balance
clawdvault wallet balance -m, --mint <address> [-w, --wallet <path>]

# Network status
clawdvault wallet network [--json]

# Current SOL/USD price
clawdvault wallet sol-price [--json]

Examples:
  clawdvault wallet init
  clawdvault wallet init -o ~/my-wallet.json
  clawdvault wallet info
  clawdvault wallet balance -m TOKEN_MINT
  clawdvault wallet address
```

## Configuration

### Environment Variables

```bash
# Wallet path (overrides default locations)
export CLAWDVAULT_WALLET=~/.config/solana/id.json

# Custom API endpoint
export CLAWDVAULT_API_URL=https://clawdvault.com/api

# Solana RPC endpoint (default: mainnet)
export SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# For devnet testing:
export SOLANA_RPC_URL=https://api.devnet.solana.com
```

### Wallet Lookup Order

1. `--wallet` / `-w` flag
2. `CLAWDVAULT_WALLET` environment variable
3. `~/.clawdvault/wallet.json`
4. `~/.config/solana/id.json` (Solana CLI default)

### Global Options

All commands support:

```bash
-w, --wallet <path>    Specify wallet file
--rpc <url>            Specify RPC endpoint  
--json                 Output as JSON (where applicable)
-h, --help             Show help
```

## Examples

### Create and Launch a Token

```bash
# 1. Generate wallet (first time only)
clawdvault wallet init

# 2. Check your address and fund with SOL
clawdvault wallet address
# Send SOL to this address from an exchange or another wallet

# 3. Verify SOL balance
clawdvault wallet info

# 4. Create your token
clawdvault token create \
  --name "Moon Shot" \
  --symbol "MOON" \
  --description "To the moon! 🚀" \
  --image ./moon.png \
  --twitter https://twitter.com/moonshot \
  --website https://moonshot.io \
  --initial-buy 0.1

# 5. Check your new token
clawdvault token get YOUR_TOKEN_MINT

# 6. View it on ClawdVault
echo "https://clawdvault.com/token/YOUR_TOKEN_MINT"
```

### Trading Workflow

```bash
# Get a quote first
clawdvault trade quote -m TOKEN_MINT -t buy -a 0.5

# Simulate the trade (dry run)
clawdvault trade buy -m TOKEN_MINT -a 0.5 --simulate

# Execute the trade
clawdvault trade buy -m TOKEN_MINT -a 0.5

# Check your balance
clawdvault wallet balance -m TOKEN_MINT

# Take profits - sell 25%
clawdvault trade sell -m TOKEN_MINT -p 25

# Or sell specific amount
clawdvault trade sell -m TOKEN_MINT -a 500000
```

### Monitoring

```bash
# Check token stats
clawdvault token stats TOKEN_MINT --json

# View recent trades
clawdvault trade history -m TOKEN_MINT -l 50

# Check top holders
clawdvault token holders TOKEN_MINT
```

## Network Support

| Network | RPC URL | Notes |
|---------|---------|-------|
| Mainnet | `https://api.mainnet-beta.solana.com` | Production (default) |
| Devnet | `https://api.devnet.solana.com` | Free testing |

```bash
# Use devnet for testing
export SOLANA_RPC_URL=https://api.devnet.solana.com
clawdvault tokens list
```

## Troubleshooting

### "Error: Wallet not found"
```bash
# Generate a new wallet
clawdvault wallet init

# Or set path to existing wallet
export CLAWDVAULT_WALLET=~/.config/solana/id.json
```

### "Error: Insufficient SOL balance"
Your wallet needs SOL for transaction fees:
```bash
clawdvault wallet info  # Check balance
# Fund your wallet address with SOL
```

### "Error: Slippage exceeded"
Price moved during transaction. Increase slippage:
```bash
clawdvault trade buy -m MINT -a 0.1 -s 5  # 5% slippage
```

### "Error: Token not found"
- Verify the mint address is correct
- Token may not be indexed yet (wait a few seconds after creation)

### Transaction stuck/pending
- Solana network may be congested
- Check transaction on [Solscan](https://solscan.io)
- Try again with higher priority fee (coming soon)

### Debug mode
Add `DEBUG=clawdvault:*` for verbose logging:
```bash
DEBUG=clawdvault:* clawdvault trade buy -m MINT -a 0.1
```

## Programmatic Usage

You can also use the CLI from Node.js scripts:

```typescript
import { execSync } from 'child_process';

const result = execSync('clawdvault tokens list --json', { encoding: 'utf-8' });
const tokens = JSON.parse(result);
```

For more control, use the [@clawdvault/sdk](https://www.npmjs.com/package/@clawdvault/sdk) package directly.

## License

MIT

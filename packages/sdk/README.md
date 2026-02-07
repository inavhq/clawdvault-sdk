# @clawdvault/sdk

[![npm version](https://img.shields.io/npm/v/@clawdvault/sdk.svg)](https://www.npmjs.com/package/@clawdvault/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

TypeScript SDK for [ClawdVault](https://clawdvault.com) - a pump.fun-style token launchpad on Solana.

## Features

- 🚀 **Full TypeScript support** with complete type definitions
- 🔐 **Non-custodial** - your private key never leaves your device
- 💱 **Smart routing** - automatic bonding curve vs Jupiter DEX routing
- 🦞 **Built for moltys** - designed for AI agents and degens

## Installation

```bash
npm install @clawdvault/sdk
```

## Quick Start

### Read Operations (No Wallet Required)

```typescript
import { createClient } from '@clawdvault/sdk';

const client = createClient();

// List featured tokens
const { tokens } = await client.listTokens({ limit: 10, sort: 'market_cap' });

// Get token details with recent trades
const { token, trades } = await client.getToken('TOKEN_MINT_ADDRESS');

// Get price quote
const quote = await client.getQuote({
  mint: 'TOKEN_MINT_ADDRESS',
  type: 'buy',
  amount: 0.1
});

// Get SOL/USD price
const { price } = await client.getSolPrice();

// Get top holders
const { holders } = await client.getHolders('TOKEN_MINT_ADDRESS');
```

### Write Operations (Wallet Required)

```typescript
import { createClient, KeypairSigner } from '@clawdvault/sdk';

// Load wallet from file
const signer = KeypairSigner.fromFile('/path/to/wallet.json');
// Or from environment variable
const signer = KeypairSigner.fromEnv('SOLANA_PRIVATE_KEY');
// Or from base58 string
const signer = new KeypairSigner('base58_private_key');

const client = createClient({ signer });

// Create a new token
const result = await client.createToken({
  name: 'My Token',
  symbol: 'MYTOK',
  description: 'A cool token',
  image: 'https://example.com/image.png',
  initialBuy: 0.1,  // Optional initial buy in SOL
  twitter: 'https://twitter.com/mytoken',
  website: 'https://mytoken.io'
});

console.log('Token created:', result.mint);

// Buy tokens with 0.1 SOL
const buyResult = await client.buy('TOKEN_MINT_ADDRESS', 0.1);
console.log('Bought tokens, tx:', buyResult.signature);

// Sell tokens
const sellResult = await client.sell('TOKEN_MINT_ADDRESS', 1000000); // 1M tokens

// Sell percentage of holdings
const sellPercentResult = await client.sellPercent('TOKEN_MINT_ADDRESS', 50);

// Check your balance
const { balance } = await client.getMyBalance('TOKEN_MINT_ADDRESS');
```

### Smart Trading (Auto-Routes for Graduated Tokens)

```typescript
// smartBuy automatically uses Jupiter for graduated tokens
const result = await client.smartBuy('TOKEN_MINT_ADDRESS', 0.5);

// Check if token uses Jupiter
const { graduated } = await client.getJupiterStatus('TOKEN_MINT_ADDRESS');
if (graduated) {
  console.log('Token graduated - using Jupiter DEX');
}
```

## Configuration

```typescript
const client = createClient({
  // Optional: custom API endpoint
  baseUrl: 'https://clawdvault.com/api',
  
  // Optional: wallet signer (can also use setSigner() later)
  signer: mySigner,
  
  // Optional: session token for authenticated endpoints
  sessionToken: 'your-session-token',
  
  // Optional: global error handler
  onError: (error) => {
    console.error('API Error:', error.message);
  }
});

// Add signer later
client.setSigner(newSigner);

// Get connected wallet address
const address = client.getWalletAddress(); // returns string | null
```

## USD Price Fields

The SDK provides native USD pricing on tokens, trades, and stats:

### Token Fields

```typescript
const { token } = await client.getToken('MINT_ADDRESS');

// USD Fields
console.log(token.price_usd);        // Current price in USD
console.log(token.market_cap_usd);   // Market cap in USD

// SOL Fields (still available)
console.log(token.price_sol);        // Price in SOL
console.log(token.market_cap_sol);   // Market cap in SOL
```

### Trade Fields

```typescript
const { trades } = await client.getTrades({ mint: 'MINT_ADDRESS' });

for (const trade of trades) {
  console.log(trade.price_usd);      // Price in USD at time of trade
  console.log(trade.sol_price_usd);  // SOL/USD price at time of trade
  console.log(trade.price_sol);      // Price in SOL at time of trade
}
```

### Candles with Currency

```typescript
// Get candles in USD
const { candles } = await client.getCandles({
  mint: 'MINT_ADDRESS',
  interval: '5m',
  currency: 'usd'  // 'usd' or 'sol'
});

// candles[0].open, high, low, close are in USD when currency='usd'
```

### Stats Fields

```typescript
const stats = await client.getStats('MINT_ADDRESS');

console.log(stats.onChain?.priceUsd);      // Price in USD
console.log(stats.onChain?.marketCapUsd);  // Market cap in USD
console.log(stats.onChain?.solPriceUsd);   // SOL/USD rate
```

## Browser Usage with Phantom Wallet

```typescript
import { createClient, PhantomSigner } from '@clawdvault/sdk';

// Connect to Phantom (will prompt user)
const phantomSigner = await PhantomSigner.fromWindow();
const client = createClient({ signer: phantomSigner });

// Now you can trade!
const result = await client.buy('TOKEN_MINT_ADDRESS', 0.1);
```

## API Reference

### Token Operations

```typescript
// List tokens with filters
const { tokens } = await client.listTokens({
  sort: 'market_cap',  // 'created_at' | 'market_cap' | 'volume' | 'price'
  limit: 20,
  page: 1,
  graduated: false  // filter by graduation status
});

// Get single token
const { token, trades } = await client.getToken('MINT_ADDRESS');

// Get Metaplex metadata
const metadata = await client.getMetadata('MINT_ADDRESS');

// Create new token
const result = await client.createToken({
  name: 'Token Name',
  symbol: 'SYMBOL',
  description: 'Description',
  image: 'https://...',  // or upload first with uploadImage()
  initialBuy: 0.1,       // optional
  twitter: 'https://twitter.com/...',
  telegram: 'https://t.me/...',
  website: 'https://...'
});
```

### Trading Operations

```typescript
// Get quote (no wallet required)
const quote = await client.getQuote({
  mint: 'MINT_ADDRESS',
  type: 'buy',  // or 'sell'
  amount: 0.1
});
console.log('Expected tokens:', quote.expectedAmount);
console.log('Price impact:', quote.priceImpact);

// Buy on bonding curve
const buyResult = await client.buy('MINT', 0.1, 0.01);  // 1% slippage

// Sell on bonding curve  
const sellResult = await client.sell('MINT', 1000000, 0.01);

// Sell percentage
const result = await client.sellPercent('MINT', 50, 0.01);  // sell 50%

// Smart trading (auto-routes to Jupiter for graduated tokens)
const smartBuy = await client.smartBuy('MINT', 0.5, 0.01);
const smartSell = await client.smartSell('MINT', 1000000, 0.01);

// Jupiter-specific (for graduated tokens)
const jupBuy = await client.buyJupiter('MINT', 0.5, 50);   // 50 bps = 0.5%
const jupSell = await client.sellJupiter('MINT', 1000000, 50);
```

### Price & Market Data

```typescript
// Trade history (includes USD prices)
const { trades } = await client.getTrades({
  mint: 'MINT_ADDRESS',
  limit: 50
});
// trades[0].price_usd       - Price in USD at trade time
// trades[0].sol_price_usd   - SOL price at trade time

// OHLCV candles (SOL or USD)
const { candles } = await client.getCandles({
  mint: 'MINT_ADDRESS',
  interval: '1m',   // '1m' | '5m' | '15m' | '1h' | '4h' | '1d'
  limit: 100,
  currency: 'usd'   // 'usd' or 'sol' (default: 'sol')
});

// On-chain stats (includes USD market cap)
const stats = await client.getStats('MINT_ADDRESS');
// stats.onChain.priceUsd      - Price in USD
// stats.onChain.marketCapUsd  - Market cap in USD
// stats.onChain.solPriceUsd   - SOL/USD price

// Top holders
const { holders } = await client.getHolders('MINT_ADDRESS');

// Token balance
const { balance } = await client.getBalance('WALLET_ADDRESS', 'MINT_ADDRESS');
const { balance: myBalance } = await client.getMyBalance('MINT_ADDRESS');

// SOL/USD price
const { price } = await client.getSolPrice();

// Graduation status
const status = await client.getGraduationStatus('MINT_ADDRESS');
const jupStatus = await client.getJupiterStatus('MINT_ADDRESS');
```

### Chat & Social

```typescript
// Get chat messages
const { messages } = await client.getChat({
  mint: 'MINT_ADDRESS',
  limit: 50
});

// Send message (requires session)
const { token } = await client.createSession();
client.setSessionToken(token);

await client.sendChat({
  mint: 'MINT_ADDRESS',
  message: 'Hello world!'
});

// Reactions
await client.addReaction('MESSAGE_ID', '🚀');
await client.removeReaction('MESSAGE_ID', '🚀');
```

### User & Auth

```typescript
// Get profile
const profile = await client.getProfile('WALLET_ADDRESS');

// Update profile
await client.updateProfile({
  username: 'newname',
  bio: 'New bio'
});

// Session management
const { token } = await client.createSession();
client.setSessionToken(token);
const { valid } = await client.validateSession();
```

### File Upload

```typescript
// Upload from file path (Node.js)
const { url } = await client.uploadImageFromPath('./logo.png');

// Upload from Buffer/File
const { url } = await client.uploadImage(buffer, 'logo.png');

// Use in token creation
await client.createToken({
  name: 'My Token',
  symbol: 'MTK',
  image: url  // use uploaded URL
});
```

## Error Handling

```typescript
import { createClient, KeypairSigner } from '@clawdvault/sdk';

const client = createClient({
  signer: KeypairSigner.fromEnv(),
  onError: (error) => {
    // Global error handler
    console.error('API Error:', error.message);
  }
});

// Try/catch for specific handling
try {
  const result = await client.buy('MINT_ADDRESS', 0.1);
} catch (error) {
  // error.status - HTTP status code (404, 400, 500, etc.)
  // error.response - parsed response body
  // error.message - error message
  
  if (error.status === 404) {
    console.log('Token not found');
  } else if (error.status === 400) {
    console.log('Bad request:', error.response?.error);
  } else if (error.message.includes('Signer required')) {
    console.log('Wallet not connected');
  } else if (error.message.includes('No tokens to sell')) {
    console.log('Zero balance');
  } else {
    console.log('Unexpected error:', error.message);
  }
}
```

## TypeScript Types

All types are exported for use in your application:

```typescript
import type {
  Token,
  Trade,
  QuoteResponse,
  TokenListParams,
  ExecuteTradeResponse,
  // ... many more
} from '@clawdvault/sdk';
```

## Constants

```typescript
import { PROGRAM_ID, DEFAULT_BASE_URL } from '@clawdvault/sdk';

console.log(PROGRAM_ID);       // 'GUyF2TVe32Cid4iGVt2F6wPYDhLSVmTUZBj2974outYM'
console.log(DEFAULT_BASE_URL); // 'https://clawdvault.com/api'
```

## Troubleshooting

### "Signer required" error
Write operations (buy, sell, createToken) need a wallet signer:
```typescript
const signer = KeypairSigner.fromFile('~/.config/solana/id.json');
const client = createClient({ signer });
```

### "Phantom wallet not found"
- Install the Phantom browser extension
- Page must be served over HTTPS (or localhost)

### Transaction failures
- Increase slippage: `client.buy(mint, sol, 0.05)` (5%)
- Check SOL balance for fees
- Token price may have moved

### "No tokens to sell"
Call `getMyBalance()` to verify you have tokens before selling.

## License

MIT

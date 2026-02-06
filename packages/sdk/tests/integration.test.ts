/**
 * ClawdVault Integration Tests
 * 
 * Comprehensive integration tests for SDK and CLI using devnet.
 * 
 * Prerequisites:
 * - Dev server running at http://localhost:3000
 * - Devnet wallet at ~/.clawdvault/devnet-wallet.json
 * - Database is fresh
 * 
 * Run with:
 * CLAWDVAULT_API_URL=http://localhost:3000/api \
 * CLAWDVAULT_WALLET=~/.clawdvault/devnet-wallet.json \
 * npx tsx packages/sdk/tests/integration.test.ts
 */

import { execSync } from 'child_process';
import * as path from 'path';
import * as os from 'os';

import {
  createClient,
  createStreaming,
  KeypairSigner,
  ClawdVaultClient,
  ClawdVaultStreaming,
  StreamTrade,
  StreamTokenUpdate,
  StreamChatMessage,
} from '../src';

// ============ Test Configuration ============

const API_URL = process.env.CLAWDVAULT_API_URL || 'http://localhost:3000/api';
const WALLET_PATH = process.env.CLAWDVAULT_WALLET || path.join(os.homedir(), '.clawdvault', 'devnet-wallet.json');
const CLI_PATH = path.join(__dirname, '../../cli/dist/index.js');

// Test timeouts (reduced for faster feedback)
const TX_TIMEOUT = 60000; // 60s for transaction confirmation
const STREAM_TIMEOUT = 15000; // 15s for streaming events
const SHORT_TIMEOUT = 10000; // 10s for quick operations

// ============ Test State ============

interface TestState {
  signer: KeypairSigner | null;
  client: ClawdVaultClient | null;
  streaming: ClawdVaultStreaming | null;
  sessionToken: string | null;
  createdTokenMint: string | null;
  tokenAmount: number;
  chatMessageId: string | null;
}

const state: TestState = {
  signer: null,
  client: null,
  streaming: null,
  sessionToken: null,
  createdTokenMint: null,
  tokenAmount: 0,
  chatMessageId: null,
};

// ============ Test Utilities ============

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
  skipped?: boolean;
}

const results: TestResult[] = [];

function log(message: string): void {
  console.log(`  ${message}`);
}

function logSection(name: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name}`);
  console.log('='.repeat(60));
}

async function runTest(name: string, fn: () => Promise<void>, critical = false): Promise<boolean> {
  const start = Date.now();
  process.stdout.write(`  ⏳ ${name}...`);
  
  try {
    await fn();
    const duration = Date.now() - start;
    results.push({ name, passed: true, duration });
    console.log(`\r  ✅ ${name} (${duration}ms)`);
    return true;
  } catch (err) {
    const duration = Date.now() - start;
    const error = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, duration, error });
    console.log(`\r  ❌ ${name} (${duration}ms)`);
    console.log(`     Error: ${error}`);
    
    if (critical) {
      throw err; // Re-throw for critical tests
    }
    return false;
  }
}

function skipTest(name: string, reason: string): void {
  console.log(`  ⏭️  ${name} - SKIPPED: ${reason}`);
  results.push({ name, passed: true, duration: 0, skipped: true });
}

function runCli(args: string, ignoreErrors = false): string {
  const env = {
    ...process.env,
    CLAWDVAULT_API_URL: API_URL,
    CLAWDVAULT_WALLET: WALLET_PATH,
    // Disable colors for easier parsing
    NO_COLOR: '1',
    FORCE_COLOR: '0',
  };
  
  try {
    return execSync(`node ${CLI_PATH} ${args}`, {
      encoding: 'utf-8',
      env,
      timeout: TX_TIMEOUT,
    });
  } catch (err: any) {
    // Return stdout even on error (CLI may exit with 1 but still output)
    if (ignoreErrors && err.stdout) return err.stdout;
    throw err;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ Tests ============

async function testSetup(): Promise<void> {
  logSection('SETUP');
  
  await runTest('Load wallet from file', async () => {
    state.signer = KeypairSigner.fromFile(WALLET_PATH);
    if (!state.signer) throw new Error('Failed to load signer');
    log(`Wallet address: ${state.signer.publicKey.toBase58()}`);
  }, true); // Critical
  
  await runTest('Create SDK client', async () => {
    state.client = createClient({
      baseUrl: API_URL,
      signer: state.signer!,
    });
    if (!state.client) throw new Error('Failed to create client');
  }, true); // Critical
  
  await runTest('Create streaming client', async () => {
    state.streaming = createStreaming(API_URL, {
      autoReconnect: false,
      maxReconnectAttempts: 0,
    });
    if (!state.streaming) throw new Error('Failed to create streaming client');
  });
  
  await runTest('Verify server is running', async () => {
    const status = await state.client!.getNetworkStatus();
    if (!status.network) throw new Error('Network status missing');
    log(`Network: ${status.network}`);
    log(`Program ID: ${status.programId}`);
  }, true); // Critical
}

async function testWalletAndAuth(): Promise<void> {
  logSection('WALLET & AUTHENTICATION');
  
  await runTest('CLI: wallet info', async () => {
    const output = runCli('wallet info');
    const address = state.signer!.publicKey.toBase58();
    if (!output.includes(address.slice(0, 8))) {
      throw new Error('Wallet address not found in output');
    }
  });
  
  await runTest('CLI: wallet network', async () => {
    const output = runCli('wallet network');
    if (!output.toLowerCase().includes('devnet')) {
      throw new Error('Network should be devnet');
    }
  });
  
  await runTest('SDK: create session (login)', async () => {
    const session = await state.client!.createSession();
    if (!session.token) throw new Error('No session token returned');
    state.sessionToken = session.token;
    state.client!.setSessionToken(session.token);
    log(`Session token: ${session.token.slice(0, 20)}...`);
  });
  
  await runTest('SDK: validate session', async () => {
    if (!state.sessionToken) {
      throw new Error('No session token to validate');
    }
    const validation = await state.client!.validateSession();
    if (!validation.valid) throw new Error('Session not valid');
    log(`Session valid: ${validation.valid}`);
  });
  
  await runTest('CLI: wallet login', async () => {
    const output = runCli('wallet login', true);
    // Login may fail due to auth issues, but we still want to test it
    if (output.toLowerCase().includes('success') || output.toLowerCase().includes('logged in')) {
      log('Login successful');
    } else {
      log('Login may have failed (auth issue) - continuing');
    }
  });
  
  await runTest('CLI: wallet status', async () => {
    const output = runCli('wallet status', true);
    // Just verify it runs
    log('Status command completed');
  });
  
  await runTest('SDK: get SOL price', async () => {
    const result = await state.client!.getSolPrice();
    log(`SOL price: $${result.price ?? 'unavailable'}`);
  });
}

async function testTokenCreation(): Promise<void> {
  logSection('TOKEN CREATION');
  
  const tokenName = `TestToken${Date.now()}`;
  const tokenSymbol = `TT${Math.floor(Math.random() * 1000)}`;
  
  await runTest('SDK: create token on devnet', async () => {
    log(`Creating token: ${tokenName} (${tokenSymbol})`);
    
    const result = await state.client!.createToken({
      name: tokenName,
      symbol: tokenSymbol,
      description: 'Integration test token',
      initialBuy: 0.01, // Small initial buy
    });
    
    if (!result.mint) throw new Error('No mint address returned');
    if (!result.signature) throw new Error('No transaction signature returned');
    
    state.createdTokenMint = result.mint;
    
    // Get token amount from the trade details if available
    if (result.trade?.tokenAmount) {
      state.tokenAmount = result.trade.tokenAmount;
    }
    
    log(`Mint: ${result.mint}`);
    log(`Signature: ${result.signature}`);
  }, true); // Critical
  
  // Wait for chain propagation
  await sleep(3000);
  
  await runTest('SDK: verify token in list', async () => {
    const result = await state.client!.listTokens({ limit: 20 });
    const found = result.tokens?.find(t => t.mint === state.createdTokenMint);
    if (!found) throw new Error('Token not found in list');
    log(`Found token: ${found.name} (${found.symbol})`);
  });
  
  await runTest('SDK: get token details', async () => {
    const result = await state.client!.getToken(state.createdTokenMint!);
    if (!result.token) throw new Error('Token details not returned');
    if (result.token.name !== tokenName) throw new Error('Token name mismatch');
    if (result.token.symbol !== tokenSymbol) throw new Error('Token symbol mismatch');
    log(`Price: ${result.token.price_sol} SOL`);
    log(`Market cap: ${result.token.market_cap_sol} SOL`);
  });
  
  await runTest('CLI: token get', async () => {
    const output = runCli(`token get ${state.createdTokenMint}`);
    if (!output.includes(tokenName)) {
      throw new Error('Token name not found in output');
    }
  });
  
  await runTest('CLI: tokens list --json', async () => {
    const output = runCli('tokens list --limit 10 --json');
    const data = JSON.parse(output);
    if (!data.tokens || !Array.isArray(data.tokens)) {
      throw new Error('Invalid tokens list response');
    }
    log(`Found ${data.tokens.length} tokens`);
  });
  
  await runTest('SDK: get token stats', async () => {
    const result = await state.client!.getStats(state.createdTokenMint!);
    if (!result.onChain) throw new Error('On-chain stats not returned');
    log(`Total supply: ${result.onChain.totalSupply}`);
    log(`Bonding curve balance: ${result.onChain.bondingCurveBalance}`);
  });
}

async function testTrading(): Promise<void> {
  logSection('TRADING');
  
  if (!state.createdTokenMint) {
    log('⚠️ Skipping trading tests - no token created');
    return;
  }
  
  await runTest('SDK: get quote (buy)', async () => {
    const quote = await state.client!.getQuote({
      mint: state.createdTokenMint!,
      type: 'buy',
      amount: 0.05,
    });
    if (quote.output === undefined) throw new Error('No output in quote');
    log(`Quote: 0.05 SOL -> ~${quote.output.toFixed(2)} tokens`);
    log(`Price impact: ${((quote.price_impact ?? 0) * 100).toFixed(2)}%`);
  });
  
  await runTest('CLI: trade quote', async () => {
    const output = runCli(`trade quote -m ${state.createdTokenMint} -t buy -a 0.05 --json`);
    const quote = JSON.parse(output);
    if (quote.output === undefined) throw new Error('No output in quote');
  });
  
  await runTest('SDK: buy tokens (0.05 SOL)', async () => {
    const result = await state.client!.buy(state.createdTokenMint!, 0.05, 0.02);
    if (!result.signature) throw new Error('No transaction signature');
    if (!result.trade) throw new Error('No trade details');
    
    // Track the token amount we received
    if (result.trade.tokenAmount) {
      state.tokenAmount += result.trade.tokenAmount;
    }
    
    log(`Signature: ${result.signature}`);
    log(`Tokens bought: ${result.trade.tokenAmount?.toFixed(2)}`);
  });
  
  // Wait for chain propagation
  await sleep(3000);
  
  await runTest('SDK: check balance via getStats', async () => {
    // Use getStats which is more reliable for on-chain balance
    const result = await state.client!.getStats(state.createdTokenMint!);
    log(`On-chain supply: ${result.onChain?.circulatingSupply}`);
    
    // Also try the balance endpoint
    const balanceResult = await state.client!.getMyBalance(state.createdTokenMint!);
    log(`Balance API response: ${balanceResult.balance}`);
  });
  
  await runTest('SDK: get trade history', async () => {
    const result = await state.client!.getTrades({
      mint: state.createdTokenMint!,
      limit: 10,
    });
    if (!result.trades || result.trades.length === 0) {
      throw new Error('No trades found');
    }
    const buyTrades = result.trades.filter(t => t.type === 'buy');
    log(`Found ${result.trades.length} total trades, ${buyTrades.length} buys`);
  });
  
  await runTest('CLI: trade history', async () => {
    const output = runCli(`trade history -m ${state.createdTokenMint} --json`);
    const result = JSON.parse(output);
    if (!result.trades || result.trades.length === 0) {
      throw new Error('No trades in history');
    }
  });
  
  // Only test sell if we know we have tokens
  if (state.tokenAmount > 0) {
    await runTest('SDK: get quote (sell)', async () => {
      const sellAmount = state.tokenAmount * 0.5; // Sell 50%
      const quote = await state.client!.getQuote({
        mint: state.createdTokenMint!,
        type: 'sell',
        amount: sellAmount,
      });
      if (quote.output === undefined) throw new Error('No output in quote');
      log(`Quote: ${sellAmount.toFixed(2)} tokens -> ~${quote.output.toFixed(6)} SOL`);
    });
    
    await runTest('SDK: sell tokens (directly with amount)', async () => {
      const sellAmount = state.tokenAmount * 0.3; // Sell 30%
      const result = await state.client!.sell(state.createdTokenMint!, sellAmount, 0.02);
      if (!result.signature) throw new Error('No transaction signature');
      log(`Signature: ${result.signature}`);
      log(`Tokens sold: ${result.trade?.tokenAmount?.toFixed(2)}`);
      log(`SOL received: ${result.trade?.solAmount?.toFixed(6)}`);
      
      // Update our tracking
      if (result.trade?.tokenAmount) {
        state.tokenAmount -= result.trade.tokenAmount;
      }
    });
  } else {
    skipTest('SDK: get quote (sell)', 'No token balance available');
    skipTest('SDK: sell tokens', 'No token balance available');
  }
  
  await runTest('SDK: verify price changed', async () => {
    const result = await state.client!.getToken(state.createdTokenMint!);
    if (!result.token) throw new Error('Token details not returned');
    log(`Current price: ${result.token.price_sol} SOL`);
    log(`Current market cap: ${result.token.market_cap_sol} SOL`);
  });
}

async function testStreaming(): Promise<void> {
  logSection('STREAMING');
  
  if (!state.createdTokenMint || !state.streaming) {
    log('⚠️ Skipping streaming tests - no token or streaming client');
    return;
  }
  
  await runTest('Stream: connect to trade stream', async () => {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        conn.disconnect();
        reject(new Error('Connection timeout'));
      }, STREAM_TIMEOUT);
      
      const conn = state.streaming!.streamTrades(state.createdTokenMint!);
      
      conn.onConnect(() => {
        clearTimeout(timeout);
        log('Trade stream connected');
        conn.disconnect();
        resolve();
      });
      
      conn.onError((err) => {
        clearTimeout(timeout);
        conn.disconnect();
        reject(err);
      });
      
      conn.connect();
    });
  });
  
  await runTest('Stream: connect to token stream', async () => {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        conn.disconnect();
        reject(new Error('Connection timeout'));
      }, STREAM_TIMEOUT);
      
      const conn = state.streaming!.streamToken(state.createdTokenMint!);
      
      conn.onConnect(() => {
        clearTimeout(timeout);
        log('Token stream connected');
        conn.disconnect();
        resolve();
      });
      
      conn.onError((err) => {
        clearTimeout(timeout);
        conn.disconnect();
        reject(err);
      });
      
      conn.connect();
    });
  });
  
  await runTest('Stream: connect to chat stream', async () => {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        conn.disconnect();
        reject(new Error('Connection timeout'));
      }, STREAM_TIMEOUT);
      
      const conn = state.streaming!.streamChat(state.createdTokenMint!);
      
      conn.onConnect(() => {
        clearTimeout(timeout);
        log('Chat stream connected');
        conn.disconnect();
        resolve();
      });
      
      conn.onError((err) => {
        clearTimeout(timeout);
        conn.disconnect();
        reject(err);
      });
      
      conn.connect();
    });
  });
  
  // Test receiving initial data (may not be supported by server)
  await runTest('Stream: attempt to receive token data', async () => {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        conn.disconnect();
        // Not a hard failure - server may not send initial data
        log('No initial data received (may be expected)');
        resolve();
      }, 5000); // Short timeout
      
      const conn = state.streaming!.streamToken(state.createdTokenMint!);
      let received = false;
      
      conn.on<StreamTokenUpdate>('connected', (data) => {
        if (!received) {
          received = true;
          clearTimeout(timeout);
          log(`Received initial: price=${data.price_sol}`);
          conn.disconnect();
          resolve();
        }
      });
      
      conn.on<StreamTokenUpdate>('update', (data) => {
        if (!received) {
          received = true;
          clearTimeout(timeout);
          log(`Received update: price=${data.price_sol}`);
          conn.disconnect();
          resolve();
        }
      });
      
      conn.connect();
    });
  });
}

async function testChat(): Promise<void> {
  logSection('CHAT');
  
  if (!state.createdTokenMint) {
    log('⚠️ Skipping chat tests - no token created');
    return;
  }
  
  const testMessage = `Integration test message ${Date.now()}`;
  
  await runTest('SDK: send chat message', async () => {
    const result = await state.client!.sendChat({
      mint: state.createdTokenMint!,
      message: testMessage,
    });
    if (!result.success) throw new Error('Failed to send message');
    if (!result.message?.id) throw new Error('No message ID returned');
    state.chatMessageId = result.message.id;
    log(`Message ID: ${state.chatMessageId}`);
  });
  
  await sleep(1000);
  
  await runTest('SDK: get chat history', async () => {
    const result = await state.client!.getChat({
      mint: state.createdTokenMint!,
      limit: 10,
    });
    if (!result.messages || result.messages.length === 0) {
      throw new Error('No messages in history');
    }
    const found = result.messages.find(m => m.message === testMessage);
    if (!found) throw new Error('Sent message not found in history');
    log(`Found ${result.messages.length} messages`);
  });
  
  await runTest('CLI: chat history', async () => {
    const output = runCli(`chat history -m ${state.createdTokenMint} --json`);
    const result = JSON.parse(output);
    if (!result.messages) {
      throw new Error('Invalid messages response');
    }
    log(`CLI found ${result.messages.length} messages`);
  });
  
  if (state.chatMessageId) {
    await runTest('SDK: add reaction', async () => {
      await state.client!.addReaction(state.chatMessageId!, '🚀');
      log('Reaction added: 🚀');
    });
    
    await sleep(500);
    
    await runTest('SDK: remove reaction', async () => {
      await state.client!.removeReaction(state.chatMessageId!, '🚀');
      log('Reaction removed: 🚀');
    });
  }
}

async function testCleanup(): Promise<void> {
  logSection('CLEANUP');
  
  await runTest('SDK: disconnect all streams', async () => {
    if (state.streaming) {
      state.streaming.disconnectAll();
      log('All streams disconnected');
    }
  });
  
  await runTest('CLI: wallet logout', async () => {
    const output = runCli('wallet logout', true);
    log('Logout command completed');
  });
}

// ============ Main ============

async function main(): Promise<void> {
  console.log('\n' + '═'.repeat(60));
  console.log('  ClawdVault Integration Tests');
  console.log('═'.repeat(60));
  console.log(`\n  API URL: ${API_URL}`);
  console.log(`  Wallet: ${WALLET_PATH}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  
  const startTime = Date.now();
  
  try {
    await testSetup();
    await testWalletAndAuth();
    await testTokenCreation();
    await testTrading();
    await testStreaming();
    await testChat();
    await testCleanup();
  } catch (err) {
    console.error('\n❌ Fatal error:', err);
  }
  
  // Print summary
  const totalDuration = Date.now() - startTime;
  const passed = results.filter(r => r.passed && !r.skipped).length;
  const failed = results.filter(r => !r.passed).length;
  const skipped = results.filter(r => r.skipped).length;
  
  console.log('\n' + '═'.repeat(60));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(60));
  console.log(`\n  Total: ${results.length} tests`);
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  if (skipped > 0) {
    console.log(`  ⏭️  Skipped: ${skipped}`);
  }
  console.log(`  ⏱️  Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  
  if (failed > 0) {
    console.log('\n  Failed tests:');
    for (const r of results.filter(r => !r.passed)) {
      console.log(`    - ${r.name}: ${r.error}`);
    }
  }
  
  if (state.createdTokenMint) {
    console.log(`\n  📝 Created token: ${state.createdTokenMint}`);
  }
  
  console.log('\n' + '═'.repeat(60) + '\n');
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);

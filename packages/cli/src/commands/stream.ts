/**
 * Streaming commands - real-time data feeds
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import {
  spinner,
  formatSol,
  formatTokens,
  formatUsd,
  shortenAddress,
  handleError,
  info,
  warn,
  success,
  createReadOnlyClient,
} from '../utils';
import {
  createStreaming,
  StreamTrade,
  StreamTokenUpdate,
  StreamTokenConnected,
  StreamChatMessage,
} from '@clawdvault/sdk';

// Get base URL from environment
function getBaseUrl(): string {
  return process.env.CLAWDVAULT_API_URL || 'https://clawdvault.com/api';
}

export const streamCommand = new Command('stream')
  .description('Real-time streaming commands');

// Stream trades
streamCommand
  .command('trades')
  .description('Stream real-time trades for a token')
  .requiredOption('-m, --mint <address>', 'Token mint address')
  .option('--json', 'Output as JSON (one object per line)')
  .option('--append', 'Append mode instead of table (good for logging)')
  .action(async (options) => {
    const baseUrl = getBaseUrl();
    
    console.log(chalk.bold(`\n📡 Streaming trades for ${shortenAddress(options.mint)}\n`));
    info(`Connecting to ${baseUrl}...`);
    console.log(chalk.dim('Press Ctrl+C to stop\n'));
    
    const streaming = createStreaming(baseUrl, {
      autoReconnect: true,
      reconnectDelay: 3000,
    });
    
    const conn = streaming.streamTrades(options.mint);
    
    // Track trades for table mode
    const trades: StreamTrade[] = [];
    const MAX_DISPLAY = 20;
    
    conn.onConnect(() => {
      success('Connected to stream');
      console.log();
    });
    
    conn.onDisconnect(() => {
      warn('Disconnected - reconnecting...');
    });
    
    conn.onError((err) => {
      if (!err.message.includes('Max reconnect')) {
        // Ignore normal reconnect errors
      } else {
        console.error(chalk.red(`Error: ${err.message}`));
        process.exit(1);
      }
    });
    
    // Track seen trade IDs to avoid duplicates
    const seenTrades = new Set<string>();
    
    conn.on<StreamTrade>('trade', (trade) => {
      // Skip duplicates
      if (seenTrades.has(trade.id)) {
        return;
      }
      seenTrades.add(trade.id);
      
      // Limit set size
      if (seenTrades.size > 1000) {
        const first = seenTrades.values().next().value;
        if (first) seenTrades.delete(first);
      }
      
      if (options.json) {
        // JSON mode: one line per trade
        console.log(JSON.stringify(trade));
        return;
      }
      
      if (options.append) {
        // Append mode: simple one-line format
        const typeStr = trade.type === 'buy' 
          ? chalk.green('BUY ') 
          : chalk.red('SELL');
        const time = new Date(trade.created_at).toLocaleTimeString();
        console.log(
          `${chalk.dim(time)} ${typeStr} ${formatSol(trade.sol_amount).padEnd(15)} ` +
          `${formatTokens(trade.token_amount).padEnd(12)} @ ${formatSol(trade.price_sol).padEnd(18)} ` +
          `${chalk.dim(shortenAddress(trade.trader))}`
        );
        return;
      }
      
      // Table mode: update display
      trades.unshift(trade);
      if (trades.length > MAX_DISPLAY) {
        trades.pop();
      }
      
      // Clear screen and redraw
      console.clear();
      console.log(chalk.bold(`\n📡 Live Trades - ${shortenAddress(options.mint)}\n`));
      
      const table = new Table({
        head: [
          chalk.cyan('Type'),
          chalk.cyan('SOL'),
          chalk.cyan('Tokens'),
          chalk.cyan('Price'),
          chalk.cyan('Trader'),
          chalk.cyan('Time'),
        ],
        style: { head: [], border: [] },
      });
      
      for (const t of trades) {
        const typeStr = t.type === 'buy' 
          ? chalk.green('BUY') 
          : chalk.red('SELL');
        
        table.push([
          typeStr,
          formatSol(t.sol_amount),
          formatTokens(t.token_amount),
          formatSol(t.price_sol),
          shortenAddress(t.trader),
          new Date(t.created_at).toLocaleTimeString(),
        ]);
      }
      
      console.log(table.toString());
      console.log(chalk.dim('\nPress Ctrl+C to stop'));
    });
    
    conn.connect();
    
    // Handle graceful shutdown
    let isShuttingDown = false;
    const shutdown = async () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      console.log('\n');
      info('Disconnecting...');
      streaming.disconnectAll();
      
      // Give time for cleanup
      await new Promise(r => setTimeout(r, 500));
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    // Keep process alive
    await new Promise(() => {});
  });

// Stream token price/market cap
streamCommand
  .command('token')
  .description('Stream real-time token updates (price, market cap)')
  .requiredOption('-m, --mint <address>', 'Token mint address')
  .option('--json', 'Output as JSON (one object per line)')
  .action(async (options) => {
    const baseUrl = getBaseUrl();
    
    console.log(chalk.bold(`\n📈 Watching token ${shortenAddress(options.mint)}\n`));
    info(`Connecting to ${baseUrl}...`);
    console.log(chalk.dim('Press Ctrl+C to stop\n'));
    
    const streaming = createStreaming(baseUrl);
    const conn = streaming.streamToken(options.mint);
    
    // Get SOL price for USD conversion
    const client = createReadOnlyClient();
    let solPrice = 0;
    try {
      const { price } = await client.getSolPrice();
      solPrice = price ?? 0;
    } catch {
      // Continue without USD prices
    }
    
    let tokenInfo: { name?: string; symbol?: string } = {};
    let lastUpdate: StreamTokenUpdate | null = null;
    
    const displayUpdate = (update: StreamTokenUpdate) => {
      if (options.json) {
        console.log(JSON.stringify({ ...update, ...tokenInfo }));
        return;
      }
      
      // Clear and redraw
      console.clear();
      console.log(chalk.bold(`\n📈 ${tokenInfo.name || 'Token'} (${tokenInfo.symbol || shortenAddress(options.mint)})\n`));
      
      const table = new Table({
        style: { head: [], border: [] },
      });
      
      const priceUsd = solPrice > 0 ? formatUsd(update.price_sol * solPrice) : '-';
      const mcapUsd = solPrice > 0 ? formatUsd(update.market_cap_sol * solPrice) : '-';
      
      table.push(
        { [chalk.cyan('Price (SOL)')]: formatSol(update.price_sol) },
        { [chalk.cyan('Price (USD)')]: priceUsd },
        { [chalk.cyan('Market Cap (SOL)')]: formatSol(update.market_cap_sol) },
        { [chalk.cyan('Market Cap (USD)')]: mcapUsd },
        { [chalk.cyan('Bonding Curve SOL')]: formatSol(update.real_sol_reserves) },
        { [chalk.cyan('Status')]: update.graduated ? chalk.green('✓ Graduated') : chalk.yellow('Bonding Curve') },
      );
      
      console.log(table.toString());
      
      // Show change if we have a previous value
      if (lastUpdate && lastUpdate.price_sol !== update.price_sol) {
        const change = ((update.price_sol - lastUpdate.price_sol) / lastUpdate.price_sol) * 100;
        const changeStr = change >= 0 
          ? chalk.green(`+${change.toFixed(2)}%`)
          : chalk.red(`${change.toFixed(2)}%`);
        console.log(`\n${chalk.dim('Last change:')} ${changeStr}`);
      }
      
      console.log(chalk.dim('\nLast update: ' + new Date(update.timestamp).toLocaleTimeString()));
      console.log(chalk.dim('Press Ctrl+C to stop'));
      
      lastUpdate = update;
    };
    
    conn.onConnect(() => {
      success('Connected to stream');
    });
    
    conn.onDisconnect(() => {
      warn('Disconnected - reconnecting...');
    });
    
    // Initial connection event
    conn.on<StreamTokenConnected>('connected', (data) => {
      tokenInfo = { name: data.name, symbol: data.symbol };
      displayUpdate(data);
    });
    
    // Price updates
    conn.on<StreamTokenUpdate>('update', displayUpdate);
    
    // Trade notifications
    conn.on<{ type: string; price_sol?: number; sol_amount?: number }>('trade', (trade) => {
      if (lastUpdate && trade.price_sol !== undefined) {
        lastUpdate.price_sol = trade.price_sol;
        displayUpdate(lastUpdate);
      }
    });
    
    conn.connect();
    
    // Handle graceful shutdown
    let isShuttingDown = false;
    const shutdown = async () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      console.log('\n');
      info('Disconnecting...');
      streaming.disconnectAll();
      
      // Give time for cleanup
      await new Promise(r => setTimeout(r, 500));
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    await new Promise(() => {});
  });

// Stream chat messages
streamCommand
  .command('chat')
  .description('Stream real-time chat messages for a token')
  .requiredOption('-m, --mint <address>', 'Token mint address')
  .option('--json', 'Output as JSON (one object per line)')
  .action(async (options) => {
    const baseUrl = getBaseUrl();
    
    console.log(chalk.bold(`\n💬 Streaming chat for ${shortenAddress(options.mint)}\n`));
    info(`Connecting to ${baseUrl}...`);
    console.log(chalk.dim('Press Ctrl+C to stop\n'));
    
    const streaming = createStreaming(baseUrl);
    const conn = streaming.streamChat(options.mint);
    
    conn.onConnect(() => {
      success('Connected to stream');
      console.log();
    });
    
    conn.onDisconnect(() => {
      warn('Disconnected - reconnecting...');
    });
    
    // Track seen message IDs to avoid duplicates (serverless can create multiple subscriptions)
    const seenMessages = new Set<string>();
    
    conn.on<StreamChatMessage>('message', (msg) => {
      // Skip duplicates
      if (seenMessages.has(msg.id)) {
        return;
      }
      seenMessages.add(msg.id);
      
      // Limit set size to prevent memory leak
      if (seenMessages.size > 1000) {
        const first = seenMessages.values().next().value;
        if (first) seenMessages.delete(first);
      }
      
      if (options.json) {
        console.log(JSON.stringify(msg));
        return;
      }
      
      const time = new Date(msg.created_at).toLocaleTimeString();
      const sender = msg.username || shortenAddress(msg.wallet);
      
      console.log(
        `${chalk.dim(time)} ${chalk.cyan(sender)}: ${msg.message}`
      );
    });
    
    conn.connect();
    
    // Handle graceful shutdown
    let isShuttingDown = false;
    const shutdown = async () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      
      console.log('\n');
      info('Disconnecting...');
      streaming.disconnectAll();
      
      // Give time for cleanup
      await new Promise(r => setTimeout(r, 500));
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    await new Promise(() => {});
  });

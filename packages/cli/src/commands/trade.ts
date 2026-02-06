/**
 * Trade commands (buy/sell)
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { 
  spinner, 
  formatSol, 
  formatTokens,
  formatPercent,
  shortenAddress, 
  handleError,
  success,
  info,
  warn,
  link,
  createClientWithWallet,
  createReadOnlyClient,
  requireWallet,
} from '../utils';
import {
  createStreaming,
  StreamTrade,
} from '@clawdvault/sdk';

export const tradeCommand = new Command('trade')
  .description('Trading operations');

// Buy tokens
tradeCommand
  .command('buy')
  .description('Buy tokens')
  .requiredOption('-m, --mint <address>', 'Token mint address')
  .requiredOption('-a, --sol <amount>', 'Amount of SOL to spend')
  .option('-s, --slippage <percent>', 'Slippage tolerance (default: 1%)', '1')
  .option('-w, --wallet <path>', 'Wallet file path')
  .option('--simulate', 'Only simulate, don\'t execute')
  .action(async (options) => {
    const { client, signer, walletAddress } = createClientWithWallet(options.wallet);
    requireWallet(signer);
    
    const solAmount = parseFloat(options.sol);
    const slippage = parseFloat(options.slippage) / 100;
    
    // Get quote first
    const quoteSpin = spinner('Getting quote...').start();
    
    try {
      const quote = await client.getQuote({
        mint: options.mint,
        type: 'buy',
        amount: solAmount,
      });
      
      quoteSpin.stop();
      
      console.log(chalk.bold('\n📊 Trade Preview\n'));
      
      const table = new Table({
        style: { head: [], border: [] },
      });
      
      const priceImpact = quote.price_impact ?? 0;
      
      table.push(
        { [chalk.cyan('Input')]: `${solAmount} SOL` },
        { [chalk.cyan('Output')]: `~${formatTokens(quote.output ?? 0)} tokens` },
        { [chalk.cyan('Price')]: formatSol(quote.current_price ?? 0) },
        { [chalk.cyan('Fee')]: formatSol(quote.fee ?? 0) },
        { [chalk.cyan('Price Impact')]: formatPercent(priceImpact) },
        { [chalk.cyan('Slippage')]: `${(slippage * 100).toFixed(1)}%` },
      );
      
      console.log(table.toString());
      
      if (options.simulate) {
        info('Simulation only - no transaction executed');
        return;
      }
      
      // Check for high price impact
      if (priceImpact > 0.05) {
        warn(`High price impact: ${(priceImpact * 100).toFixed(2)}%`);
      }
      
      console.log();
      const tradeSpin = spinner('Executing trade...').start();
      
      // Check if graduated and route appropriately
      const jupiterStatus = await client.getJupiterStatus(options.mint);
      
      let result;
      if (jupiterStatus.graduated) {
        info('Token graduated - routing through Jupiter');
        result = await client.buyJupiter(options.mint, solAmount, Math.floor(slippage * 10000));
      } else {
        result = await client.buy(options.mint, solAmount, slippage);
      }
      
      tradeSpin.stop();
      
      success('Trade executed successfully!');
      console.log();
      info(`Signature: ${result.signature}`);
      info(`SOL spent: ${formatSol(result.trade?.solAmount ?? 0)}`);
      info(`Tokens received: ${formatTokens(result.trade?.tokenAmount ?? 0)}`);
      console.log();
      info(`Explorer: ${link(result.explorer ?? '')}`);
      console.log();
    } catch (err) {
      quoteSpin.stop();
      handleError(err);
    }
  });

// Sell tokens
tradeCommand
  .command('sell')
  .description('Sell tokens')
  .requiredOption('-m, --mint <address>', 'Token mint address')
  .option('-a, --amount <tokens>', 'Amount of tokens to sell')
  .option('-p, --percent <percent>', 'Percentage of holdings to sell')
  .option('-s, --slippage <percent>', 'Slippage tolerance (default: 1%)', '1')
  .option('-w, --wallet <path>', 'Wallet file path')
  .option('--simulate', 'Only simulate, don\'t execute')
  .action(async (options) => {
    const { client, signer, walletAddress } = createClientWithWallet(options.wallet);
    requireWallet(signer);
    
    if (!options.amount && !options.percent) {
      throw new Error('Must specify --amount or --percent');
    }
    
    const slippage = parseFloat(options.slippage) / 100;
    
    // Get balance first
    const balanceSpin = spinner('Checking balance...').start();
    
    try {
      const { balance: rawBalance } = await client.getMyBalance(options.mint);
      const balance = rawBalance ?? 0;
      
      balanceSpin.stop();
      
      if (balance <= 0) {
        throw new Error('No tokens to sell');
      }
      
      let tokenAmount: number;
      if (options.percent) {
        const percent = parseFloat(options.percent);
        tokenAmount = balance * (percent / 100);
        info(`Selling ${percent}% of ${formatTokens(balance)} tokens`);
      } else {
        tokenAmount = parseFloat(options.amount);
        if (tokenAmount > balance) {
          throw new Error(`Insufficient balance. Have ${formatTokens(balance)}, trying to sell ${formatTokens(tokenAmount)}`);
        }
      }
      
      // Get quote
      const quoteSpin = spinner('Getting quote...').start();
      
      const quote = await client.getQuote({
        mint: options.mint,
        type: 'sell',
        amount: tokenAmount,
      });
      
      quoteSpin.stop();
      
      console.log(chalk.bold('\n📊 Trade Preview\n'));
      
      const table = new Table({
        style: { head: [], border: [] },
      });
      
      const sellPriceImpact = quote.price_impact ?? 0;
      
      table.push(
        { [chalk.cyan('Input')]: `${formatTokens(tokenAmount)} tokens` },
        { [chalk.cyan('Output')]: `~${formatSol(quote.output ?? 0)}` },
        { [chalk.cyan('Price')]: formatSol(quote.current_price ?? 0) },
        { [chalk.cyan('Fee')]: formatSol(quote.fee ?? 0) },
        { [chalk.cyan('Price Impact')]: formatPercent(-sellPriceImpact) },
        { [chalk.cyan('Slippage')]: `${(slippage * 100).toFixed(1)}%` },
      );
      
      console.log(table.toString());
      
      if (options.simulate) {
        info('Simulation only - no transaction executed');
        return;
      }
      
      // Check for high price impact
      if (sellPriceImpact > 0.05) {
        warn(`High price impact: ${(sellPriceImpact * 100).toFixed(2)}%`);
      }
      
      console.log();
      const tradeSpin = spinner('Executing trade...').start();
      
      // Check if graduated and route appropriately
      const jupiterStatus = await client.getJupiterStatus(options.mint);
      
      let result;
      if (jupiterStatus.graduated) {
        info('Token graduated - routing through Jupiter');
        result = await client.sellJupiter(options.mint, tokenAmount, Math.floor(slippage * 10000));
      } else {
        result = await client.sell(options.mint, tokenAmount, slippage);
      }
      
      tradeSpin.stop();
      
      success('Trade executed successfully!');
      console.log();
      info(`Signature: ${result.signature}`);
      info(`Tokens sold: ${formatTokens(result.trade?.tokenAmount ?? 0)}`);
      info(`SOL received: ${formatSol(result.trade?.solAmount ?? 0)}`);
      console.log();
      info(`Explorer: ${link(result.explorer ?? '')}`);
      console.log();
    } catch (err) {
      balanceSpin.stop();
      handleError(err);
    }
  });

// Get quote
tradeCommand
  .command('quote')
  .description('Get a price quote without executing')
  .requiredOption('-m, --mint <address>', 'Token mint address')
  .requiredOption('-t, --type <type>', 'Trade type (buy or sell)')
  .requiredOption('-a, --amount <amount>', 'Amount (SOL for buy, tokens for sell)')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spin = spinner('Getting quote...').start();
    
    try {
      const client = createReadOnlyClient();
      
      const quote = await client.getQuote({
        mint: options.mint,
        type: options.type,
        amount: parseFloat(options.amount),
      });
      
      spin.stop();
      
      if (options.json) {
        console.log(JSON.stringify(quote, null, 2));
        return;
      }
      
      const isBuy = options.type === 'buy';
      
      console.log(chalk.bold(`\n💱 ${isBuy ? 'Buy' : 'Sell'} Quote\n`));
      
      const table = new Table({
        style: { head: [], border: [] },
      });
      
      const quotePriceImpact = quote.price_impact ?? 0;
      
      table.push(
        { [chalk.cyan('Input')]: isBuy ? `${options.amount} SOL` : `${formatTokens(parseFloat(options.amount))} tokens` },
        { [chalk.cyan('Output')]: isBuy ? `~${formatTokens(quote.output ?? 0)} tokens` : `~${formatSol(quote.output ?? 0)}` },
        { [chalk.cyan('Price')]: formatSol(quote.current_price ?? 0) },
        { [chalk.cyan('Fee')]: formatSol(quote.fee ?? 0) },
        { [chalk.cyan('Price Impact')]: formatPercent(isBuy ? quotePriceImpact : -quotePriceImpact) },
      );
      
      console.log(table.toString());
      console.log();
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

// Get trade history
tradeCommand
  .command('history')
  .description('Get trade history for a token')
  .requiredOption('-m, --mint <address>', 'Token mint address')
  .option('-l, --limit <number>', 'Number of trades', '20')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spin = spinner('Fetching trades...').start();
    
    try {
      const client = createReadOnlyClient();
      
      const result = await client.getTrades({
        mint: options.mint,
        limit: parseInt(options.limit),
      });
      
      spin.stop();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      console.log(chalk.bold(`\n📜 Trade History\n`));
      
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
      
      for (const trade of result.trades ?? []) {
        const typeStr = trade.type === 'buy' 
          ? chalk.green('BUY') 
          : chalk.red('SELL');
        
        table.push([
          typeStr,
          formatSol(trade.sol_amount ?? 0),
          formatTokens(trade.token_amount ?? 0),
          formatSol(trade.price ?? 0),
          shortenAddress(trade.trader ?? ''),
          new Date(trade.created_at ?? Date.now()).toLocaleString(),
        ]);
      }
      
      console.log(table.toString());
      console.log();
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

// Stream trades in real-time
tradeCommand
  .command('stream')
  .description('Stream trades in real-time')
  .requiredOption('-m, --mint <address>', 'Token mint address')
  .option('--json', 'Output as JSON (one object per line)')
  .option('--append', 'Append mode (simple log format)')
  .action(async (options) => {
    const baseUrl = process.env.CLAWDVAULT_API_URL || 'https://clawdvault.com/api';
    
    console.log(chalk.bold(`\n📡 Streaming trades for ${shortenAddress(options.mint)}\n`));
    info(`Connecting to ${baseUrl}...`);
    console.log(chalk.dim('Press Ctrl+C to stop\n'));
    
    const streaming = createStreaming(baseUrl);
    const conn = streaming.streamTrades(options.mint);
    
    const trades: StreamTrade[] = [];
    const MAX_DISPLAY = 20;
    
    conn.onConnect(() => {
      success('Connected to stream');
      console.log();
    });
    
    conn.onDisconnect(() => warn('Disconnected - reconnecting...'));
    
    conn.on<StreamTrade>('trade', (trade) => {
      if (options.json) {
        console.log(JSON.stringify(trade));
        return;
      }
      
      if (options.append) {
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
      
      // Table mode
      trades.unshift(trade);
      if (trades.length > MAX_DISPLAY) {
        trades.pop();
      }
      
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
    
    process.on('SIGINT', () => {
      console.log('\n');
      info('Disconnecting...');
      streaming.disconnectAll();
      process.exit(0);
    });
    
    await new Promise(() => {});
  });

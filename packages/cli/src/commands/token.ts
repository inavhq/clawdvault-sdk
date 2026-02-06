/**
 * Token management commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import * as fs from 'fs';
import { 
  spinner, 
  formatSol, 
  formatTokens,
  formatUsd,
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
  StreamTokenUpdate,
  StreamTokenConnected,
} from '@clawdvault/sdk';

export const tokenCommand = new Command('token')
  .description('Token operations');

// Get token details
tokenCommand
  .command('get <mint>')
  .description('Get token details')
  .option('--json', 'Output as JSON')
  .action(async (mint: string, options) => {
    const spin = spinner('Fetching token...').start();
    
    try {
      const client = createReadOnlyClient();
      const result = await client.getToken(mint);
      
      spin.stop();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      const token = result.token;
      const trades = result.trades ?? [];
      
      if (!token) {
        console.log(chalk.yellow('Token not found'));
        return;
      }
      
      console.log(chalk.bold(`\n🪙 ${token.name ?? 'Unknown'} (${token.symbol ?? '???'})\n`));
      
      const table = new Table({
        style: { head: [], border: [] },
      });
      
      table.push(
        { [chalk.cyan('Mint')]: token.mint ?? '' },
        { [chalk.cyan('Creator')]: shortenAddress(token.creator ?? '') },
        { [chalk.cyan('Price')]: formatSol(token.price_sol ?? 0) },
        { [chalk.cyan('Market Cap')]: formatSol(token.market_cap_sol ?? 0) },
        { [chalk.cyan('Status')]: token.graduated ? '🎓 Graduated' : '📈 Bonding Curve' },
      );
      
      if (token.description) {
        table.push({ [chalk.cyan('Description')]: token.description });
      }
      
      if (token.twitter) {
        table.push({ [chalk.cyan('Twitter')]: token.twitter });
      }
      
      if (token.telegram) {
        table.push({ [chalk.cyan('Telegram')]: token.telegram });
      }
      
      if (token.website) {
        table.push({ [chalk.cyan('Website')]: token.website });
      }
      
      console.log(table.toString());
      
      // Show recent trades
      if (trades.length > 0) {
        console.log(chalk.bold(`\n📊 Recent Trades\n`));
        
        const tradesTable = new Table({
          head: [
            chalk.cyan('Type'),
            chalk.cyan('SOL'),
            chalk.cyan('Tokens'),
            chalk.cyan('Trader'),
            chalk.cyan('Time'),
          ],
          style: { head: [], border: [] },
        });
        
        for (const trade of trades.slice(0, 10)) {
          const typeStr = trade.type === 'buy' 
            ? chalk.green('BUY') 
            : chalk.red('SELL');
          
          tradesTable.push([
            typeStr,
            formatSol(trade.sol_amount ?? 0),
            formatTokens(trade.token_amount ?? 0),
            shortenAddress(trade.trader ?? ''),
            new Date(trade.created_at ?? Date.now()).toLocaleString(),
          ]);
        }
        
        console.log(tradesTable.toString());
      }
      
      console.log();
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

// Create token
tokenCommand
  .command('create')
  .description('Create a new token')
  .requiredOption('-n, --name <name>', 'Token name')
  .requiredOption('-s, --symbol <symbol>', 'Token symbol')
  .option('-d, --description <desc>', 'Token description')
  .option('-i, --image <path>', 'Image file path')
  .option('--initial-buy <sol>', 'Initial buy amount in SOL')
  .option('--twitter <url>', 'Twitter URL')
  .option('--telegram <url>', 'Telegram URL')
  .option('--website <url>', 'Website URL')
  .option('-w, --wallet <path>', 'Wallet file path')
  .action(async (options) => {
    const { client, signer } = createClientWithWallet(options.wallet);
    requireWallet(signer);
    
    let imageUrl: string | undefined;
    
    // Upload image if provided
    if (options.image) {
      if (!fs.existsSync(options.image)) {
        throw new Error(`Image file not found: ${options.image}`);
      }
      
      const uploadSpin = spinner('Uploading image...').start();
      try {
        const upload = await client.uploadImageFromPath(options.image);
        imageUrl = upload.url;
        uploadSpin.succeed('Image uploaded');
      } catch (err) {
        uploadSpin.fail('Image upload failed');
        throw err;
      }
    }
    
    const createSpin = spinner('Creating token...').start();
    
    try {
      const result = await client.createToken({
        name: options.name,
        symbol: options.symbol,
        description: options.description,
        image: imageUrl,
        initialBuy: options.initialBuy ? parseFloat(options.initialBuy) : undefined,
        twitter: options.twitter,
        telegram: options.telegram,
        website: options.website,
      });
      
      createSpin.stop();
      
      success(`Token created successfully!`);
      console.log();
      info(`Name: ${result.token?.name ?? 'Unknown'}`);
      info(`Symbol: ${result.token?.symbol ?? '???'}`);
      info(`Mint: ${result.mint ?? ''}`);
      info(`Signature: ${result.signature ?? ''}`);
      console.log();
      info(`Explorer: ${link(result.explorer ?? '')}`);
      info(`View: ${link(`https://clawdvault.com/${result.mint ?? ''}`)}`);
      console.log();
    } catch (err) {
      createSpin.stop();
      handleError(err);
    }
  });

// Get token stats
tokenCommand
  .command('stats <mint>')
  .description('Get on-chain stats')
  .option('--json', 'Output as JSON')
  .action(async (mint: string, options) => {
    const spin = spinner('Fetching stats...').start();
    
    try {
      const client = createReadOnlyClient();
      const result = await client.getStats(mint);
      
      spin.stop();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      console.log(chalk.bold(`\n📈 On-Chain Stats\n`));
      
      const onChain = result.onChain;
      
      if (!onChain) {
        console.log(chalk.yellow('No on-chain data available'));
        return;
      }
      
      const table = new Table({
        style: { head: [], border: [] },
      });
      
      table.push(
        { [chalk.cyan('Price')]: formatSol(onChain.price ?? 0) },
        { [chalk.cyan('Market Cap')]: formatSol(onChain.marketCap ?? 0) },
        { [chalk.cyan('Total Supply')]: formatTokens(onChain.totalSupply ?? 0) },
        { [chalk.cyan('Circulating')]: formatTokens(onChain.circulatingSupply ?? 0) },
        { [chalk.cyan('Curve Balance')]: formatTokens(onChain.bondingCurveBalance ?? 0) },
        { [chalk.cyan('Curve SOL')]: formatSol(onChain.bondingCurveSol ?? 0) },
        { [chalk.cyan('Status')]: onChain.graduated ? '🎓 Graduated' : '📈 Bonding' },
      );
      
      console.log(table.toString());
      console.log();
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

// Get holders
tokenCommand
  .command('holders <mint>')
  .description('Get top token holders')
  .option('--json', 'Output as JSON')
  .action(async (mint: string, options) => {
    const spin = spinner('Fetching holders...').start();
    
    try {
      const client = createReadOnlyClient();
      const result = await client.getHolders(mint);
      
      spin.stop();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      console.log(chalk.bold(`\n👥 Top Holders\n`));
      
      const table = new Table({
        head: [
          chalk.cyan('#'),
          chalk.cyan('Address'),
          chalk.cyan('Balance'),
          chalk.cyan('%'),
          chalk.cyan('Label'),
        ],
        style: { head: [], border: [] },
      });
      
      (result.holders ?? []).forEach((holder, i) => {
        table.push([
          i + 1,
          shortenAddress(holder.address ?? ''),
          formatTokens(holder.balance ?? 0),
          `${(holder.percentage ?? 0).toFixed(2)}%`,
          holder.label || '-',
        ]);
      });
      
      console.log(table.toString());
      console.log();
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

// Watch token price (streaming)
tokenCommand
  .command('watch <mint>')
  .description('Watch token price in real-time')
  .option('--json', 'Output as JSON')
  .action(async (mint: string, options) => {
    const baseUrl = process.env.CLAWDVAULT_API_URL || 'https://clawdvault.com/api';
    
    console.log(chalk.bold(`\n📈 Watching ${shortenAddress(mint)}\n`));
    info(`Connecting to ${baseUrl}...`);
    console.log(chalk.dim('Press Ctrl+C to stop\n'));
    
    const streaming = createStreaming(baseUrl);
    const conn = streaming.streamToken(mint);
    
    // Get SOL price for USD conversion
    const client = createReadOnlyClient();
    let solPrice: number = 0;
    try {
      const priceResult = await client.getSolPrice();
      solPrice = priceResult.price ?? 0;
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
      
      console.clear();
      console.log(chalk.bold(`\n📈 ${tokenInfo.name || 'Token'} (${tokenInfo.symbol || shortenAddress(mint)})\n`));
      
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
    
    conn.onConnect(() => success('Connected to stream'));
    conn.onDisconnect(() => warn('Disconnected - reconnecting...'));
    
    conn.on<StreamTokenConnected>('connected', (data) => {
      tokenInfo = { name: data.name, symbol: data.symbol };
      displayUpdate(data);
    });
    
    conn.on<StreamTokenUpdate>('update', displayUpdate);
    
    conn.on<{ type: string; price_sol: number; sol_amount: number }>('trade', (trade) => {
      if (lastUpdate) {
        lastUpdate.price_sol = trade.price_sol;
        displayUpdate(lastUpdate);
      }
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

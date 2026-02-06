/**
 * Wallet commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import * as fs from 'fs';
import * as path from 'path';
import { 
  Keypair, 
  Connection, 
  PublicKey, 
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { 
  spinner, 
  formatSol, 
  formatTokens,
  formatUsd,
  handleError,
  success,
  info,
  warn,
  error,
  createClientWithWallet,
  getConfigDir,
  getWalletPath,
  loadSigner,
  requireWallet,
} from '../utils';

export const walletCommand = new Command('wallet')
  .description('Wallet operations');

// Show wallet info
walletCommand
  .command('info')
  .description('Show wallet information')
  .option('-w, --wallet <path>', 'Wallet file path')
  .action(async (options) => {
    try {
      const { signer, walletAddress } = createClientWithWallet(options.wallet);
      
      if (!signer) {
        warn('No wallet configured');
        info('Set CLAWDVAULT_WALLET environment variable');
        info('Or use: clawdvault wallet init');
        return;
      }
      
      console.log(chalk.bold('\n👛 Wallet Info\n'));
      
      const table = new Table({
        style: { head: [], border: [] },
      });
      
      table.push(
        { [chalk.cyan('Address')]: walletAddress },
        { [chalk.cyan('Source')]: options.wallet || getWalletPath() || 'environment' },
      );
      
      console.log(table.toString());
      console.log();
    } catch (err) {
      handleError(err);
    }
  });

// Generate new wallet
walletCommand
  .command('init')
  .description('Generate a new wallet')
  .option('-o, --output <path>', 'Output file path (default: ~/.clawdvault/wallet.json)')
  .option('--force', 'Overwrite existing wallet')
  .action(async (options) => {
    try {
      const configDir = getConfigDir();
      const outputPath = options.output || path.join(configDir, 'wallet.json');
      
      // Check if wallet exists
      if (fs.existsSync(outputPath) && !options.force) {
        warn(`Wallet already exists at ${outputPath}`);
        info('Use --force to overwrite');
        return;
      }
      
      // Create config dir if needed
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      // Generate keypair
      const keypair = Keypair.generate();
      const secretKey = Array.from(keypair.secretKey);
      
      // Save wallet
      fs.writeFileSync(outputPath, JSON.stringify(secretKey));
      fs.chmodSync(outputPath, 0o600); // Secure permissions
      
      success('Wallet created successfully!');
      console.log();
      info(`Address: ${keypair.publicKey.toBase58()}`);
      info(`Saved to: ${outputPath}`);
      console.log();
      warn('⚠️  IMPORTANT: Back up your wallet file! Loss of this file means loss of funds.');
      console.log();
    } catch (err) {
      handleError(err);
    }
  });

// Get balance
walletCommand
  .command('balance')
  .description('Get wallet balance for a token')
  .requiredOption('-m, --mint <address>', 'Token mint address')
  .option('-w, --wallet <path>', 'Wallet file path')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spin = spinner('Fetching balance...').start();
    
    try {
      const { client, signer, walletAddress } = createClientWithWallet(options.wallet);
      
      if (!signer) {
        spin.stop();
        warn('No wallet configured');
        return;
      }
      
      const result = await client.getBalance(walletAddress!, options.mint);
      
      spin.stop();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      console.log(chalk.bold('\n💰 Token Balance\n'));
      
      const table = new Table({
        style: { head: [], border: [] },
      });
      
      table.push(
        { [chalk.cyan('Wallet')]: result.wallet },
        { [chalk.cyan('Token')]: result.mint },
        { [chalk.cyan('Balance')]: formatTokens(result.balance) },
      );
      
      console.log(table.toString());
      console.log();
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

// Show address from key
walletCommand
  .command('address')
  .description('Show address for a wallet file or private key')
  .option('-w, --wallet <path>', 'Wallet file path')
  .option('-k, --key <key>', 'Private key (base58)')
  .action(async (options) => {
    try {
      let signer;
      
      if (options.key) {
        signer = loadSigner(options.key);
      } else {
        const { signer: s } = createClientWithWallet(options.wallet);
        signer = s;
      }
      
      if (!signer) {
        warn('No wallet found');
        return;
      }
      
      console.log(signer.publicKey.toBase58());
    } catch (err) {
      handleError(err);
    }
  });

// Network status
walletCommand
  .command('network')
  .description('Show network status')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spin = spinner('Fetching network status...').start();
    
    try {
      const { client } = createClientWithWallet();
      const result = await client.getNetworkStatus();
      
      spin.stop();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      console.log(chalk.bold('\n🌐 Network Status\n'));
      
      const table = new Table({
        style: { head: [], border: [] },
      });
      
      table.push(
        { [chalk.cyan('Network')]: result.network },
        { [chalk.cyan('Program ID')]: result.programId },
        { [chalk.cyan('RPC URL')]: result.rpcUrl },
        { [chalk.cyan('Initialized')]: result.configInitialized ? '✓ Yes' : '✗ No' },
      );
      
      console.log(table.toString());
      console.log();
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

// SOL price
walletCommand
  .command('sol-price')
  .description('Get current SOL/USD price')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spin = spinner('Fetching SOL price...').start();
    
    try {
      const { client } = createClientWithWallet();
      const result = await client.getSolPrice();
      
      spin.stop();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      console.log(chalk.bold(`\n💲 SOL Price: $${result.price.toFixed(2)}\n`));
      
      if (result.cached) {
        info(`Cached ${result.age}s ago from ${result.source}`);
      }
      console.log();
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

// Helper to get RPC URL
function getRpcUrl(): string {
  return process.env.SOLANA_RPC_URL || process.env.RPC_URL || 'https://api.devnet.solana.com';
}

// Check if on devnet
function isDevnet(rpcUrl: string): boolean {
  return rpcUrl.includes('devnet');
}

// SOL balance
walletCommand
  .command('sol-balance')
  .description('Get SOL balance with USD value')
  .option('-w, --wallet <path>', 'Wallet file path')
  .option('--rpc <url>', 'Solana RPC URL')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spin = spinner('Fetching SOL balance...').start();
    
    try {
      const { client, signer, walletAddress } = createClientWithWallet(options.wallet);
      requireWallet(signer);
      
      const rpcUrl = options.rpc || getRpcUrl();
      const connection = new Connection(rpcUrl, 'confirmed');
      
      // Get SOL balance
      const balanceLamports = await connection.getBalance(signer.publicKey);
      const balanceSol = balanceLamports / LAMPORTS_PER_SOL;
      
      // Get SOL price for USD value
      let solPrice = 0;
      let usdValue = 0;
      try {
        const priceData = await client.getSolPrice();
        solPrice = priceData.price;
        usdValue = balanceSol * solPrice;
      } catch {
        // Price fetch failed, continue without USD value
      }
      
      spin.stop();
      
      const result = {
        wallet: walletAddress,
        balance: balanceSol,
        lamports: balanceLamports,
        usdValue: usdValue,
        solPrice: solPrice,
        rpc: rpcUrl,
        network: isDevnet(rpcUrl) ? 'devnet' : 'mainnet',
      };
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      console.log(chalk.bold('\n💰 SOL Balance\n'));
      
      const table = new Table({
        style: { head: [], border: [] },
      });
      
      table.push(
        { [chalk.cyan('Wallet')]: walletAddress },
        { [chalk.cyan('Balance')]: `${balanceSol.toFixed(9)} SOL` },
        { [chalk.cyan('USD Value')]: solPrice > 0 ? formatUsd(usdValue) : 'N/A' },
        { [chalk.cyan('Network')]: result.network },
      );
      
      console.log(table.toString());
      console.log();
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

// Transfer SOL or tokens
walletCommand
  .command('transfer')
  .description('Send SOL or tokens to another wallet')
  .requiredOption('--to <address>', 'Recipient address')
  .option('--sol <amount>', 'Amount of SOL to send')
  .option('-m, --mint <address>', 'Token mint address (for token transfers)')
  .option('-a, --amount <amount>', 'Amount of tokens to send')
  .option('-w, --wallet <path>', 'Wallet file path')
  .option('--rpc <url>', 'Solana RPC URL')
  .action(async (options) => {
    try {
      const { signer, walletAddress } = createClientWithWallet(options.wallet);
      requireWallet(signer);
      
      // Validate inputs
      if (!options.sol && !options.mint) {
        error('Must specify either --sol or --mint with --amount');
        process.exit(1);
      }
      
      if (options.mint && !options.amount) {
        error('Must specify --amount when using --mint');
        process.exit(1);
      }
      
      const rpcUrl = options.rpc || getRpcUrl();
      const connection = new Connection(rpcUrl, 'confirmed');
      const recipient = new PublicKey(options.to);
      
      if (options.sol) {
        // Transfer SOL
        const solAmount = parseFloat(options.sol);
        if (isNaN(solAmount) || solAmount <= 0) {
          error('Invalid SOL amount');
          process.exit(1);
        }
        
        const spin = spinner(`Sending ${solAmount} SOL to ${options.to.slice(0, 8)}...`).start();
        
        const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
        
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: signer.publicKey,
            toPubkey: recipient,
            lamports,
          })
        );
        
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [signer.keypair],
          { commitment: 'confirmed' }
        );
        
        spin.stop();
        success(`Sent ${solAmount} SOL to ${options.to}`);
        console.log();
        info(`Transaction: ${signature}`);
        if (isDevnet(rpcUrl)) {
          info(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
        } else {
          info(`Explorer: https://explorer.solana.com/tx/${signature}`);
        }
        console.log();
        
      } else if (options.mint) {
        // Transfer tokens
        const tokenAmount = parseFloat(options.amount);
        if (isNaN(tokenAmount) || tokenAmount <= 0) {
          error('Invalid token amount');
          process.exit(1);
        }
        
        const spin = spinner(`Sending ${tokenAmount} tokens to ${options.to.slice(0, 8)}...`).start();
        
        const mint = new PublicKey(options.mint);
        
        // Get source token account
        const sourceAta = await getAssociatedTokenAddress(
          mint,
          signer.publicKey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        // Get destination token account
        const destAta = await getAssociatedTokenAddress(
          mint,
          recipient,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
        
        const transaction = new Transaction();
        
        // Check if destination ATA exists, if not create it
        try {
          await getAccount(connection, destAta);
        } catch {
          // ATA doesn't exist, create it
          transaction.add(
            createAssociatedTokenAccountInstruction(
              signer.publicKey, // payer
              destAta,          // ata
              recipient,        // owner
              mint,             // mint
              TOKEN_PROGRAM_ID,
              ASSOCIATED_TOKEN_PROGRAM_ID
            )
          );
        }
        
        // Assume 6 decimals for tokens (standard for most SPL tokens)
        const decimals = 6;
        const rawAmount = BigInt(Math.floor(tokenAmount * Math.pow(10, decimals)));
        
        transaction.add(
          createTransferInstruction(
            sourceAta,
            destAta,
            signer.publicKey,
            rawAmount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
        
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [signer.keypair],
          { commitment: 'confirmed' }
        );
        
        spin.stop();
        success(`Sent ${tokenAmount} tokens to ${options.to}`);
        console.log();
        info(`Transaction: ${signature}`);
        if (isDevnet(rpcUrl)) {
          info(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
        } else {
          info(`Explorer: https://explorer.solana.com/tx/${signature}`);
        }
        console.log();
      }
    } catch (err) {
      handleError(err);
    }
  });

// Airdrop SOL (devnet only)
walletCommand
  .command('airdrop')
  .description('Request SOL from devnet faucet (devnet only)')
  .option('--sol <amount>', 'Amount of SOL to request (max 2)', '1')
  .option('-w, --wallet <path>', 'Wallet file path')
  .option('--rpc <url>', 'Solana RPC URL')
  .action(async (options) => {
    try {
      const { signer, walletAddress } = createClientWithWallet(options.wallet);
      requireWallet(signer);
      
      const rpcUrl = options.rpc || getRpcUrl();
      
      // Check if on devnet
      if (!isDevnet(rpcUrl)) {
        error('Airdrop only works on devnet!');
        info(`Current RPC: ${rpcUrl}`);
        info('Use --rpc https://api.devnet.solana.com or set SOLANA_RPC_URL');
        process.exit(1);
      }
      
      const solAmount = parseFloat(options.sol);
      if (isNaN(solAmount) || solAmount <= 0 || solAmount > 2) {
        error('Invalid SOL amount (must be between 0 and 2)');
        process.exit(1);
      }
      
      const spin = spinner(`Requesting ${solAmount} SOL airdrop...`).start();
      
      const connection = new Connection(rpcUrl, 'confirmed');
      const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
      
      try {
        const signature = await connection.requestAirdrop(signer.publicKey, lamports);
        
        // Wait for confirmation
        spin.text = 'Waiting for confirmation...';
        await connection.confirmTransaction(signature, 'confirmed');
        
        spin.stop();
        success(`Airdrop successful! Received ${solAmount} SOL`);
        console.log();
        info(`Transaction: ${signature}`);
        info(`Explorer: https://explorer.solana.com/tx/${signature}?cluster=devnet`);
        console.log();
        
        // Show new balance
        const newBalance = await connection.getBalance(signer.publicKey);
        info(`New balance: ${(newBalance / LAMPORTS_PER_SOL).toFixed(9)} SOL`);
        console.log();
      } catch (airdropErr: any) {
        spin.stop();
        if (airdropErr.message?.includes('429') || airdropErr.message?.includes('rate')) {
          error('Rate limited. Please wait a minute and try again.');
        } else {
          throw airdropErr;
        }
      }
    } catch (err) {
      handleError(err);
    }
  });

#!/usr/bin/env node
/**
 * ClawdVault CLI
 * Command-line interface for ClawdVault token launchpad
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { tokensCommand } from './commands/tokens';
import { tokenCommand } from './commands/token';
import { tradeCommand } from './commands/trade';
import { walletCommand } from './commands/wallet';
import { streamCommand } from './commands/stream';
import { chatCommand } from './commands/chat';

const program = new Command();

program
  .name('clawdvault')
  .description('CLI for ClawdVault - Solana token launchpad')
  .version('0.1.0');

// Register commands
program.addCommand(tokensCommand);
program.addCommand(tokenCommand);
program.addCommand(tradeCommand);
program.addCommand(walletCommand);
program.addCommand(streamCommand);
program.addCommand(chatCommand);

// Global setup - check environment before any command
program.hook('preAction', () => {
  // Warn if using production API
  const apiUrl = process.env.CLAWDVAULT_API_URL;
  if (apiUrl?.includes('clawdvault.com') || apiUrl?.includes('mainnet')) {
    console.warn(chalk.yellow('⚠️  WARNING: Using PRODUCTION API (clawdvault.com)'));
    console.warn(chalk.gray('   Set CLAWDVAULT_API_URL=http://localhost:3000/api for local development'));
    console.warn();
  }
});

program.configureOutput({
  outputError: (str, write) => {
    write(chalk.red(str));
  },
});

program.parse();

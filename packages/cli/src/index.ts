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
import { chatCommand } from './commands/chat';
import { agentCommand } from './commands/agent';
import { userCommand } from './commands/user';

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
program.addCommand(chatCommand);
program.addCommand(agentCommand);
program.addCommand(userCommand);

// Global error handling
program.hook('preAction', () => {
  // Can add global setup here
});

program.configureOutput({
  outputError: (str, write) => {
    write(chalk.red(str));
  },
});

program.parse();

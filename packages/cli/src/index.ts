#!/usr/bin/env node
/**
 * ClawdVault CLI
 * Command-line interface for ClawdVault token launchpad
 */

import { Command } from 'commander';
import chalk from 'chalk';
import updateNotifier from 'update-notifier';
import { tokensCommand } from './commands/tokens';
import { tokenCommand } from './commands/token';
import { tradeCommand } from './commands/trade';
import { walletCommand } from './commands/wallet';
import { chatCommand } from './commands/chat';
import { agentCommand } from './commands/agent';

// Import package.json for version
import packageJson from '../package.json';

// Check for updates
const notifier = updateNotifier({
  pkg: packageJson,
  updateCheckInterval: 1000 * 60 * 60 * 24, // Check daily
});

if (notifier.update) {
  notifier.notify({
    isGlobal: true,
    message: `${chalk.yellow('Update available')} ${chalk.dim(notifier.update.current)} → ${chalk.green(notifier.update.latest)}\n` +
      `Run ${chalk.cyan('npm install -g @clawdvault/cli')} to update`,
  });
}

const program = new Command();

program
  .name('clawdvault')
  .description('CLI for ClawdVault - Solana token launchpad')
  .version(packageJson.version);

// Register commands
program.addCommand(tokensCommand);
program.addCommand(tokenCommand);
program.addCommand(tradeCommand);
program.addCommand(walletCommand);
program.addCommand(chatCommand);
program.addCommand(agentCommand);

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

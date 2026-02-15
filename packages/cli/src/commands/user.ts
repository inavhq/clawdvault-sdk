/**
 * User leaderboard and search commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import {
  spinner,
  formatUsd,
  shortenAddress,
  handleError,
  info,
  createReadOnlyClient,
} from '../utils';

export const userCommand = new Command('user')
  .description('User leaderboard and search');

// List users (leaderboard)
userCommand
  .command('list')
  .description('List users leaderboard or search for users')
  .option('--sort <field>', 'Sort by: volume, tokens, fees', 'volume')
  .option('--limit <n>', 'Number of results', '25')
  .option('--page <n>', 'Page number', '1')
  .option('--search <query>', 'Search users by name or wallet')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spin = spinner(options.search ? 'Searching users...' : 'Fetching users...').start();

    try {
      const client = createReadOnlyClient();
      const result = await client.listUsers({
        sortBy: options.sort as 'volume' | 'tokens' | 'fees',
        limit: parseInt(options.limit),
        page: parseInt(options.page),
        search: options.search,
      });

      spin.stop();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      const users = result.users ?? [];

      if (users.length === 0) {
        info(options.search ? `No users found matching "${options.search}"` : 'No users found');
        return;
      }

      const title = options.search
        ? `🔍 User Search: "${options.search}" (sorted by ${options.sort})`
        : `👥 User Leaderboard (sorted by ${options.sort})`;
      console.log(chalk.bold(`\n${title}\n`));

      const table = new Table({
        head: [
          chalk.cyan('#'),
          chalk.cyan('Name'),
          chalk.cyan('Wallet'),
          chalk.cyan('Volume'),
          chalk.cyan('Tokens'),
          chalk.cyan('Fees'),
        ],
        style: { head: [], border: [] },
      });

      const pageOffset = (parseInt(options.page) - 1) * parseInt(options.limit);

      users.forEach((user, i) => {
        table.push([
          pageOffset + i + 1,
          user.name ?? '-',
          shortenAddress(user.wallet ?? ''),
          formatUsd(user.total_volume ?? 0),
          user.tokens_created ?? 0,
          formatUsd(user.total_fees ?? 0),
        ]);
      });

      console.log(table.toString());
      console.log(chalk.gray(`\n  Page ${result.page ?? 1} | ${result.total ?? 0} total users\n`));
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

// Search users (convenience alias for list --search)
userCommand
  .command('search <query>')
  .description('Search for users by name or wallet')
  .option('--sort <field>', 'Sort by: volume, tokens, fees', 'volume')
  .option('--limit <n>', 'Number of results', '25')
  .option('--page <n>', 'Page number', '1')
  .option('--json', 'Output as JSON')
  .action(async (query, options) => {
    const spin = spinner('Searching users...').start();

    try {
      const client = createReadOnlyClient();
      const result = await client.listUsers({
        sortBy: options.sort as 'volume' | 'tokens' | 'fees',
        limit: parseInt(options.limit),
        page: parseInt(options.page),
        search: query,
      });

      spin.stop();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      const users = result.users ?? [];

      if (users.length === 0) {
        info(`No users found matching "${query}"`);
        return;
      }

      console.log(chalk.bold(`\n🔍 User Search: "${query}" (sorted by ${options.sort})\n`));

      const table = new Table({
        head: [
          chalk.cyan('#'),
          chalk.cyan('Name'),
          chalk.cyan('Wallet'),
          chalk.cyan('Volume'),
          chalk.cyan('Tokens'),
          chalk.cyan('Fees'),
        ],
        style: { head: [], border: [] },
      });

      const pageOffset = (parseInt(options.page) - 1) * parseInt(options.limit);

      users.forEach((user, i) => {
        table.push([
          pageOffset + i + 1,
          user.name ?? '-',
          shortenAddress(user.wallet ?? ''),
          formatUsd(user.total_volume ?? 0),
          user.tokens_created ?? 0,
          formatUsd(user.total_fees ?? 0),
        ]);
      });

      console.log(table.toString());
      console.log(chalk.gray(`\n  Page ${result.page ?? 1} | ${result.total ?? 0} total users\n`));
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

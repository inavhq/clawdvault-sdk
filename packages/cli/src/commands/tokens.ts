/**
 * Tokens listing command
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { createClient } from '@clawdvault/sdk';
import { spinner, formatSol, formatTokens, formatUsd, shortenAddress, handleError } from '../utils';

export const tokensCommand = new Command('tokens')
  .description('List tokens');

tokensCommand
  .command('list')
  .description('List all tokens')
  .option('-s, --sort <field>', 'Sort by field (created_at, market_cap, volume, price)', 'created_at')
  .option('-p, --page <number>', 'Page number', '1')
  .option('-l, --limit <number>', 'Items per page', '20')
  .option('--graduated', 'Show only graduated tokens')
  .option('--not-graduated', 'Show only non-graduated tokens')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spin = spinner('Fetching tokens...').start();
    
    try {
      const client = createClient();
      
      let graduated: boolean | undefined;
      if (options.graduated) graduated = true;
      if (options.notGraduated) graduated = false;
      
      const result = await client.listTokens({
        sort: options.sort,
        page: parseInt(options.page),
        limit: parseInt(options.limit),
        graduated,
      });
      
      spin.stop();
      
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }
      
      console.log(chalk.bold(`\n📊 Tokens (Page ${result.page}, ${result.tokens?.length ?? 0} of ${result.total ?? 0})\n`));
      
      const table = new Table({
        head: [
          chalk.cyan('Symbol'),
          chalk.cyan('Name'),
          chalk.cyan('Price'),
          chalk.cyan('Market Cap'),
          chalk.cyan('24h Vol'),
          chalk.cyan('Status'),
          chalk.cyan('Mint'),
        ],
        style: { head: [], border: [] },
      });
      
      for (const token of result.tokens ?? []) {
        const status = token.graduated
          ? chalk.green('🎓 Graduated')
          : chalk.yellow('📈 Bonding');

        table.push([
          chalk.bold(token.symbol ?? '???'),
          token.name ?? 'Unknown',
          formatUsd(token.price_usd ?? 0),
          formatUsd(token.market_cap_usd ?? 0),
          token.volume_24h ? formatSol(token.volume_24h) : '-',
          status,
          shortenAddress(token.mint ?? ''),
        ]);
      }
      
      console.log(table.toString());
      console.log();
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

// Add shortcut so `clawdvault tokens` without subcommand also lists
tokensCommand.action(async () => {
  const listCmd = tokensCommand.commands.find(c => c.name() === 'list');
  if (listCmd) {
    await listCmd.parseAsync([], { from: 'user' });
  }
});

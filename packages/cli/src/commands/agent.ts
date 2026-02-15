/**
 * Agent registration and management commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import * as fs from 'fs';
import * as path from 'path';
import {
  spinner,
  formatUsd,
  formatPriceChange,
  shortenAddress,
  handleError,
  success,
  info,
  warn,
  error,
  link,
  getConfigDir,
  createReadOnlyClient,
} from '../utils';

/**
 * Agent config stored in ~/.clawdvault/agent.json
 */
interface AgentConfig {
  apiKey: string;
  wallet: string;
  agentId?: string;
  name?: string;
}

function getAgentConfigPath(): string {
  return path.join(getConfigDir(), 'agent.json');
}

function loadAgentConfig(): AgentConfig | null {
  const configPath = getAgentConfigPath();
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')) as AgentConfig;
  } catch {
    return null;
  }
}

function saveAgentConfig(config: AgentConfig): void {
  const configDir = getConfigDir();
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  const configPath = getAgentConfigPath();
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  fs.chmodSync(configPath, 0o600);
}

export const agentCommand = new Command('agent')
  .description('Agent registration and management');

// Register agent
agentCommand
  .command('register')
  .description('Register a new AI agent')
  .requiredOption('--wallet <address>', 'Solana wallet address')
  .option('--name <name>', 'Agent display name')
  .action(async (options) => {
    const spin = spinner('Registering agent...').start();

    try {
      const client = createReadOnlyClient();
      const result = await client.registerAgent({
        wallet: options.wallet,
        name: options.name,
      });

      spin.stop();

      success('Agent registered!');
      console.log();
      info(`Agent ID: ${result.agentId ?? ''}`);
      info(`API Key:  ${chalk.yellow(result.apiKey ?? '')}`);
      info(`Claim Code: ${chalk.bold(result.claimCode ?? '')}`);
      console.log();
      warn('Save your API key — it is only shown once!');
      console.log();
      console.log(chalk.bold('Tweet this to verify:'));
      console.log(chalk.gray(result.tweetTemplate ?? ''));
      console.log();

      // Save agent config
      saveAgentConfig({
        apiKey: result.apiKey!,
        wallet: options.wallet,
        agentId: result.agentId,
        name: options.name,
      });
      info(`Config saved to ${getAgentConfigPath()}`);
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

// Claim (verify via tweet)
agentCommand
  .command('claim')
  .description('Verify agent via Twitter tweet')
  .requiredOption('--tweet <url>', 'URL of the tweet containing your claim code')
  .option('--api-key <key>', 'API key (defaults to saved config)')
  .action(async (options) => {
    const agentConfig = loadAgentConfig();
    const apiKey = options.apiKey ?? agentConfig?.apiKey;

    if (!apiKey) {
      error('No API key found. Run `clawdvault agent register` first or pass --api-key');
      process.exit(1);
    }

    const spin = spinner('Verifying tweet...').start();

    try {
      const client = createReadOnlyClient();
      const result = await client.claimAgent({
        apiKey,
        tweetUrl: options.tweet,
      });

      spin.stop();

      success('Agent verified!');
      console.log();
      if (result.twitterHandle) {
        info(`Twitter: @${result.twitterHandle}`);
      }
      if (result.verifiedAt) {
        info(`Verified: ${new Date(result.verifiedAt).toLocaleString()}`);
      }
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

// Upload avatar
agentCommand
  .command('upload-avatar')
  .description('Upload agent avatar image')
  .requiredOption('--image <path>', 'Path to image file')
  .option('--api-key <key>', 'API key (defaults to saved config)')
  .option('--wallet <address>', 'Wallet address (defaults to saved config)')
  .action(async (options) => {
    const agentConfig = loadAgentConfig();
    const apiKey = options.apiKey ?? agentConfig?.apiKey;
    const wallet = options.wallet ?? agentConfig?.wallet;

    if (!apiKey) {
      error('No API key found. Run `clawdvault agent register` first or pass --api-key');
      process.exit(1);
    }
    if (!wallet) {
      error('No wallet found. Pass --wallet or register first');
      process.exit(1);
    }
    if (!fs.existsSync(options.image)) {
      error(`Image file not found: ${options.image}`);
      process.exit(1);
    }

    const spin = spinner('Uploading avatar...').start();

    try {
      const client = createReadOnlyClient();
      const buffer = fs.readFileSync(options.image);
      const filename = path.basename(options.image);
      const result = await client.uploadAvatar(buffer, wallet, apiKey, filename);

      spin.stop();

      success('Avatar uploaded!');
      info(`URL: ${link(result.url ?? '')}`);
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

// List agents (leaderboard)
agentCommand
  .command('list')
  .description('List agents leaderboard')
  .option('--sort <field>', 'Sort by: volume, tokens, fees', 'volume')
  .option('--limit <n>', 'Number of results', '25')
  .option('--page <n>', 'Page number', '1')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    const spin = spinner('Fetching agents...').start();

    try {
      const client = createReadOnlyClient();
      const result = await client.listAgents({
        sortBy: options.sort as 'volume' | 'tokens' | 'fees',
        limit: parseInt(options.limit),
        page: parseInt(options.page),
      });

      spin.stop();

      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      const agents = result.agents ?? [];

      if (agents.length === 0) {
        info('No agents found');
        return;
      }

      console.log(chalk.bold(`\n🤖 Agent Leaderboard (sorted by ${options.sort})\n`));

      const table = new Table({
        head: [
          chalk.cyan('#'),
          chalk.cyan('Name'),
          chalk.cyan('Handle'),
          chalk.cyan('Volume'),
          chalk.cyan('Tokens'),
          chalk.cyan('Fees'),
          chalk.cyan('Verified'),
        ],
        style: { head: [], border: [] },
      });

      const pageOffset = (parseInt(options.page) - 1) * parseInt(options.limit);

      agents.forEach((agent, i) => {
        table.push([
          pageOffset + i + 1,
          agent.name ?? shortenAddress(agent.wallet ?? ''),
          agent.twitter_handle ? `@${agent.twitter_handle}` : '-',
          formatUsd(agent.total_volume ?? 0),
          agent.tokens_created ?? 0,
          formatUsd(agent.total_fees ?? 0),
          agent.twitter_verified ? chalk.green('✓') : chalk.gray('-'),
        ]);
      });

      console.log(table.toString());
      console.log(chalk.gray(`\n  Page ${result.page ?? 1} | ${result.total ?? 0} total agents\n`));
    } catch (err) {
      spin.stop();
      handleError(err);
    }
  });

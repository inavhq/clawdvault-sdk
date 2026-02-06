/**
 * CLI Utility Functions
 */

import { createClient, ClawdVaultClient, KeypairSigner } from '@clawdvault/sdk';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Auth config stored in ~/.clawdvault/auth.json
 */
export interface AuthConfig {
  sessionToken?: string;
  wallet?: string;
  expiresAt?: string;
}

/**
 * Get config directory
 */
export function getConfigDir(): string {
  return path.join(os.homedir(), '.clawdvault');
}

/**
 * Get auth config file path
 */
export function getAuthConfigPath(): string {
  return path.join(getConfigDir(), 'auth.json');
}

/**
 * Load auth config from disk
 */
export function loadAuthConfig(): AuthConfig | null {
  const configPath = getAuthConfigPath();
  if (!fs.existsSync(configPath)) {
    return null;
  }
  
  try {
    const data = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(data) as AuthConfig;
    
    // Check if token is expired
    if (config.expiresAt) {
      const expiresAt = new Date(config.expiresAt);
      if (expiresAt <= new Date()) {
        // Token expired, remove it
        fs.unlinkSync(configPath);
        return null;
      }
    }
    
    return config;
  } catch {
    return null;
  }
}

/**
 * Save auth config to disk
 */
export function saveAuthConfig(config: AuthConfig): void {
  const configDir = getConfigDir();
  const configPath = getAuthConfigPath();
  
  // Create config dir if needed
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  fs.chmodSync(configPath, 0o600); // Secure permissions
}

/**
 * Clear auth config (logout)
 */
export function clearAuthConfig(): void {
  const configPath = getAuthConfigPath();
  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }
}

/**
 * Get wallet path from environment or default locations
 */
export function getWalletPath(): string | null {
  // Check env var first
  if (process.env.CLAWDVAULT_WALLET) {
    return process.env.CLAWDVAULT_WALLET;
  }
  
  // Check config dir
  const configWallet = path.join(getConfigDir(), 'wallet.json');
  if (fs.existsSync(configWallet)) {
    return configWallet;
  }

  // Check Solana CLI default
  const solanaWallet = path.join(os.homedir(), '.config', 'solana', 'id.json');
  if (fs.existsSync(solanaWallet)) {
    return solanaWallet;
  }

  return null;
}

/**
 * Load signer from wallet file or private key
 */
export function loadSigner(walletPathOrKey?: string): KeypairSigner | null {
  const pathOrKey = walletPathOrKey || getWalletPath();
  
  if (!pathOrKey) {
    return null;
  }

  // Check if it's a file path
  if (fs.existsSync(pathOrKey)) {
    try {
      return KeypairSigner.fromFile(pathOrKey);
    } catch {
      // File exists but can't be read (permissions, corrupted, etc.)
      return null;
    }
  }

  // Try as private key directly
  try {
    return new KeypairSigner(pathOrKey);
  } catch {
    return null;
  }
}

/**
 * Get API base URL from environment or default
 */
function getBaseUrl(): string | undefined {
  return process.env.CLAWDVAULT_API_URL;
}

/**
 * Create client with optional wallet
 */
export function createClientWithWallet(walletPath?: string): {
  client: ClawdVaultClient;
  signer: KeypairSigner | null;
  walletAddress: string | null;
} {
  const signer = loadSigner(walletPath);
  const baseUrl = getBaseUrl();
  
  // Load auth config for session token
  const authConfig = loadAuthConfig();
  const sessionToken = authConfig?.sessionToken;
  
  const client = createClient({ 
    signer: signer || undefined, 
    baseUrl,
    sessionToken,
  });
  
  return {
    client,
    signer,
    walletAddress: signer?.publicKey.toBase58() ?? null,
  };
}

/**
 * Create authenticated client (requires login)
 */
export function createAuthenticatedClient(walletPath?: string): {
  client: ClawdVaultClient;
  signer: KeypairSigner | null;
  walletAddress: string | null;
  sessionToken: string | null;
} {
  const { client, signer, walletAddress } = createClientWithWallet(walletPath);
  const authConfig = loadAuthConfig();
  
  return {
    client,
    signer,
    walletAddress,
    sessionToken: authConfig?.sessionToken ?? null,
  };
}

/**
 * Require authentication or exit
 */
export function requireAuth(): AuthConfig {
  const authConfig = loadAuthConfig();
  if (!authConfig?.sessionToken) {
    error('Not logged in. Run: clawdvault wallet login');
    process.exit(1);
  }
  return authConfig;
}

/**
 * Create read-only client (no wallet needed)
 * Use for operations that don't require signing
 */
export function createReadOnlyClient(): ClawdVaultClient {
  const baseUrl = getBaseUrl();
  return createClient({ baseUrl });
}

/**
 * Create spinner
 */
export function spinner(text: string) {
  return ora({ text, color: 'cyan' });
}

/**
 * Format SOL amount
 */
export function formatSol(amount: number): string {
  return `${amount.toFixed(9)} SOL`;
}

/**
 * Format token amount
 */
export function formatTokens(amount: number): string {
  if (amount >= 1e9) {
    return `${(amount / 1e9).toFixed(2)}B`;
  }
  if (amount >= 1e6) {
    return `${(amount / 1e6).toFixed(2)}M`;
  }
  if (amount >= 1e3) {
    return `${(amount / 1e3).toFixed(2)}K`;
  }
  return amount.toFixed(2);
}

/**
 * Format USD amount
 */
export function formatUsd(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
  const formatted = (value * 100).toFixed(2);
  return value >= 0 ? chalk.green(`+${formatted}%`) : chalk.red(`${formatted}%`);
}

/**
 * Shorten address
 */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Print success message
 */
export function success(message: string): void {
  console.log(chalk.green('✓'), message);
}

/**
 * Print error message
 */
export function error(message: string): void {
  console.error(chalk.red('✗'), message);
}

/**
 * Print warning message
 */
export function warn(message: string): void {
  console.log(chalk.yellow('⚠'), message);
}

/**
 * Print info message
 */
export function info(message: string): void {
  console.log(chalk.blue('ℹ'), message);
}

/**
 * Print link
 */
export function link(url: string): string {
  return chalk.cyan.underline(url);
}

/**
 * Handle command errors
 */
export function handleError(err: unknown): never {
  if (err instanceof Error) {
    const apiError = err as any;
    if (apiError.response?.error) {
      error(apiError.response.error);
    } else {
      error(err.message);
    }
  } else {
    error(String(err));
  }
  process.exit(1);
}

/**
 * Require wallet or exit
 */
export function requireWallet(signer: KeypairSigner | null): asserts signer is KeypairSigner {
  if (!signer) {
    error('Wallet required for this operation');
    info('Set CLAWDVAULT_WALLET environment variable or use --wallet flag');
    info('Or place wallet.json in ~/.clawdvault/wallet.json');
    process.exit(1);
  }
}

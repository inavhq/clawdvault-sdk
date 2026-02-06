/**
 * Solana Wallet Integration for ClawdVault SDK
 * Supports both Keypair (CLI/server) and Phantom (browser) signing
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  SendOptions,
} from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Abstract signer interface for wallet signing
 */
export interface WalletSigner {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

/**
 * Keypair-based signer for CLI/server usage
 */
export class KeypairSigner implements WalletSigner {
  private _keypair: Keypair;

  constructor(keypairOrSecretKey: Keypair | Uint8Array | string) {
    if (keypairOrSecretKey instanceof Keypair) {
      this._keypair = keypairOrSecretKey;
    } else if (typeof keypairOrSecretKey === 'string') {
      // Support base58 or JSON array format
      if (keypairOrSecretKey.startsWith('[')) {
        const secretKey = new Uint8Array(JSON.parse(keypairOrSecretKey));
        this._keypair = Keypair.fromSecretKey(secretKey);
      } else {
        const secretKey = bs58.decode(keypairOrSecretKey);
        this._keypair = Keypair.fromSecretKey(secretKey);
      }
    } else {
      this._keypair = Keypair.fromSecretKey(keypairOrSecretKey);
    }
  }

  get publicKey(): PublicKey {
    return this._keypair.publicKey;
  }

  /**
   * Get the underlying Keypair (use with caution)
   */
  get keypair(): Keypair {
    return this._keypair;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    if (tx instanceof Transaction) {
      tx.sign(this._keypair);
    } else {
      tx.sign([this._keypair]);
    }
    return tx;
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    // Use nacl signing from tweetnacl
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nacl = require('tweetnacl');
    const signature = nacl.sign.detached(message, this._keypair.secretKey) as Uint8Array;
    return signature;
  }

  /**
   * Load keypair from file path (e.g., Solana CLI wallet)
   */
  static fromFile(path: string): KeypairSigner {
    const fs = require('fs');
    const data = fs.readFileSync(path, 'utf-8');
    const secretKey = new Uint8Array(JSON.parse(data));
    return new KeypairSigner(secretKey);
  }

  /**
   * Load from environment variable
   */
  static fromEnv(envVar: string = 'SOLANA_PRIVATE_KEY'): KeypairSigner {
    const key = process.env[envVar];
    if (!key) {
      throw new Error(`Environment variable ${envVar} not set`);
    }
    return new KeypairSigner(key);
  }
}

/**
 * Phantom wallet adapter for browser usage
 * Compatible with @solana/wallet-adapter
 */
export interface PhantomWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
  connect(): Promise<{ publicKey: PublicKey }>;
  disconnect(): Promise<void>;
  isConnected: boolean;
}

/**
 * Adapter to make Phantom wallet work with WalletSigner interface
 */
export class PhantomSigner implements WalletSigner {
  constructor(private phantom: PhantomWallet) {}

  get publicKey(): PublicKey {
    return this.phantom.publicKey;
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T> {
    return this.phantom.signTransaction(tx);
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    const { signature } = await this.phantom.signMessage(message);
    return signature;
  }

  /**
   * Get Phantom from window object (browser only)
   */
  static async fromWindow(): Promise<PhantomSigner> {
    if (typeof window === 'undefined') {
      throw new Error('PhantomSigner.fromWindow() only works in browser');
    }
    
    const phantom = (window as any).phantom?.solana;
    if (!phantom) {
      throw new Error('Phantom wallet not found. Please install Phantom extension.');
    }

    if (!phantom.isConnected) {
      await phantom.connect();
    }

    return new PhantomSigner(phantom);
  }
}

/**
 * Sign and serialize a transaction for API submission
 */
export async function signAndSerialize(
  transaction: string, // Base64 encoded
  signer: WalletSigner
): Promise<string> {
  const txBuffer = Buffer.from(transaction, 'base64');
  
  // Try to deserialize as VersionedTransaction first
  try {
    const versionedTx = VersionedTransaction.deserialize(txBuffer);
    const signedTx = await signer.signTransaction(versionedTx);
    return Buffer.from(signedTx.serialize()).toString('base64');
  } catch {
    // Fall back to legacy Transaction
    const legacyTx = Transaction.from(txBuffer);
    const signedTx = await signer.signTransaction(legacyTx);
    return Buffer.from(signedTx.serialize()).toString('base64');
  }
}

/**
 * Create the signable message format that matches the server
 * Uses a timestamp window to prevent replay attacks
 */
export function createSignableMessage(action: string, data: Record<string, unknown>): string {
  const timestamp = Math.floor(Date.now() / 1000);
  // Round to 5-minute windows to allow for clock skew
  const window = Math.floor(timestamp / 300) * 300;
  return `ClawdVault:${action}:${window}:${JSON.stringify(data)}`;
}

/**
 * Create signature for authenticated API requests
 */
export async function createAuthSignature(
  signer: WalletSigner,
  action: string,
  data: Record<string, unknown>
): Promise<{ signature: string; wallet: string }> {
  const message = createSignableMessage(action, data);
  const messageBytes = new TextEncoder().encode(message);
  const signatureBytes = await signer.signMessage(messageBytes);
  
  return {
    signature: bs58.encode(signatureBytes),
    wallet: signer.publicKey.toBase58(),
  };
}

/**
 * Verify a signature (for server-side validation)
 */
export function verifySignature(
  message: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const pubkey = new PublicKey(publicKey);
    
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nacl = require('tweetnacl');
    return nacl.sign.detached.verify(messageBytes, signatureBytes, pubkey.toBytes()) as boolean;
  } catch {
    return false;
  }
}

/**
 * ClawdVault SDK
 * TypeScript client for ClawdVault token launchpad on Solana
 * 
 * @packageDocumentation
 */

// Main client
export { ClawdVaultClient, createClient, type ClawdVaultConfig } from './client';

// Wallet integration
export {
  type WalletSigner,
  KeypairSigner,
  PhantomSigner,
  type PhantomWallet,
  signAndSerialize,
  createAuthSignature,
  verifySignature,
} from './wallet';

// Types
export type {
  // Core schemas
  Token,
  Trade,
  ChatMessage,
  UserProfile,
  
  // Request types
  PrepareCreateRequest,
  ExecuteCreateRequest,
  PrepareTradeRequest,
  ExecuteTradeRequest,
  JupiterSwapRequest,
  JupiterExecuteRequest,
  SendChatRequest,
  UpdateProfileRequest,
  
  // Response types
  PrepareCreateResponse,
  ExecuteCreateResponse,
  TokenListResponse,
  TokenDetailResponse,
  QuoteResponse,
  PrepareTradeResponse,
  ExecuteTradeResponse,
  TradeHistoryResponse,
  CandleData,
  CandlesResponse,
  StatsResponse,
  HolderInfo,
  HoldersResponse,
  BalanceResponse,
  SolPriceResponse,
  GraduationStatusResponse,
  JupiterStatusResponse,
  JupiterQuoteResponse,
  ChatMessagesResponse,
  SessionResponse,
  SessionValidateResponse,
  UploadResponse,
  NetworkStatusResponse,
  
  // Query params
  TokenListParams,
  QuoteParams,
  TradesParams,
  CandlesParams,
  ChatParams,
} from './types';

// Re-export useful Solana types
export { PublicKey, Keypair } from '@solana/web3.js';

// Constants
export const PROGRAM_ID = 'GUyF2TVe32Cid4iGVt2F6wPYDhLSVmTUZBj2974outYM';
export const DEFAULT_BASE_URL = 'https://clawdvault.com/api';

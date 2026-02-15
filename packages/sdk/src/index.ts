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

// Types - Generated from OpenAPI spec
export type {
  // Core schemas (from components.schemas)
  Token,
  Trade,
  ChatMessage,
  UserProfile,
  
  // Request types (from paths)
  PrepareCreateRequest,
  ExecuteCreateRequest,
  PrepareTradeRequest,
  ExecuteTradeRequest,
  JupiterSwapRequest,
  JupiterExecuteRequest,
  SendChatRequest,
  UpdateProfileRequest,
  AddReactionRequest,
  
  // Response types (from paths)
  PrepareCreateResponse,
  ExecuteCreateResponse,
  TokenListResponse,
  TokenDetailResponse,
  MetadataResponse,
  QuoteResponse,
  PrepareTradeResponse,
  ExecuteTradeResponse,
  TradeHistoryResponse,
  CandlesResponse,
  StatsResponse,
  HoldersResponse,
  BalanceResponse,
  SolPriceResponse,
  GraduationStatusResponse,
  JupiterStatusResponse,
  JupiterQuoteResponse,
  JupiterExecuteResponse,
  ChatMessagesResponse,
  SendChatResponse,
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
  
  // Sub-types
  CandleData,
  HolderInfo,
  OnChainStats,
  GraduationData,
  JupiterQuote,
  VerifiedTrade,

  // Agent types
  AgentRegisterRequest,
  AgentClaimRequest,
  AgentRegisterResponse,
  AgentClaimResponse,
  AgentsListResponse,
  UsersListResponse,
  SiteStatsResponse,
  AgentsListParams,
  UsersListParams,
  AgentEntry,
  UserEntry,

  // Full API types for advanced usage
  paths,
  components,
} from './types';

// Re-export useful Solana types
export { PublicKey, Keypair } from '@solana/web3.js';

// Constants
export const PROGRAM_ID = 'GUyF2TVe32Cid4iGVt2F6wPYDhLSVmTUZBj2974outYM';
export const DEFAULT_BASE_URL = 'https://clawdvault.com/api';

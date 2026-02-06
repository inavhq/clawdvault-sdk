/**
 * ClawdVault API Types
 * Generated from OpenAPI spec
 */

// ============ Core Schemas ============

export interface Token {
  mint: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  creator: string;
  creator_name?: string;
  price_sol: number;
  market_cap_sol: number;
  volume_24h?: number;
  virtual_sol_reserves: number;
  virtual_token_reserves: number;
  real_sol_reserves: number;
  real_token_reserves: number;
  graduated: boolean;
  migrated_to_raydium: boolean;
  twitter?: string;
  telegram?: string;
  website?: string;
  created_at: string;
}

export interface Trade {
  id: string;
  type: 'buy' | 'sell';
  sol_amount: number;
  token_amount: number;
  price: number;
  trader: string;
  signature: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  wallet: string;
  username?: string;
  message: string;
  reply_to?: string;
  reactions: Record<string, string[]>;
  created_at: string;
}

export interface UserProfile {
  wallet: string;
  username?: string;
  avatar?: string;
  created_at: string;
}

// ============ Request Types ============

export interface PrepareCreateRequest {
  creator: string;
  name: string;
  symbol: string;
  initialBuy?: number;
}

export interface ExecuteCreateRequest {
  signedTransaction: string;
  mint: string;
  creator: string;
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
}

export interface PrepareTradeRequest {
  mint: string;
  type: 'buy' | 'sell';
  amount: number;
  wallet: string;
  slippage?: number;
}

export interface ExecuteTradeRequest {
  signedTransaction: string;
  mint: string;
  type: 'buy' | 'sell';
  wallet: string;
}

export interface JupiterSwapRequest {
  mint: string;
  action: 'buy' | 'sell';
  amount: string;
  userPublicKey: string;
  slippageBps?: number;
}

export interface JupiterExecuteRequest {
  mint: string;
  signedTransaction: string;
  type: 'buy' | 'sell';
  wallet: string;
  solAmount?: number;
  tokenAmount?: number;
}

export interface SendChatRequest {
  mint: string;
  message: string;
  replyTo?: string;
}

export interface UpdateProfileRequest {
  username?: string;
  avatar?: string;
}

// ============ Response Types ============

export interface PrepareCreateResponse {
  success: boolean;
  transaction: string;
  mint: string;
  programId: string;
  network: string;
  initialBuy?: {
    sol: number;
    estimatedTokens: number;
  };
}

export interface ExecuteCreateResponse {
  success: boolean;
  signature: string;
  mint: string;
  token: Token;
  explorer: string;
}

export interface TokenListResponse {
  tokens: Token[];
  total: number;
  page: number;
  per_page: number;
}

export interface TokenDetailResponse {
  token: Token;
  trades: Trade[];
}

export interface QuoteResponse {
  input: number;
  output: number;
  price_impact: number;
  fee: number;
  current_price: number;
}

export interface PrepareTradeResponse {
  success: boolean;
  transaction: string;
  type: string;
  input: {
    sol?: number;
    fee?: number;
    tokens?: number;
  };
  output: {
    tokens?: number;
    minTokens?: number;
    sol?: number;
    minSol?: number;
  };
  priceImpact: number;
  currentPrice: number;
  onChain: boolean;
}

export interface ExecuteTradeResponse {
  success: boolean;
  signature: string;
  explorer: string;
  slot: number;
  blockTime: number;
  trade: {
    id: string;
    mint: string;
    trader: string;
    type: string;
    solAmount: number;
    tokenAmount: number;
    protocolFee: number;
    creatorFee: number;
  };
}

export interface TradeHistoryResponse {
  trades: Trade[];
}

export interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CandlesResponse {
  mint: string;
  interval: string;
  candles: CandleData[];
}

export interface StatsResponse {
  success: boolean;
  mint: string;
  onChain: {
    totalSupply: number;
    bondingCurveBalance: number;
    circulatingSupply: number;
    bondingCurveSol: number;
    virtualSolReserves: number;
    virtualTokenReserves: number;
    price: number;
    marketCap: number;
    graduated: boolean;
  };
}

export interface HolderInfo {
  address: string;
  balance: number;
  percentage: number;
  label?: string;
}

export interface HoldersResponse {
  holders: HolderInfo[];
}

export interface BalanceResponse {
  balance: number;
  wallet: string;
  mint: string;
}

export interface SolPriceResponse {
  price: number;
  valid: boolean;
  cached: boolean;
  source: string;
  age: number;
}

export interface GraduationStatusResponse {
  success: boolean;
  data: {
    mint: string;
    graduated: boolean;
    migratedToRaydium: boolean;
    realSolReserves: string;
    realTokenReserves: string;
    canMigrate: boolean;
  };
}

export interface JupiterStatusResponse {
  success: boolean;
  mint: string;
  graduated: boolean;
  tradeEndpoint: string;
}

export interface JupiterQuoteResponse {
  success: boolean;
  graduated: boolean;
  quote: {
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    priceImpactPct: string;
    slippageBps: number;
  };
  transaction: string;
  lastValidBlockHeight: number;
}

export interface ChatMessagesResponse {
  messages: ChatMessage[];
}

export interface SessionResponse {
  success: boolean;
  token: string;
  expiresIn: number;
  wallet: string;
}

export interface SessionValidateResponse {
  valid: boolean;
  wallet: string;
}

export interface UploadResponse {
  success: boolean;
  url: string;
  filename: string;
}

export interface NetworkStatusResponse {
  network: string;
  programId: string;
  rpcUrl: string;
  configInitialized: boolean;
}

// ============ Query Parameters ============

export interface TokenListParams {
  sort?: 'created_at' | 'market_cap' | 'volume' | 'price';
  page?: number;
  limit?: number;
  graduated?: boolean;
}

export interface QuoteParams {
  mint: string;
  type: 'buy' | 'sell';
  amount: number;
}

export interface TradesParams {
  mint: string;
  limit?: number;
  before?: string;
}

export interface CandlesParams {
  mint: string;
  interval?: '1m' | '5m' | '15m' | '1h' | '1d';
  limit?: number;
}

export interface ChatParams {
  mint: string;
  limit?: number;
  before?: string;
}

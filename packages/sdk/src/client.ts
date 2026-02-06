/**
 * ClawdVault API Client
 * Full TypeScript client with wallet integration
 */

import type {
  Token,
  Trade,
  ChatMessage,
  UserProfile,
  PrepareCreateRequest,
  ExecuteCreateRequest,
  PrepareTradeRequest,
  ExecuteTradeRequest,
  JupiterSwapRequest,
  JupiterExecuteRequest,
  SendChatRequest,
  UpdateProfileRequest,
  PrepareCreateResponse,
  ExecuteCreateResponse,
  TokenListResponse,
  TokenDetailResponse,
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
  ChatMessagesResponse,
  SessionResponse,
  SessionValidateResponse,
  UploadResponse,
  NetworkStatusResponse,
  TokenListParams,
  QuoteParams,
  TradesParams,
  CandlesParams,
  ChatParams,
} from './types';
import { WalletSigner, signAndSerialize, createAuthSignature } from './wallet';

export interface ClawdVaultConfig {
  baseUrl?: string;
  signer?: WalletSigner;
  sessionToken?: string;
  onError?: (error: Error) => void;
}

export class ClawdVaultClient {
  private baseUrl: string;
  private signer?: WalletSigner;
  private sessionToken?: string;
  private onError?: (error: Error) => void;

  constructor(config: ClawdVaultConfig = {}) {
    this.baseUrl = config.baseUrl?.replace(/\/$/, '') || 'https://clawdvault.com/api';
    this.signer = config.signer;
    this.sessionToken = config.sessionToken;
    this.onError = config.onError;
  }

  /**
   * Set the wallet signer for authenticated operations
   */
  setSigner(signer: WalletSigner): void {
    this.signer = signer;
  }

  /**
   * Set session token for authenticated operations
   */
  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  /**
   * Get wallet address
   */
  getWalletAddress(): string | null {
    return this.signer?.publicKey.toBase58() ?? null;
  }

  private async request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    options: {
      params?: Record<string, any>;
      body?: any;
      auth?: boolean;
      formData?: FormData;
    } = {}
  ): Promise<T> {
    const { params, body, auth, formData } = options;
    
    let url = `${this.baseUrl}${path}`;
    if (params) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          searchParams.set(key, String(value));
        }
      }
      const qs = searchParams.toString();
      if (qs) url += `?${qs}`;
    }

    const headers: Record<string, string> = {};
    
    // Add authentication headers
    if (auth) {
      if (this.sessionToken) {
        headers['Authorization'] = `Bearer ${this.sessionToken}`;
      } else if (this.signer && body) {
        const { signature, wallet } = await createAuthSignature(this.signer, body);
        headers['X-Wallet'] = wallet;
        headers['X-Signature'] = signature;
      }
    }

    let requestBody: any;
    if (formData) {
      requestBody = formData;
    } else if (body) {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(url, {
      method,
      headers,
      body: requestBody,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      const err = new Error(error.error || error.message || `HTTP ${response.status}`);
      (err as any).status = response.status;
      (err as any).response = error;
      this.onError?.(err);
      throw err;
    }

    return response.json();
  }

  // ============ Token Operations ============

  /**
   * List tokens with optional filters
   */
  async listTokens(params: Partial<TokenListParams> = {}): Promise<TokenListResponse> {
    return this.request('GET', '/tokens', { params });
  }

  /**
   * Get token details
   */
  async getToken(mint: string): Promise<TokenDetailResponse> {
    return this.request('GET', `/tokens/${mint}`);
  }

  /**
   * Get token metadata (Metaplex format)
   */
  async getMetadata(mint: string): Promise<{ name: string; symbol: string; description: string; image: string }> {
    return this.request('GET', `/metadata/${mint}`);
  }

  /**
   * Prepare token creation (step 1)
   */
  async prepareCreate(params: PrepareCreateRequest): Promise<PrepareCreateResponse> {
    return this.request('POST', '/token/prepare-create', { body: params });
  }

  /**
   * Execute token creation (step 2)
   */
  async executeCreate(params: ExecuteCreateRequest): Promise<ExecuteCreateResponse> {
    return this.request('POST', '/token/execute-create', { body: params });
  }

  /**
   * Create token with automatic signing
   * Combines prepare + sign + execute in one call
   */
  async createToken(params: {
    name: string;
    symbol: string;
    description?: string;
    image?: string;
    initialBuy?: number;
    twitter?: string;
    telegram?: string;
    website?: string;
  }): Promise<ExecuteCreateResponse> {
    if (!this.signer) {
      throw new Error('Signer required for createToken');
    }

    const wallet = this.signer.publicKey.toBase58();
    
    // Step 1: Prepare
    const prepared = await this.prepareCreate({
      creator: wallet,
      name: params.name,
      symbol: params.symbol,
      initialBuy: params.initialBuy,
    });

    // Step 2: Sign (transaction is guaranteed by API contract)
    const signedTx = await signAndSerialize(prepared.transaction!, this.signer);

    // Step 3: Execute
    return this.executeCreate({
      signedTransaction: signedTx,
      mint: prepared.mint!,
      creator: wallet,
      name: params.name,
      symbol: params.symbol,
      description: params.description,
      image: params.image,
      twitter: params.twitter,
      telegram: params.telegram,
      website: params.website,
    });
  }

  // ============ Trading Operations ============

  /**
   * Get price quote
   */
  async getQuote(params: QuoteParams): Promise<QuoteResponse> {
    return this.request('GET', '/trade', { params });
  }

  /**
   * Prepare trade transaction (step 1)
   */
  async prepareTrade(params: PrepareTradeRequest): Promise<PrepareTradeResponse> {
    return this.request('POST', '/trade/prepare', { body: params });
  }

  /**
   * Execute trade (step 2)
   */
  async executeTrade(params: ExecuteTradeRequest): Promise<ExecuteTradeResponse> {
    return this.request('POST', '/trade/execute', { body: params });
  }

  /**
   * Buy tokens with automatic signing
   */
  async buy(mint: string, solAmount: number, slippage = 0.01): Promise<ExecuteTradeResponse> {
    if (!this.signer) {
      throw new Error('Signer required for buy');
    }

    const wallet = this.signer.publicKey.toBase58();
    
    // Prepare
    const prepared = await this.prepareTrade({
      mint,
      type: 'buy',
      amount: solAmount,
      wallet,
      slippage,
    });

    // Sign (transaction is guaranteed by API contract)
    const signedTx = await signAndSerialize(prepared.transaction!, this.signer);

    // Execute
    return this.executeTrade({
      signedTransaction: signedTx,
      mint,
      type: 'buy',
      wallet,
    });
  }

  /**
   * Sell tokens with automatic signing
   */
  async sell(mint: string, tokenAmount: number, slippage = 0.01): Promise<ExecuteTradeResponse> {
    if (!this.signer) {
      throw new Error('Signer required for sell');
    }

    const wallet = this.signer.publicKey.toBase58();
    
    // Prepare
    const prepared = await this.prepareTrade({
      mint,
      type: 'sell',
      amount: tokenAmount,
      wallet,
      slippage,
    });

    // Sign (transaction is guaranteed by API contract)
    const signedTx = await signAndSerialize(prepared.transaction!, this.signer);

    // Execute
    return this.executeTrade({
      signedTransaction: signedTx,
      mint,
      type: 'sell',
      wallet,
    });
  }

  /**
   * Sell percentage of token holdings
   */
  async sellPercent(mint: string, percent: number, slippage = 0.01): Promise<ExecuteTradeResponse> {
    if (!this.signer) {
      throw new Error('Signer required for sellPercent');
    }

    const wallet = this.signer.publicKey.toBase58();
    const balanceResponse = await this.getBalance(wallet, mint);
    const balance = balanceResponse.balance ?? 0;
    
    if (balance <= 0) {
      throw new Error('No tokens to sell');
    }

    const tokenAmount = balance * (percent / 100);
    return this.sell(mint, tokenAmount, slippage);
  }

  // ============ Price Data ============

  /**
   * Get trade history
   */
  async getTrades(params: TradesParams): Promise<TradeHistoryResponse> {
    return this.request('GET', '/trades', { params });
  }

  /**
   * Get OHLCV candles
   */
  async getCandles(params: CandlesParams): Promise<CandlesResponse> {
    return this.request('GET', '/candles', { params });
  }

  /**
   * Get on-chain stats
   */
  async getStats(mint: string): Promise<StatsResponse> {
    return this.request('GET', '/stats', { params: { mint } });
  }

  /**
   * Get top holders
   */
  async getHolders(mint: string, creator?: string): Promise<HoldersResponse> {
    return this.request('GET', '/holders', { params: { mint, creator } });
  }

  /**
   * Get wallet token balance
   */
  async getBalance(wallet: string, mint: string): Promise<BalanceResponse> {
    return this.request('GET', '/balance', { params: { wallet, mint } });
  }

  /**
   * Get my balance for a token
   */
  async getMyBalance(mint: string): Promise<BalanceResponse> {
    if (!this.signer) {
      throw new Error('Signer required for getMyBalance');
    }
    return this.getBalance(this.signer.publicKey.toBase58(), mint);
  }

  /**
   * Get SOL/USD price
   */
  async getSolPrice(): Promise<SolPriceResponse> {
    return this.request('GET', '/sol-price');
  }

  // ============ Graduation / Jupiter ============

  /**
   * Check graduation status
   */
  async getGraduationStatus(mint: string): Promise<GraduationStatusResponse> {
    return this.request('GET', '/graduate', { params: { mint } });
  }

  /**
   * Check Jupiter availability
   */
  async getJupiterStatus(mint: string): Promise<JupiterStatusResponse> {
    return this.request('GET', '/trade/jupiter', { params: { mint } });
  }

  /**
   * Get Jupiter swap quote
   */
  async getJupiterQuote(params: JupiterSwapRequest): Promise<JupiterQuoteResponse> {
    return this.request('POST', '/trade/jupiter', { body: params });
  }

  /**
   * Execute Jupiter swap
   */
  async executeJupiterSwap(params: JupiterExecuteRequest): Promise<ExecuteTradeResponse> {
    return this.request('POST', '/trade/jupiter/execute', { body: params });
  }

  /**
   * Buy graduated token via Jupiter
   */
  async buyJupiter(mint: string, solAmount: number, slippageBps = 50): Promise<ExecuteTradeResponse> {
    if (!this.signer) {
      throw new Error('Signer required for buyJupiter');
    }

    const wallet = this.signer.publicKey.toBase58();
    const lamports = Math.floor(solAmount * 1e9);
    
    // Get quote
    const quote = await this.getJupiterQuote({
      mint,
      action: 'buy',
      amount: lamports.toString(),
      userPublicKey: wallet,
      slippageBps,
    });

    // Sign (transaction is guaranteed by API contract)
    const signedTx = await signAndSerialize(quote.transaction!, this.signer);

    // Execute
    return this.executeJupiterSwap({
      mint,
      signedTransaction: signedTx,
      type: 'buy',
      wallet,
    });
  }

  /**
   * Sell graduated token via Jupiter
   */
  async sellJupiter(mint: string, tokenAmount: number, slippageBps = 50): Promise<ExecuteTradeResponse> {
    if (!this.signer) {
      throw new Error('Signer required for sellJupiter');
    }

    const wallet = this.signer.publicKey.toBase58();
    
    // Get quote
    const quote = await this.getJupiterQuote({
      mint,
      action: 'sell',
      amount: Math.floor(tokenAmount * 1e6).toString(), // Assuming 6 decimals
      userPublicKey: wallet,
      slippageBps,
    });

    // Sign (transaction is guaranteed by API contract)
    const signedTx = await signAndSerialize(quote.transaction!, this.signer);

    // Execute
    return this.executeJupiterSwap({
      mint,
      signedTransaction: signedTx,
      type: 'sell',
      wallet,
    });
  }

  /**
   * Smart buy - automatically routes to bonding curve or Jupiter
   */
  async smartBuy(mint: string, solAmount: number, slippage = 0.01): Promise<ExecuteTradeResponse> {
    const status = await this.getJupiterStatus(mint);
    if (status.graduated) {
      return this.buyJupiter(mint, solAmount, Math.floor(slippage * 10000));
    }
    return this.buy(mint, solAmount, slippage);
  }

  /**
   * Smart sell - automatically routes to bonding curve or Jupiter
   */
  async smartSell(mint: string, tokenAmount: number, slippage = 0.01): Promise<ExecuteTradeResponse> {
    const status = await this.getJupiterStatus(mint);
    if (status.graduated) {
      return this.sellJupiter(mint, tokenAmount, Math.floor(slippage * 10000));
    }
    return this.sell(mint, tokenAmount, slippage);
  }

  // ============ Chat ============

  /**
   * Get chat messages
   */
  async getChat(params: ChatParams): Promise<ChatMessagesResponse> {
    return this.request('GET', '/chat', { params });
  }

  /**
   * Send chat message
   */
  async sendChat(params: SendChatRequest): Promise<{ success: boolean; message: ChatMessage }> {
    return this.request('POST', '/chat', { body: params, auth: true });
  }

  /**
   * Add reaction
   */
  async addReaction(messageId: string, emoji: string): Promise<void> {
    await this.request('POST', '/reactions', { 
      body: { messageId, emoji }, 
      auth: true 
    });
  }

  /**
   * Remove reaction
   */
  async removeReaction(messageId: string, emoji: string): Promise<void> {
    await this.request('DELETE', '/reactions', { 
      params: { messageId, emoji },
      auth: true 
    });
  }

  // ============ User / Auth ============

  /**
   * Get user profile
   */
  async getProfile(wallet: string): Promise<UserProfile> {
    return this.request('GET', '/profile', { params: { wallet } });
  }

  /**
   * Update profile
   */
  async updateProfile(params: UpdateProfileRequest): Promise<void> {
    await this.request('POST', '/profile', { body: params, auth: true });
  }

  /**
   * Create session token
   */
  async createSession(): Promise<SessionResponse> {
    return this.request('POST', '/auth/session', { body: {}, auth: true });
  }

  /**
   * Validate session token
   */
  async validateSession(): Promise<SessionValidateResponse> {
    return this.request('GET', '/auth/session', { auth: true });
  }

  // ============ Uploads ============

  /**
   * Upload image file
   */
  async uploadImage(file: File | Buffer | Uint8Array, filename = 'image.png'): Promise<UploadResponse> {
    const formData = new FormData();
    
    if (file instanceof Blob) {
      formData.append('file', file, filename);
    } else {
      // Node.js Buffer/Uint8Array - convert to Blob
      const blob = new Blob([file as BlobPart]);
      formData.append('file', blob, filename);
    }

    return this.request('POST', '/upload', { formData });
  }

  /**
   * Upload image from file path (Node.js only)
   */
  async uploadImageFromPath(filePath: string): Promise<UploadResponse> {
    const fs = require('fs');
    const path = require('path');
    const buffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    return this.uploadImage(buffer, filename);
  }

  // ============ Network ============

  /**
   * Get network status
   */
  async getNetworkStatus(): Promise<NetworkStatusResponse> {
    return this.request('GET', '/network');
  }
}

/**
 * Create a new ClawdVault client
 */
export function createClient(config?: ClawdVaultConfig): ClawdVaultClient {
  return new ClawdVaultClient(config);
}

/**
 * ClawdVault API Types
 * Generated from OpenAPI spec with helper types for SDK usage
 */

import type { paths, components } from './generated/api';

// ============ Generated Schema Types ============
// Re-export core schemas from OpenAPI spec

export type Token = components['schemas']['Token'];
export type Trade = components['schemas']['Trade'];
export type ChatMessage = components['schemas']['ChatMessage'];
export type UserProfile = components['schemas']['UserProfile'];

// ============ Helper Type Utilities ============

/** Extract JSON request body from a path operation */
type RequestBody<T> = T extends { requestBody: { content: { 'application/json': infer B } } } ? B : never;

/** Extract JSON response body from a path operation's 200 response */
type ResponseBody<T> = T extends { responses: { 200: { content: { 'application/json': infer R } } } } ? R : never;

/** Extract query parameters from a path operation (handles optional query) */
type QueryParams<T> = T extends { parameters: { query?: infer Q } } 
  ? (Q extends undefined ? Record<string, never> : NonNullable<Q>)
  : T extends { parameters: { query: infer Q } } 
    ? Q 
    : Record<string, never>;

// ============ Request Types (from OpenAPI paths) ============

export type PrepareCreateRequest = RequestBody<paths['/token/prepare-create']['post']>;
export type ExecuteCreateRequest = RequestBody<paths['/token/execute-create']['post']>;
export type PrepareTradeRequest = RequestBody<paths['/trade/prepare']['post']>;
export type ExecuteTradeRequest = RequestBody<paths['/trade/execute']['post']>;
export type JupiterSwapRequest = RequestBody<paths['/trade/jupiter']['post']>;
export type JupiterExecuteRequest = RequestBody<paths['/trade/jupiter/execute']['post']>;
export type SendChatRequest = RequestBody<paths['/chat']['post']>;
export type UpdateProfileRequest = RequestBody<paths['/profile']['post']>;
export type AddReactionRequest = RequestBody<paths['/reactions']['post']>;

// ============ Response Types (from OpenAPI paths) ============

export type PrepareCreateResponse = ResponseBody<paths['/token/prepare-create']['post']>;
export type ExecuteCreateResponse = ResponseBody<paths['/token/execute-create']['post']>;
export type TokenListResponse = ResponseBody<paths['/tokens']['get']>;
export type TokenDetailResponse = ResponseBody<paths['/tokens/{mint}']['get']>;
export type MetadataResponse = ResponseBody<paths['/metadata/{mint}']['get']>;
export type QuoteResponse = ResponseBody<paths['/trade']['get']>;
export type PrepareTradeResponse = ResponseBody<paths['/trade/prepare']['post']>;
export type ExecuteTradeResponse = ResponseBody<paths['/trade/execute']['post']>;
export type TradeHistoryResponse = ResponseBody<paths['/trades']['get']>;
export type CandlesResponse = ResponseBody<paths['/candles']['get']>;
export type StatsResponse = ResponseBody<paths['/stats']['get']>;
export type HoldersResponse = ResponseBody<paths['/holders']['get']>;
export type BalanceResponse = ResponseBody<paths['/balance']['get']>;
export type SolPriceResponse = ResponseBody<paths['/sol-price']['get']>;
export type GraduationStatusResponse = ResponseBody<paths['/graduate']['get']>;
export type JupiterStatusResponse = ResponseBody<paths['/trade/jupiter']['get']>;
export type JupiterQuoteResponse = ResponseBody<paths['/trade/jupiter']['post']>;
export type JupiterExecuteResponse = ResponseBody<paths['/trade/jupiter/execute']['post']>;
export type ChatMessagesResponse = ResponseBody<paths['/chat']['get']>;
export type SendChatResponse = ResponseBody<paths['/chat']['post']>;
export type SessionResponse = ResponseBody<paths['/auth/session']['post']>;
export type SessionValidateResponse = ResponseBody<paths['/auth/session']['get']>;
export type UploadResponse = ResponseBody<paths['/upload']['post']>;
export type NetworkStatusResponse = ResponseBody<paths['/network']['get']>;

// ============ Query Parameter Types ============

export type TokenListParams = QueryParams<paths['/tokens']['get']>;
export type QuoteParams = QueryParams<paths['/trade']['get']>;
export type TradesParams = QueryParams<paths['/trades']['get']>;
export type CandlesParams = QueryParams<paths['/candles']['get']>;
export type ChatParams = QueryParams<paths['/chat']['get']>;

// ============ Extracted Sub-types ============

/** Candle data point */
export type CandleData = NonNullable<CandlesResponse['candles']>[number];

/** Holder information */
export type HolderInfo = NonNullable<HoldersResponse['holders']>[number];

/** On-chain stats data */
export type OnChainStats = NonNullable<StatsResponse['onChain']>;

/** Graduation data */
export type GraduationData = NonNullable<GraduationStatusResponse['data']>;

/** Jupiter quote data */
export type JupiterQuote = NonNullable<JupiterQuoteResponse['quote']>;

/** Verified trade data from execute response */
export type VerifiedTrade = NonNullable<ExecuteTradeResponse['trade']>;

// ============ Agent Types (from OpenAPI paths) ============

export type AgentRegisterRequest = RequestBody<paths['/agent/register']['post']>;
export type AgentClaimRequest = RequestBody<paths['/agent/claim']['post']>;

export type AgentRegisterResponse = ResponseBody<paths['/agent/register']['post']>;
export type AgentClaimResponse = ResponseBody<paths['/agent/claim']['post']>;
export type AgentsListResponse = ResponseBody<paths['/agents']['get']>;
export type UsersListResponse = ResponseBody<paths['/users']['get']>;
export type SiteStatsResponse = ResponseBody<paths['/site-stats']['get']>;

export type AgentsListParams = QueryParams<paths['/agents']['get']>;
export type UsersListParams = QueryParams<paths['/users']['get']>;

/** Agent leaderboard entry */
export type AgentEntry = components['schemas']['AgentEntry'];

/** User leaderboard entry */
export type UserEntry = components['schemas']['UserEntry'];

// ============ Full API paths export for advanced usage ============

export type { paths, components } from './generated/api';

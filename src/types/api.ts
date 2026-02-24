/**
 * API Response Types
 * API 響應類型定義
 */

// 通用 API 響應類型
export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

// 信號相關類型
export interface Signal {
  id: number;
  symbol: string;
  type: string; // 'LONG' | 'SHORT'
  price: number;
  time: string;
  confidence: number;
  strategy: string;
}

// 回測結果相關類型
export interface Backtest {
  id: number;
  strategy: string;
  symbol: string;
  return: number;
  sharpe: number;
  max_dd: number;
}

// 策略相關類型
export interface Strategy {
  id: number;
  name: string;
  params: string;
  return: number;
  sharpe: number;
  enabled: boolean;
}

// 倉位相關類型
export interface Position {
  symbol: string;
  shares: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  allocation: number;
}

// 投資組合相關類型
export interface Portfolio {
  totalAssets: number;
  todayPnL: number;
  positions: Position[];
}

// 市場狀態相關類型
export interface MarketStatus {
  isOpen: boolean;
  lastUpdate: string | null;
}

// API 請求參數類型
export interface SignalsParams {
  type?: string;
  symbol?: string;
  limit?: number;
}

export interface BacktestsParams {
  strategy?: string;
  symbol?: string;
  limit?: number;
}

// API 響應數據類型
export interface SignalsResponse {
  signals: Signal[];
  status: 'ok' | 'error';
}

export interface BacktestsResponse {
  backtests: Backtest[];
  status: 'ok' | 'error';
}

export interface StrategiesResponse {
  strategies: Strategy[];
  status: 'ok' | 'error';
}

export interface PortfolioResponse {
  portfolio: Portfolio;
  status: 'ok' | 'error';
}

// 切換策略響應
export interface ToggleStrategyResponse {
  enabled: boolean;
  status: 'ok' | 'error';
}

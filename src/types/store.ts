/**
 * Store Types
 * 狀態管理類型定義
 */

import type { Signal, Backtest, Strategy, Portfolio, MarketStatus } from './api';

// 信號狀態
export interface SignalsState {
  items: Signal[];
  loading: boolean;
}

// 回測狀態
export interface BacktestsState {
  items: Backtest[];
  loading: boolean;
}

// 策略狀態
export interface StrategiesState {
  items: Strategy[];
  loading: boolean;
}

// 投資組合狀態
export interface PortfolioState {
  data: Portfolio;
  loading: boolean;
}

// 市場狀態
export interface MarketStatusState {
  isOpen: boolean;
  lastUpdate: string | null;
}

// 根狀態
export interface RootState {
  signals: SignalsState;
  backtests: BacktestsState;
  strategies: StrategiesState;
  portfolio: PortfolioState;
  marketStatus: MarketStatusState;
}

// 為了向後兼容，也導出 signals 和 positions 狀態
// 這些在設計文件中被引用
export interface SignalsStateCompat {
  items: Signal[];
  loading: boolean;
}

export interface PositionsState {
  items: any[]; // 倉位數據
  loading: boolean;
}

// 重新導出類型以便於使用
export type { Signal, Backtest, Strategy, Portfolio, MarketStatus };

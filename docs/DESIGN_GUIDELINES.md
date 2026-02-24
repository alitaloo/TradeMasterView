# TradeMasterView Design Guidelines

**量化交易可视化仪表板 - 設計規範**

---

## 配色方案

| 用途 | 色值 | CSS 變量 |
|------|------|----------|
| **主色** | `#1a1a2e` | `--color-primary` |
| **背景色** | `#16213e` | `--color-background` |
| **強調色** | `#e94560` | `--color-accent` |
| **成功色** | `#4ecca3` | `--color-success` |
| **警告色** | `#ffc107` | `--color-warning` |
| **文字色** | `#ffffff` | `--color-text` |
| **次要文字** | `#a0a0a0` | `--color-text-secondary` |
| **邊框色** | `#2a2a4a` | `--color-border` |

---

## 字體規範

| 用途 | 字體 | 大小 | 字重 |
|------|------|------|------|
| **標題** | Inter | 24px | Bold |
| **副標題** | Inter | 18px | SemiBold |
| **正文** | Inter | 14px | Regular |
| **代碼** | JetBrains Mono | 12px | Regular |

---

## 間距規範

| 用途 | Padding | Margin |
|------|---------|--------|
| **卡片內邊距** | 16px | - |
| **區塊間距** | - | 24px |
| **按鈕內邊距** | 12px 24px | - |
| **列表項** | 12px 16px | 8px |

---

## 組件尺寸

| 組件 | 寬度 | 高度 |
|------|------|------|
| **Header** | 100% | 64px |
| **Sidebar** | 240px | 100% |
| **SignalCard** | 100% | auto |
| **BacktestChart** | 100% | 400px |
| **StrategyTable** | 100% | auto |

---

## 響應式設計

| 斷點 | 螢幕寬度 | Sidebar 行為 |
|------|----------|-------------|
| **Desktop** | > 1200px | 展開 |
| **Tablet** | 768px - 1200px | 收起圖標 |
| **Mobile** | < 768px | 隱藏/抽屜 |

---

## 組件設計原則

### 1. Header
- Logo 左對齊
- 搜索框居中
- 用戶信息右對齊
- 通知圖標

### 2. Sidebar
- Logo + 標題
- 導航選單（Dashboard, Signals, Backtests, Strategies, Portfolio）
- 當前路由高亮
- 收縮/展開按鈕

### 3. SignalCard
- LONG: 綠色標籤
- SHORT: 紅色標籤
- 股票代碼 + 名稱
- 置信度進度條
- 時間戳

### 4. 卡片樣式
- 圓角: 8px
- 陰影: 0 4px 6px rgba(0, 0, 0, 0.1)
- 背景: #1a1a2e
- 邊框: 1px solid #2a2a4a

---

## API 數據結構

### Signals
```typescript
interface Signal {
  id: string;
  symbol: string;
  name: string;
  direction: 'LONG' | 'SHORT';
  confidence: number; // 0-1
  timestamp: string;
  strategy: string;
}
```

### Backtests
```typescript
interface Backtest {
  id: string;
  strategy_name: string;
  final_equity: number;
  total_return: number; // -1 to 1
  max_drawdown: number; // 0-1
  sharpe_ratio: number;
  win_rate: number; // 0-1
  trades_count: number;
  start_date: string;
  end_date: string;
}
```

### Strategies
```typescript
interface Strategy {
  id: string;
  name: string;
  enabled: boolean;
  parameters: Record<string, number>;
  performance: {
    total_return: number;
    sharpe_ratio: number;
  };
}
```

### Portfolio
```typescript
interface Portfolio {
  id: string;
  positions: Position[];
  total_value: number;
  cash_balance: number;
}

interface Position {
  symbol: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  pnl: number;
  pnl_percent: number;
}
```

---

## 圖表配置

### Equity Curve Chart
- 類型: Line Chart
- X軸: 日期
- Y軸: 資金
- 填充: 漸變背景

### Drawdown Chart
- 類型: Area Chart
- X軸: 日期
- Y軸: 回撤百分比

### Strategy Comparison
- 類型: Bar Chart
- 分組: 策略名稱
- 數值: 報酬率/夏普比率

---

## 文件結構

```
docs/
├── DESIGN_GUIDELINES.md
└── COMPONENTS.md

src/
├── components/
│   ├── Header.vue
│   ├── Sidebar.vue
│   ├── SignalCard.vue
│   ├── BacktestChart.vue
│   ├── StrategyTable.vue
│   └── PortfolioSummary.vue
├── views/
│   ├── Dashboard.vue
│   ├── Signals.vue
│   ├── Backtests.vue
│   ├── Strategies.vue
│   └── Portfolio.vue
├── api/
│   └── index.js
├── utils/
│   └── formatter.js
└── stores/
    └── trademaster.js
```

---

*最後更新: 2026-02-11*

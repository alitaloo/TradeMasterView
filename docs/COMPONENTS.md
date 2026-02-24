# TradeMasterView Components

**組件接口文檔**

---

## Header.vue

### Props
```typescript
interface Props {
  title?: string;
  userName?: string;
  notifications?: number;
}
```

### 使用示例
```vue
<Header
  title="TradeMaster"
  user-name="Alita"
  :notifications="3"
/>
```

### Events
| 事件名 | 參數 | 說明 |
|--------|------|------|
| search | query: string | 搜索請求 |
| toggleSidebar | - | 收縮側邊欄 |
| logout | - | 登出 |

---

## Sidebar.vue

### Props
```typescript
interface Props {
  collapsed?: boolean;
  items?: SidebarItem[];
}

interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: number;
}
```

### 使用示例
```vue
<Sidebar
  :items="navItems"
  :collapsed="false"
  @toggle="toggleSidebar"
/>
```

### 預設導航
```javascript
const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', route: '/dashboard' },
  { id: 'signals', label: 'Signals', icon: '📈', route: '/signals', badge: 5 },
  { id: 'backtests', label: 'Backtests', icon: '🔬', route: '/backtests' },
  { id: 'strategies', label: 'Strategies', icon: '⚙️', route: '/strategies' },
  { id: 'portfolio', label: 'Portfolio', icon: '💼', route: '/portfolio' },
]
```

---

## SignalCard.vue

### Props
```typescript
interface Props {
  signal: {
    id: string;
    symbol: string;
    name: string;
    direction: 'LONG' | 'SHORT';
    confidence: number;
    timestamp: string;
    strategy: string;
  };
}
```

### 使用示例
```vue
<SignalCard
  :signal="{
    id: 'sig_001',
    symbol: 'AMD',
    name: 'Advanced Micro Devices',
    direction: 'LONG',
    confidence: 0.85,
    timestamp: '2026-02-11T08:00:00Z',
    strategy: 'Trend Following'
  }"
/>
```

### 樣式規則
- LONG: 綠色 (#4ecca3)
- SHORT: 紅色 (#e94560)
- 置信度: 進度條顯示

---

## BacktestChart.vue

### Props
```typescript
interface Props {
  data: {
    labels: string[];
    equity: number[];
    drawdown: number[];
  };
  type?: 'equity' | 'drawdown';
  height?: number;
}
```

### 使用示例
```vue
<BacktestChart
  :data="chartData"
  type="equity"
  :height="400"
/>
```

### 內部組件
```vue
<!-- Equity Curve -->
<Line
  :data="equityData"
  :options="chartOptions"
/>

<!-- Drawdown Area -->
<Area
  :data="drawdownData"
  :options="areaOptions"
/>
```

---

## StrategyTable.vue

### Props
```typescript
interface Props {
  strategies: Strategy[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
```

### 使用示例
```vue
<StrategyTable
  :strategies="strategyList"
  sort-by="total_return"
  sort-order="desc"
/>
```

### 表格欄位
| 欄位 | 鍵名 | 類型 | 說明 |
|------|------|------|------|
| 名稱 | name | string | 策略名稱 |
| 狀態 | enabled | boolean | 開/關 |
| 報酬率 | total_return | percent | 總回報 |
| 夏普比率 | sharpe_ratio | number | 風險調整後報酬 |
| 交易次數 | trades_count | number | 總交易筆數 |

### Events
| 事件名 | 參數 | 說明 |
|--------|------|------|
| toggle | id: string | 開關策略 |
| edit | strategy: Strategy | 編輯策略 |
| delete | id: string | 刪除策略 |

---

## PortfolioSummary.vue

### Props
```typescript
interface Props {
  portfolio: {
    total_value: number;
    cash_balance: number;
    positions: Position[];
  };
}
```

### 使用示例
```vue
<PortfolioSummary :portfolio="portfolioData" />
```

### 子組件
```vue
<!-- 持倉卡片 -->
<PositionCard
  v-for="pos in positions"
  :key="pos.symbol"
  :position="pos"
/>

<!-- 收益統計 -->
<ReturnStats :returns="returns" />

<!-- 風險指標 -->
<RiskMetrics :metrics="riskData" />
```

### 顯示內容
- 總資產價值
- 現金餘額
- 持倉分布圖
- 今日損益
- 風險指標（最大回撤、波動率）

---

## 通用組件 Props

### Card
```typescript
interface CardProps {
  title?: string;
  padding?: boolean;
  hover?: boolean;
}
```

### Button
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
}
```

### Badge
```typescript
interface BadgeProps {
  type?: 'success' | 'warning' | 'danger' | 'info';
  size?: 'sm' | 'md';
}
```

---

## Vue 使用注意事項

1. **使用 `<script setup>` 語法**
2. **Props 定義使用 TypeScript interface**
3. **樣式使用 `<style scoped>`**
4. **CSS 變量從 `:root` 读取**
5. **圖表使用 vue-chartjs 包装器**

---

## 導入示例

```vue
<script setup>
import Header from '@/components/Header.vue';
import Sidebar from '@/components/Sidebar.vue';
import SignalCard from '@/components/SignalCard.vue';
</script>
```

---

*最後更新: 2026-02-11*

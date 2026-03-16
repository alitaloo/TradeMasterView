<template>
  <div class="dashboard">
    <!-- 歡迎橫幅 -->
    <div class="welcome-banner">
      <div class="welcome-content">
        <h1 class="welcome-title">歡迎回來，Z 👋</h1>
        <p class="welcome-subtitle">今天是 {{ currentDate }}，市場 {{ marketStatus }}</p>
        <FreshnessIndicator :timestamp="store.signalsTimestamp" class="mt-2" />
        <FreshnessIndicator :timestamp="newsSyncTimestamp" label="新聞同步於" class="mt-1" />
      </div>
      <div class="quick-actions">
        <button class="action-btn" @click="$router.push('/signals')">
          <span>📈</span> 查看信號
        </button>
        <button class="action-btn secondary" @click="$router.push('/backtests')">
          <span>📊</span> 回測分析
        </button>
      </div>
    </div>
    
    <!-- 統計卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon long">📈</div>
        <div class="stat-info">
          <span class="stat-label">多頭信號</span>
          <span class="stat-value long">{{ stats.longSignals }}</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon short">📉</div>
        <div class="stat-info">
          <span class="stat-label">空頭信號</span>
          <span class="stat-value short">{{ stats.shortSignals }}</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon success">💰</div>
        <div class="stat-info">
          <span class="stat-label">今日收益</span>
          <span class="stat-value success">+{{ stats.todayReturn }}%</span>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon warning">⚠️</div>
        <div class="stat-info">
          <span class="stat-label">待處理</span>
          <span class="stat-value">{{ stats.pendingTasks }}</span>
        </div>
      </div>
    </div>
    
    <!-- 主要內容區域 -->
    <div class="dashboard-content">
      <!-- 左側：最新信號 -->
      <div class="content-left">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">📈 最新信號</h2>
            <router-link to="/signals" class="view-all">查看全部 →</router-link>
          </div>
          <div class="signal-list">
            <SignalCard 
              v-for="signal in latestSignals" 
              :key="signal.id"
              :signal="signal"
            />
          </div>
        </div>
      </div>
      
      <!-- 右側：策略表現 -->
      <div class="content-right">
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">🏆 策略表現</h2>
          </div>
          <div class="strategy-list">
            <div 
              v-for="strategy in topStrategies" 
              :key="strategy.name + strategy.symbol"
              class="strategy-item"
            >
              <div class="strategy-info">
                <span class="strategy-name">{{ strategy.name }}</span>
                <span class="strategy-symbol">{{ strategy.symbol }}</span>
              </div>
              <div class="strategy-stats">
                <span class="strategy-return" :class="strategy.return >= 0 ? 'long' : 'short'">
                  {{ strategy.return >= 0 ? '+' : '' }}{{ formatNumber(strategy.return) }}%
                </span>
                <span class="strategy-sharpe">Sharpe: {{ formatNumber(strategy.sharpe) }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 投資組合分布 -->
        <div class="card">
          <div class="card-header">
            <h2 class="card-title">💼 投資組合</h2>
          </div>
          <div class="portfolio-summary">
            <div class="portfolio-item">
              <span class="portfolio-label">總資產</span>
              <span class="portfolio-value">${{ formatNumber(portfolio.totalAssets) }}</span>
            </div>
            <div class="portfolio-item">
              <span class="portfolio-label">今日盈虧</span>
              <span class="portfolio-value" :class="portfolio.todayPnL >= 0 ? 'long' : 'short'">
                {{ portfolio.todayPnL >= 0 ? '+' : '' }}${{ formatNumber(portfolio.todayPnL) }}
              </span>
            </div>
            <div class="portfolio-item">
              <span class="portfolio-label">持倉數量</span>
              <span class="portfolio-value">{{ portfolio.positions?.length || 0 }} 檔</span>
            </div>
          </div>
        </div>

        <!-- 系統狀態面板 -->
        <SystemStatusPanel />

        <!-- 手動控制面板 -->
        <ManualActionsPanel />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useTradeMasterStore } from '../stores/trademaster'
import { newsApi } from '../api/index.js'
import SignalCard from '../components/SignalCard.vue'
import FreshnessIndicator from '../components/FreshnessIndicator.js'
import SystemStatusPanel from '../components/SystemStatusPanel.vue'
import ManualActionsPanel from '../components/ManualActionsPanel.vue'
import { getUSMarketStatus } from '../utils/datetime.js'

const store = useTradeMasterStore()

// 新聞同步狀態
const newsSyncTimestamp = ref(null)

const currentDate = computed(() => {
  return new Date().toLocaleDateString('zh-TW', { 
    month: 'long', 
    day: 'numeric', 
    weekday: 'long' 
  })
})

const marketStatus = computed(() => {
  const status = getUSMarketStatus()
  return status.text
})

// 格式化數字
const formatNumber = (num, decimals = 2) => {
  if (typeof num !== 'number') return '0.00'
  return num.toFixed(decimals)
}

// 統計卡片數據 — 不再硬編碼 fallback 數字
const stats = computed(() => ({
  longSignals: store.longSignals.length,
  shortSignals: store.shortSignals.length,
  todayReturn: store.portfolio.todayPnL && store.portfolio.totalAssets
    ? ((store.portfolio.todayPnL / (store.portfolio.totalAssets - store.portfolio.todayPnL)) * 100).toFixed(2)
    : '0.00',
  pendingTasks: store.signals.filter(s => (s.status || '').toUpperCase() === 'PENDING').length
}))

// 最新信號
const latestSignals = computed(() => store.signals.slice(0, 4))

// 策略表現
const topStrategies = computed(() => {
  if (store.backtests.length > 0) {
    return [...store.backtests]
      .sort((a, b) => (b.sharpe || 0) - (a.sharpe || 0))
      .slice(0, 4)
      .map(b => ({
        // strategy field may not exist; derive from file name or params
        name: b.strategy || (b.file ? b.file.replace(/_results\.csv$/, '').replace(/_/g, ' ') : b.params || '-'),
        symbol: b.symbol || '-',
        return: b.return || 0,
        sharpe: b.sharpe || 0
      }))
  }
  return []
})

// 投資組合 — 直接使用 store 數據
const portfolio = computed(() => store.portfolio)

onMounted(async () => {
  await store.initialize()
  // 載入新聞同步狀態
  try {
    const res = await newsApi.getSyncStatus()
    newsSyncTimestamp.value = res.news_last_synced || null
  } catch (e) {
    console.warn('News sync status unavailable:', e)
  }
})
</script>

<style scoped>
.dashboard {
  animation: fadeIn 0.3s ease;
}

.welcome-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px;
  background: linear-gradient(135deg, rgba(233, 69, 96, 0.2) 0%, rgba(102, 126, 234, 0.2) 100%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  margin-bottom: 24px;
}

.welcome-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.welcome-subtitle {
  color: var(--color-text-secondary);
  font-size: 0.9375rem;
}

.quick-actions {
  display: flex;
  gap: 12px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: var(--gradient-accent);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glow);
}

.action-btn.secondary {
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  border-radius: var(--radius-md);
}

.stat-icon.long { background: rgba(78, 204, 163, 0.2); }
.stat-icon.short { background: rgba(255, 71, 87, 0.2); }
.stat-icon.success { background: rgba(78, 204, 163, 0.2); }
.stat-icon.warning { background: rgba(255, 193, 7, 0.2); }

.stat-label {
  display: block;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.stat-value.long { color: var(--color-success); }
.stat-value.short { color: var(--color-danger); }

.dashboard-content {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
}

.content-left,
.content-right {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.view-all {
  font-size: 0.875rem;
  color: var(--color-accent);
}

.signal-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.strategy-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.strategy-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.strategy-info {
  display: flex;
  flex-direction: column;
}

.strategy-name {
  font-size: 0.875rem;
  font-weight: 500;
}

.strategy-symbol {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.strategy-stats {
  text-align: right;
}

.strategy-return {
  display: block;
  font-weight: 600;
}

.strategy-sharpe {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.portfolio-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.portfolio-item {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.portfolio-label {
  color: var(--color-text-muted);
}

.portfolio-value {
  font-weight: 600;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .dashboard-content {
    grid-template-columns: 1fr;
  }
}

.freshness-indicator {
  font-size: 0.75rem;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.freshness-indicator.fresh {
  background: rgba(78, 204, 163, 0.2);
  color: var(--color-success);
}

.freshness-indicator.normal {
  background: rgba(78, 204, 163, 0.1);
  color: var(--color-success);
}

.freshness-indicator.stale {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
}

.freshness-indicator.outdated {
  background: rgba(255, 71, 87, 0.2);
  color: var(--color-danger);
}

.freshness-indicator.unknown {
  background: var(--color-bg-tertiary);
  color: var(--color-text-muted);
}

.mt-2 {
  margin-top: 8px;
}
</style>

<template>
  <div class="risk-page">
    <div class="page-header">
      <h1 class="page-title">🛡️ 風控儀表板</h1>
      <button class="btn btn-primary" @click="checkRisk">
        <span>🔄</span> 重新檢查
      </button>
    </div>

    <!-- Tab 切換 -->
    <div class="risk-tabs">
      <button :class="['risk-tab', activeTab==='paper'?'active':'']" @click="activeTab='paper'">
        📊 模擬交易風控
      </button>
      <button :class="['risk-tab', activeTab==='live'?'active':'']" @click="activeTab='live'; fetchLiveRiskSettings()">
        💰 真實交易風控
      </button>
    </div>

    <!-- 模擬交易風控內容 -->
    <div v-show="activeTab==='paper'">
    <!-- 風控狀態 -->
    <div class="risk-status" :class="riskStatus">
      <div class="status-icon">
        {{ riskStatus === 'safe' ? '✅' : riskStatus === 'warning' ? '⚠️' : '🔴' }}
      </div>
      <div class="status-info">
        <div class="status-title">
          {{ riskStatus === 'safe' ? '風控正常' : riskStatus === 'warning' ? '風控警告' : '風控攔截' }}
        </div>
        <div class="status-desc">{{ riskMessage }}</div>
      </div>
    </div>

    <!-- 風控指標 - 2欄/3欄 grid -->
    <div class="risk-metrics">
      <h3>風控指標</h3>
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-label">持倉集中度</div>
          <div class="metric-value" :class="positionConcentration > 30 ? 'warning' : 'normal'">
            {{ positionConcentration.toFixed(1) }}%
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-label">整體損益</div>
          <div class="metric-value" :class="(paperStatus?.overall_pnl || 0) >= 0 ? 'profit' : 'loss'">
            {{ (paperStatus?.overall_pnl || 0) >= 0 ? '+' : '' }}${{ (paperStatus?.overall_pnl || 0).toLocaleString() }}
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-label">VIX 風險</div>
          <div class="metric-value" :class="vixLevel.color">{{ vixLevel.label }}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">總資產</div>
          <div class="metric-value">${{ (paperStatus?.total_assets || 0).toLocaleString() }}</div>
        </div>
      </div>
    </div>

    <!-- 風控配置 -->
    <div class="config-section">
      <h3>風控配置</h3>
      <div class="config-grid">
        <div class="config-item">
          <div class="config-label">單筆最大金額</div>
          <div class="config-value">${{ config.max_single_amount.toLocaleString() }}</div>
        </div>
        <div class="config-item">
          <div class="config-label">總持倉上限</div>
          <div class="config-value">${{ config.max_total_position.toLocaleString() }}</div>
        </div>
        <div class="config-item">
          <div class="config-label">單股票上限</div>
          <div class="config-value">${{ config.max_position_per_stock.toLocaleString() }}</div>
        </div>
        <div class="config-item">
          <div class="config-label">最大杠桿</div>
          <div class="config-value">{{ config.max_leverage }}x</div>
        </div>
        <div class="config-item">
          <div class="config-label">最低信心度</div>
          <div class="config-value">{{ (config.min_confidence * 100).toFixed(0) }}%</div>
        </div>
        <div class="config-item">
          <div class="config-label">最大持倉股票數</div>
          <div class="config-value">{{ config.max_stocks }}</div>
        </div>
      </div>
    </div>

    <!-- 持倉風控 -->
    <div class="positions-risk">
      <h3>持倉風險評估</h3>
      <div v-if="loading" class="loading">載入中...</div>
      <div v-else class="risk-list">
        <div 
          v-for="pos in positions" 
          :key="pos.symbol" 
          class="risk-item"
          :class="getRiskLevel(pos)"
        >
          <div class="risk-symbol">{{ pos.symbol }}</div>
          <div class="risk-info">
            <div class="risk-value">
              持倉: ${{ (pos.market_value || 0).toLocaleString() }}
            </div>
            <div class="risk-pnl" :class="(pos.unrealized_pnl || 0) >= 0 ? 'profit' : 'loss'">
              損益: ${{ (pos.unrealized_pnl || 0).toLocaleString() }} ({{ (pos.return_pct || 0).toFixed(2) }}%)
            </div>
          </div>
          <div class="risk-badge">
            {{ getRiskLabel(pos) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 風控日誌 -->
    <div class="risk-logs">
      <h3>最近風控記錄</h3>
      <div class="logs-list">
        <div v-for="log in riskLogs" :key="log.id" class="log-item">
          <div class="log-time">{{ formatTime(log.triggered_at) }}</div>
          <div class="log-rule">{{ log.rule_name }}</div>
          <div class="log-action">{{ log.action_taken }}</div>
        </div>
        <div v-if="riskLogs.length === 0" class="empty">暫無風控記錄</div>
      </div>
    </div>

    <!-- 📰 新聞 + ⚙️ 設定（2欄並排）-->
    <div class="news-settings-row">
    <!-- 📰 市場新聞 -->
    <div class="news-section">
      <div class="news-header">
        <h3>📰 市場新聞</h3>
        <div class="news-filters">
          <select v-model="newsFilter.symbol" @change="fetchNews" class="news-select">
            <option value="">全部股票</option>
            <option v-for="sym in watchlistSymbols" :key="sym" :value="sym">{{ sym }}</option>
          </select>
          <select v-model="newsFilter.sentiment" @change="fetchNews" class="news-select">
            <option value="">全部情緒</option>
            <option value="positive">📈 正面</option>
            <option value="negative">📉 負面</option>
            <option value="neutral">➖ 中性</option>
          </select>
          <button @click="fetchNews" class="btn-refresh-news">🔄</button>
        </div>
      </div>
      <div v-if="newsLoading" class="loading">載入中...</div>
      <div v-else-if="newsList.length === 0" class="empty-news">暫無新聞</div>
      <div v-else class="news-list">
        <a
          v-for="item in newsList"
          :key="item.id"
          :href="item.url"
          target="_blank"
          class="news-item"
          :class="item.sentiment"
        >
          <div class="news-meta">
            <span class="news-symbol">{{ item.symbol }}</span>
            <span class="news-sentiment" :class="item.sentiment">
              {{ item.sentiment === 'positive' ? '📈' : item.sentiment === 'negative' ? '📉' : '➖' }}
            </span>
            <span class="news-time">{{ formatNewsTime(item.created_at) }}</span>
          </div>
          <div class="news-title">{{ item.title }}</div>
          <div class="news-source">{{ item.source }}</div>
        </a>
      </div>
    </div>

    <!-- ⚙️ 風控參數設定 -->
    <div class="config-section risk-settings">
      <h3>⚙️ 風控參數設定</h3>
      <div class="settings-grid">
        <!-- 最低信心度 -->
        <div class="setting-item">
          <label>最低信心度</label>
          <div class="setting-input">
            <input type="range" v-model.number="riskSettings.min_confidence" min="0.3" max="0.95" step="0.05" />
            <input type="number" v-model.number="riskSettings.min_confidence" min="0.3" max="0.95" step="0.05" />
            <span class="setting-unit">{{ (riskSettings.min_confidence * 100).toFixed(0) }}%</span>
          </div>
        </div>

        <!-- 單筆上限 -->
        <div class="setting-item">
          <label>單筆上限</label>
          <div class="setting-input">
            <input type="range" v-model.number="riskSettings.max_single_amount_pct" min="0.01" max="0.5" step="0.01" />
            <input type="number" v-model.number="riskSettings.max_single_amount_pct" min="0.01" max="0.5" step="0.01" />
            <span class="setting-unit">{{ (riskSettings.max_single_amount_pct * 100).toFixed(0) }}%</span>
          </div>
        </div>

        <!-- 單股上限 -->
        <div class="setting-item">
          <label>單股上限</label>
          <div class="setting-input">
            <input type="range" v-model.number="riskSettings.max_position_per_stock_pct" min="0.05" max="0.8" step="0.05" />
            <input type="number" v-model.number="riskSettings.max_position_per_stock_pct" min="0.05" max="0.8" step="0.05" />
            <span class="setting-unit">{{ (riskSettings.max_position_per_stock_pct * 100).toFixed(0) }}%</span>
          </div>
        </div>

        <!-- 總持倉上限 -->
        <div class="setting-item">
          <label>總持倉上限</label>
          <div class="setting-input">
            <input type="range" v-model.number="riskSettings.max_total_position_pct" min="0.1" max="1.0" step="0.1" />
            <input type="number" v-model.number="riskSettings.max_total_position_pct" min="0.1" max="1.0" step="0.1" />
            <span class="setting-unit">{{ (riskSettings.max_total_position_pct * 100).toFixed(0) }}%</span>
          </div>
        </div>

        <!-- 最大持倉股數 -->
        <div class="setting-item">
          <label>最大持倉股數</label>
          <div class="setting-input">
            <input type="range" v-model.number="riskSettings.max_stocks" min="1" max="30" step="1" />
            <input type="number" v-model.number="riskSettings.max_stocks" min="1" max="30" step="1" />
            <span class="setting-unit">檔</span>
          </div>
        </div>

        <!-- 止損 -->
        <div class="setting-item">
          <label>止損</label>
          <div class="setting-input">
            <input type="range" v-model.number="riskSettings.stop_loss_pct" min="0.01" max="0.3" step="0.01" />
            <input type="number" v-model.number="riskSettings.stop_loss_pct" min="0.01" max="0.3" step="0.01" />
            <span class="setting-unit">{{ (riskSettings.stop_loss_pct * 100).toFixed(0) }}%</span>
          </div>
        </div>

        <!-- 止盈 -->
        <div class="setting-item">
          <label>止盈</label>
          <div class="setting-input">
            <input type="range" v-model.number="riskSettings.take_profit_pct" min="0.01" max="0.5" step="0.01" />
            <input type="number" v-model.number="riskSettings.take_profit_pct" min="0.01" max="0.5" step="0.01" />
            <span class="setting-unit">{{ (riskSettings.take_profit_pct * 100).toFixed(0) }}%</span>
          </div>
        </div>
      </div>
      <div class="settings-actions">
        <button class="btn btn-primary" @click="saveRiskSettings" :disabled="saving">
          {{ saving ? '儲存中...' : '💾 儲存設定' }}
        </button>
      </div>
    </div>
    </div><!-- end news-settings-row -->
    </div><!-- end paper tab -->

    <!-- 真實交易風控內容 -->
    <div v-show="activeTab==='live'" class="live-risk-section">
      <div class="live-risk-warning">⚠️ 以下設定影響真實資金交易，請謹慎調整</div>
      
      <!-- 真實交易風控設定 -->
      <div class="config-section risk-settings">
        <h3>💰 真實交易風控設定</h3>
        <div class="settings-grid">
          <!-- 最低信心度 -->
          <div class="setting-item">
            <label>最低信心度</label>
            <div class="setting-input">
              <input type="range" v-model.number="liveRiskSettings.min_confidence" min="0.3" max="0.95" step="0.05" />
              <input type="number" v-model.number="liveRiskSettings.min_confidence" min="0.3" max="0.95" step="0.05" />
              <span class="setting-unit">{{ (liveRiskSettings.min_confidence * 100).toFixed(0) }}%</span>
            </div>
          </div>

          <!-- 單筆上限 -->
          <div class="setting-item">
            <label>單筆上限</label>
            <div class="setting-input">
              <input type="range" v-model.number="liveRiskSettings.max_single_amount_pct" min="0.01" max="0.5" step="0.01" />
              <input type="number" v-model.number="liveRiskSettings.max_single_amount_pct" min="0.01" max="0.5" step="0.01" />
              <span class="setting-unit">{{ (liveRiskSettings.max_single_amount_pct * 100).toFixed(0) }}%</span>
            </div>
          </div>

          <!-- 單股上限 -->
          <div class="setting-item">
            <label>單股上限</label>
            <div class="setting-input">
              <input type="range" v-model.number="liveRiskSettings.max_position_per_stock_pct" min="0.05" max="0.8" step="0.05" />
              <input type="number" v-model.number="liveRiskSettings.max_position_per_stock_pct" min="0.05" max="0.8" step="0.05" />
              <span class="setting-unit">{{ (liveRiskSettings.max_position_per_stock_pct * 100).toFixed(0) }}%</span>
            </div>
          </div>

          <!-- 總持倉上限 -->
          <div class="setting-item">
            <label>總持倉上限</label>
            <div class="setting-input">
              <input type="range" v-model.number="liveRiskSettings.max_total_position_pct" min="0.1" max="1.0" step="0.1" />
              <input type="number" v-model.number="liveRiskSettings.max_total_position_pct" min="0.1" max="1.0" step="0.1" />
              <span class="setting-unit">{{ (liveRiskSettings.max_total_position_pct * 100).toFixed(0) }}%</span>
            </div>
          </div>

          <!-- 最大持倉股數 -->
          <div class="setting-item">
            <label>最大持倉股數</label>
            <div class="setting-input">
              <input type="range" v-model.number="liveRiskSettings.max_stocks" min="1" max="30" step="1" />
              <input type="number" v-model.number="liveRiskSettings.max_stocks" min="1" max="30" step="1" />
              <span class="setting-unit">檔</span>
            </div>
          </div>

          <!-- 止損 -->
          <div class="setting-item">
            <label>止損</label>
            <div class="setting-input">
              <input type="range" v-model.number="liveRiskSettings.stop_loss_pct" min="0.01" max="0.3" step="0.01" />
              <input type="number" v-model.number="liveRiskSettings.stop_loss_pct" min="0.01" max="0.3" step="0.01" />
              <span class="setting-unit">{{ (liveRiskSettings.stop_loss_pct * 100).toFixed(0) }}%</span>
            </div>
          </div>

          <!-- 止盈 -->
          <div class="setting-item">
            <label>止盈</label>
            <div class="setting-input">
              <input type="range" v-model.number="liveRiskSettings.take_profit_pct" min="0.01" max="0.5" step="0.01" />
              <input type="number" v-model.number="liveRiskSettings.take_profit_pct" min="0.01" max="0.5" step="0.01" />
              <span class="setting-unit">{{ (liveRiskSettings.take_profit_pct * 100).toFixed(0) }}%</span>
            </div>
          </div>
        </div>
        <div class="settings-actions">
          <button class="btn btn-primary live-save-btn" @click="saveLiveRiskSettings" :disabled="savingLive">
            {{ savingLive ? '儲存中...' : '💾 儲存設定' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'

const API_URL = import.meta.env.VITE_API_URL
const { error, success } = useToast()

// Tab 切換
const activeTab = ref('paper')

const config = ref({
  max_single_amount: 10000,
  max_total_position: 50000,
  max_position_per_stock: 20000,
  max_leverage: 3.0,
  min_confidence: 0.6,
  max_stocks: 10
})

// 風控參數設定（來自後端 DB）
const riskSettings = ref({
  min_confidence: 0.6,
  max_single_amount_pct: 0.10,
  max_position_per_stock_pct: 0.25,
  max_total_position_pct: 0.90,
  max_stocks: 10,
  stop_loss_pct: 0.05,
  take_profit_pct: 0.10
})

const saving = ref(false)
const savingLive = ref(false)

// 真實交易風控參數設定（預設值更嚴格）
const liveRiskSettings = ref({
  min_confidence: 0.75,
  max_single_amount_pct: 0.08,
  max_position_per_stock_pct: 0.20,
  max_total_position_pct: 0.70,
  max_stocks: 5,
  stop_loss_pct: 0.03,
  take_profit_pct: 0.08
})

const positions = ref([])
const newsList = ref([])
const newsLoading = ref(false)
const newsFilter = ref({ symbol: '', sentiment: '' })
const watchlistSymbols = ['AAPL', 'AMZN', 'TSLA', 'NVDA', 'NFLX', 'UBER', 'MSFT', 'GOOGL', 'META', 'ORCL']

const riskLogs = ref([])
const loading = ref(true)
const paperStatus = ref(null)
const marketData = ref(null)

// 持倉集中度（最大單一持倉 / 總市值）
const positionConcentration = computed(() => {
  if (positions.value.length === 0) return 0
  const maxPosition = Math.max(...positions.value.map(p => p.market_value || 0))
  const totalMarketValue = positions.value.reduce((sum, p) => sum + (p.market_value || 0), 0)
  return totalMarketValue > 0 ? (maxPosition / totalMarketValue) * 100 : 0
})

// VIX 風險等級
const vixLevel = computed(() => {
  const vix = marketData.value?.markets?.find(m => m.type === 'VIX')?.value
  if (vix === undefined || vix === null) return { level: 'unknown', label: '無法取得', color: 'gray' }
  if (vix < 15) return { level: 'low', label: '低風險', color: 'green' }
  if (vix < 20) return { level: 'normal', label: '正常', color: 'blue' }
  if (vix < 30) return { level: 'elevated', label: '偏高', color: 'orange' }
  return { level: 'high', label: '高風險', color: 'red' }
})

// 實際總持倉上限（從 API 取得）
const effectiveMaxPosition = computed(() => {
  return paperStatus.value?.total_assets || config.value.max_total_position
})

const riskStatus = computed(() => {
  const totalValue = positions.value.reduce((sum, p) => sum + (p.market_value || 0), 0)
  const usage = totalValue / effectiveMaxPosition.value
  if (usage > 0.9) return 'danger'
  if (usage > 0.7) return 'warning'
  return 'safe'
})

const riskMessage = computed(() => {
  const totalValue = positions.value.reduce((sum, p) => sum + (p.market_value || 0), 0)
  const usage = (totalValue / effectiveMaxPosition.value * 100).toFixed(1)
  const totalAssets = paperStatus.value?.total_assets?.toLocaleString() || 'N/A'
  
  if (riskStatus.value === 'safe') return `總持倉使用率 ${usage}%（相對於總資產 $${totalAssets}），風控狀態正常`
  if (riskStatus.value === 'warning') return `總持倉使用率 ${usage}%（相對於總資產 $${totalAssets}），接近風控上限`
  return `總持倉使用率 ${usage}%（相對於總資產 $${totalAssets}），已超過風控上限！`
})

const fetchData = async () => {
  loading.value = true
  try {
    // 獲取持倉
    const posRes = await fetch(`${API_URL}/paper/positions`)
    const posData = await posRes.json()
    if (posData.positions) {
      positions.value = posData.positions || []
    }
    
    // 獲取帳戶狀態（總資產）
    const statusRes = await fetch(`${API_URL}/paper/status`)
    const statusData = await statusRes.json()
    if (statusData.total_assets) {
      paperStatus.value = statusData
      // 自動調整風控上限為總資產的 80%
      config.value.max_total_position = Math.round(statusData.total_assets * 0.8)
    }
    
    // 獲取市場數據（VIX）
    const marketRes = await fetch(`${API_URL}/market`)
    const marketDataResult = await marketRes.json()
    if (marketDataResult.markets) {
      marketData.value = marketDataResult
    }
  } catch (err) {
    console.error('Fetch error:', err)
    error('載入風險數據失敗')
  } finally {
    loading.value = false
  }
}

const checkRisk = () => {
  fetchData()
}

const getRiskLevel = (pos) => {
  const value = pos.market_value || 0
  const totalAssets = paperStatus.value?.total_assets || 1000000
  const maxPerStock = totalAssets * (riskSettings.value.max_position_per_stock_pct || 0.25)
  if (value > maxPerStock) return 'danger'
  if (value > maxPerStock * 0.8) return 'warning'
  return 'safe'
}

const getRiskLabel = (pos) => {
  const value = pos.market_value || 0
  const totalAssets = paperStatus.value?.total_assets || 1000000
  const maxPerStock = totalAssets * (riskSettings.value.max_position_per_stock_pct || 0.25)
  const pct = (value / totalAssets * 100).toFixed(1)
  const limitPct = ((riskSettings.value.max_position_per_stock_pct || 0.25) * 100).toFixed(0)
  if (value > maxPerStock) return `⚠️ 超限 (${pct}% > ${limitPct}%)`
  if (value > maxPerStock * 0.8) return `⚡ 接近上限 (${pct}%)`
  return `✅ 正常 (${pct}%)`
}

const fetchNews = async () => {
  newsLoading.value = true
  try {
    let url = `${API_URL}/news?limit=20`
    if (newsFilter.value.symbol) url += `&symbol=US.${newsFilter.value.symbol}`
    if (newsFilter.value.sentiment) url += `&sentiment=${newsFilter.value.sentiment}`
    const res = await fetch(url)
    const data = await res.json()
    newsList.value = Array.isArray(data) ? data : (data.news || [])
  } catch (err) {
    console.error('fetchNews error:', err)
  } finally {
    newsLoading.value = false
  }
}

const formatNewsTime = (ts) => {
  if (!ts) return ''
  try {
    const d = new Date(ts)
    const now = new Date()
    const diff = Math.floor((now - d) / 60000)
    if (diff < 60) return `${diff}分鐘前`
    if (diff < 1440) return `${Math.floor(diff/60)}小時前`
    return d.toLocaleDateString('zh-TW')
  } catch { return '' }
}

const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  let d = timestamp
  if (typeof timestamp === 'string' && !timestamp.includes('Z') && !timestamp.endsWith('+08:00')) {
    d = timestamp + '+08:00'
  }
  return new Date(d).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' })
}

// 獲取風控參數設定
const fetchRiskSettings = async () => {
  try {
    const res = await fetch(`${API_URL}/api/v1/config/risk`)
    const data = await res.json()
    if (data.config) {
      riskSettings.value = {
        min_confidence: data.config.min_confidence ?? 0.6,
        max_single_amount_pct: data.config.max_single_amount_pct ?? 0.10,
        max_position_per_stock_pct: data.config.max_position_per_stock_pct ?? 0.25,
        max_total_position_pct: data.config.max_total_position_pct ?? 0.90,
        max_stocks: data.config.max_stocks ?? 10,
        stop_loss_pct: data.config.stop_loss_pct ?? 0.05,
        take_profit_pct: data.config.take_profit_pct ?? 0.10
      }
    }
  } catch (err) {
    console.error('Failed to fetch risk settings:', err)
  }
}

// 儲存風控參數設定
const saveRiskSettings = async () => {
  saving.value = true
  try {
    const res = await fetch(`${API_URL}/api/v1/config/risk`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(riskSettings.value)
    })
    const data = await res.json()
    if (data.status === 'ok') {
      success('風控參數已更新')
    } else {
      error(data.message || '儲存失敗')
    }
  } catch (err) {
    console.error('Failed to save risk settings:', err)
    error('儲存失敗')
  } finally {
    saving.value = false
  }
}

// 獲取真實交易風控參數設定
const fetchLiveRiskSettings = async () => {
  try {
    const res = await fetch(`${API_URL}/config/risk/live`)
    const data = await res.json()
    if (data.config) {
      liveRiskSettings.value = {
        min_confidence: data.config.min_confidence ?? 0.75,
        max_single_amount_pct: data.config.max_single_amount_pct ?? 0.08,
        max_position_per_stock_pct: data.config.max_position_per_stock_pct ?? 0.20,
        max_total_position_pct: data.config.max_total_position_pct ?? 0.70,
        max_stocks: data.config.max_stocks ?? 5,
        stop_loss_pct: data.config.stop_loss_pct ?? 0.03,
        take_profit_pct: data.config.take_profit_pct ?? 0.08
      }
    }
  } catch (err) {
    console.error('Failed to fetch live risk settings:', err)
  }
}

// 儲存真實交易風控參數設定
const saveLiveRiskSettings = async () => {
  savingLive.value = true
  try {
    const res = await fetch(`${API_URL}/config/risk/live`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(liveRiskSettings.value)
    })
    const data = await res.json()
    if (data.status === 'ok') {
      success('真實交易風控參數已更新')
    } else {
      error(data.message || '儲存失敗')
    }
  } catch (err) {
    console.error('Failed to save live risk settings:', err)
    error('儲存失敗')
  } finally {
    savingLive.value = false
  }
}

onMounted(() => {
  fetchData()
  fetchRiskSettings()
  fetchNews()
})
</script>

<style scoped>
/* 壓縮表格行高 */
.table th, .table td {
  padding: 6px 12px !important;
}

/* 壓縮頁面 header */
.page-header {
  margin-bottom: 12px !important;
}

/* 壓縮卡片 padding */
.card-header {
  padding: 8px 14px !important;
}

.risk-page {
  animation: fadeIn 0.3s ease;
  max-height: calc(100vh - 60px);
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
}

/* Tab 切換樣式 */
.risk-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 12px;
}

.risk-tab {
  padding: 6px 16px;
  background: #21262d;
  border: 1px solid #30363d;
  color: #8b949e;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;
}

.risk-tab:hover {
  color: #e6edf3;
}

.risk-tab.active {
  background: #1f2d40;
  border-color: #388bfd;
  color: #388bfd;
}

.risk-tab:nth-child(2).active {
  background: #2d1b1b;
  border-color: #da3633;
  color: #da3633;
}

.live-risk-section {
  animation: fadeIn 0.3s ease;
}

.live-risk-warning {
  background: rgba(218,54,51,0.1);
  border: 1px solid #da3633;
  color: #f85149;
  padding: 8px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 12px;
}

.live-save-btn {
  background: #da3633 !important;
  border-color: #da3633 !important;
}

.live-save-btn:hover {
  background: #f85149 !important;
}

.risk-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: var(--radius-lg);
  margin-bottom: 12px;
}

.risk-status.safe { background: #22c55e20; border: 1px solid #22c55e; }
.risk-status.warning { background: #f59e0b20; border: 1px solid #f59e0b; }
.risk-status.danger { background: #ef444420; border: 1px solid #ef4444; }

.status-icon { font-size: 2rem; }
.status-title { font-size: 1.25rem; font-weight: 700; }
.status-desc { color: var(--color-text-secondary); }

.config-section, .positions-risk, .risk-logs {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 12px;
  margin-bottom: 8px;
}
.news-settings-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  align-items: start;
}
.news-settings-row .news-section,
.news-settings-row .config-section {
  margin-bottom: 0;
}
.risk-settings .settings-grid {
  max-height: 260px;
  overflow-y: auto;
}

h3 {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 12px;
}

/* 風控指標 grid - 4欄排列 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.metric-card {
  padding: 8px 12px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.metric-label { font-size: 11px; color: var(--color-text-secondary); }
.metric-value { font-size: 1rem; font-weight: 700; margin-top: 2px; }
.metric-value.normal { color: var(--color-profit); }
.metric-value.warning { color: var(--color-warning); }
.metric-value.profit { color: var(--color-profit); }
.metric-value.loss { color: var(--color-loss); }
.metric-value.green { color: #22c55e; }
.metric-value.blue { color: #3b82f6; }
.metric-value.orange { color: #f59e0b; }
.metric-value.red { color: #ef4444; }
.metric-value.gray { color: var(--color-text-muted); }

.config-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.config-item {
  padding: 12px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-md);
}

.config-label { font-size: 0.75rem; color: var(--color-text-secondary); }
.config-value { font-size: 1rem; font-weight: 600; margin-top: 4px; }

.risk-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.risk-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  border-radius: var(--radius-md);
}

.risk-item.safe { background: #22c55e10; }
.risk-item.warning { background: #f59e0b10; }
.risk-item.danger { background: #ef444410; }

.risk-symbol { font-weight: 600; width: 80px; }
.risk-info { flex: 1; }
.risk-value { font-size: 0.875rem; }
.risk-pnl { font-size: 0.75rem; }
.risk-pnl.profit { color: #22c55e; }
.risk-pnl.loss { color: #ef4444; }

.risk-badge { font-size: 0.75rem; }

.logs-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.log-item {
  display: flex;
  gap: 12px;
  padding: 8px;
  font-size: 0.8125rem;
  border-bottom: 1px solid var(--color-border);
}

.log-time { width: 150px; color: var(--color-text-muted); }
.log-rule { width: 150px; }
.log-action { flex: 1; }

.loading, .empty {
  text-align: center;
  padding: 20px;
  color: var(--color-text-muted);
}

/* 新聞模塊樣式 */
.news-section { background: var(--bg-secondary); border: 1px solid var(--border-default); border-radius: var(--radius-md); padding: 12px 14px; }
.news-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.news-header h3 { margin: 0; font-size: 14px; color: var(--text-primary); }
.news-filters { display: flex; gap: 8px; align-items: center; }
.news-select { background: var(--bg-tertiary); border: 1px solid var(--border-default); color: var(--text-primary); padding: 3px 8px; border-radius: 4px; font-size: 12px; }
.btn-refresh-news { background: #21262d; border: 1px solid #30363d; color: #8b949e; padding: 3px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; }
.btn-refresh-news:hover { color: #e6edf3; }
.news-list { display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; }
.news-item { display: block; padding: 8px 10px; background: var(--bg-tertiary); border: 1px solid var(--border-default); border-radius: 6px; text-decoration: none; transition: border-color 0.15s; }
.news-item:hover { border-color: #388bfd; }
.news-item.positive { border-left: 3px solid #3fb950; }
.news-item.negative { border-left: 3px solid #da3633; }
.news-item.neutral { border-left: 3px solid #6e7681; }
.news-meta { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
.news-symbol { font-size: 11px; font-weight: 700; color: #388bfd; background: rgba(56,139,253,0.1); padding: 1px 6px; border-radius: 3px; }
.news-sentiment { font-size: 12px; }
.news-time { font-size: 11px; color: #6e7681; margin-left: auto; }
.news-title { font-size: 12px; color: #e6edf3; line-height: 1.4; margin-bottom: 3px; }
.news-source { font-size: 11px; color: #6e7681; }
.empty-news { text-align: center; padding: 20px; color: #6e7681; font-size: 13px; }

/* 風控參數設定樣式 */
.risk-settings {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 12px;
}

.risk-settings h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-item label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.setting-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-input input[type="range"] {
  flex: 1;
  height: 6px;
  -webkit-appearance: none;
  background: var(--color-bg-tertiary);
  border-radius: 3px;
  outline: none;
}

.setting-input input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 16px;
  height: 16px;
  background: var(--color-primary);
  border-radius: 50%;
  cursor: pointer;
}

.setting-input input[type="number"] {
  width: 70px;
  padding: 6px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-bg-tertiary);
  color: var(--color-text);
  font-size: 0.875rem;
  text-align: center;
}

.setting-input input[type="number"]:focus {
  outline: none;
  border-color: var(--color-primary);
}

.setting-unit {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
  min-width: 40px;
}

.settings-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.settings-actions .btn {
  padding: 8px 20px;
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>

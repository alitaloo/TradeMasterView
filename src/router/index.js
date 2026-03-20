import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: '仪表板', icon: 'dashboard' }
  },
  {
    path: '/signals',
    name: 'Signals',
    component: () => import('../views/Signals.vue'),
    meta: { title: '交易信號', icon: 'signals' }
  },
  {
    path: '/positions',
    name: 'Positions',
    component: () => import('../views/Positions.vue'),
    meta: { title: '持倉管理', icon: 'positions' }
  },
  {
    path: '/orders',
    name: 'Orders',
    component: () => import('../views/Orders.vue'),
    meta: { title: '訂單管理', icon: 'orders' }
  },
  {
    path: '/risk',
    name: 'RiskDashboard',
    component: () => import('../views/RiskDashboard.vue'),
    meta: { title: '風控儀表板', icon: 'risk' }
  },
  {
    path: '/backtests',
    name: 'Backtests',
    component: () => import('../views/Backtests.vue'),
    meta: { title: '回测结果', icon: 'backtests' }
  },
  {
    path: '/backtest-runner',
    name: 'BacktestRunner',
    component: () => import('../views/BacktestRunner.vue'),
    meta: { title: '執行回測', icon: 'backtests' }
  },
  {
    path: '/strategies',
    name: 'Strategies',
    component: () => import('../views/Strategies.vue'),
    meta: { title: '策略管理', icon: 'strategies' }
  },
  {
    path: '/stock-strategies',
    name: 'StockStrategies',
    component: () => import('../views/StockStrategies.vue'),
    meta: { title: '股票策略配置', icon: 'stock-strategies' }
  },
  {
    path: '/stocks',
    name: 'Stocks',
    component: () => import('../views/Stocks.vue'),
    meta: { title: '股票清單', icon: 'stocks' }
  },
  {
    path: '/realtime',
    name: 'Realtime',
    component: () => import('../views/RealtimeMonitor.vue'),
    meta: { title: '5分鐘K線監控', icon: 'realtime' }
  },
  {
    path: '/paper-trading',
    name: 'PaperTrading',
    component: () => import('../views/PaperTrading.vue'),
    meta: { title: '模擬交易', icon: 'paper' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 更新页面标题
router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || 'TradeMasterView'} | 量化交易仪表板`
  next()
})

export default router

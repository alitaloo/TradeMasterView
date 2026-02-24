/**
 * FreshnessIndicator Component
 * 顯示數據新鮮度指示器
 */

export default {
  name: 'FreshnessIndicator',
  props: {
    timestamp: {
      type: String,
      default: null
    },
    label: {
      type: String,
      default: '數據更新於'
    }
  },
  computed: {
    freshnessText() {
      if (!this.timestamp) {
        return '未知'
      }
      
      try {
        const dataTime = new Date(this.timestamp)
        const now = new Date()
        const diffMs = now - dataTime
        const diffMins = Math.floor(diffMs / 60000)
        const diffHours = Math.floor(diffMs / 3600000)
        const diffDays = Math.floor(diffMs / 86400000)
        
        if (diffMins < 1) {
          return '剛剛更新'
        } else if (diffMins < 60) {
          return `${diffMins} 分鐘前`
        } else if (diffHours < 24) {
          return `${diffHours} 小時前`
        } else {
          return `${diffDays} 天前`
        }
      } catch (e) {
        return '未知'
      }
    },
    freshnessClass() {
      if (!this.timestamp) {
        return 'unknown'
      }
      
      try {
        const dataTime = new Date(this.timestamp)
        const now = new Date()
        const diffMs = now - dataTime
        const diffMins = Math.floor(diffMs / 60000)
        
        if (diffMins < 5) {
          return 'fresh'
        } else if (diffMins < 30) {
          return 'normal'
        } else if (diffMins < 60) {
          return 'stale'
        } else {
          return 'outdated'
        }
      } catch (e) {
        return 'unknown'
      }
    }
  }
}

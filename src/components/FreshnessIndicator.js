/**
 * FreshnessIndicator Component
 * 顯示數據新鮮度指示器 — 使用統一 datetime 工具
 */

import { h } from 'vue'
import { getFreshnessLevel } from '../utils/datetime.js'

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
    freshness() {
      return getFreshnessLevel(this.timestamp)
    },
    freshnessText() {
      return this.freshness.text
    },
    freshnessClass() {
      return this.freshness.class
    }
  },
  render() {
    const cls = `freshness-indicator ${this.freshnessClass}`
    const dot = this.freshnessClass === 'fresh' ? '🟢'
      : this.freshnessClass === 'normal' ? '🟡'
      : this.freshnessClass === 'stale' ? '🟠'
      : this.freshnessClass === 'outdated' ? '🔴'
      : '⚪'
    return h('span', { class: cls }, `${dot} ${this.label} ${this.freshnessText}`)
  }
}

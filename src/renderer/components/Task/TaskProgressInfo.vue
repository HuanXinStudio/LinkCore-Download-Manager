<template>
  <div class="task-progress-info-wrap">
  <el-row class="task-progress-info">
    <el-col
      class="task-progress-info-left"
      :xs="12"
      :sm="7"
      :md="6"
      :lg="6"
    >
      <div v-if="!magnetHintText && (task.completedLength > 0 || task.totalLength > 0)">
        <span>{{ task.completedLength | bytesToSize(2) }}</span>
        <span v-if="task.totalLength > 0"> / {{ task.totalLength | bytesToSize(2) }}</span>
      </div>
      <el-tooltip v-if="magnetHintText" effect="dark" :content="magnetHintText" placement="top">
        <div class="task-magnet-hint task-magnet-hint--ellipsis">{{ magnetHintText }}</div>
      </el-tooltip>
    </el-col>
    <el-col
      class="task-progress-info-right"
      v-if="isActive"
      :xs="12"
      :sm="17"
      :md="18"
      :lg="18"
    >
      <div class="task-speed-info">
        <div class="task-speed-text" v-if="isBT">
          <i><mo-icon name="arrow-up" width="10" height="14" /></i>
          <span>{{ task.uploadSpeed | bytesToSize }}/s</span>
        </div>
        <div class="task-speed-text">
          <i><mo-icon name="arrow-down" width="10" height="14" /></i>
          <span>{{ task.downloadSpeed | bytesToSize }}/s</span>
        </div>
        <div class="task-speed-text hidden-sm-and-down" v-if="remaining > 0">
          <span>
            {{
              remaining | timeFormat({
                prefix: $t('task.remaining-prefix'),
                i18n: {
                  'gt1d': $t('app.gt1d'),
                  'hour': $t('app.hour'),
                  'minute': $t('app.minute'),
                  'second': $t('app.second')
                }
              })
            }}
          </span>
        </div>
        <div class="task-speed-text hidden-sm-and-down" v-if="isBT">
          <i><mo-icon name="magnet" width="10" height="14" /></i>
          <span>{{ task.numSeeders }}</span>
        </div>
        <div class="task-speed-text hidden-sm-and-down">
          <i><mo-icon name="node" width="10" height="14" /></i>
          <span>{{ task.connections }}</span>
        </div>
        <div class="task-speed-text" v-if="taskPriority > 0">
          <span>{{ $t('task.priority-short') }} {{ taskPriority }}</span>
        </div>
      </div>
    </el-col>
  </el-row>
  </div>
</template>

<script>
  import {
    bytesToSize,
    checkTaskIsBT,
    checkTaskIsSeeder,
    timeFormat,
    timeRemaining,
    isMagnetTask
  } from '@shared/utils'
  import { TASK_STATUS } from '@shared/constants'
  import '@/components/Icons/arrow-up'
  import '@/components/Icons/arrow-down'
  import '@/components/Icons/node'
  import '@/components/Icons/magnet'
  import { mapState } from 'vuex'

  export default {
    name: 'mo-task-progress-info',
    props: {
      task: {
        type: Object
      }
    },
    computed: {
      ...mapState('task', {
        magnetStatuses: state => state.magnetStatuses,
        taskPriorities: state => state.taskPriorities
      }),
      ...mapState('preference', {
        preferenceConfig: state => state.config
      }),
      isActive () {
        return this.task.status === TASK_STATUS.ACTIVE
      },
      isBT () {
        return checkTaskIsBT(this.task)
      },
      isSeeder () {
        return checkTaskIsSeeder(this.task)
      },
      remaining () {
        const { totalLength, completedLength, downloadSpeed } = this.task
        return timeRemaining(totalLength, completedLength, downloadSpeed)
      },
      magnetHintText () {
        const zero = Number(this.task.downloadSpeed) === 0
        const isMagnet = isMagnetTask(this.task)
        if (!(isMagnet && zero)) return ''
        const s = this.magnetStatuses[this.task.gid]
        if (!s) return this.$t('task.magnet-fetching-metadata')
        const { peerCount = 0, trackerCount = 0, elapsedSec = 0, phase = '', peerTrend = 'flat', globalLimitLow = false, pauseMetadata = false } = s
        const cfg = this.preferenceConfig || {}
        const dhtEnabled = Number(cfg['dht-listen-port'] || cfg.dhtListenPort || 0) > 0
        const trackersConfigured = `${cfg['bt-tracker'] || cfg.btTracker || ''}`.trim().length > 0
        const elapsedMin = Math.floor(elapsedSec / 60)
        if (phase === 'no_trackers' || (peerCount === 0 && trackerCount === 0)) {
          const base = trackersConfigured ? this.$t('task.magnet-status-contacting-trackers', { trackerCount }) : this.$t('task.magnet-status-no-trackers')
          const suggest = this.$t('task.magnet-suggest-add-trackers')
          return `${base}，${suggest}`
        }
        if (phase === 'contacting_trackers' || (peerCount === 0 && trackerCount > 0)) {
          const base = this.$t('task.magnet-status-contacting-trackers', { trackerCount })
          if (elapsedMin >= 2) {
            const wait = this.$t('task.magnet-status-long-wait') + ' ' + this.$t('task.magnet-status-elapsed-minutes', { minutes: elapsedMin })
            const extra = dhtEnabled ? '' : (' ' + this.$t('task.magnet-suggest-open-port'))
            const limit = globalLimitLow ? (' ' + this.$t('task.magnet-suggest-limit')) : ''
            const paused = pauseMetadata ? (' ' + this.$t('task.magnet-suggest-unpause-metadata')) : ''
            return `${base}，${wait}${extra}${limit}${paused}`
          }
          return base
        }
        // peers connected but metadata not ready
        const peersText = this.$t('task.magnet-status-peers', { peerCount })
        const trackersText = this.$t('task.magnet-status-trackers', { trackerCount })
        if (elapsedMin >= 2) {
          const wait = this.$t('task.magnet-status-long-wait') + ' ' + this.$t('task.magnet-status-elapsed-minutes', { minutes: elapsedMin })
          const trendText = peerTrend === 'up' ? this.$t('task.magnet-trend-up') : (peerTrend === 'down' ? this.$t('task.magnet-trend-down') : this.$t('task.magnet-trend-flat'))
          const limit = globalLimitLow ? (' ' + this.$t('task.magnet-suggest-limit')) : ''
          const paused = pauseMetadata ? (' ' + this.$t('task.magnet-suggest-unpause-metadata')) : ''
          return `${peersText}，${trackersText}，${wait}，${trendText}${limit}${paused}`
        }
        const trendText = peerTrend === 'up' ? this.$t('task.magnet-trend-up') : (peerTrend === 'down' ? this.$t('task.magnet-trend-down') : '')
        return `${peersText}，${trackersText}${trendText ? '，' + trendText : ''}`
      },
      taskPriority () {
        const gid = this.task && this.task.gid
        const map = this.taskPriorities || {}
        return (gid && map[gid]) ? Number(map[gid]) : 0
      }
    },
    filters: {
      bytesToSize,
      timeFormat
    }
  }
</script>

<style lang="scss">
.task-progress-info {
  font-size: 0.75rem;
  line-height: 0.875rem;
  min-height: 0.875rem;
  color: #9B9B9B;
  margin-top: 0.5rem;
  i {
    font-style: normal;
  }
}
.task-progress-info-left {
  min-height: 0.875rem;
  text-align: left;
}
.task-progress-info-right {
  min-height: 0.875rem;
  text-align: right;
}
.task-speed-info {
  font-size: 0;
  & > .task-speed-text {
    margin-left: 0.375rem;
    font-size: 0;
    line-height: 0.875rem;
    vertical-align: middle;
    display: inline-block;
    &:first-of-type {
      margin-left: 0;
    }
    & > i, & > span {
      height: 0.875rem;
      line-height: 0.875rem;
      display: inline-block;
      vertical-align: middle;
    }
    & > i {
      margin-right: 0.125rem;
    }
    & > span {
      font-size: 0.75rem;
    }
  }
}
.task-magnet-hint {
  font-size: 0.75rem;
  line-height: 0.875rem;
  min-height: 0.875rem;
  color: #9B9B9B;
}
.task-magnet-hint--ellipsis {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  width: 100%;
}
.task-magnet-hint-row {
  margin-top: 4px;
}
</style>

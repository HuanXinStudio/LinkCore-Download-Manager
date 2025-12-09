<template>
  <nav class="subnav-inner">
    <h3>{{ title }}</h3>
    <ul>
      <li
        @click="() => nav('basic')"
        :class="[ current === 'basic' ? 'active' : '' ]"
        >
        <i class="subnav-icon">
          <mo-icon name='preference-basic' width="20" height="20" />
        </i>
        <span>{{ $t('preferences.basic') }}</span>
      </li>
      <li
        @click="() => nav('advanced')"
        :class="[ current === 'advanced' ? 'active' : '' ]"
        >
        <i class="subnav-icon">
          <mo-icon name='preference-advanced' width="20" height="20" />
        </i>
        <span>{{ $t('preferences.advanced') }}</span>
      </li>
      <li
        @click="() => nav('lab')"
        :class="[ current === 'lab' ? 'active' : '' ]"
        >
        <i class="subnav-icon">
          <mo-icon name='preference-lab' width="20" height="20" />
        </i>
        <span>{{ $t('preferences.lab') }}</span>
      </li>
      <li
        @click="checkForUpdates"
        class="version-item"
        :class="{ 'update-available': updateAvailable, 'is-checking': isChecking }"
        :disabled="isChecking"
        >
        <span>{{ updateAvailable ? `新版本 ${newVersion}` : appVersion }}</span>
      </li>
    </ul>
  </nav>
</template>

<script>
  import '@/components/Icons/preference-basic'
  import '@/components/Icons/preference-advanced'
  import '@/components/Icons/preference-lab'

  export default {
    name: 'mo-preference-subnav',
    props: {
      current: {
        type: String,
        default: 'basic'
      }
    },
    data () {
      return {
        appVersion: '',
        newVersion: '',
        updateAvailable: false,
        isChecking: false
      }
    },
    computed: {
      title () {
        return this.$t('subnav.preferences')
      }
    },
    async mounted () {
      // 获取应用版本信息
      try {
        const appConfig = await this.$electron.ipcRenderer.invoke('get-app-config')
        this.appVersion = appConfig.version
      } catch (error) {
        console.error('[Motrix] Failed to get app version:', error)
      }

      // 监听更新事件
      this.$electron.ipcRenderer.on('update-available', (event, version) => {
        this.updateAvailable = true
        this.newVersion = version
      })

      this.$electron.ipcRenderer.on('update-not-available', () => {
        this.updateAvailable = false
        this.newVersion = ''
      })
    },
    beforeDestroy () {
      // 移除事件监听
      this.$electron.ipcRenderer.removeAllListeners('update-available')
      this.$electron.ipcRenderer.removeAllListeners('update-not-available')
    },
    methods: {
      nav (category = 'basic') {
        this.$router.push({
          path: `/preference/${category}`
        }).catch(err => {
          console.log(err)
        })
      },

      // 检查是否支持消息提示
      hasMsgSupport () {
        return typeof this.$msg !== 'undefined' && this.$msg !== null
      },

      // 显示消息
      showMessage (type, message) {
        if (this.hasMsgSupport()) {
          this.$msg[type](message)
        } else {
          console.log(`[Motrix] Update message: ${type} - ${message}`)
          // 如果没有消息组件，使用浏览器的alert
          if (type === 'error') {
            alert(message)
          }
        }
      },

      // 检查更新
      checkForUpdates () {
        // 如果正在检查，直接返回
        if (this.isChecking) return

        // 设置检查状态
        this.isChecking = true

        // 显示检查中消息
        this.showMessage('info', this.$t('app.checking-for-updates'))

        // 创建临时事件监听器，使用once确保只触发一次
        const onUpdateError = () => {
          this.showMessage('error', this.$t('app.update-error-message'))
          this.isChecking = false
        }

        const onUpdateNotAvailable = () => {
          this.showMessage('success', this.$t('app.update-not-available-message'))
          this.isChecking = false
          this.updateAvailable = false
          this.newVersion = ''
        }

        const onUpdateAvailable = (event, version) => {
          this.showMessage('info', this.$t('app.update-available-message'))
          this.isChecking = false
          this.updateAvailable = true
          this.newVersion = version
        }

        // 使用once监听事件，确保事件只处理一次
        this.$electron.ipcRenderer.once('update-error', onUpdateError)
        this.$electron.ipcRenderer.once('update-not-available', onUpdateNotAvailable)
        this.$electron.ipcRenderer.once('update-available', onUpdateAvailable)

        // 设置超时处理，防止无限期等待
        const timeout = setTimeout(() => {
          console.log('[Motrix] Update check timed out')
          // 移除所有临时事件监听器
          this.$electron.ipcRenderer.removeListener('update-error', onUpdateError)
          this.$electron.ipcRenderer.removeListener('update-not-available', onUpdateNotAvailable)
          this.$electron.ipcRenderer.removeListener('update-available', onUpdateAvailable)

          // 显示超时消息
          this.showMessage('error', this.$t('app.update-timeout-message') || '更新检查超时，请稍后重试')
          this.isChecking = false
        }, 10000) // 10秒超时

        // 监听任何更新事件，清除超时
        const clearTimeoutListener = () => {
          clearTimeout(timeout)
          console.log('[Motrix] Update check completed, clearing timeout')
          // 移除清除超时的监听器
          this.$electron.ipcRenderer.removeListener('update-error', clearTimeoutListener)
          this.$electron.ipcRenderer.removeListener('update-not-available', clearTimeoutListener)
          this.$electron.ipcRenderer.removeListener('update-available', clearTimeoutListener)
        }
        this.$electron.ipcRenderer.once('update-error', clearTimeoutListener)
        this.$electron.ipcRenderer.once('update-not-available', clearTimeoutListener)
        this.$electron.ipcRenderer.once('update-available', clearTimeoutListener)

        // 发送检查更新命令
        console.log('[Motrix] Sending check for updates command')
        this.$electron.ipcRenderer.send('command', 'application:check-for-updates')
      }
    }
  }
</script>

<style lang="scss">
.version-item {
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #dcdfe6;
  border-radius: 12px;
  padding: 8px 12px;
  margin-top: 10px;
  background-color: transparent;
  opacity: 0.5;

  &:hover {
    background-color: transparent;
    border-color: #c6e2ff;
    opacity: 1;
  }

  &.update-available {
    color: #67c23a;
    font-weight: bold;
    border-color: #c2e7b0;
    background-color: transparent;
    opacity: 1;
    animation: pulse-green 1s infinite;

    &:hover {
      background-color: transparent;
      border-color: #a5d6a7;
      opacity: 1;
    }
  }

  &.is-checking {
    cursor: not-allowed;
    opacity: 1;
    animation: pulse 1s infinite;
    border-color: #409eff;
  }

  &.is-checking:hover {
    opacity: 1;
    border-color: #409eff;
    background-color: transparent;
  }

  &[disabled] {
    cursor: not-allowed;
  }

  span {
    font-family: monospace;
    display: block;
    text-align: center;
  }
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.4);
  }
  70% {
    box-shadow: 0 0 0 5px rgba(64, 158, 255, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0);
  }
}

@keyframes pulse-green {
  0% {
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0.4);
  }
  70% {
    box-shadow: 0 0 0 5px rgba(103, 194, 58, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(103, 194, 58, 0);
  }
}
</style>

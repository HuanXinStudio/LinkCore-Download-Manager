<template>
  <div v-if="false"></div>
</template>

<script>
  import is from 'electron-is'
  import { mapState } from 'vuex'
  import api from '@/api'
  import {
    getTaskFullPath,
    showItemInFolder
  } from '@/utils/native'
  import { checkTaskIsBT, getTaskName } from '@shared/utils'
  import { existsSync, renameSync, mkdirSync } from 'node:fs'
  import { dirname } from 'path'
  import { autoCategorizeDownloadedFile } from '@shared/utils/file-categorize'

  export default {
    name: 'mo-engine-client',
    computed: {
      isRenderer: () => is.renderer(),
      ...mapState('app', {
        uploadSpeed: state => state.stat.uploadSpeed,
        downloadSpeed: state => state.stat.downloadSpeed,
        speed: state => state.stat.uploadSpeed + state.stat.downloadSpeed,
        interval: state => state.interval,
        downloading: state => state.stat.numActive > 0,
        progress: state => state.progress
      }),
      ...mapState('task', {
        messages: state => state.messages,
        seedingList: state => state.seedingList,
        taskDetailVisible: state => state.taskDetailVisible,
        enabledFetchPeers: state => state.enabledFetchPeers,
        currentTaskGid: state => state.currentTaskGid,
        currentTaskItem: state => state.currentTaskItem
      }),
      ...mapState('preference', {
        taskNotification: state => state.config.taskNotification
      }),
      currentTaskIsBT () {
        return checkTaskIsBT(this.currentTaskItem)
      }
    },
    watch: {
      speed (val) {
        const { uploadSpeed, downloadSpeed } = this
        this.$electron.ipcRenderer.send('event', 'speed-change', {
          uploadSpeed,
          downloadSpeed
        })
      },
      downloading (val, oldVal) {
        if (val !== oldVal && this.isRenderer) {
          this.$electron.ipcRenderer.send('event', 'download-status-change', val)
        }
      },
      progress (val) {
        this.$electron.ipcRenderer.send('event', 'progress-change', val)
      }
    },
    methods: {
      async fetchTaskItem ({ gid }) {
        return api.fetchTaskItem({ gid })
          .catch((e) => {
            console.warn(`fetchTaskItem fail: ${e.message}`)
          })
      },
      onDownloadStart (event) {
        this.$store.dispatch('task/fetchList')
        this.$store.dispatch('app/resetInterval')
        this.$store.dispatch('task/saveSession')
        const [{ gid }] = event
        const { seedingList } = this
        if (seedingList.includes(gid)) {
          return
        }

        this.fetchTaskItem({ gid })
          .then((task) => {
            const { dir } = task
            this.$store.dispatch('preference/recordHistoryDirectory', dir)
            const taskName = getTaskName(task)
            const message = this.$t('task.download-start-message', { taskName })
            this.$msg.info(message)

            // 自动创建目标文件夹
            this.ensureTargetDirectoryExists(task)

            // 添加下载中文件后缀
            this.addDownloadingSuffix(task)
          })
      },
      onDownloadPause (event) {
        const [{ gid }] = event
        const { seedingList } = this
        if (seedingList.includes(gid)) {
          return
        }

        this.fetchTaskItem({ gid })
          .then((task) => {
            const taskName = getTaskName(task)
            const message = this.$t('task.download-pause-message', { taskName })
            this.$msg.info(message)
          })
      },
      onDownloadStop (event) {
        const [{ gid }] = event
        this.fetchTaskItem({ gid })
          .then((task) => {
            const taskName = getTaskName(task)
            const message = this.$t('task.download-stop-message', { taskName })
            this.$msg.info(message)
          })
      },
      onDownloadError (event) {
        const [{ gid }] = event
        this.fetchTaskItem({ gid })
          .then((task) => {
            const taskName = getTaskName(task)
            const { errorCode, errorMessage } = task
            console.error(`[Motrix] download error gid: ${gid}, #${errorCode}, ${errorMessage}`)
            const message = this.$t('task.download-error-message', { taskName })
            const link = `<a target="_blank" href="https://github.com/agalwood/Motrix/wiki/Error#${errorCode}" rel="noopener noreferrer">${errorCode}</a>`
            this.$msg({
              type: 'error',
              showClose: true,
              duration: 5000,
              dangerouslyUseHTMLString: true,
              message: `${message} ${link}`
            })
          })
      },
      onDownloadComplete (event) {
        this.$store.dispatch('task/fetchList')
        const [{ gid }] = event
        this.$store.dispatch('task/removeFromSeedingList', gid)

        this.fetchTaskItem({ gid })
          .then((task) => {
            this.handleDownloadComplete(task, false)
          })
      },
      onBtDownloadComplete (event) {
        this.$store.dispatch('task/fetchList')
        const [{ gid }] = event
        const { seedingList } = this
        if (seedingList.includes(gid)) {
          return
        }

        this.$store.dispatch('task/addToSeedingList', gid)

        this.fetchTaskItem({ gid })
          .then((task) => {
            this.handleDownloadComplete(task, true)
          })
      },
      handleDownloadComplete (task, isBT) {
        this.$store.dispatch('task/saveSession')

        const path = getTaskFullPath(task)
        this.showTaskCompleteNotify(task, isBT, path)
        this.$electron.ipcRenderer.send('event', 'task-download-complete', task, path)

        // 移除下载中文件后缀
        this.removeDownloadingSuffix(task)

        // 自动分类文件
        this.autoCategorizeDownloadedFile(task)
      },
      ensureTargetDirectoryExists (task) {
        // 获取任务完整路径
        const fullPath = getTaskFullPath(task)

        // 获取目标文件夹路径
        const targetDir = dirname(fullPath)

        // 检查文件夹是否存在，如果不存在则创建
        if (!existsSync(targetDir)) {
          try {
            mkdirSync(targetDir, { recursive: true })
            console.log(`[Motrix] Created target directory: ${targetDir}`)
          } catch (error) {
            console.warn(`[Motrix] Failed to create target directory: ${error.message}`)
          }
        }
      },

      addDownloadingSuffix (task) {
        // 获取下载中文件后缀配置
        const downloadingFileSuffix = this.$store.state.preference.config.downloadingFileSuffix

        // 获取任务完整路径
        const originalPath = getTaskFullPath(task)

        // 使用轮询方式检查文件是否存在，然后添加后缀
        this.pollForFileAndAddSuffix(originalPath, downloadingFileSuffix, 0)
      },

      pollForFileAndAddSuffix (originalPath, suffix, attempt) {
        const maxAttempts = 30 // 最多尝试30次（约30秒）

        if (attempt >= maxAttempts) {
          console.warn(`[Motrix] Failed to add downloading suffix after ${maxAttempts} attempts: ${originalPath}`)
          return
        }

        // 检查文件是否存在
        if (existsSync(originalPath) && !originalPath.endsWith(suffix)) {
          const newPath = originalPath + suffix
          try {
            renameSync(originalPath, newPath)
            console.log(`[Motrix] Added downloading suffix: ${originalPath} -> ${newPath}`)
          } catch (error) {
            console.warn(`[Motrix] Failed to add downloading suffix: ${error.message}`)
          }
        } else if (!originalPath.endsWith(suffix)) {
          // 文件还不存在，继续轮询
          setTimeout(() => {
            this.pollForFileAndAddSuffix(originalPath, suffix, attempt + 1)
          }, 1000) // 每秒检查一次
        }
      },

      removeDownloadingSuffix (task) {
        // 获取下载中文件后缀配置
        const downloadingFileSuffix = this.$store.state.preference.config.downloadingFileSuffix

        // 获取任务完整路径
        const currentPath = getTaskFullPath(task)

        // 如果文件有下载中后缀，则移除后缀
        if (currentPath.endsWith(downloadingFileSuffix)) {
          const originalPath = currentPath.slice(0, -downloadingFileSuffix.length)
          try {
            renameSync(currentPath, originalPath)
            console.log(`[Motrix] Removed downloading suffix: ${currentPath} -> ${originalPath}`)
          } catch (error) {
            console.warn(`[Motrix] Failed to remove downloading suffix: ${error.message}`)
          }
        } else {
          // 检查是否有带后缀的文件存在（可能文件已经被重命名）
          const suffixedPath = currentPath + downloadingFileSuffix
          if (existsSync(suffixedPath)) {
            try {
              renameSync(suffixedPath, currentPath)
              console.log(`[Motrix] Removed downloading suffix: ${suffixedPath} -> ${currentPath}`)
            } catch (error) {
              console.warn(`[Motrix] Failed to remove downloading suffix: ${error.message}`)
            }
          }
        }
      },
      autoCategorizeDownloadedFile (task) {
        // 检查是否启用了自动分类功能
        const autoCategorizeEnabled = this.$store.state.preference.config.autoCategorizeFiles

        if (!autoCategorizeEnabled) {
          console.log('[Motrix] Auto categorize files is disabled')
          return
        }

        // 获取任务完整路径
        const filePath = getTaskFullPath(task)

        if (!existsSync(filePath)) {
          console.warn(`[Motrix] File not found for categorization: ${filePath}`)
          return
        }

        try {
          // 获取下载目录作为基础目录
          const baseDir = dirname(filePath)
          // 获取分类配置
          const categories = this.$store.state.preference.config.fileCategories

          // 调用自动分类功能
          const result = autoCategorizeDownloadedFile(filePath, baseDir, categories)
          if (result) {
            console.log(`[Motrix] File categorized successfully: ${filePath}`)
          } else {
            console.warn('[Motrix] File categorization failed or file already in category')
          }
        } catch (error) {
          console.error(`[Motrix] Error during auto categorization: ${error.message}`)
        }
      },
      showTaskCompleteNotify (task, isBT, path) {
        const taskName = getTaskName(task)
        const message = isBT
          ? this.$t('task.bt-download-complete-message', { taskName })
          : this.$t('task.download-complete-message', { taskName })
        const tips = isBT
          ? '\n' + this.$t('task.bt-download-complete-tips')
          : ''

        this.$msg.success(`${message}${tips}`)

        if (!this.taskNotification) {
          return
        }

        const notifyMessage = isBT
          ? this.$t('task.bt-download-complete-notify')
          : this.$t('task.download-complete-notify')

        /* eslint-disable no-new */
        const notify = new Notification(notifyMessage, {
          body: `${taskName}${tips}`
        })
        notify.onclick = () => {
          showItemInFolder(path, {
            errorMsg: this.$t('task.file-not-exist')
          })
        }
      },
      showTaskErrorNotify (task) {
        const taskName = getTaskName(task)

        const message = this.$t('task.download-fail-message', { taskName })
        this.$msg.success(message)

        if (!this.taskNotification) {
          return
        }

        /* eslint-disable no-new */
        new Notification(this.$t('task.download-fail-notify'), {
          body: taskName
        })
      },
      bindEngineEvents () {
        api.client.on('onDownloadStart', this.onDownloadStart)
        // api.client.on('onDownloadPause', this.onDownloadPause)
        api.client.on('onDownloadStop', this.onDownloadStop)
        api.client.on('onDownloadComplete', this.onDownloadComplete)
        api.client.on('onDownloadError', this.onDownloadError)
        api.client.on('onBtDownloadComplete', this.onBtDownloadComplete)
      },
      unbindEngineEvents () {
        api.client.removeListener('onDownloadStart', this.onDownloadStart)
        // api.client.removeListener('onDownloadPause', this.onDownloadPause)
        api.client.removeListener('onDownloadStop', this.onDownloadStop)
        api.client.removeListener('onDownloadComplete', this.onDownloadComplete)
        api.client.removeListener('onDownloadError', this.onDownloadError)
        api.client.removeListener('onBtDownloadComplete', this.onBtDownloadComplete)
      },
      startPolling () {
        this.timer = setTimeout(() => {
          this.polling()
          this.startPolling()
        }, this.interval)
      },
      polling () {
        this.$store.dispatch('app/fetchGlobalStat')
        this.$store.dispatch('app/fetchProgress')
        this.$store.dispatch('task/fetchList')

        if (this.taskDetailVisible && this.currentTaskGid) {
          if (this.currentTaskIsBT && this.enabledFetchPeers) {
            this.$store.dispatch('task/fetchItemWithPeers', this.currentTaskGid)
          } else {
            this.$store.dispatch('task/fetchItem', this.currentTaskGid)
          }
        }
      },
      stopPolling () {
        clearTimeout(this.timer)
        this.timer = null
      }
    },
    created () {
      this.bindEngineEvents()
    },
    mounted () {
      setTimeout(() => {
        this.$store.dispatch('app/fetchEngineInfo')
        this.$store.dispatch('app/fetchEngineOptions')

        this.startPolling()
      }, 100)
    },
    destroyed () {
      this.$store.dispatch('task/saveSession')

      this.unbindEngineEvents()

      this.stopPolling()
    }
  }
</script>

<style>
 </style>

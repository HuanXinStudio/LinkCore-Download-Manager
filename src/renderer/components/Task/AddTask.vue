<template>
  <el-dialog
    custom-class="tab-title-dialog add-task-dialog"
    width="67vw"
    :visible="visible"
    :top="dialogTop"
    :show-close="false"
    :before-close="beforeClose"
    @open="handleOpen"
    @opened="handleOpened"
    @closed="handleClosed"
  >
    <el-form ref="taskForm" label-position="left" :model="form" :rules="rules">
      <el-tabs :value="type" @tab-click="handleTabClick">
        <el-tab-pane :label="$t('task.uri-task')" name="uri">
          <el-form-item>
            <el-input
              ref="uri"
              type="textarea"
              auto-complete="off"
              :autosize="{ minRows: 3, maxRows: 5 }"
              :placeholder="$t('task.uri-task-tips')"
              @paste.native="handleUriPaste"
              v-model="form.uris"
            >
            </el-input>
          </el-form-item>
          <div class="parsed-preview" v-if="parsedTasks.length > 0 && type === 'uri'">
            <div class="parsed-preview__header">{{ $t('task.parsed-tasks') }}</div>
            <el-table :data="parsedTasks" :border="false" :stripe="true" size="mini" style="width: 100%" height="150">
              <el-table-column :label="$t('task.task-name')" min-width="240">
                <template slot-scope="scope">
                  <span v-if="!scope.row.editing" @dblclick="enableNameEdit(scope.$index)">{{ scope.row.name }}</span>
                  <el-input
                    v-else
                    size="mini"
                    v-model="scope.row.name"
                    @blur="disableNameEdit(scope.$index)"
                    @keyup.enter.native="disableNameEdit(scope.$index)"
                  />
                </template>
              </el-table-column>
              <el-table-column :label="$t('task.file-size')" min-width="120">
                <template slot-scope="scope">
                  <span>{{ scope.row.sizeText }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        <el-tab-pane :label="$t('task.torrent-task')" name="torrent">
          <el-form-item>
            <mo-select-torrent ref="selectTorrent" v-on:change="handleTorrentChange" />
          </el-form-item>
        </el-tab-pane>
      </el-tabs>
      <el-row :gutter="12">

        <el-col :span="9" :xs="24">
          <el-form-item
            :label="`${$t('task.task-split')}: `"
            :label-width="formLabelWidth"
          >
            <el-input-number
              v-model="form.split"
              controls-position="right"
              :min="1"
              :max="config.engineMaxConnectionPerServer"
              :label="$t('task.task-split')"
            >
            </el-input-number>
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item
        :label="`${$t('task.task-dir')}: `"
        :label-width="formLabelWidth"
      >
        <el-input
          placeholder=""
          v-model="form.dir"
          :readonly="isMas"
        >
          <mo-history-directory
            slot="prepend"
            @selected="handleHistoryDirectorySelected"
          />
          <mo-select-directory
            v-if="isRenderer"
            slot="append"
            @selected="handleNativeDirectorySelected"
          />
        </el-input>
      </el-form-item>
      <div class="task-advanced-options" v-if="showAdvanced">
        <el-form-item
          :label="`${$t('task.task-user-agent')}: `"
          :label-width="formLabelWidth"
        >
          <el-input
            type="textarea"
            auto-complete="off"
            :autosize="{ minRows: 2, maxRows: 3 }"
            :placeholder="$t('task.task-user-agent')"
            v-model="form.userAgent"
          >
          </el-input>
        </el-form-item>
        <el-form-item
          :label="`${$t('task.task-authorization')}: `"
          :label-width="formLabelWidth"
        >
          <el-input
            type="textarea"
            auto-complete="off"
            :autosize="{ minRows: 2, maxRows: 3 }"
            :placeholder="$t('task.task-authorization')"
            v-model="form.authorization"
          >
          </el-input>
        </el-form-item>
        <el-form-item
          :label="`${$t('task.task-referer')}: `"
          :label-width="formLabelWidth"
        >
          <el-input
            type="textarea"
            auto-complete="off"
            :autosize="{ minRows: 2, maxRows: 3 }"
            :placeholder="$t('task.task-referer')"
            v-model="form.referer"
          >
          </el-input>
        </el-form-item>
        <el-form-item
          :label="`${$t('task.task-cookie')}: `"
          :label-width="formLabelWidth"
        >
          <el-input
            type="textarea"
            auto-complete="off"
            :autosize="{ minRows: 2, maxRows: 3 }"
            :placeholder="$t('task.task-cookie')"
            v-model="form.cookie"
          >
          </el-input>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="16" :xs="24">
            <el-form-item
              :label="`${$t('task.task-proxy')}: `"
              :label-width="formLabelWidth"
            >
              <el-input
                placeholder="[http://][USER:PASSWORD@]HOST[:PORT]"
                v-model="form.allProxy">
              </el-input>
            </el-form-item>
          </el-col>
          <el-col :span="8" :xs="24">
            <div class="help-link">
              <a target="_blank" href="https://github.com/agalwood/Motrix/wiki/Proxy" rel="noopener noreferrer">
                {{ $t('preferences.proxy-tips') }}
                <mo-icon name="link" width="12" height="12" />
              </a>
            </div>
          </el-col>
        </el-row>
        <el-form-item label="" :label-width="formLabelWidth" style="margin-top: 12px;">
          <el-checkbox class="chk" v-model="form.newTaskShowDownloading">
            {{$t('task.navigate-to-downloading')}}
          </el-checkbox>
        </el-form-item>
      </div>
  </el-form>
    <button
      slot="title"
      type="button"
      class="el-dialog__headerbtn"
      aria-label="Close"
      @click="handleClose">
      <i class="el-dialog__close el-icon el-icon-close"></i>
    </button>
    <div slot="footer" class="dialog-footer">
      <el-row>
        <el-col :span="12" :xs="12">
          <el-checkbox class="chk" v-model="showAdvanced">
            {{$t('task.show-advanced-options')}}
          </el-checkbox>
        </el-col>
        <el-col :span="12" :xs="12" style="text-align: right;">
          <el-button
            type="primary"
            @click="submitForm('taskForm')"
          >
            {{$t('app.submit')}}
          </el-button>
        </el-col>
      </el-row>
    </div>
  </el-dialog>
</template>

<script>
  import is from 'electron-is'
  import { mapState } from 'vuex'
  import { isEmpty } from 'lodash'
  import fetch from 'node-fetch'
  import HistoryDirectory from '@/components/Preference/HistoryDirectory'
  import SelectDirectory from '@/components/Native/SelectDirectory'
  import SelectTorrent from '@/components/Task/SelectTorrent'
  import {
    initTaskForm,
    buildUriPayload,
    buildTorrentPayload
  } from '@/utils/task'
  import { ADD_TASK_TYPE } from '@shared/constants'
  import { detectResource } from '@shared/utils'
  import '@/components/Icons/inbox'

  export default {
    name: 'mo-add-task',
    components: {
      [HistoryDirectory.name]: HistoryDirectory,
      [SelectDirectory.name]: SelectDirectory,
      [SelectTorrent.name]: SelectTorrent
    },
    props: {
      visible: {
        type: Boolean,
        default: false
      },
      type: {
        type: String,
        default: ADD_TASK_TYPE.URI
      }
    },
    data () {
      return {
        formLabelWidth: '110px',
        showAdvanced: false,
        form: {},
        rules: {},
        parsedTasks: []
      }
    },
    computed: {
      isRenderer: () => is.renderer(),
      isMas: () => is.mas(),
      ...mapState('app', {
        taskList: state => state.taskList
      }),
      ...mapState('preference', {
        config: state => state.config
      }),
      taskType () {
        return this.type
      },
      dialogTop () {
        return this.showAdvanced ? '8vh' : '15vh'
      }
    },
    watch: {
      taskType (current, previous) {
        if (this.visible && previous === ADD_TASK_TYPE.URI) {
          return
        }

        if (current === ADD_TASK_TYPE.URI) {
          setTimeout(() => {
            this.$refs.uri && this.$refs.uri.focus()
          }, 50)
        }
      },
      visible (current) {
        if (current === true) {
          document.addEventListener('keydown', this.handleHotkey)
        } else {
          document.removeEventListener('keydown', this.handleHotkey)
        }
      },
      'form.uris' (val) {
        if (this.taskType === ADD_TASK_TYPE.URI) {
          this.updateUriPreview(val)
        }
      }
    },
    methods: {
      async autofillResourceLink () {
        const content = await navigator.clipboard.readText()
        const hasResource = detectResource(content)
        if (!hasResource) {
          return
        }

        if (isEmpty(this.form.uris)) {
          this.form.uris = content
          this.updateUriPreview(this.form.uris)
        }
      },
      beforeClose () {
        if (isEmpty(this.form.uris) && isEmpty(this.form.torrent)) {
          this.handleClose()
        }
      },
      handleOpen () {
        this.form = initTaskForm(this.$store.state)
        if (this.taskType === ADD_TASK_TYPE.URI) {
          if (!isEmpty(this.form.uris)) {
            this.updateUriPreview(this.form.uris)
          }
          this.autofillResourceLink()
          setTimeout(() => {
            this.$refs.uri && this.$refs.uri.focus()
          }, 50)
        }
      },
      handleOpened () {
        this.detectThunderResource(this.form.uris)
      },
      handleClose () {
        this.$store.dispatch('app/hideAddTaskDialog')
        this.$store.dispatch('app/updateAddTaskOptions', {})
      },
      handleClosed () {
        this.reset()
      },
      handleHotkey (event) {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault()

          this.submitForm('taskForm')
        }
      },
      handleTabClick (tab) {
        this.$store.dispatch('app/changeAddTaskType', tab.name)
      },
      handleUriPaste () {
        setImmediate(() => {
          const uris = this.$refs.uri.value
          this.detectThunderResource(uris)
          this.updateUriPreview(uris)
        })
      },
      detectThunderResource (uris = '') {
        if (uris.includes('thunder://')) {
          this.$msg({
            type: 'warning',
            message: this.$t('task.thunder-link-tips'),
            duration: 6000
          })
        }
      },
      handleTorrentChange (torrent, selectedFileIndex, files) {
        this.form.torrent = torrent
        this.form.selectFile = selectedFileIndex
        if (Array.isArray(files) && files.length > 0) {
          this.parsedTasks = files.map(f => {
            const size = (typeof f.length === 'number') ? f.length : (typeof f.size === 'number' ? f.size : 0)
            return { name: f.path || f.name, sizeText: this.bytesToSize(size) }
          })
        } else {
          this.updateTorrentPreview()
        }
      },
      handleHistoryDirectorySelected (dir) {
        this.form.dir = dir
      },
      handleNativeDirectorySelected (dir) {
        this.form.dir = dir
        this.$store.dispatch('preference/recordHistoryDirectory', dir)
      },
      reset () {
        this.showAdvanced = false
        this.form = initTaskForm(this.$store.state)
        this.parsedTasks = []
      },
      enableNameEdit (idx) {
        if (this.parsedTasks[idx]) {
          this.$set(this.parsedTasks[idx], 'editing', true)
        }
      },
      disableNameEdit (idx) {
        if (this.parsedTasks[idx]) {
          this.$set(this.parsedTasks[idx], 'editing', false)
        }
      },
      async updateUriPreview (uris = '') {
        const lines = (uris || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean)
        const items = lines.map(u => {
          try {
            const url = decodeURI(u)
            const lastSlash = url.lastIndexOf('/')
            const name = lastSlash >= 0 ? url.substring(lastSlash + 1) : url
            return { name, sizeText: '-', editing: false }
          } catch (e) {
            return { name: u, sizeText: '-', editing: false }
          }
        })
        this.parsedTasks = items
        await this.fetchUriSizes(lines)
      },
      async fetchUriSizes (lines = []) {
        const updates = await Promise.all(lines.map(async (u, idx) => {
          if (!/^https?:/i.test(u) || u.startsWith('magnet:')) {
            return { idx, sizeText: '-' }
          }
          try {
            const res = await fetch(u, { method: 'HEAD' })
            const len = res.headers.get('content-length')
            if (!len) {
              return { idx, sizeText: '-' }
            }
            const sizeText = this.bytesToSize(parseInt(len, 10))
            return { idx, sizeText }
          } catch (_) {
            return { idx, sizeText: '-' }
          }
        }))
        updates.forEach(({ idx, sizeText }) => {
          if (this.parsedTasks[idx]) {
            this.$set(this.parsedTasks[idx], 'sizeText', sizeText)
          }
        })
      },
      updateTorrentPreview () {
        // For torrent tasks, try to read files from child component if available
        const selectComp = this.$refs && this.$refs.selectTorrent
        let items = []
        if (selectComp && Array.isArray(selectComp.files) && selectComp.files.length > 0) {
          items = selectComp.files.map(f => {
            const size = (typeof f.length === 'number') ? f.length : (typeof f.size === 'number' ? f.size : 0)
            return { name: f.path || f.name, sizeText: this.bytesToSize(size), editing: false }
          })
        }
        this.parsedTasks = items
      },
      bytesToSize (n) {
        if (!n || n <= 0) return '-'
        const units = ['B', 'KB', 'MB', 'GB', 'TB']
        let i = 0
        let val = n
        while (val >= 1024 && i < units.length - 1) { val /= 1024; i++ }
        return `${val.toFixed(1)} ${units[i]}`
      },
      addTask (type, form) {
        let payload = null
        if (type === ADD_TASK_TYPE.URI) {
          // 获取自动分类配置
          const autoCategorizeFiles = this.config.autoCategorizeFiles || false
          const fileCategories = this.config.fileCategories || null

          payload = buildUriPayload(form, autoCategorizeFiles, fileCategories)
          this.$store.dispatch('task/addUri', payload).catch(err => {
            this.$msg.error(err.message)
          })
        } else if (type === ADD_TASK_TYPE.TORRENT) {
          payload = buildTorrentPayload(form)
          this.$store.dispatch('task/addTorrent', payload).catch(err => {
            this.$msg.error(err.message)
          })
        } else if (type === 'metalink') {
        // @TODO addMetalink
        } else {
          console.error('[Motrix] Add task fail', form)
        }
      },
      submitForm (formName) {
        this.$refs[formName].validate(valid => {
          if (!valid) {
            return false
          }

          try {
            if (this.type === 'uri' && this.parsedTasks.length > 0) {
              this.form.customOuts = this.parsedTasks.map(i => i.name)
            }
            this.addTask(this.type, this.form)

            this.$store.dispatch('app/hideAddTaskDialog')
            if (this.form.newTaskShowDownloading) {
              this.$router.push({
                path: '/task/active'
              }).catch(err => {
                console.log(err)
              })
            }
          } catch (err) {
            this.$msg.error(this.$t(err.message))
          }
        })
      }
    }
  }
</script>

<style lang="scss">
.el-dialog.add-task-dialog {
  max-width: 632px;
  min-width: 380px;

  /* 确保弹窗遮罩层有正确的背景色 */
  :deep(.el-dialog__wrapper) {
    background: rgba(0, 0, 0, 0.5);
  }
  .parsed-preview {
    margin-top: 12px;
    .parsed-preview__header {
      font-size: 12px;
      color: $--color-text-secondary;
      margin-bottom: 6px;
    }
    background: transparent;
    border: none;
    border-radius: 4px;
    padding: 8px;
    :deep(.el-table) {
      background: transparent;
    }
    :deep(.el-table--border) {
      border: none !important;
    }
    :deep(.el-table::before),
    :deep(.el-table--border::after),
    :deep(.el-table__border-left-patch),
    :deep(.el-table__border-right-patch) {
      display: none !important;
    }
    :deep(.el-table th),
    :deep(.el-table td),
    :deep(.el-table__header-wrapper th),
    :deep(.el-table__body-wrapper td),
    :deep(.el-table--border .el-table__cell) {
      border: none !important;
    }
    :deep(.el-table th),
    :deep(.el-table tr),
    :deep(.el-table td) {
      border-color: var(--border-color) !important;
      background-color: transparent !important;
      color: var(--text-color-primary);
    }
    :deep(.el-table__header-wrapper),
    :deep(.el-table__body-wrapper) {
      background: transparent;
    }
  }
  .task-advanced-options .el-form-item:last-of-type {
    margin-bottom: 0;
  }
  .el-tabs__header {
    user-select: none;
  }
  .el-input-number.el-input-number--mini {
    width: 100%;
  }
  .help-link {
    font-size: 12px;
    line-height: 14px;
    padding-top: 7px;
    > a {
      color: #909399;
    }
  }
  .el-dialog__footer {
    padding-top: 0;
    background-color: transparent;
    border-radius: 0 0 5px 5px;
    position: fixed;
    bottom: 0;
    right: 0;
    left: 0;
    z-index: 1000;
    box-shadow: none;
  }
  .dialog-footer {
    .chk {
      float: left;
      line-height: 28px;
      &.el-checkbox {
        & .el-checkbox__input {
          line-height: 19px;
        }
        & .el-checkbox__label {
          padding-left: 6px;
        }
      }
    }
  }
}
</style>

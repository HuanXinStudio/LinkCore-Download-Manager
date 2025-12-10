<template>
  <el-container class="content panel" direction="vertical">
    <el-header class="panel-header" height="84">
      <h4 class="hidden-xs-only">{{ title }}</h4>
      <mo-subnav-switcher
        :title="title"
        :subnavs="subnavs"
        class="hidden-sm-and-up"
      />
    </el-header>
    <el-main class="panel-content">
      <el-form
        class="form-preference"
        ref="advancedForm"
        label-position="right"
        size="mini"
        :model="form"
        :rules="rules"
      >
        <!-- 自动更新设置卡片 -->
        <div class="preference-card">
          <h3 class="card-title">{{ $t('preferences.auto-update') }}</h3>
          <el-form-item size="mini">
            <el-col class="form-item-sub" :span="24">
              <el-checkbox v-model="form.autoCheckUpdate" @change="autoSaveForm">
                {{ $t('preferences.auto-check-update') }}
              </el-checkbox>
              <div
                class="el-form-item__info"
                style="margin-top: 8px;"
                v-if="form.lastCheckUpdateTime !== 0"
              >
                {{ $t('preferences.last-check-update-time') + ': ' +
                  (form.lastCheckUpdateTime !== 0 ?
                    new Date(form.lastCheckUpdateTime).toLocaleString() :
                    new Date().toLocaleString())
                }}
                <span
                  class="action-link"
                  :class="{ 'action-link--disabled': isCheckingUpdate || updateAvailable }"
                  @click.prevent="(isCheckingUpdate || updateAvailable) ? null : onCheckUpdateClick()"
                >
                  {{ $t('app.check-updates-now') }}
                </span>
              </div>
            </el-col>
          </el-form-item>
        </div>
        <div class="preference-card">
          <h3 class="card-title">磁力环境自检</h3>
          <el-form-item size="mini">
            <el-row :gutter="12" style="margin-bottom:12px">
              <el-col :span="24">
                <el-button type="primary" :loading="magnetCheckRunning" @click="runMagnetCheck">运行检测</el-button>
                <el-button style="margin-left:8px" :loading="magnetOptimizeRunning" @click="applyMagnetOptimizations">一键优化</el-button>
              </el-col>
            </el-row>
            <el-row v-for="item in magnetCheckItems" :key="item.key" :gutter="8" style="margin-bottom:6px">
              <el-col :span="6"><strong>{{ item.label }}</strong></el-col>
              <el-col :span="18">
                <span :class="['magnet-check-status', item.status]">{{ item.text }}</span>
              </el-col>
            </el-row>
          </el-form-item>
        </div>

        <!-- 代理设置卡片 -->
        <div class="preference-card">
          <h3 class="card-title">{{ $t('preferences.proxy') }}</h3>
          <el-form-item size="mini">
            <el-switch
              v-model="form.proxy.enable"
              :active-text="$t('preferences.enable-proxy')"
              @change="(val) => { onProxyEnableChange(val); autoSaveForm(); }"
              >
            </el-switch>
          </el-form-item>
          <el-form-item size="mini" v-if="form.proxy.enable" style="margin-top: -16px;">
            <el-col
              class="form-item-sub"
              :xs="24"
              :sm="20"
              :md="16"
              :lg="16"
            >
              <el-input
                placeholder="[http://][USER:PASSWORD@]HOST[:PORT]"
                @change="(val) => { onProxyServerChange(val); autoSaveForm(); }"
                v-model="form.proxy.server">
              </el-input>
            </el-col>
            <el-col
              class="form-item-sub"
              :xs="24"
              :sm="24"
              :md="20"
              :lg="20"
            >
              <el-input
                type="textarea"
                rows="2"
                auto-complete="off"
                @change="handleProxyBypassChange"
                :placeholder="`${$t('preferences.proxy-bypass-input-tips')}`"
                v-model="form.proxy.bypass">
              </el-input>
            </el-col>
            <el-col
              class="form-item-sub"
              :xs="24"
              :sm="24"
              :md="20"
              :lg="20"
            >
              <el-select
                class="proxy-scope"
                v-model="form.proxy.scope"
                multiple
              >
                <el-option
                  v-for="item in proxyScopeOptions"
                  :key="item"
                  :label="$t(`preferences.proxy-scope-${item}`)"
                  :value="item"
                />
              </el-select>
              <div class="el-form-item__info" style="margin-top: 8px;">
                <a target="_blank" href="https://github.com/agalwood/Motrix/wiki/Proxy" rel="noopener noreferrer">
                  {{ $t('preferences.proxy-tips') }}
                  <mo-icon name="link" width="12" height="12" />
                </a>
              </div>
            </el-col>
          </el-form-item>
        </div>

        <!-- BT Tracker设置卡片 -->
        <div class="preference-card">
          <h3 class="card-title">{{ $t('preferences.bt-tracker') }}</h3>
          <el-form-item size="mini">
            <div class="form-item-sub bt-tracker">
              <el-row :gutter="10" style="line-height: 0;">
                <el-col :span="20">
                  <div class="track-source">
                    <el-select
                      class="select-track-source"
                      v-model="form.trackerSource"
                      allow-create
                      filterable
                      multiple
                    >
                      <el-option-group
                        v-for="group in trackerSourceOptions"
                        :key="group.label"
                        :label="group.label"
                      >
                        <el-option
                          v-for="item in group.options"
                          :key="item.value"
                          :label="item.label"
                          :value="item.value"
                        >
                          <span style="float: left">{{ item.label }}</span>
                          <span style="float: right; margin-right: 24px">
                            <el-tag
                              type="success"
                              size="mini"
                              v-if="item.cdn"
                            >
                              CDN
                            </el-tag>
                          </span>
                        </el-option>
                      </el-option-group>
                    </el-select>
                  </div>
                </el-col>
                <el-col :span="3">
                  <div class="sync-tracker">
                    <el-tooltip
                      class="item"
                      effect="dark"
                      :content="$t('preferences.sync-tracker-tips')"
                      placement="bottom"
                    >
                      <el-button
                        @click="syncTrackerFromSource"
                        class="sync-tracker-btn"
                      >
                        <mo-icon
                          name="refresh"
                          width="12"
                          height="12"
                          :spin="true"
                          v-if="trackerSyncing"
                        />
                        <mo-icon name="sync" width="12" height="12" v-else />
                      </el-button>
                    </el-tooltip>
                  </div>
                </el-col>
              </el-row>
              <el-input
                type="textarea"
                rows="3"
                auto-complete="off"
                :placeholder="`${$t('preferences.bt-tracker-input-tips')}`"
                v-model="form.btTracker">
              </el-input>
              <div class="el-form-item__info" style="margin-top: 8px;">
                {{ $t('preferences.bt-tracker-tips') }}
                <a target="_blank" href="https://github.com/ngosang/trackerslist" rel="noopener noreferrer">
                  ngosang/trackerslist
                  <mo-icon name="link" width="12" height="12" />
                </a>
                <a target="_blank" href="https://github.com/XIU2/TrackersListCollection" rel="noopener noreferrer">
                  XIU2/TrackersListCollection
                  <mo-icon name="link" width="12" height="12" />
                </a>
              </div>
            </div>
            <div class="form-item-sub">
              <el-checkbox v-model="form.autoSyncTracker">
                {{ $t('preferences.auto-sync-tracker') }}
              </el-checkbox>
              <div class="el-form-item__info" style="margin-top: 8px;" v-if="form.lastSyncTrackerTime > 0">
                {{ new Date(form.lastSyncTrackerTime).toLocaleString() }}
              </div>
            </div>
          </el-form-item>
        </div>

        <!-- RPC设置卡片 -->
        <div class="preference-card">
          <h3 class="card-title">{{ $t('preferences.rpc') }}</h3>
          <el-form-item size="mini">
            <el-row style="margin-bottom: 8px;">
              <el-col
                class="form-item-sub"
                :xs="24"
                :sm="18"
                :md="10"
                :lg="10"
              >
                {{ $t('preferences.rpc-listen-port') }}
                <el-input
                  :placeholder="rpcDefaultPort"
                  :maxlength="8"
                  v-model="form.rpcListenPort"
                  @change="onRpcListenPortChange"
                >
                  <i slot="append" @click.prevent="onRpcPortDiceClick">
                    <mo-icon name="dice" width="12" height="12" />
                  </i>
                </el-input>
              </el-col>
            </el-row>
            <el-row style="margin-bottom: 8px;">
              <el-col
                class="form-item-sub"
                :xs="24"
                :sm="18"
                :md="18"
                :lg="18"
              >
                {{ $t('preferences.rpc-secret') }}
                <el-input
                  :show-password="hideRpcSecret"
                  placeholder="RPC Secret"
                  :maxlength="64"
                  v-model="form.rpcSecret"
                >
                  <i slot="append" @click.prevent="onRpcSecretDiceClick">
                    <mo-icon name="dice" width="12" height="12" />
                  </i>
                </el-input>
                <div class="el-form-item__info" style="margin-top: 8px;">
                  <a target="_blank" href="https://github.com/agalwood/Motrix/wiki/RPC" rel="noopener noreferrer">
                    {{ $t('preferences.rpc-secret-tips') }}
                    <mo-icon name="link" width="12" height="12" />
                  </a>
                </div>
              </el-col>
            </el-row>
          </el-form-item>
        </div>

        <!-- 端口设置卡片 -->
        <div class="preference-card">
          <h3 class="card-title">{{ $t('preferences.port') }}</h3>
          <el-form-item size="mini">
            <el-row style="margin-bottom: 8px;">
              <el-col
                class="form-item-sub"
                :xs="24"
                :sm="18"
                :md="12"
                :lg="12"
              >
                <el-switch
                  v-model="form.enableUpnp"
                  active-text="UPnP/NAT-PMP"
                  >
                </el-switch>
              </el-col>
            </el-row>
            <el-row style="margin-bottom: 8px;">
              <el-col class="form-item-sub"
                :xs="24"
                :sm="18"
                :md="10"
                :lg="10"
              >
                {{ $t('preferences.bt-port') }}
                <el-input
                  placeholder="BT Port"
                  :maxlength="8"
                  v-model="form.listenPort"
                >
                  <i slot="append" @click.prevent="onBtPortDiceClick">
                    <mo-icon name="dice" width="12" height="12" />
                  </i>
                </el-input>
              </el-col>
            </el-row>
            <el-row>
              <el-col
                class="form-item-sub"
                :xs="24"
                :sm="18"
                :md="10"
                :lg="10"
              >
                {{ $t('preferences.dht-port') }}
                <el-input
                  placeholder="DHT Port"
                  :maxlength="8"
                  v-model="form.dhtListenPort"
                >
                  <i slot="append" @click.prevent="onDhtPortDiceClick">
                    <mo-icon name="dice" width="12" height="12" />
                  </i>
                </el-input>
              </el-col>
            </el-row>
          </el-form-item>
        </div>

        <!-- 下载协议设置卡片 -->
        <div class="preference-card">
          <h3 class="card-title">{{ $t('preferences.download-protocol') }}</h3>
          <el-form-item size="mini">
            {{ $t('preferences.protocols-default-client') }}
            <el-col class="form-item-sub" :span="24">
              <el-switch
                v-model="form.protocols.magnet"
                :active-text="$t('preferences.protocols-magnet')"
                @change="(val) => onProtocolsChange('magnet', val)"
                >
              </el-switch>
            </el-col>
            <el-col class="form-item-sub" :span="24">
              <el-switch
                v-model="form.protocols.thunder"
                :active-text="$t('preferences.protocols-thunder')"
                @change="(val) => onProtocolsChange('thunder', val)"
                >
              </el-switch>
            </el-col>
          </el-form-item>
        </div>

        <!-- 引擎信息卡片 -->
        <div class="preference-card">
          <h3 class="card-title">{{ $t('preferences.engine') }}</h3>
          <el-form-item size="mini">
            <el-col class="form-item-sub" :span="24">
              <el-row :gutter="16" style="margin-bottom: 12px;">
                <el-col :span="24">
                  <strong>{{ $t('preferences.engine-select') }}:</strong>
                  <el-select
                    v-model="form.engineBinary"
                    :placeholder="$t('preferences.engine-select-placeholder')"
                    style="width: 100%; margin-top: 8px;"
                    @change="onEngineBinaryChange"
                  >
                    <el-option
                      v-for="engine in engineList"
                      :key="engine"
                      :label="engine"
                      :value="engine"
                    ></el-option>
                  </el-select>
                </el-col>
              </el-row>
              <el-row :gutter="16" style="margin-bottom: 12px;">
                <el-col :span="8">
                  <strong>{{ $t('preferences.engine-version') }}:</strong>
                  <div>{{ storeEngineInfo.version || '--' }}</div>
                </el-col>
                <el-col :span="8">
                  <strong>{{ $t('preferences.engine-architecture') }}:</strong>
                  <div>{{ storeEngineInfo.architecture || '--' }}</div>
                </el-col>
                <el-col :span="8">
                  <strong>{{ $t('preferences.engine-features') }}:</strong>
                  <div>{{ storeEngineInfo.features ? storeEngineInfo.features.join(', ') : '--' }}</div>
                </el-col>
              </el-row>
              <el-row :gutter="16" style="margin-bottom: 12px;">
                <el-col :span="12">
                  <strong>{{ $t('preferences.engine-dependencies') }}:</strong>
                  <div>{{ storeEngineInfo.dependencies ? storeEngineInfo.dependencies.join(', ') : '--' }}</div>
                </el-col>
                <el-col :span="12">
                  <strong>{{ $t('preferences.engine-compile-info') }}:</strong>
                  <div>{{ storeEngineInfo.compileInfo || '--' }}</div>
                </el-col>
              </el-row>
            </el-col>
          </el-form-item>
        </div>

        <!-- 用户代理设置卡片 -->
        <div class="preference-card">
          <h3 class="card-title">{{ $t('preferences.user-agent') }}</h3>
          <el-form-item size="mini">
            <el-col class="form-item-sub" :span="24">
              {{ $t('preferences.mock-user-agent') }}
              <el-input
                type="textarea"
                rows="2"
                auto-complete="off"
                placeholder="User-Agent"
                v-model="form.userAgent">
              </el-input>
              <el-button-group class="ua-group">
                <el-button @click="() => changeUA('aria2')">Aria2</el-button>
                <el-button @click="() => changeUA('transmission')">Transmission</el-button>
                <el-button @click="() => changeUA('chrome')">Chrome</el-button>
                <el-button @click="() => changeUA('du')">du</el-button>
              </el-button-group>
            </el-col>
          </el-form-item>
        </div>

        <!-- 开发者选项卡片 -->
        <div class="preference-card">
          <h3 class="card-title">{{ $t('preferences.developer') }}</h3>
          <el-form-item size="mini">
            <el-col class="form-item-sub" :span="24">
              {{ $t('preferences.aria2-conf-path') }}
              <el-input placeholder="" disabled v-model="aria2ConfPath">
                <mo-show-in-folder
                  slot="append"
                  v-if="isRenderer"
                  :path="aria2ConfPath"
              />
            </el-input>
            <el-button type="primary" size="mini" @click="openAria2ConfEditor">编辑 aria2.conf</el-button>
          </el-col>
            <el-col class="form-item-sub" :span="24">
              {{ $t('preferences.download-session-path') }}
              <el-input placeholder="" disabled v-model="sessionPath">
                <mo-show-in-folder
                  slot="append"
                  v-if="isRenderer"
                  :path="sessionPath"
                />
              </el-input>
            </el-col>
            <el-col class="form-item-sub" :span="24">
              {{ $t('preferences.app-log-path') }}
              <el-row :gutter="16">
                <el-col :span="18">
                  <el-input placeholder="" disabled v-model="logPath">
                    <mo-show-in-folder
                    slot="append"
                    v-if="isRenderer"
                    :path="logPath"
                    />
                  </el-input>
                </el-col>
                <el-col :span="6">
                  <el-select v-model="form.logLevel">
                    <el-option
                      v-for="item in logLevels"
                      :key="item"
                      :label="item"
                      :value="item">
                    </el-option>
                  </el-select>
                </el-col>
              </el-row>
            </el-col>
            <el-col class="form-item-sub" :span="24">
              <el-button plain type="warning" @click="() => onSessionResetClick()">
                {{ $t('preferences.session-reset') }}
              </el-button>
              <el-button plain type="danger" @click="() => onFactoryResetClick()">
                {{ $t('preferences.factory-reset') }}
              </el-button>
            </el-col>
          </el-form-item>
        </div>
      </el-form>
    <el-dialog
      custom-class="tab-title-dialog aria2conf-editor-dialog"
      width="900px"
      :visible.sync="aria2ConfEditorVisible"
      :show-close="true"
      :append-to-body="true"
    >
      <div slot="title" class="aria2conf-toolbar">
        <el-row :gutter="8" style="margin-bottom:8px">
          <el-col :span="12">
            <el-input :value="aria2ConfPath" disabled>
              <mo-show-in-folder slot="append" v-if="isRenderer" :path="aria2ConfPath" />
            </el-input>
          </el-col>
          <el-col :span="12">
            <el-input v-model="aria2ConfSearch" placeholder="搜索键或值" clearable />
          </el-col>
        </el-row>
        <el-row :gutter="8">
          <el-col :span="12">
            <el-select v-model="aria2ConfQuickKey" filterable clearable placeholder="快速添加常用键" style="width:100%">
              <el-option v-for="k in aria2ConfCommonKeys" :key="k" :label="k" :value="k" />
            </el-select>
          </el-col>
          <el-col :span="12">
            <el-button type="primary" size="mini" @click="addConfKey">添加键</el-button>
            <el-button size="mini" @click="addConfItem">新增空条目</el-button>
            <el-button size="mini" @click="copyAria2ConfText">复制为文本</el-button>
            <el-button size="mini" @click="pasteFromClipboard">粘贴并导入</el-button>
          </el-col>
        </el-row>
        <el-row :gutter="8" style="margin-bottom:8px">
          <el-col :span="24">
            <el-input type="textarea" :autosize="{ minRows: 2, maxRows: 6 }" v-model="aria2ConfRawText" placeholder="粘贴或编辑原始配置文本" />
            <div style="margin-top:8px">
              <el-button type="primary" size="mini" @click="importFromText">从文本导入</el-button>
            </div>
          </el-col>
        </el-row>
      </div>
      <el-row :gutter="8">
        <el-col :span="24">
          <el-table :data="aria2ConfFilteredItems" :border="false" :stripe="true" size="mini" style="width: 100%">
            <el-table-column label="键" width="300">
              <template slot-scope="scope">
                <el-input v-model="scope.row.key" size="mini" />
              </template>
            </el-table-column>
            <el-table-column label="值">
              <template slot-scope="scope">
                <el-input v-model="scope.row.value" size="mini" />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template slot-scope="scope">
                <el-button type="danger" size="mini" @click="removeConfItem(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-col>
      </el-row>
      <div slot="footer" class="dialog-footer">
        <el-button type="primary" @click="saveAria2Conf">保存</el-button>
      </div>
    </el-dialog>

    </el-main>
  </el-container>
</template>

<script>
  import is from 'electron-is'
  import { dialog } from '@electron/remote'
  import { mapState, mapActions } from 'vuex'
  import { cloneDeep, extend, isEmpty } from 'lodash'
  import randomize from 'randomatic'
  import ShowInFolder from '@/components/Native/ShowInFolder'
  import SubnavSwitcher from '@/components/Subnav/SubnavSwitcher'
  import userAgentMap from '@shared/ua'
  import {
    EMPTY_STRING,
    ENGINE_RPC_PORT,
    LOG_LEVELS,
    TRACKER_SOURCE_OPTIONS,
    PROXY_SCOPE_OPTIONS
  } from '@shared/constants'
  import {
    buildRpcUrl,
    calcFormLabelWidth,
    changedConfig,
    checkIsNeedRestart,
    convertCommaToLine,
    convertLineToComma,
    diffConfig,
    generateRandomInt
  } from '@shared/utils'
  import { convertTrackerDataToLine, reduceTrackerString } from '@shared/utils/tracker'
  import '@/components/Icons/dice'
  import '@/components/Icons/sync'
  import '@/components/Icons/refresh'
  import { getLanguage } from '@shared/locales'
  import { getLocaleManager } from '@/components/Locale'

  const initForm = (config) => {
    const {
      autoCheckUpdate,
      autoSyncTracker,
      btTracker,
      dhtListenPort,
      enableUpnp,
      hideAppMenu,
      lastCheckUpdateTime,
      lastSyncTrackerTime,
      listenPort,
      logLevel,
      protocols,
      proxy,
      rpcListenPort,
      rpcSecret,
      trackerSource,
      useProxy,
      userAgent,
      engineBinary
    } = config
    // 兼容旧的kebab-case配置键
    const parsedEngineBinary = engineBinary || config['engine-binary'] || ''
    const result = {
      autoCheckUpdate,
      autoSyncTracker,
      btTracker: convertCommaToLine(btTracker),
      dhtListenPort,
      enableUpnp,
      hideAppMenu,
      lastCheckUpdateTime,
      lastSyncTrackerTime,
      listenPort,
      logLevel,
      proxy: cloneDeep(proxy),
      protocols: { ...protocols },
      rpcListenPort,
      rpcSecret,
      trackerSource,
      useProxy,
      userAgent,
      engineBinary: parsedEngineBinary
    }
    return result
  }

  export default {
    name: 'mo-preference-advanced',
    components: {
      [SubnavSwitcher.name]: SubnavSwitcher,
      [ShowInFolder.name]: ShowInFolder
    },
    data () {
      const { locale } = this.$store.state.preference.config
      const formOriginal = initForm(this.$store.state.preference.config)
      let form = {}
      form = initForm(extend(form, formOriginal, changedConfig.advanced))

      return {
        form,
        formLabelWidth: calcFormLabelWidth(locale),
        formOriginal,
        hideRpcSecret: true,
        proxyScopeOptions: PROXY_SCOPE_OPTIONS,
        rules: {},
        trackerSourceOptions: TRACKER_SOURCE_OPTIONS,
        trackerSyncing: false,
        saveTimeout: null,
        engineList: [],
        // 添加标志，用于跟踪引擎配置是否已初始化
        engineConfigInitialized: false,
        aria2ConfEditorVisible: false,
        aria2ConfOriginalLines: [],
        aria2ConfItems: [],
        aria2ConfLoading: false,
        aria2ConfSearch: '',
        aria2ConfQuickKey: '',
        aria2ConfCommonKeys: [
          'max-concurrent-downloads',
          'max-connection-per-server',
          'max-overall-download-limit',
          'max-overall-upload-limit',
          'rpc-listen-port',
          'rpc-secret',
          'user-agent',
          'dir'
        ],
        aria2ConfRawText: '',
        magnetCheckRunning: false,
        magnetOptimizeRunning: false,
        magnetCheckItems: []
      }
    },
    computed: {
      ...mapState('app', ['isCheckingUpdate']),
      ...mapState('preference', ['updateAvailable']),
      ...mapState('app', {
        storeEngineInfo: state => state.engineInfo
      }),
      configEngineBinary () {
        const { config = {} } = this.$store.state.preference
        return config.engineBinary || config['engine-binary']
      },
      engineInfo () {
        return this.storeEngineInfo
      },
      isRenderer: () => is.renderer(),
      title () {
        return this.$t('preferences.advanced')
      },
      subnavs () {
        return [
          {
            key: 'basic',
            title: this.$t('preferences.basic'),
            route: '/preference/basic'
          },
          {
            key: 'advanced',
            title: this.$t('preferences.advanced'),
            route: '/preference/advanced'
          },
          {
            key: 'lab',
            title: this.$t('preferences.lab'),
            route: '/preference/lab'
          }
        ]
      },
      rpcDefaultPort () {
        return ENGINE_RPC_PORT
      },
      logLevels () {
        return LOG_LEVELS
      },
      ...mapState('preference', {
        config: state => state.config,
        aria2ConfPath: state => state.config.aria2ConfPath,
        logPath: state => state.config.logPath,
        sessionPath: state => state.config.sessionPath
      }),
      aria2ConfFilteredItems () {
        const q = `${this.aria2ConfSearch}`.toLowerCase()
        if (!q) return this.aria2ConfItems
        return this.aria2ConfItems.filter(i => {
          const k = `${i.key}`.toLowerCase()
          const v = `${i.value}`.toLowerCase()
          return k.includes(q) || v.includes(q)
        })
      }
    },
    watch: {
      form: {
        handler () {
          // Only save if form has changed from original
          const hasChanges = !isEmpty(diffConfig(this.formOriginal, this.form))
          if (hasChanges) {
            this.autoSaveForm()
          }
        },
        deep: true
      },
      'form.rpcListenPort' (val) {
        const url = buildRpcUrl({
          port: this.form.rpcListenPort,
          secret: val
        })
        navigator.clipboard.writeText(url)
      },
      'form.rpcSecret' (val) {
        const url = buildRpcUrl({
          port: this.form.rpcListenPort,
          secret: val
        })
        navigator.clipboard.writeText(url)
      },
      // 监听引擎列表变化，确保当前选择的引擎有效
      engineList (newList) {
        if (newList.length > 0) {
          this.initEngineSelection(newList)
        }
      },
      // 监听store中的engineBinary变化，确保表单与最新配置同步
      configEngineBinary: {
        handler (newValue) {
          if (newValue && this.engineList.length > 0) {
            this.form.engineBinary = newValue
            this.formOriginal.engineBinary = newValue
          }
        },
        immediate: true
      }
    },
    async created () {
      // 获取引擎列表
      await this.fetchEngineList()
    },
    async mounted () {
      // 组件挂载后再次获取引擎列表，确保最新
      await this.fetchEngineList()
    },
    methods: {
      ...mapActions('app', ['updateCheckingUpdate']),
      // 初始化引擎选择
      initEngineSelection (engineList) {
        // 1. 从store获取最新的引擎配置
        const storeConfig = this.$store.state.preference.config
        const storeEngineBinary = storeConfig.engineBinary || storeConfig['engine-binary']

        // 2. 检查store中的引擎配置是否有效
        if (storeEngineBinary && engineList.includes(storeEngineBinary)) {
          // 如果有效，使用store中的配置
          this.form.engineBinary = storeEngineBinary
          this.formOriginal.engineBinary = storeEngineBinary
        } else if (this.form.engineBinary && engineList.includes(this.form.engineBinary)) {
          // 3. 检查当前表单中的引擎配置是否有效
          // 如果有效，保持当前配置
          this.formOriginal.engineBinary = this.form.engineBinary
        } else if (engineList.length > 0) {
          // 4. 否则，使用第一个可用引擎
          this.form.engineBinary = engineList[0]
          this.formOriginal.engineBinary = engineList[0]
          // 保存新的引擎配置
          this.autoSaveForm()
        }
      },
      // 获取引擎列表方法
      async fetchEngineList () {
        try {
          const engines = await this.$electron.ipcRenderer.invoke('get-engine-list')
          this.engineList = engines
        } catch (error) {
          console.error('Failed to get engine list:', error)
          this.engineList = []
        }
      },
      autoSaveForm () {
        // Debounce auto-save to avoid too many requests
        if (this.saveTimeout) {
          clearTimeout(this.saveTimeout)
        }
        this.saveTimeout = setTimeout(() => {
          // Double-check there are actual changes before submitting
          if (!isEmpty(diffConfig(this.formOriginal, this.form))) {
            this.submitForm('advancedForm')
          }
        }, 500)
      },
      onEngineBinaryChange () {
        // 引擎选择变化时，直接触发保存，不更新formOriginal
        this.autoSaveForm()
      },
      handleLocaleChange (locale) {
        const lng = getLanguage(locale)
        getLocaleManager().changeLanguage(lng)
        this.autoSaveForm()
      },
      onCheckUpdateClick () {
        // 如果正在检查，直接返回
        if (this.isCheckingUpdate) return

        // 设置检查状态
        this.updateCheckingUpdate(true)

        // 显示检查中消息
        this.$msg.info(this.$t('app.checking-for-updates'))

        // 创建临时事件监听器，使用once确保只触发一次
        const onUpdateError = () => {
          this.$msg.error(this.$t('app.update-error-message'))
          this.updateCheckingUpdate(false)
        }

        const onUpdateNotAvailable = () => {
          this.$msg.success(this.$t('app.update-not-available-message'))
          this.updateCheckingUpdate(false)
        }

        const onUpdateAvailable = (event, version) => {
          this.$msg.info(this.$t('app.update-available-message'))
          this.updateCheckingUpdate(false)
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
          this.$msg.error(this.$t('app.update-timeout-message') || '更新检查超时，请稍后重试')
          this.updateCheckingUpdate(false)
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

        // 更新最后检查时间
        this.$store.dispatch('preference/fetchPreference')
          .then((config) => {
            const { lastCheckUpdateTime } = config
            this.form.lastCheckUpdateTime = lastCheckUpdateTime
          })
      },
      syncTrackerFromSource () {
        this.trackerSyncing = true
        const { trackerSource } = this.form
        this.$store.dispatch('preference/fetchBtTracker', trackerSource)
          .then((data) => {
            const tracker = convertTrackerDataToLine(data)
            this.form.lastSyncTrackerTime = Date.now()
            this.form.btTracker = tracker
            this.trackerSyncing = false
          })
          .catch((_) => {
            this.trackerSyncing = false
          })
      },
      onProtocolsChange (protocol, enabled) {
        const { protocols } = this.form
        this.form.protocols = {
          ...protocols,
          [protocol]: enabled
        }
      },
      onProxyEnableChange (enable) {
        this.form.proxy = {
          ...this.form.proxy,
          enable
        }
      },
      onProxyServerChange (server) {
        this.form.proxy = {
          ...this.form.proxy,
          server
        }
      },
      handleProxyBypassChange (bypass) {
        this.form.proxy = {
          ...this.form.proxy,
          bypass: convertLineToComma(bypass)
        }
      },
      onProxyScopeChange (scope) {
        this.form.proxy = {
          ...this.form.proxy,
          scope: [...scope]
        }
      },
      changeUA (type) {
        const ua = userAgentMap[type]
        if (!ua) {
          return
        }
        this.form.userAgent = ua
      },
      onBtPortDiceClick () {
        const port = generateRandomInt(20000, 24999)
        this.form.listenPort = port
      },
      onDhtPortDiceClick () {
        const port = generateRandomInt(25000, 29999)
        this.form.dhtListenPort = port
      },
      onRpcListenPortChange (value) {
        console.log('onRpcListenPortChange===>', value)
        if (EMPTY_STRING === value) {
          this.form.rpcListenPort = this.rpcDefaultPort
        }
      },
      onRpcPortDiceClick () {
        const port = generateRandomInt(ENGINE_RPC_PORT, 20000)
        this.form.rpcListenPort = port
      },
      onRpcSecretDiceClick () {
        this.hideRpcSecret = false
        const rpcSecret = randomize('Aa0', 16)
        this.form.rpcSecret = rpcSecret

        setTimeout(() => {
          this.hideRpcSecret = true
        }, 2000)
      },
      onSessionResetClick () {
        dialog.showMessageBox({
          type: 'warning',
          title: this.$t('preferences.session-reset'),
          message: this.$t('preferences.session-reset-confirm'),
          buttons: [this.$t('app.yes'), this.$t('app.no')],
          cancelId: 1
        }).then(({ response }) => {
          if (response === 0) {
            this.$store.dispatch('task/purgeTaskRecord')
            this.$store.dispatch('task/pauseAllTask')
              .then(() => {
                this.$electron.ipcRenderer.send('command', 'application:reset-session')
              })
          }
        })
      },
      runMagnetCheck () {
        this.magnetCheckRunning = true
        const cfg = this.$store.state.preference.config || {}
        const trackers = `${cfg.btTracker || cfg['bt-tracker'] || ''}`.trim()
        const trackerCount = trackers ? trackers.split(/[\n,]+/).filter(Boolean).length : 0
        const dhtPort = Number(cfg.dhtListenPort || cfg['dht-listen-port'] || 0)
        const btPort = Number(cfg.listenPort || cfg['listen-port'] || 0)
        const pauseNew = !!(cfg.pause)
        const limitStr = `${cfg.maxOverallDownloadLimit || cfg['max-overall-download-limit'] || 0}`
        const limitOk = (limitStr === '0' || Number(limitStr) >= 102400)
        const rpcPort = Number(cfg.rpcListenPort || cfg['rpc-listen-port'] || 0)
        const items = [
          { key: 'trackers', label: 'Tracker 配置', status: trackerCount > 0 ? 'ok' : 'warn', text: trackerCount > 0 ? `已配置 ${trackerCount} 个` : '未配置，建议同步/添加公共 Tracker' },
          { key: 'dht', label: 'DHT 端口', status: dhtPort > 0 ? 'ok' : 'warn', text: dhtPort > 0 ? `已启用，端口 ${dhtPort}` : '未启用，建议开启 DHT' },
          { key: 'btport', label: 'BT 监听端口', status: btPort > 0 ? 'ok' : 'warn', text: btPort > 0 ? `已启用，端口 ${btPort}` : '未设置，建议开启 BT 端口' },
          { key: 'pause', label: '新增任务默认暂停', status: !pauseNew ? 'ok' : 'warn', text: !pauseNew ? '已关闭' : '已开启，建议关闭以自动获取元数据' },
          { key: 'limit', label: '全局下载限速', status: limitOk ? 'ok' : 'warn', text: limitOk ? '正常' : `当前为 ${limitStr}/s，建议提升或设为不限制` },
          { key: 'rpc', label: 'RPC 端口', status: rpcPort > 0 ? 'ok' : 'warn', text: rpcPort > 0 ? `端口 ${rpcPort}` : '未设置，建议设置 RPC 端口' }
        ]
        this.magnetCheckItems = items
        this.magnetCheckRunning = false
      },
      async applyMagnetOptimizations () {
        this.magnetOptimizeRunning = true
        const cfg = this.$store.state.preference.config || {}
        const trackers = `${cfg.btTracker || cfg['bt-tracker'] || ''}`.trim()
        const defaultTrackers = [
          'udp://tracker.opentrackr.org:1337/announce',
          'udp://open.demonii.com:1337/announce',
          'udp://tracker.openbittorrent.com:80/announce',
          'udp://tracker.coppersurfer.tk:6969/announce',
          'udp://exodus.desync.com:6969/announce'
        ].join('\n')
        const data = {}
        data.pause = false
        data['max-overall-download-limit'] = 0
        if (!trackers) {
          data['bt-tracker'] = defaultTrackers
        }
        this.$store.dispatch('preference/save', data)
          .then(() => {
            this.$store.dispatch('app/fetchEngineOptions')
            this.magnetOptimizeRunning = false
            this.runMagnetCheck()
            this.$msg.success('已应用优化设置')
          })
          .catch(() => {
            this.magnetOptimizeRunning = false
            this.$msg.error(this.$t('preferences.save-fail-message'))
          })
      },
      onFactoryResetClick () {
        dialog.showMessageBox({
          type: 'warning',
          title: this.$t('preferences.factory-reset'),
          message: this.$t('preferences.factory-reset-confirm'),
          buttons: [this.$t('app.yes'), this.$t('app.no')],
          cancelId: 1
        }).then(({ response }) => {
          if (response === 0) {
            this.$electron.ipcRenderer.send('command', 'application:factory-reset')
          }
        })
      },
      openAria2ConfEditor () {
        this.aria2ConfEditorVisible = true
        this.loadAria2Conf()
      },
      async loadAria2Conf () {
        this.aria2ConfLoading = true
        try {
          const res = await this.$electron.ipcRenderer.invoke('aria2-conf:read')
          const text = res && res.content ? res.content : ''
          const lines = `${text}`.split(/\r?\n/)
          this.aria2ConfOriginalLines = lines
          const items = []
          lines.forEach((line, idx) => {
            const m = /^\s*([A-Za-z0-9_.-]+)\s*=\s*(.*)\s*$/.exec(line)
            if (m) {
              items.push({ key: m[1], value: m[2], index: idx })
            }
          })
          this.aria2ConfItems = items
        } catch (e) {
          this.$msg.error(this.$t('preferences.save-fail-message'))
        } finally {
          this.aria2ConfLoading = false
        }
      },
      addConfItem () {
        this.aria2ConfItems = [...this.aria2ConfItems, { key: '', value: '', index: -1 }]
      },
      removeConfItem (row) {
        const idx = this.aria2ConfItems.indexOf(row)
        if (idx !== -1) {
          this.aria2ConfItems.splice(idx, 1)
        }
      },
      async saveAria2Conf () {
        const original = [...this.aria2ConfOriginalLines]
        const kvRegex = /^\s*([A-Za-z0-9_.-]+)\s*=\s*(.*)\s*$/
        const kvMap = {}
        original.forEach(line => {
          const m = kvRegex.exec(line)
          if (m) { kvMap[m[1]] = m[2] }
        })
        this.aria2ConfItems.forEach(item => {
          const k = `${item.key}`.trim()
          if (!k) return
          const v = `${item.value}`.trim()
          kvMap[k] = v
        })
        const rebuilt = original.map(line => {
          const m = kvRegex.exec(line)
          if (!m) return line
          const k = m[1]
          const v = kvMap[k]
          return typeof v !== 'undefined' ? `${k}=${v}` : line
        })
        // 追加原文件中未包含但编辑器新增的键
        const existingKeys = new Set(Object.keys(kvMap))
        original.forEach(line => {
          const m = kvRegex.exec(line)
          if (m) existingKeys.delete(m[1])
        })
        existingKeys.forEach(k => {
          rebuilt.push(`${k}=${kvMap[k]}`)
        })
        const content = rebuilt.join('\n')
        const res = await this.$electron.ipcRenderer.invoke('aria2-conf:write', { content })
        if (res && res.success) {
          this.$msg.success(`${this.$t('preferences.save-success-message')} \n${res.path}`)
          // 立即重新加载以验证写入成功，不关闭编辑器
          await this.loadAria2Conf()
        } else {
          const msg = (res && res.error) ? res.error : this.$t('preferences.save-fail-message')
          this.$msg.error(msg)
        }
      },
      addConfKey () {
        const key = this.aria2ConfQuickKey
        if (!key) return
        const exists = this.aria2ConfItems.find(item => item.key === key)
        if (!exists) {
          this.aria2ConfItems = [...this.aria2ConfItems, { key, value: '', index: -1 }]
        }
      },
      copyAria2ConfText () {
        const text = this.aria2ConfItems
          .filter(i => i.key)
          .map(i => `${i.key}=${i.value}`)
          .join('\n')
        if (text) {
          navigator.clipboard.writeText(text)
        }
      },
      importFromText () {
        const raw = `${this.aria2ConfRawText}`
        const lines = raw.split(/\r?\n/)
        lines.forEach(line => {
          const m = /^\s*([A-Za-z0-9_.-]+)\s*=\s*(.*)\s*$/.exec(line)
          if (m) {
            const key = m[1]
            const value = m[2]
            const idx = this.aria2ConfItems.findIndex(i => i.key === key)
            if (idx >= 0) {
              this.aria2ConfItems.splice(idx, 1, { ...this.aria2ConfItems[idx], value })
            } else {
              this.aria2ConfItems.push({ key, value, index: -1 })
            }
          }
        })
      },
      async pasteFromClipboard () {
        try {
          const text = await navigator.clipboard.readText()
          this.aria2ConfRawText = text
          this.importFromText()
        } catch (e) {
          this.$msg.error(this.$t('preferences.save-fail-message'))
        }
      },
      syncFormConfig () {
        this.$store.dispatch('preference/fetchPreference')
          .then((config) => {
            this.form = initForm(config)
            this.formOriginal = cloneDeep(this.form)
          })
      },
      submitForm (formName) {
        this.$refs[formName].validate((valid) => {
          if (!valid) {
            console.error('[Motrix] preference form valid:', valid)
            return false
          }

          const data = {
            ...diffConfig(this.formOriginal, this.form)
          }

          // 显式处理engineBinary字段，转换为kebab-case
          if ('engineBinary' in data) {
            data['engine-binary'] = data.engineBinary
            delete data.engineBinary
          }

          const {
            autoHideWindow,
            btAutoDownloadContent,
            btTracker,
            rpcListenPort
          } = data

          if ('btAutoDownloadContent' in data) {
            data.followTorrent = btAutoDownloadContent
            data.followMetalink = btAutoDownloadContent
            data.pauseMetadata = !btAutoDownloadContent
          }

          if (btTracker) {
            data.btTracker = reduceTrackerString(convertLineToComma(btTracker))
          }

          if (rpcListenPort === EMPTY_STRING) {
            data.rpcListenPort = this.rpcDefaultPort
          }

          console.log('[Motrix] preference changed data:', data)

          // 检查是否需要重启
          const needRelaunch = this.isRenderer && (
            ('engine-binary' in data && data['engine-binary'] !== this.formOriginal.engineBinary) ||
            checkIsNeedRestart(data)
          )

          this.$store.dispatch('preference/save', data)
            .then(() => {
              this.$store.dispatch('app/fetchEngineOptions')
              // Don't show success message for auto-save to avoid constant notifications

              changedConfig.basic = {}
              changedConfig.advanced = {}

              if (this.isRenderer) {
                if ('autoHideWindow' in data) {
                  this.$electron.ipcRenderer.send('command',
                                                  'application:auto-hide-window', autoHideWindow)
                }

                // 只有在配置保存成功后才发送重启命令
                if (needRelaunch) {
                  this.$electron.ipcRenderer.send('command', 'application:relaunch')
                  // 发送重启命令后立即返回，不再执行后续的syncFormConfig()
                  return
                }

                // 不需要重启时，才同步表单配置
                this.syncFormConfig()
              }
            })
            .catch((e) => {
              this.$msg.error(this.$t('preferences.save-fail-message'))
              changedConfig.basic = {}
              changedConfig.advanced = {}
            })
        })
      }
    },

    beforeRouteLeave (to, from, next) {
      // Since we now use auto-save on changes, there's no need to check for unsaved changes
      changedConfig.advanced = {}
      changedConfig.basic = {}
      next()
    }
  }
</script>

<style lang="scss">
.proxy-scope {
  width: 100%;
}
.bt-tracker {
  position: relative;
  .sync-tracker-btn {
    line-height: 0;
  }
  .track-source {
    margin-bottom: 16px;
    .select-track-source {
      width: 100%;
    }
    .el-select__tags {
      overflow-x: auto;
    }
  }
}
.ua-group {
  margin-top: 8px;
}

.magnet-check-status {
  &.ok { color: #67C23A; }
  &.warn { color: #E6A23C; }
}

.action-link {
  &--disabled {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
    text-decoration: none;
  }
}

.el-dialog.aria2conf-editor-dialog {
  :deep(.el-dialog__wrapper) {
    background: rgba(0, 0, 0, 0.5);
  }
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  .el-dialog__header {
    padding: 10px 20px;
    border-bottom: none;
  }
  .el-dialog__body {
    flex: 1 1 auto;
    overflow-y: auto;
    padding-bottom: 10px;
  }
  .el-dialog__footer {
    border-top: none;
    background: transparent;
  }
  .dialog-footer {
    position: fixed;
    right: 16px;
    bottom: 16px;
    left: auto;
    padding: 0;
    background: transparent;
  }
  .aria2conf-toolbar {
    background: var(--panel-background);
    padding: 8px 0 4px;
  }
  :deep(.el-table__header-wrapper) {
    position: sticky;
    top: 0;
    z-index: 1;
    background: var(--panel-background);
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
}
</style>

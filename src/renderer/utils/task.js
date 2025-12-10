import { isEmpty } from 'lodash'
import { existsSync, mkdirSync } from 'node:fs'

import {
  ADD_TASK_TYPE,
  NONE_SELECTED_FILES,
  SELECTED_ALL_FILES
} from '@shared/constants'
import { splitTaskLinks } from '@shared/utils'
import { buildOuts } from '@shared/utils/rename'
import {
  buildCategorizedPaths,
  shouldCategorizeFiles
} from '@shared/utils/file-categorize'

import {
  buildUrisFromCurl,
  buildHeadersFromCurl,
  buildDefaultOptionsFromCurl
} from '@shared/utils/curl'

export const initTaskForm = state => {
  const { addTaskUrl, addTaskOptions } = state.app
  const {
    allProxy,
    dir,
    engineMaxConnectionPerServer,
    followMetalink,
    followTorrent,
    maxConnectionPerServer,
    newTaskShowDownloading,
    split
  } = state.preference.config
  const result = {
    allProxy,
    cookie: '',
    dir,
    engineMaxConnectionPerServer,
    followMetalink,
    followTorrent,
    maxConnectionPerServer,
    newTaskShowDownloading,
    out: '',
    customOuts: [],
    referer: '',
    selectFile: NONE_SELECTED_FILES,
    split,
    torrent: '',
    uris: addTaskUrl,
    userAgent: '',
    authorization: '',
    ...addTaskOptions
  }
  return result
}

export const buildHeader = (form) => {
  const { userAgent, referer, cookie, authorization } = form
  const result = []

  if (!isEmpty(userAgent)) {
    result.push(`User-Agent: ${userAgent}`)
  }
  if (!isEmpty(referer)) {
    result.push(`Referer: ${referer}`)
  }
  if (!isEmpty(cookie)) {
    result.push(`Cookie: ${cookie}`)
  }
  if (!isEmpty(authorization)) {
    result.push(`Authorization: ${authorization}`)
  }

  return result
}

export const buildOption = (type, form) => {
  const {
    allProxy,
    dir,
    out,
    selectFile,
    split
  } = form
  const result = {}

  if (!isEmpty(allProxy)) {
    result.allProxy = allProxy
  }

  if (!isEmpty(dir)) {
    result.dir = dir
  }

  if (!isEmpty(out)) {
    result.out = out
  }

  if (split > 0) {
    result.split = split
  }

  if (type === ADD_TASK_TYPE.TORRENT) {
    if (
      selectFile !== SELECTED_ALL_FILES &&
      selectFile !== NONE_SELECTED_FILES
    ) {
      result.selectFile = selectFile
    }
  }

  const header = buildHeader(form)
  if (!isEmpty(header)) {
    result.header = header
  }

  return result
}

export const buildUriPayload = (form, autoCategorize = false, categories = null) => {
  let { uris, out, dir } = form
  if (isEmpty(uris)) {
    throw new Error('task.new-task-uris-required')
  }

  uris = splitTaskLinks(uris)
  const curlHeaders = buildHeadersFromCurl(uris)
  uris = buildUrisFromCurl(uris)
  let outs = []
  if (Array.isArray(form.customOuts) && form.customOuts.length === uris.length) {
    outs = [...form.customOuts]
  } else {
    outs = buildOuts(uris, out)
  }

  form = buildDefaultOptionsFromCurl(form, curlHeaders)

  // 如果启用了自动分类功能，处理文件分类
  let categorizedOuts = outs
  if (shouldCategorizeFiles(autoCategorize, categories) && dir) {
    const categorizedPaths = buildCategorizedPaths(uris, outs, categories, dir)
    // 对于每个文件，将outs设置为文件名，将options.dir设置为分类目录
    // 这样aria2就不会将路径重复拼接
    categorizedOuts = categorizedPaths.map(item => item.categorizedPath.split('/').pop())
    // 更新form.dir为分类目录，这样buildOption函数会使用正确的目录
    // 注意：如果有多个文件，会使用第一个文件的分类目录
    // 这是因为aria2只支持一个dir参数，所以如果有多个不同类型的文件，可能会有问题
    // 但这是当前架构的限制，需要后续优化
    if (categorizedPaths.length > 0) {
      form.dir = categorizedPaths[0].categorizedDir
      // 在下载前创建分类目录，这样下载完成后就不需要再次创建了
      if (!existsSync(form.dir)) {
        try {
          mkdirSync(form.dir, { recursive: true })
          console.log(`[Motrix] Created category directory: ${form.dir}`)
        } catch (error) {
          console.warn(`[Motrix] Failed to create category directory: ${error.message}`)
        }
      }
    }
  }

  const options = buildOption(ADD_TASK_TYPE.URI, form)
  const result = {
    uris,
    outs: categorizedOuts,
    options
  }
  return result
}

export const buildTorrentPayload = (form) => {
  const { torrent } = form
  if (isEmpty(torrent)) {
    throw new Error('task.new-task-torrent-required')
  }

  const options = buildOption(ADD_TASK_TYPE.TORRENT, form)
  const result = {
    torrent,
    options
  }
  return result
}

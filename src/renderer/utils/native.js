import { access, constants, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { shell, nativeTheme } from '@electron/remote'
import { Message } from 'element-ui'

import {
  getFileNameFromFile,
  isMagnetTask
} from '@shared/utils'
import { APP_THEME, TASK_STATUS } from '@shared/constants'

export const showItemInFolder = (fullPath, { errorMsg }) => {
  if (!fullPath) {
    return
  }

  fullPath = resolve(fullPath)
  access(fullPath, constants.F_OK, (err) => {
    console.warn(`[Motrix] ${fullPath} ${err ? 'does not exist' : 'exists'}`)
    if (err && errorMsg) {
      Message.error(errorMsg)
      return
    }

    shell.showItemInFolder(fullPath)
  })
}

export const openItem = async (fullPath) => {
  if (!fullPath) {
    return
  }

  const result = await shell.openPath(fullPath)
  return result
}

export const getTaskFullPath = (task) => {
  const { dir, files, bittorrent } = task
  let result = resolve(dir)

  // Magnet link task
  if (isMagnetTask(task)) {
    return result
  }

  if (bittorrent && bittorrent.info && bittorrent.info.name) {
    result = resolve(result, bittorrent.info.name)
    return result
  }

  const [file] = files
  const path = file.path ? resolve(file.path) : ''
  let fileName = ''

  if (path) {
    result = path
  } else {
    if (files && files.length === 1) {
      fileName = getFileNameFromFile(file)
      if (fileName) {
        result = resolve(result, fileName)
      }
    }
  }

  return result
}

export const moveTaskFilesToTrash = async (task, downloadingFileSuffix = '') => {
  /**
   * For magnet link tasks, there is bittorrent, but there is no bittorrent.info.
   * The path is not a complete path before it becomes a BT task.
   * In order to avoid accidentally deleting the directory
   * where the task is located, it directly returns true when deleting.
   */
  if (isMagnetTask(task)) {
    return true
  }

  const { dir, status } = task
  const path = getTaskFullPath(task)
  if (!path || dir === path) {
    throw new Error('task.file-path-error')
  }

  // 尝试删除原始路径文件
  if (existsSync(path)) {
    console.log(`[Motrix] ${path} exists, deleting...`)
    await shell.trashItem(path)
  } else if (downloadingFileSuffix) {
    // 如果原始路径文件不存在，尝试删除带有自定义后缀的文件
    const suffixedPath = `${path}${downloadingFileSuffix}`
    if (existsSync(suffixedPath)) {
      console.log(`[Motrix] ${suffixedPath} exists, deleting...`)
      await shell.trashItem(suffixedPath)
    }
  }

  // There is no configuration file for the completed task.
  if (status === TASK_STATUS.COMPLETE) {
    return true
  }

  const extraFilePath = `${path}.aria2`
  // 等待一段时间，确保.aria2文件有足够的时间被创建
  // 这是解决任务刚开始时.aria2文件未创建的问题的关键
  await new Promise(resolve => setTimeout(resolve, 100))

  // 检查.aria2文件是否存在，如果存在则删除
  if (existsSync(extraFilePath)) {
    console.log(`[Motrix] ${extraFilePath} exists, deleting...`)
    await shell.trashItem(extraFilePath)
  } else {
    // 如果.aria2文件不存在，尝试再次检查，因为可能存在延迟
    await new Promise(resolve => setTimeout(resolve, 100))
    if (existsSync(extraFilePath)) {
      console.log(`[Motrix] ${extraFilePath} exists after delay, deleting...`)
      await shell.trashItem(extraFilePath)
    }
  }

  // 总是返回true，因为文件删除失败不应该影响任务删除流程
  // 即使文件删除失败，任务也应该被从列表中移除
  return true
}

export const getSystemTheme = () => {
  return nativeTheme.shouldUseDarkColors ? APP_THEME.DARK : APP_THEME.LIGHT
}

export const delayDeleteTaskFiles = (task, delay, downloadingFileSuffix = '') => {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await moveTaskFilesToTrash(task, downloadingFileSuffix)
        resolve(result)
      } catch (err) {
        reject(err.message)
      }
    }, delay)
  })
}

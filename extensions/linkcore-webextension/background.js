const defaults = {
  host: '127.0.0.1',
  port: 16800,
  secret: '',
  autoHijack: true
}

const getConfig = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get(defaults, (cfg) => resolve(cfg || defaults))
  })
}

const setConfig = (data) => {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => resolve(true))
  })
}

const tryRpc = async (host, port) => {
  try {
    const rpc = `http://${host}:${port}/jsonrpc`
    const body = { jsonrpc: '2.0', id: Date.now(), method: 'aria2.getVersion', params: [''] }
    const res = await fetch(rpc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) return { host, port }
  } catch (e) {}
  return null
}

const probeRpc = async () => {
  const candidates = [
    ['127.0.0.1', 16800],
    ['localhost', 16800],
    ['127.0.0.1', 6800],
    ['localhost', 6800]
  ]
  for (const [h, p] of candidates) {
    const ok = await tryRpc(h, p)
    if (ok) {
      await setConfig({ ...(await getConfig()), host: ok.host, port: ok.port })
      return ok
    }
  }
  return { host: defaults.host, port: defaults.port }
}

let lastConnectedAt = 0
const fetchWithTimeout = (url, options = {}, timeout = 2000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeout)
    fetch(url, options).then((res) => {
      clearTimeout(timer)
      resolve(res)
    }).catch((err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}
const CHANNEL_PORT = 16900
const tryChannel = async (path, options = {}, timeout = 2000) => {
  const hosts = ['127.0.0.1', 'localhost']
  for (const h of hosts) {
    try {
      const resp = await fetchWithTimeout(`http://${h}:${CHANNEL_PORT}${path}`, options, timeout)
      if (resp && resp.ok) return { host: h, resp }
    } catch (e) {}
  }
  return null
}

const addUri = async (url, referer) => {
  try {
    const headers = await getHeadersForUrl(url, referer)
    const ok = await tryChannel('/linkcore/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, referer, headers })
    }, 3000)
    if (!ok) return false
    lastConnectedAt = Date.now()
    const data = await ok.resp.json().catch(() => ({}))
    return !!(data && data.ok)
  } catch (e) {
    return false
  }
}
const getHeadersForUrl = async (url, referer) => {
  const hs = ['X-LinkCore-Source: BrowserExtension']
  try {
    const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : ''
    if (ua) hs.push(`User-Agent: ${ua}`)
  } catch (_) {}
  if (referer) {
    hs.push(`Referer: ${referer}`)
  }
  try {
    const list = await new Promise((resolve) => {
      chrome.cookies.getAll({ url }, (cookies) => resolve(cookies || []))
    })
    if (Array.isArray(list) && list.length > 0) {
      const cookieStr = list.map(c => `${c.name}=${c.value}`).join('; ')
      if (cookieStr) hs.push(`Cookie: ${cookieStr}`)
    }
  } catch (_) {}
  return hs
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'linkcore-download',
    title: '使用 LinkCore 下载',
    contexts: ['link', 'page', 'selection', 'image', 'video', 'audio']
  })
  // 预探测一次，提升首用体验
  probeRpc()
})

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg && msg.type === 'probe') {
    const ok = await probeRpc()
    sendResponse(ok)
    return true
  }
  if (msg && msg.type === 'tasks') {
    try {
      const ok = await tryChannel('/linkcore/tasks', { method: 'GET' }, 3000)
      if (!ok) {
        sendResponse({ connected: false, totalSpeed: 0, tasks: [] })
        return true
      }
      const data = await ok.resp.json().catch(() => ({ totalSpeed: 0, tasks: [] }))
      lastConnectedAt = Date.now()
      sendResponse({ connected: true, totalSpeed: data.totalSpeed || 0, tasks: data.tasks || [] })
    } catch (e) {
      sendResponse({ connected: false, totalSpeed: 0, tasks: [] })
    }
    return true
  }
  if (msg && msg.type === 'connection') {
    try {
      let connected = false
      const ok = await tryChannel('/linkcore/health', { method: 'GET' }, 5000)
      if (ok && ok.resp && ok.resp.ok) {
        lastConnectedAt = Date.now()
        connected = true
      } else {
        const vk = await tryChannel('/linkcore/version', { method: 'GET' }, 5000)
        if (vk && vk.resp && vk.resp.ok) {
          lastConnectedAt = Date.now()
          connected = true
        } else {
          const recent = (Date.now() - lastConnectedAt) < 5000
          connected = recent
        }
      }
      sendResponse({ connected })
    } catch (e) {
      sendResponse({ connected: false })
    }
    return true
  }
  if (msg && msg.type === 'version') {
    // 查询应用版本而非引擎版本
    try {
      const ok = await tryChannel('/linkcore/version', { method: 'GET' }, 2000)
      if (ok && ok.resp && ok.resp.ok) {
        lastConnectedAt = Date.now()
        let data = null
        try {
          data = await ok.resp.json()
        } catch (_) {}
        const version = data && data.version ? data.version : ''
        sendResponse({ connected: true, version })
      } else {
        sendResponse({ connected: false, version: '' })
      }
    } catch (e) {
      sendResponse({ connected: false, version: '' })
    }
    return true
  }
})
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let url = info.linkUrl || info.srcUrl || info.pageUrl
  const referer = tab && tab.url ? tab.url : ''
  if (url) {
    await addUri(url, referer)
  }
})

chrome.downloads.onCreated.addListener(async (item) => {
  const cfg = await getConfig()
  if (!cfg.autoHijack) return
  const url = item && item.url ? item.url : ''
  if (!url || !/^https?:/i.test(url)) return
  try {
    const ok = await addUri(url, item.referrer)
    if (ok) {
      chrome.downloads.cancel(item.id)
    }
  } catch (e) {
  }
})

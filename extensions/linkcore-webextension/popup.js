const defaults = { host: '127.0.0.1', port: 16800, secret: '', autoHijack: true }

const getConfig = () => new Promise((r) => chrome.storage.local.get(defaults, (c) => r(c || defaults)))
const setConfig = (d) => new Promise((r) => chrome.storage.local.set(d, () => r(true)))

document.addEventListener('DOMContentLoaded', async () => {
  const cfg = await getConfig()
  document.getElementById('rpc').textContent = `RPC: http://${cfg.host}:${cfg.port}`
  document.getElementById('autoHijack').checked = !!cfg.autoHijack
  startPolling()
  startVersionPolling()
  chrome.runtime.sendMessage({ type: 'probe' }, async (ok) => {
    const c = await getConfig()
    document.getElementById('rpc').textContent = `RPC: http://${c.host}:${c.port}`
  })
  startConnectionPolling()
})

document.getElementById('autoHijack').addEventListener('change', async (e) => {
  const cfg = await getConfig()
  await setConfig({ ...cfg, autoHijack: !!e.target.checked })
})

let timer = null
let versionTimer = null
let connectionTimer = null
const humanSize = (n) => {
  const u = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = n
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(1)} ${u[i]}`
}
const humanSpeed = (n) => `${humanSize(n)}/s`
const renderTasks = (data) => {
  const gs = document.getElementById('globalSpeed')
  gs.textContent = `总速度：${humanSpeed(Number(data.totalSpeed || 0))}`
  const list = document.getElementById('taskList')
  list.innerHTML = ''
  const tasks = data.tasks || []
  tasks.slice(0, 8).forEach(t => {
    const wrap = document.createElement('div')
    wrap.className = 'task'
    const meta = document.createElement('div')
    meta.className = 'meta'
    const nameEl = document.createElement('div')
    const rightEl = document.createElement('div')
    const name = t.name || t.gid
    const speed = humanSpeed(t.speed || 0)
    const percentText = `${t.percent}%`
    nameEl.textContent = name
    rightEl.textContent = `${percentText}  ${speed}`
    meta.appendChild(nameEl)
    meta.appendChild(rightEl)
    const progress = document.createElement('div')
    progress.className = 'progress'
    const bar = document.createElement('div')
    bar.className = 'progress-bar'
    bar.style.width = `${Math.max(0, Math.min(100, t.percent || 0))}%`
    progress.appendChild(bar)
    wrap.appendChild(meta)
    wrap.appendChild(progress)
    list.appendChild(wrap)
  })
}
const poll = () => {
  chrome.runtime.sendMessage({ type: 'tasks' }, (res) => {
    if (res) renderTasks(res)
  })
}
const startPolling = () => {
  if (timer) clearInterval(timer)
  poll()
  timer = setInterval(poll, 1000)
}

const renderVersion = (res) => {
  const ver = document.getElementById('clientVersion')
  if (!ver) return
  if (res && res.connected && res.version) {
    ver.textContent = `客户端版本：${res.version}`
  } else if (res && res.connected && !res.version) {
    ver.textContent = '客户端版本：-'
  } else {
    ver.textContent = '客户端版本：-'
  }
}
const pollVersion = () => {
  chrome.runtime.sendMessage({ type: 'version' }, (res) => {
    renderVersion(res || null)
  })
}
const startVersionPolling = () => {
  if (versionTimer) clearInterval(versionTimer)
  pollVersion()
  versionTimer = setInterval(pollVersion, 3000)
}

const renderConnection = (res) => {
  const conn = document.getElementById('conn')
  if (!conn) return
  if (res && res.connected) {
    conn.textContent = '状态：已连接'
  } else {
    conn.textContent = '状态：未连接'
  }
}
const pollConnection = () => {
  chrome.runtime.sendMessage({ type: 'connection' }, (res) => {
    renderConnection(res || null)
  })
}
const startConnectionPolling = () => {
  if (connectionTimer) clearInterval(connectionTimer)
  pollConnection()
  connectionTimer = setInterval(pollConnection, 2000)
}

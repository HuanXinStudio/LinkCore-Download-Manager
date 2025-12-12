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

document.addEventListener('DOMContentLoaded', async () => {
  const cfg = await getConfig()
  document.getElementById('host').value = cfg.host
  document.getElementById('port').value = cfg.port
  document.getElementById('secret').value = cfg.secret
  document.getElementById('autoHijack').checked = cfg.autoHijack
  document.getElementById('rpcStatus').textContent = `当前 RPC: http://${cfg.host}:${cfg.port}`
})

document.getElementById('save').addEventListener('click', async () => {
  const host = document.getElementById('host').value || defaults.host
  const port = Number(document.getElementById('port').value || defaults.port)
  const secret = document.getElementById('secret').value || ''
  const autoHijack = document.getElementById('autoHijack').checked
  await setConfig({ host, port, secret, autoHijack })
  const s = document.getElementById('status')
  s.textContent = '已保存'
  setTimeout(() => { s.textContent = '' }, 1200)
  document.getElementById('rpcStatus').textContent = `当前 RPC: http://${host}:${port}`
})

document.getElementById('probe').addEventListener('click', async () => {
  chrome.runtime.sendMessage({ type: 'probe' }, (ok) => {
    if (ok && ok.host && ok.port) {
      setConfig({ ...(defaults), host: ok.host, port: ok.port })
      document.getElementById('host').value = ok.host
      document.getElementById('port').value = ok.port
      document.getElementById('rpcStatus').textContent = `当前 RPC: http://${ok.host}:${ok.port}`
      const s = document.getElementById('status')
      s.textContent = '已探测并应用'
      setTimeout(() => { s.textContent = '' }, 1200)
    } else {
      const s = document.getElementById('status')
      s.textContent = '探测失败，请检查应用是否运行'
      setTimeout(() => { s.textContent = '' }, 2000)
    }
  })
})

const matchHotkey = (event) => {
  if (!event) return false
  if (event.shiftKey) return true
  const key = (event.key || '').toLowerCase()
  return key === 'shift'
}

const sendToggleAutoHijackOverride = () => {
  try {
    chrome.runtime.sendMessage({ type: 'shiftHotkeyTriggered' }, () => {})
  } catch (e) {
  }
}

const buttonLocaleTexts = {
  en: 'Download with LinkCore',
  zh_CN: '使用 LinkCore 下载',
  zh_TW: '使用 LinkCore 下載',
  ja: 'LinkCore でダウンロード',
  ko: 'LinkCore로 다운로드',
  es: 'Descargar con LinkCore',
  fr: 'Télécharger avec LinkCore',
  de: 'Mit LinkCore herunterladen',
  ru: 'Скачать с LinkCore'
}

const normalizeButtonLocale = (locale) => {
  const s = `${locale || ''}`.toLowerCase()
  if (!s) return ''
  if (s.startsWith('zh-cn') || s.startsWith('zh_cn')) return 'zh_CN'
  if (s.startsWith('zh-tw') || s.startsWith('zh_tw')) return 'zh_TW'
  if (s.startsWith('ja')) return 'ja'
  if (s.startsWith('ko')) return 'ko'
  if (s.startsWith('es')) return 'es'
  if (s.startsWith('fr')) return 'fr'
  if (s.startsWith('de')) return 'de'
  if (s.startsWith('ru')) return 'ru'
  if (s.startsWith('en')) return 'en'
  return ''
}

const applyClientLocaleToButton = (btn) => {
  try {
    if (!chrome || !chrome.storage || !chrome.storage.local) return
    chrome.storage.local.get(['browserLocale'], (result) => {
      const raw = result && result.browserLocale ? result.browserLocale : ''
      const direct = buttonLocaleTexts[raw]
      const key = direct ? raw : normalizeButtonLocale(raw)
      const text = buttonLocaleTexts[key]
      if (text) {
        btn.textContent = text
        btn.title = text
      }
    })
  } catch (e) {
  }
}

if (typeof window !== 'undefined' && window.addEventListener) {
  window.addEventListener('keydown', (event) => {
    if (matchHotkey(event)) {
      sendToggleAutoHijackOverride()
    }
  }, true)

  window.addEventListener('click', (event) => {
    if (matchHotkey(event)) {
      sendToggleAutoHijackOverride()
    }
  }, true)

  const isTopWindow = () => {
    try {
      return window.top === window
    } catch (e) {
      return true
    }
  }

  const isBilibiliVideoPage = (url) => {
    const s = (url || window.location.href || '').trim()
    if (!s) return false
    try {
      const u = new URL(s)
      const host = (u.hostname || '').toLowerCase()
      const path = (u.pathname || '').toLowerCase()
      if (!host) return false
      const isBilibiliHost = host === 'bilibili.com' ||
        host === 'www.bilibili.com' ||
        host.endsWith('.bilibili.com')
      const isShort = host === 'b23.tv' || host === 'www.b23.tv'
      if (isShort) return true
      if (!isBilibiliHost) return false
      if (path.startsWith('/video/')) return true
      if (path.startsWith('/bangumi/')) return true
      if (path.startsWith('/cheese/')) return true
      return false
    } catch (e) {
      return false
    }
  }

  const sendBilibiliPageToClient = () => {
    try {
      const url = window.location.href || ''
      if (!url || !/^https?:/i.test(url)) return
      const referer = url
      chrome.runtime.sendMessage({ type: 'addUriFromContent', url, referer }, () => {})
    } catch (e) {
    }
  }

  const ensureBilibiliButton = () => {
    if (!isTopWindow()) return
    if (!isBilibiliVideoPage()) return
    if (!document) return
    if (document.getElementById('linkcore-bilibili-download-btn')) return
    const selectors = [
      '.bpx-player-container',
      '.bpx-player-video-area',
      '.bilibili-player-video-wrap',
      '#bilibili-player',
      '.player-container',
      '.player-wrap'
    ]
    let container = null
    for (const sel of selectors) {
      const el = document.querySelector(sel)
      if (el) {
        container = el
        break
      }
    }
    if (!container) return
    const computedPosition = window.getComputedStyle(container).position
    if (!computedPosition || computedPosition === 'static') {
      container.style.position = 'relative'
    }
    const wrapper = document.createElement('div')
    wrapper.id = 'linkcore-bilibili-download-btn-wrapper'
    const wStyle = wrapper.style
    wStyle.position = 'absolute'
    wStyle.top = '0'
    wStyle.right = '0px'
    wStyle.transform = 'translateY(-110%)'
    wStyle.zIndex = '9999'
    wStyle.pointerEvents = 'auto'
    const btn = document.createElement('button')
    btn.id = 'linkcore-bilibili-download-btn'
    let label = 'Download with LinkCore'
    try {
      if (chrome && chrome.i18n && chrome.i18n.getMessage) {
        const msg = chrome.i18n.getMessage('contextMenuDownload')
        if (msg) label = msg
      }
    } catch (e) {
    }
    btn.textContent = label
    btn.title = label
    applyClientLocaleToButton(btn)
    const style = btn.style
    style.position = 'relative'
    style.padding = '6px 12px'
    style.background = '#00a1d6'
    style.color = '#ffffff'
    style.border = 'none'
    style.borderRadius = '4px'
    style.cursor = 'pointer'
    style.fontSize = '12px'
    style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)'
    style.opacity = '0.9'
    style.transition = 'opacity 0.2s ease'
    style.pointerEvents = 'auto'
    btn.addEventListener('mouseenter', () => {
      btn.style.opacity = '1'
    })
    btn.addEventListener('mouseleave', () => {
      btn.style.opacity = '0.9'
    })
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      sendBilibiliPageToClient()
    })
    wrapper.appendChild(btn)
    container.appendChild(wrapper)
  }

  const scheduleBilibiliButton = () => {
    if (!isTopWindow()) return
    const tryInit = () => {
      if (!isBilibiliVideoPage()) return
      ensureBilibiliButton()
    }
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      setTimeout(tryInit, 0)
    } else {
      window.addEventListener('DOMContentLoaded', () => {
        tryInit()
      })
    }
    setInterval(() => {
      tryInit()
    }, 3000)
  }

  scheduleBilibiliButton()
}

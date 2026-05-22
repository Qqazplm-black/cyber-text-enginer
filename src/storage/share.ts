import type { ShareBundle } from './types'

export function encodeShareBundle(bundle: ShareBundle): string {
  const json = JSON.stringify(bundle)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((b) => {
    binary += String.fromCharCode(b)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeShareBundle(encoded: string): ShareBundle {
  try {
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const binary = atob(padded)
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
    const json = new TextDecoder().decode(bytes)
    const bundle = JSON.parse(json) as ShareBundle
    if (bundle.v !== 1 || !bundle.game) {
      throw new Error('无效的分享数据')
    }
    return bundle
  } catch {
    throw new Error('分享链接无效或已损坏')
  }
}

export function buildShareUrl(bundle: ShareBundle): string {
  const encoded = encodeShareBundle(bundle)
  const base = `${window.location.origin}${window.location.pathname}`
  return `${base}#/play/${encoded}`
}

/** 从完整 URL、hash 或纯编码片段解析为路由 hash */
export function normalizeShareInput(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const hashIdx = trimmed.indexOf('#')
  if (hashIdx >= 0) {
    const hash = trimmed.slice(hashIdx)
    return parseShareFromHash(hash) ? hash : null
  }

  if (trimmed.startsWith('/play/')) {
    const hash = `#${trimmed}`
    return parseShareFromHash(hash) ? hash : null
  }

  const hash = `#/play/${trimmed}`
  return parseShareFromHash(hash) ? hash : null
}

export function parseShareFromHash(hash: string): ShareBundle | null {
  const match = hash.match(/^#\/play\/(.+)$/)
  if (!match) return null
  try {
    return decodeShareBundle(match[1])
  } catch {
    return null
  }
}

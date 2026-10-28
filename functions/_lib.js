// Shared helpers for the SnowClient partners API (Cloudflare Pages Functions + KV).
// KV binding name: PARTNERS      Secret env var: ADMIN_PASSWORD

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
  'Access-Control-Max-Age': '86400',
}

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...extra },
  })
}

export function preflight() {
  return new Response(null, { status: 204, headers: CORS })
}

export async function loadServers(env) {
  const raw = await env.PARTNERS.get('servers')
  if (!raw) return []
  try {
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export async function saveServers(env, servers) {
  await env.PARTNERS.put('servers', JSON.stringify(servers))
}

// Constant-time-ish string comparison
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const len = Math.max(a.length, b.length)
  let diff = a.length ^ b.length
  for (let i = 0; i < len; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  return diff === 0
}

/** Returns a Response when NOT authorised, otherwise null. */
export function requireAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) {
    return json({ error: 'ADMIN_PASSWORD is not configured on the server.' }, 500)
  }
  const given = request.headers.get('X-Admin-Password') || ''
  if (!safeEqual(given, env.ADMIN_PASSWORD)) {
    return json({ error: 'Wrong password.' }, 401)
  }
  return null
}

// host, host:port, IPv4, or hostname (no scheme, no path)
const ADDRESS_RE = /^(?=.{3,100}$)([a-z0-9]([a-z0-9-]*[a-z0-9])?)(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*(:\d{1,5})?$/i

export function cleanAddress(value) {
  const ip = String(value || '').trim().toLowerCase()
  if (!ADDRESS_RE.test(ip)) return null
  const port = ip.includes(':') ? Number(ip.split(':')[1]) : 25565
  if (port < 1 || port > 65535) return null
  return ip
}

export function cleanDescription(value) {
  // one line only, max 90 characters
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text || text.length > 90) return null
  return text
}

export function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function readImage(file) {
  if (!file || typeof file === 'string' || !file.size) return { image: null }
  if (!IMAGE_TYPES.includes(file.type)) return { error: 'Image must be JPG, PNG or WebP.' }
  if (file.size > MAX_IMAGE_BYTES) return { error: 'Image is too large (max 2 MB).' }
  return { image: { buffer: await file.arrayBuffer(), type: file.type } }
}

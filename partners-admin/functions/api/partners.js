// PUBLIC endpoint read by the SnowClient launcher.
// GET /api/partners -> { servers: [{ id, ip, description, image, status }] }
import { json, loadServers, preflight } from '../_lib.js'

async function liveStatus(ip) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 4000)
    const res = await fetch(`https://api.mcsrvstat.us/3/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'SnowClient-Partners/1.0 (https://snowclientmc.pages.dev)' },
      // Cloudflare edge cache: one status lookup per server per minute, no matter how many players ask
      cf: { cacheTtl: 60, cacheEverything: true },
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`status ${res.status}`)
    const data = await res.json()
    return {
      online: Boolean(data.online),
      players_online: data.players?.online ?? 0,
      players_max: data.players?.max ?? null,
    }
  } catch {
    return null // unknown
  }
}

export async function onRequestGet({ request, env }) {
  const origin = new URL(request.url).origin
  const servers = await loadServers(env)
  const out = await Promise.all(
    servers.map(async (s) => ({
      id: s.id,
      ip: s.ip,
      description: s.description,
      image: s.hasImage ? `${origin}/api/image/${s.id}?v=${s.updated || 0}` : null,
      status: await liveStatus(s.ip),
    })),
  )
  return json({ servers: out }, 200, { 'Cache-Control': 'public, max-age=30' })
}

export function onRequestOptions() {
  return preflight()
}


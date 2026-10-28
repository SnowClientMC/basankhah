// ADMIN endpoint (password protected) used by the management page.
//   GET    /api/admin/partners            -> list (also verifies the password)
//   POST   /api/admin/partners            -> add     (multipart: ip, description, image)
//   PUT    /api/admin/partners?id=<id>    -> edit    (multipart: ip?, description?, image?)
//   DELETE /api/admin/partners?id=<id>    -> remove
import {
  cleanAddress,
  cleanDescription,
  json,
  loadServers,
  newId,
  preflight,
  readImage,
  requireAdmin,
  saveServers,
} from '../../_lib.js'

const MAX_SERVERS = 30

export async function onRequestGet({ request, env }) {
  const denied = requireAdmin(request, env)
  if (denied) return denied
  const origin = new URL(request.url).origin
  const servers = (await loadServers(env)).map((s) => ({
    id: s.id,
    ip: s.ip,
    description: s.description,
    image: s.hasImage ? `${origin}/api/image/${s.id}?v=${s.updated || 0}` : null,
  }))
  return json({ servers })
}

export async function onRequestPost({ request, env }) {
  const denied = requireAdmin(request, env)
  if (denied) return denied

  const form = await request.formData()
  const ip = cleanAddress(form.get('ip'))
  const description = cleanDescription(form.get('description'))
  if (!ip) return json({ error: 'Enter a valid server IP (like play.example.com or 1.2.3.4:25565).' }, 400)
  if (!description) return json({ error: 'Description is required (one line, max 90 characters).' }, 400)

  const { image, error } = await readImage(form.get('image'))
  if (error) return json({ error }, 400)
  if (!image) return json({ error: 'Please choose a landscape image.' }, 400)

  const servers = await loadServers(env)
  if (servers.length >= MAX_SERVERS) return json({ error: `Limit of ${MAX_SERVERS} servers reached.` }, 400)
  if (servers.some((s) => s.ip === ip)) return json({ error: 'That server is already in the list.' }, 409)

  const id = newId()
  await env.PARTNERS.put(`img:${id}`, image.buffer, { metadata: { type: image.type } })
  servers.push({ id, ip, description, hasImage: true, updated: Date.now() })
  await saveServers(env, servers)
  return json({ ok: true, id }, 201)
}

export async function onRequestPut({ request, env }) {
  const denied = requireAdmin(request, env)
  if (denied) return denied

  const id = new URL(request.url).searchParams.get('id')
  const servers = await loadServers(env)
  const server = servers.find((s) => s.id === id)
  if (!server) return json({ error: 'Server not found.' }, 404)

  const form = await request.formData()
  if (form.has('ip')) {
    const ip = cleanAddress(form.get('ip'))
    if (!ip) return json({ error: 'Enter a valid server IP.' }, 400)
    if (servers.some((s) => s.ip === ip && s.id !== id)) return json({ error: 'That IP is already in the list.' }, 409)
    server.ip = ip
  }
  if (form.has('description')) {
    const description = cleanDescription(form.get('description'))
    if (!description) return json({ error: 'Description must be one line, max 90 characters.' }, 400)
    server.description = description
  }
  const { image, error } = await readImage(form.get('image'))
  if (error) return json({ error }, 400)
  if (image) {
    await env.PARTNERS.put(`img:${id}`, image.buffer, { metadata: { type: image.type } })
    server.hasImage = true
  }
  server.updated = Date.now()
  await saveServers(env, servers)
  return json({ ok: true })
}

export async function onRequestDelete({ request, env }) {
  const denied = requireAdmin(request, env)
  if (denied) return denied

  const id = new URL(request.url).searchParams.get('id')
  const servers = await loadServers(env)
  if (!servers.some((s) => s.id === id)) return json({ error: 'Server not found.' }, 404)
  await env.PARTNERS.delete(`img:${id}`)
  await saveServers(env, servers.filter((s) => s.id !== id))
  return json({ ok: true })
}

export function onRequestOptions() {
  return preflight()
}

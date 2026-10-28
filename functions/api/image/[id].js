// Serves a partner server's landscape image from KV.
import { CORS } from '../../_lib.js'

export async function onRequestGet({ params, env }) {
  const id = String(params.id || '')
  if (!/^[a-f0-9]{16}$/.test(id)) return new Response('Not found', { status: 404, headers: CORS })
  const { value, metadata } = await env.PARTNERS.getWithMetadata(`img:${id}`, 'arrayBuffer')
  if (!value) return new Response('Not found', { status: 404, headers: CORS })
  return new Response(value, {
    headers: {
      'Content-Type': metadata?.type || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400, immutable',
      ...CORS,
    },
  })
}

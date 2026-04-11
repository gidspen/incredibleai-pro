export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let email;
  try {
    const body = await req.json();
    email = body.email?.trim().toLowerCase();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response('Invalid email', { status: 400 });
  }

  const apiKey = process.env.KIT_API_SECRET;
  const tagId  = '18871785'; // Deal Hunter Early Access

  if (!apiKey) {
    console.error('KIT_API_SECRET not set');
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Subscribe to tag — creates subscriber if new, tags if existing
  const res = await fetch(`https://api.convertkit.com/v3/tags/${tagId}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_secret: apiKey, email }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('Kit tag subscribe failed:', txt);
    return new Response('Upstream error', { status: 502 });
  }

  const data = await res.json();
  return new Response(JSON.stringify({ ok: true, id: data.subscription?.subscriber?.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

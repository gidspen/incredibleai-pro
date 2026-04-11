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
  const tagId  = process.env.KIT_DEAL_HUNTER_TAG_ID;

  if (!apiKey || !tagId) {
    // Env vars not yet configured — log and succeed silently so the UI works
    console.error('KIT_API_SECRET or KIT_DEAL_HUNTER_TAG_ID not set');
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create or update subscriber
  const subRes = await fetch('https://api.convertkit.com/v3/subscribers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_secret: apiKey, email_address: email }),
  });

  if (!subRes.ok) {
    const txt = await subRes.text();
    console.error('Kit subscriber create failed:', txt);
    return new Response('Upstream error', { status: 502 });
  }

  const { subscriber } = await subRes.json();

  // Add "Deal Hunter Early Access" tag
  await fetch(`https://api.convertkit.com/v3/tags/${tagId}/subscribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_secret: apiKey, email: email }),
  });

  return new Response(JSON.stringify({ ok: true, id: subscriber?.id }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

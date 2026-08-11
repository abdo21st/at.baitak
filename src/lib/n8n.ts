export async function triggerN8nWebhook(event: string, payload: Record<string, any>, webhookUrl?: string) {
  const targetUrl = webhookUrl || 'https://n8n.ordermt.ly/webhook/attendance-alert';

  try {
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        ...payload
      })
    });
    return res.ok;
  } catch (err) {
    console.warn('n8n webhook dispatch warning:', err);
    return false;
  }
}

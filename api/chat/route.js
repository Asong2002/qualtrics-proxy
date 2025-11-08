// api/volcano-proxy.js
export const runtime = 'edge';

export async function POST() {
  try {
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/bots/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ec95726d-d7f2-4e8c-92ba-88927fcd8cca' // 硬编码新密钥
      },
      body: JSON.stringify({
        model: 'bot-20251031115408-jz6th',
        stream: true,
        messages: [{ role: 'user', content: '简化测试' }]
      })
    });

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Access-Control-Allow-Origin': 'qualtrics-proxy-brie.vercel.app' // 替换为实际前端域名
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

export function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': 'qualtrics-proxy-brie.vercel.app',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
  });
}

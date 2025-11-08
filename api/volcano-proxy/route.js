export const runtime = 'edge';

// 接收前端传递的请求体
export async function POST(request) {
  try {
    // 1. 获取前端发送的请求数据（包含用户消息和历史）
    const requestData = await request.json();
    
    // 2. 从环境变量获取密钥（避免硬编码，之前建议的安全改进）
    const apiKey = process.env.VOLCANO_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
    }

    // 3. 使用前端传递的参数调用火山引擎API，而不是硬编码内容
    const response = await fetch('https://ark.cn-beijing.volces.com/api/v3/bots/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}` // 使用环境变量
      },
      body: JSON.stringify(requestData) // 直接传递前端的请求数据
    });

    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        // 修复跨域：允许前端域名，开发环境可临时用*
        'Access-Control-Allow-Origin': process.env.FRONTEND_DOMAIN || 'https://qualtrics-proxy-brie.vercel.app',
        'Access-Control-Allow-Credentials': 'true'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

// 修复OPTIONS跨域配置
export function OPTIONS() {
  const allowedOrigin = process.env.FRONTEND_DOMAIN || 'https://qualtrics-proxy-brie.vercel.app';
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type', // 允许前端传递Content-Type
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}

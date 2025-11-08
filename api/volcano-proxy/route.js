export const runtime = 'edge';

export async function POST(request) {
  try {
    // 1. 获取前端请求
    const requestData = await request.json();
    
    // 2. 获取密钥
    const apiKey = process.env.VOLCANO_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key not configured on Vercel' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. 调用火山引擎 API
    const volcanoResponse = await fetch('https://ark.cn-beijing.volces.com/api/v3/bots/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestData)
    });

    // --- [ 关键修复 ] ---
    // 4. 检查火山引擎的响应是否成功
    if (!volcanoResponse.ok) {
      // 如果火山引擎返回错误 (e.g., 401, 400, 500)
      // 我们读取该错误，并将其作为服务器 502 错误返回给前端
      const errorBody = await volcanoResponse.json().catch(() => ({ error: "Failed to parse Volcano error response" }));
      
      console.error('Volcano API Error:', errorBody); // 在 Vercel 后台记录错误
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to call Volcano API', 
          status: volcanoResponse.status, 
          details: errorBody 
        }), 
        { 
          status: 502, // 502 Bad Gateway 表明上游服务器（火山）出错了
          headers: { 'Content-Type': 'application/json' } 
        }
      );
    }
    // --- [ 修复结束 ] ---

    // 5. 如果一切正常，将流式响应转发给前端
    // (注意：因为是同源，CORS 头不是必需的，但保留也无害)
    const allowedOrigin = process.env.FRONTEND_DOMAIN || 'https://qualtrics-proxy-brie1.vercel.app';
    
    return new Response(volcanoResponse.body, {
      status: 200, // 明确设置 200 OK
      headers: {
        'Content-Type': 'text/event-stream',
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (e) {
    console.error('Vercel function error:', e);
    return new Response(
      JSON.stringify({ error: e.message }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// OPTIONS 函数对于同源请求不是必需的，但保留它以防万一
export function OPTIONS() {
  const allowedOrigin = process.env.FRONTEND_DOMAIN || 'https://qualtrics-proxy-brie1.vercel.app';
  return new Response(null, {
    status: 204, // No Content
    headers: {
      'Access-Control-Allow-Origin': allowedOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}

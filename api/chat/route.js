// 火山方舟API代理服务（全域名开放精简版）
const VOLCANO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/bots/chat/completions';

export const runtime = 'edge';

// 统一的CORS头
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export async function POST(request) {
  try {
    const frontendRequestBody = await request.json();
    
    // 参数验证
    if (!frontendRequestBody.messages || !Array.isArray(frontendRequestBody.messages)) {
      return new Response(JSON.stringify({ error: 'Missing "messages" parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const apiKey = process.env.VOLCANO_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API Key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 调用火山API
    const volcanoResponse = await fetch(VOLCANO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        model: frontendRequestBody.model || 'bot-20251031115408-jz6th',
        stream: frontendRequestBody.stream ?? true,
        stream_options: frontendRequestBody.stream_options || { include_usage: true },
        messages: frontendRequestBody.messages,
      }),
    });

    if (!volcanoResponse.ok) {
      const errorText = await volcanoResponse.text();
      return new Response(JSON.stringify({
        error: 'API request failed',
        status: volcanoResponse.status,
        details: errorText
      }), {
        status: volcanoResponse.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // 透传流式响应
    return new Response(volcanoResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Server error',
      details: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

export async function GET() {
  return new Response(JSON.stringify({
    status: 'running',
    message: 'Volcano API Proxy - CORS enabled for all domains',
    timestamp: new Date().toISOString()
  }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
}

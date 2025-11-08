// 火山方舟API代理服务（修复版）
// 部署路径：建议放在项目的 api/volcano-proxy.js 下

// 1. 配置基础参数（请根据实际情况修改）
const VOLCANO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/bots/chat/completions';
// 允许的前端域名列表（替换为你的实际前端域名，多个用逗号分隔）
const ALLOWED_ORIGINS = ['https://your-frontend.com', 'https://admin.your-frontend.com'];
// Edge Runtime配置（确保流式响应兼容性）
export const runtime = 'edge';

// 2. 工具函数：处理CORS跨域域名验证
const getAllowOrigin = (request) => {
  const origin = request.headers.get('origin') || '';
  // 允许列表内的域名直接通过，否则返回空（禁止跨域）
  return ALLOWED_ORIGINS.includes(origin) ? origin : '';
};

// 3. 处理POST请求（核心逻辑）
export async function POST(request) {
  try {
    // 3.1 跨域验证
    const allowOrigin = getAllowOrigin(request);
    if (!allowOrigin) {
      console.warn('CORS rejected: Unauthorized origin', request.headers.get('origin'));
      return new Response(JSON.stringify({ error: 'Unauthorized origin' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 3.2 解析前端请求参数
    const frontendRequestBody = await request.json();
    // 验证必要参数（至少需要messages）
    if (!frontendRequestBody.messages || !Array.isArray(frontendRequestBody.messages)) {
      return new Response(JSON.stringify({ error: 'Missing or invalid "messages" parameter' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowOrigin,
          'Access-Control-Allow-Credentials': 'true'
        }
      });
    }

    // 3.3 构造转发给火山API的参数
    const requestBody = {
      model: frontendRequestBody.model || 'bot-20251031115408-jz6th', // 默认模型
      stream: frontendRequestBody.stream ?? true, // 默认为流式响应
      stream_options: frontendRequestBody.stream_options || { include_usage: true },
      ...frontendRequestBody // 合并前端其他参数
    };

    // 3.4 调用火山方舟API（核心步骤）
    const volcanoResponse = await fetch(VOLCANO_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 使用Vercel环境变量（必须在Vercel后台配置VOLCANO_API_KEY）
        'Authorization': `Bearer ${process.env.VOLCANO_API_KEY}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(requestBody),
      // 设置超时（避免Vercel Edge 30秒强制中断）
      signal: AbortSignal.timeout(25000)
    });

    // 3.5 处理火山API错误响应
    if (!volcanoResponse.ok) {
      const errorText = await volcanoResponse.text().catch(() => 'Unknown error');
      console.error(`Volcano API error [${volcanoResponse.status}]:`, errorText);
      return new Response(JSON.stringify({
        error: 'Volcano API request failed',
        status: volcanoResponse.status,
        details: errorText
      }), {
        status: volcanoResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowOrigin,
          'Access-Control-Allow-Credentials': 'true'
        }
      });
    }

    // 3.6 透传流式响应（关键优化：确保SSE正确传递）
    return new Response(volcanoResponse.body, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': allowOrigin,
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // 禁用代理缓冲，确保实时推送
        'X-Content-Type-Options': 'nosniff'
      }
    });

  } catch (error) {
    // 3.7 捕获服务器端错误
    console.error('Proxy server error:', error.stack || error.message);
    const allowOrigin = getAllowOrigin(request);
    return new Response(JSON.stringify({
      error: 'Proxy server internal error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Please try again later'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowOrigin || '*', // 错误时放宽限制
        'Access-Control-Allow-Credentials': 'true'
      }
    });
  }
}

// 4. 处理OPTIONS预检请求（CORS必备）
export async function OPTIONS(request) {
  const allowOrigin = getAllowOrigin(request);
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS', // 只允许必要方法
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400' // 预检结果缓存24小时
    }
  });
}

// 5. 处理GET请求（健康检查）
export async function GET(request) {
  const allowOrigin = getAllowOrigin(request) || '*'; // 健康检查允许所有域
  return new Response(JSON.stringify({
    status: 'running',
    service: 'volcano-api-proxy',
    timestamp: new Date().toISOString(),
    runtime: 'edge',
    docs: 'POST /api/volcano-proxy to use'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Credentials': 'true'
    }
  });
}

const VOLCANO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/bots/chat/completions';

// 允许所有域名访问
const ALLOWED_ORIGIN = '*';

// 指定运行时为edge
export const runtime = 'edge';

// 处理POST请求
export async function POST(request) {
    try {
        // 动态获取请求来源，用于日志记录
        const origin = request.headers.get('origin') || 'unknown';
        console.log(`Request from origin: ${origin}`);

        // 解析请求体
        const frontendRequestBody = await request.json();
        
        // 确保必要的参数存在
        const requestBody = {
            // 确保model参数存在，设置默认值
            model: frontendRequestBody.model || 'bot-20251031115408-jz6th',
            // 确保stream参数设置为true
            stream: frontendRequestBody.stream !== undefined ? frontendRequestBody.stream : true,
            // 确保stream_options参数存在
            stream_options: frontendRequestBody.stream_options || { include_usage: true },
            // 保留其他参数，特别是messages
            ...frontendRequestBody
        };
        
        console.log('Forwarding request to Volcano API:', {
            model: requestBody.model,
            stream: requestBody.stream,
            stream_options: requestBody.stream_options,
            messageCount: requestBody.messages?.length,
            origin: origin
        });

        // 调用火山方舟 API
        const volcanoResponse = await fetch(VOLCANO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.VOLCANO_API_KEY || process.env.ARK_API_KEY || 'ec95726d-d7f2-4e8c-92ba-88927fcd8cca'}`,
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify(requestBody),
        });

        if (!volcanoResponse.ok) {
            const errorText = await volcanoResponse.text();
            console.error('Volcano API error:', volcanoResponse.status, errorText);
            
            return new Response(JSON.stringify({
                error: 'Volcano API error',
                status: volcanoResponse.status,
                details: errorText
            }), {
                status: volcanoResponse.status,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                    'Access-Control-Allow-Credentials': 'true',
                },
            });
        }

        // 成功响应 - 透传流式响应
        return new Response(volcanoResponse.body, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Expose-Headers': 'Content-Type, Content-Length, X-Requested-With',
                'Access-Control-Allow-Credentials': 'true',
                'X-Content-Type-Options': 'nosniff',
            },
        });

    } catch (error) {
        console.error('Proxy server error:', error);
        return new Response(JSON.stringify({
            error: 'Proxy server error',
            details: error.message
        }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
                'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Allow-Credentials': 'true',
            },
        });
    }
}

// 处理OPTIONS请求（用于CORS预检）
export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
            'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400', // 缓存预检请求 24 小时
        },
    });
}

// 处理GET请求（用于健康检查）
export async function GET() {
    return new Response(JSON.stringify({
        success: true,
        message: 'Volcano API Proxy is running',
        timestamp: new Date().toISOString(),
        mode: 'edge',
        version: '1.0.0'
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
            'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
            'Access-Control-Allow-Credentials': 'true',
        },
    });
}

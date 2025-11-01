export const runtime = 'edge';

const VOLCANO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/bots/chat/completions';

// 允许所有域名访问
const ALLOWED_ORIGIN = '*';

export async function POST(request) {
    try {
        // 动态获取请求来源，用于日志记录
        const origin = request.headers.get('origin') || 'unknown';
        console.log(`Request from origin: ${origin}`);

        const frontendRequestBody = await request.json();
        
        console.log('Forwarding request to Volcano API:', {
            model: frontendRequestBody.model,
            messageCount: frontendRequestBody.messages?.length,
            origin: origin
        });

        // 调用火山方舟 API
        const volcanoResponse = await fetch(VOLCANO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.VOLCANO_API_KEY || process.env.ARK_API_KEY}`,
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify(frontendRequestBody),
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

export async function OPTIONS() {
    return new Response(null, {
        status: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true',
            'Access-Control-Max-Age': '86400', // 缓存预检请求 24 小时
        },
    });
}

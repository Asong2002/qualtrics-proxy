// 文件路径: api/chat.js
export const config = {
    runtime: 'edge',
};

const VOLCANO_API_URL = 'https://ark.cn-beijing.volces.com/api/v3/bots/chat/completions';

export default async function handler(request) {

    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                // ‼️ 换成你的 Qualtrics 域名
                'Access-Control-Allow-Origin': 'https://your-university.qualtrics.com', 
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
            },
        });
    }

    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405, headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const frontendRequestBody = await request.json();

        const volcanoResponse = await fetch(VOLCANO_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.VOLCANO_API_KEY}`, // 从 Vercel 读取密钥
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify(frontendRequestBody),
        });

        if (!volcanoResponse.ok) {
            const errorData = await volcanoResponse.json();
            return new Response(JSON.stringify(errorData), {
                status: volcanoResponse.status,
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': 'https://lse.eu.qualtrics.com', // ‼️ 换成你的域名
                },
            });
        }

        return new Response(volcanoResponse.body, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': 'https://lse.eu.qualtrics.com', // ‼️ 换成你的域名
                'Content-Type': 'text/event-stream; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: 'Proxy server error', details: error.message }), {
            status: 500,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': 'https://lse.eu.qualtrics.com', // ‼️ 换成你的域名
            },
        });
    }
}

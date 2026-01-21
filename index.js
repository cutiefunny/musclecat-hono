import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// CORS 설정
app.use('/*', cors())

app.get('/', (c) => {
  return c.redirect('https://musclecat-studio.com')
})

app.all('/api/*', async (c) => {
  // Cafe24 호스팅 주소 (끝에 / 없음)
  const FASTAPI_HOST = "http://musclecat3.cafe24.com:8001"; 
  
  const url = new URL(c.req.url);
  // /api를 제거하고 FastAPI 경로로 변환
  const newPath = url.pathname.replace(/^\/api/, '');
  const targetUrl = `${FASTAPI_HOST}${newPath}${url.search}`;

  console.log(`📡 [Proxy Log] ${url.pathname} --> ${targetUrl}`);

  try {
    // 1. 클라이언트의 헤더를 가져옵니다.
    const headers = new Headers(c.req.header());

    // 2. [핵심] Cafe24 서버를 속이기 위한 '스텔스' 헤더 설정
    // (1) 호스트 설정 (필수)
    headers.set('Host', new URL(FASTAPI_HOST).host);
    
    // (2) 출처 위장 (Hotlink 차단 우회)
    headers.set('Origin', FASTAPI_HOST);
    headers.set('Referer', `${FASTAPI_HOST}/`);

    // (3) 브라우저 위장 (Bot 차단 우회)
    // Cloudflare Workers라는 User-Agent 대신 일반 크롬 브라우저인 척 합니다.
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // (4) 불필요한 Cloudflare 헤더 제거 (선택사항: 서버 혼란 방지)
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ipcountry');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');

    const fetchOptions = {
      method: c.req.method,
      headers: headers,
      redirect: 'manual' 
    };

    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      fetchOptions.body = c.req.raw;
    }

    const response = await fetch(targetUrl, fetchOptions);

    // 3. 응답 처리
    // 리다이렉트가 오면 주소를 Hono 주소로 바꿔줍니다.
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('Location');
      if (location) {
        const newLocation = location.replace(FASTAPI_HOST, '/api');
        const newResp = new Response(response.body, response);
        newResp.headers.set('Location', newLocation);
        return newResp;
      }
    }

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });

  } catch (error) {
    console.error("❌ Proxy Error:", error);
    return c.json({ error: "Backend Connection Error", details: error.message }, 502);
  }
});

// 5. [신규] Swagger UI 문제 해결 (openapi.json 프록시)
// 브라우저가 /openapi.json을 루트에서 찾을 때 FastAPI로 연결해줍니다.
app.get('/openapi.json', async (c) => {
  const FASTAPI_URL = "http://musclecat3.cafe24.com:8001"; // 위와 동일한 IP
  const targetUrl = `${FASTAPI_URL}/openapi.json`;
  
  console.log(`📡 [Swagger Log] openapi.json 요청 --> ${targetUrl}`);

  try {
    const response = await fetch(targetUrl);
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (e) {
    return c.json({ error: "OpenAPI Fetch Error" }, 500);
  }
});

app.notFound((c) => c.json({ error: 'Not Found' }, 404))

export default {
  fetch: (request, env, ctx) => {
    return app.fetch(request, env, ctx);
  },

  // Cron 스케줄러
  async scheduled(event, env, ctx) {
    console.log("⏰ [Cron Triggered] 크론 작업이 시작되었습니다!");
    // 여기에 주기적으로 실행할 작업을 추가하세요.
  }
}
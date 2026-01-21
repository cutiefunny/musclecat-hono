import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// CORS 설정
app.use('/*', cors())

app.get('/', (c) => {
  return c.redirect('https://musclecat-studio.com')
})

app.all('/api/*', async (c) => {
  // ⚠️ 실제 리눅스 서버 IP로 꼭 변경해주세요!
  const FASTAPI_URL = "http://210.114.17.65:8001"; 
  
  const url = new URL(c.req.url);
  
  // "/api" 제거 로직
  const newPath = url.pathname.replace(/^\/api/, '');
  
  // 최종 타겟 URL 생성
  const targetUrl = `${FASTAPI_URL}${newPath}${url.search}`;

  // 👉 [요청하신 기능] 실제 요청 주소를 콘솔에 출력
  console.log(`📡 [Proxy Log] 유저 요청: ${url.pathname} --> FastAPI 전달: ${targetUrl}`);

  try {
    const fetchOptions = {
      method: c.req.method,
      headers: c.req.header(),
    };

    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      fetchOptions.body = c.req.raw;
    }

    const response = await fetch(targetUrl, fetchOptions);

    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
  } catch (error) {
    console.error("❌ FastAPI Proxy Error:", error);
    return c.json({ error: "Backend Server Error", details: error.message }, 502);
  }
});

// 5. [신규] Swagger UI 문제 해결 (openapi.json 프록시)
// 브라우저가 /openapi.json을 루트에서 찾을 때 FastAPI로 연결해줍니다.
app.get('/openapi.json', async (c) => {
  const FASTAPI_URL = "http://210.114.17.65:8001"; // 위와 동일한 IP
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
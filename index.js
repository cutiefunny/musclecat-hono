import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// CORS 설정
app.use('/*', cors())

app.get('/', (c) => {
  return c.redirect('https://musclecat-studio.com')
})

app.all('/api/*', async (c) => {
  // 1. 내 FastAPI 서버 주소 (http여도 상관없음)
  const FASTAPI_URL = "http://210.114.17.65:8001/"; // 개발자님의 리눅스 서버 IP로 변경
  
  // 2. 요청 경로 재구성
  // 예: Hono로 "/api/users" 요청이 오면 -> FastAPI "/users"로 보낼지, "/api/users"로 보낼지 결정
  // 여기서는 "/api"를 그대로 유지해서 보낸다고 가정합니다.
  const url = new URL(c.req.url);
  const targetUrl = `${FASTAPI_URL}${url.pathname}${url.search}`;

  // 3. FastAPI로 요청 전달 (Proxy)
  try {
    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers: c.req.header(), // 클라이언트가 보낸 헤더(인증 등) 그대로 전달
      body: c.req.raw ? c.req.raw : null, // POST Body가 있다면 전달
    });

    // 4. FastAPI의 응답을 그대로 클라이언트에게 반환
    // (여기서 Hono의 CORS 미들웨어가 자동으로 CORS 헤더를 붙여줍니다)
    return new Response(response.body, {
      status: response.status,
      headers: response.headers,
    });
    
  } catch (error) {
    console.error("FastAPI Proxy Error:", error);
    return c.json({ error: "Backend Server Error" }, 502);
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
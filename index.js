import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// CORS 허용
app.use('/*', cors())

app.get('/', (c) => c.redirect('https://musclecat-studio.com'))

// =================================================================
// 🚀 [최종 해결책] 헤더 다이어트 프록시
// =================================================================
app.all('/api/*', async (c) => {
  const FASTAPI_HOST = "http://musclecat3.cafe24.com:8001";
  
  const url = new URL(c.req.url);
  // /api 제거하고 경로 생성
  const newPath = url.pathname.replace(/^\/api/, '');
  const targetUrl = `${FASTAPI_HOST}${newPath}${url.search}`;

  console.log(`📡 [Clean Proxy] ${url.pathname} --> ${targetUrl}`);

  try {
    // 1. [핵심] 헤더를 복사하지 않고, '빈 종이'에서 시작합니다.
    const cleanHeaders = new Headers();

    // 2. [핵심] 호스트 헤더를 명확하게 지정 (포트 번호 제외 시도)
    // Cafe24 가상호스트는 도메인 이름만 보는 경우가 많습니다.
    cleanHeaders.set('Host', 'musclecat3.cafe24.com');

    // 3. 브라우저 위장 (필수)
    cleanHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36');
    
    // 4. Content-Type이 있다면(POST 요청 등) 그것만 옮겨줍니다.
    const contentType = c.req.header('content-type');
    if (contentType) {
      cleanHeaders.set('Content-Type', contentType);
    }

    // 5. 인증 토큰이 있다면 그것만 옮겨줍니다. (필요 시 주석 해제)
    // const auth = c.req.header('authorization');
    // if (auth) cleanHeaders.set('Authorization', auth);

    const fetchOptions = {
      method: c.req.method,
      headers: cleanHeaders, // 깨끗한 헤더 사용
      redirect: 'manual',
      keepalive: false // 연결 유지 끄기 (방화벽 문제 회피용)
    };

    if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
      fetchOptions.body = c.req.raw;
    }

    const response = await fetch(targetUrl, fetchOptions);

    console.log(`✅ [Response Status] ${response.status}`);

    // 응답 처리
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

// Swagger 프록시
app.get('/openapi.json', async (c) => {
  const targetUrl = `http://musclecat3.cafe24.com:8001/openapi.json`;
  try {
    const cleanHeaders = new Headers();
    cleanHeaders.set('Host', 'musclecat3.cafe24.com');
    cleanHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36');
    
    const response = await fetch(targetUrl, { headers: cleanHeaders });
    return new Response(response.body, { status: response.status, headers: response.headers });
  } catch (e) {
    return c.json({ error: "OpenAPI Fetch Error" }, 500);
  }
});

app.notFound((c) => c.json({ error: 'Not Found' }, 404))

export default {
  fetch: (req, env, ctx) => app.fetch(req, env, ctx),
  async scheduled(event, env, ctx) { }
}
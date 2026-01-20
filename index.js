import { Hono } from 'hono'
import { cors } from 'hono/cors'

// Hono 앱 인스턴스 생성
const app = new Hono()

// 1. 미들웨어: CORS 설정 (모든 도메인 허용)
app.use('/*', cors())

// 2. 기본 라우트
app.get('/', (c) => {
  return c.text('Hello! This is pure JavaScript on Cloudflare Workers.')
})

// 3. [신규 기능] 포춘쿠키 API (외부 API 연동 실습)
app.get('/fortune', async (c) => {
  // 3-1. 쿼리 파라미터로 언어 선택 (기본값: english) -> ?lang=kr
  const lang = c.req.query('lang') || 'english'

  try {
    let message = ''
    let source = ''

    if (lang === 'kr') {
      // 한국어: 내부 백업 데이터 사용 (연습용)
      const backups = [
        "시작이 반이다.",
        "피할 수 없으면 즐겨라.",
        "행운은 용기를 뒤따른다.",
        "오늘의 노력이 내일의 결실을 맺는다.",
        "당신은 충분히 잘하고 있다."
      ]
      message = backups[Math.floor(Math.random() * backups.length)]
      source = 'Local Backup (Korean)'
    } else {
      // 영어: 외부 API (Advice Slip) 호출
      // Cloudflare Workers에서는 fetch가 내장되어 있어 별도 import가 필요 없습니다.
      const response = await fetch('https://api.adviceslip.com/advice')
      
      if (!response.ok) {
        throw new Error('External API Error')
      }

      const data = await response.json()
      message = data.slip.advice
      source = 'Advice Slip API'
    }

    // JSON 응답 반환
    return c.json({
      success: true,
      data: {
        message: message,
        language: lang,
        source: source
      },
      timestamp: new Date().toISOString()
    })

  } catch (err) {
    // 에러 발생 시 처리
    console.error('Fortune Error:', err)
    return c.json({
      success: false,
      error: '포춘쿠키를 가져오는 데 실패했습니다.',
      details: err.message
    }, 500)
  }
})

// 4. 기존: JSON 반환 및 파라미터 처리
app.get('/users/:id', (c) => {
  const userId = c.req.param('id')
  const userRole = c.req.query('role') || 'member'

  return c.json({
    message: `유저 ${userId} 정보 조회`,
    role: userRole,
    platform: 'Cloudflare Workers (JS)',
    timestamp: Date.now()
  })
})

// 5. 기존: POST 요청 처리
app.post('/api/data', async (c) => {
  try {
    const body = await c.req.json()
    
    return c.json({
      success: true,
      received: body
    }, 201)
  } catch (err) {
    return c.json({ error: 'Invalid JSON' }, 400)
  }
})

// 6. 404 에러 처리
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404)
})

// 중요: 'export default app' 문법은 Cloudflare Workers의 표준입니다.
export default app
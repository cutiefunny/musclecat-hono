import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// 1. 미들웨어: CORS 설정
app.use('/*', cors())

// 2. 기본 라우트
app.get('/', (c) => {
  return c.text('Hello! This is pure JavaScript on Cloudflare Workers with Gemini.')
})

// 3. [핵심] 포춘쿠키 + Gemini 번역 API
app.get('/fortune', async (c) => {
  const API_KEY = c.env.GOOGLE_API_KEY
  
  try {
    // 1단계: 영어 명언 가져오기 (Advice Slip API)
    const adviceResponse = await fetch('https://api.adviceslip.com/advice')
    if (!adviceResponse.ok) throw new Error('Advice API Error')
    const adviceData = await adviceResponse.json()
    const originalText = adviceData.slip.advice

    // 2단계: Gemini에게 번역 요청
    // 모델: gemini-2.5-flash-lite (속도가 빠르고 비용 효율적임)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${API_KEY}`
    
    const geminiBody = {
      contents: [{
        parts: [{
          // 단순 직역보다 '한 줄 운세'처럼 번역하도록 지시
          text: `Translate the following sentence into Korean efficiently and naturally, like a one-line fortune. Output only the Korean text without quotes.\n\nSentence: "${originalText}"`
        }]
      }]
    }

    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    })

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      throw new Error(`Gemini API Error: ${errText}`)
    }

    const geminiData = await geminiResponse.json()
    
    // 응답에서 텍스트 추출
    const koreanMessage = geminiData.candidates[0].content.parts[0].text.trim()

    // 3단계: 결과 반환 (한국어 메시지만)
    return c.text(koreanMessage)

  } catch (err) {
    console.error(err)
    return c.json({ 
      error: '명언을 가져오는 중 문제가 발생했습니다.',
      detail: err.message 
    }, 500)
  }
})

// 4. 기존 사용자 조회 API (유지)
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

// 5. POST 요청 처리 (유지)
app.post('/api/data', async (c) => {
  try {
    const body = await c.req.json()
    return c.json({ success: true, received: body }, 201)
  } catch (err) {
    return c.json({ error: 'Invalid JSON' }, 400)
  }
})

app.notFound((c) => c.json({ error: 'Not Found' }, 404))

export default app
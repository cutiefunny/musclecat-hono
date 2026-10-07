import { Hono } from 'hono'
import { cors } from 'hono/cors'

const app = new Hono()

// CORS 허용
app.use('/*', cors())

app.get('/', (c) => c.json({ message: 'musclecat backend api server' }))

app.get('/test', (c) => c.json({ result: 'continue!' }))
app.get('/test2', (c) => c.json({ result: 'stop!' }))

app.notFound((c) => c.json({ error: 'Not Found' }, 404))

export default {
  fetch: (req, env, ctx) => app.fetch(req, env, ctx),
  async scheduled(event, env, ctx) { }
}
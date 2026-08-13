const KMA_API_URL =
  'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  }

  const serviceKey = process.env.KMA_SERVICE_KEY?.trim()
  if (!serviceKey) return response.status(503).json({ error: 'KMA_SERVICE_KEY_MISSING' })

  const allowedParams = ['pageNo', 'numOfRows', 'dataType', 'base_date', 'base_time', 'nx', 'ny']
  const query = new URLSearchParams({ serviceKey })
  allowedParams.forEach((name) => {
    const value = request.query[name]
    if (typeof value === 'string') query.set(name, value)
  })

  try {
    const upstream = await fetch(`${KMA_API_URL}?${query.toString()}`)
    const body = await upstream.text()
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    response.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return response.status(upstream.status).send(body)
  } catch {
    return response.status(502).json({ error: 'KMA_UPSTREAM_ERROR' })
  }
}

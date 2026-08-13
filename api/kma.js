const KMA_API_BASE = 'https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0'
const KMA_OPERATIONS = {
  current: 'getUltraSrtNcst',
  forecast: 'getVilageFcst',
}

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  }

  const authKey = process.env.KMA_API_HUB_KEY?.trim()
  if (!authKey) return response.status(503).json({ error: 'KMA_API_HUB_KEY_MISSING' })

  const operation = KMA_OPERATIONS[request.query.type ?? 'current']
  if (!operation) return response.status(400).json({ error: 'INVALID_KMA_REQUEST_TYPE' })

  const allowedParams = ['pageNo', 'numOfRows', 'dataType', 'base_date', 'base_time', 'nx', 'ny']
  const query = new URLSearchParams({ authKey })
  allowedParams.forEach((name) => {
    const value = request.query[name]
    if (typeof value === 'string') query.set(name, value)
  })

  try {
    const url = `${KMA_API_BASE}/${operation}?${query.toString()}`
    let upstream
    let body
    for (let attempt = 0; attempt < 2; attempt += 1) {
      upstream = await fetch(url)
      body = await upstream.text()
      if (upstream.ok || upstream.status < 500 || attempt === 1) break
    }
    response.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    response.setHeader(
      'Cache-Control',
      operation === 'getUltraSrtNcst'
        ? 's-maxage=300, stale-while-revalidate=600'
        : 's-maxage=600, stale-while-revalidate=1200',
    )
    return response.status(upstream.status).send(body)
  } catch {
    return response.status(502).json({ error: 'KMA_UPSTREAM_ERROR' })
  }
}

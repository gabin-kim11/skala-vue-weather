import { fetchPublicData } from '../server/publicData.js'

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.setHeader('Allow', 'GET')
    return response.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  }

  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY?.trim()
  if (!serviceKey) return response.status(503).json({ error: 'DATA_GO_KR_SERVICE_KEY_MISSING' })

  try {
    const requestUrl = new URL(request.url, 'https://weather.local')
    const result = await fetchPublicData(requestUrl, serviceKey)
    if (result.status >= 500 || result.status === 404) {
      response.setHeader('Cache-Control', 'no-store')
      return response.status(200).json({ available: false, type: requestUrl.searchParams.get('type') })
    }
    response.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200')
    return response.status(result.status).json({ available: true, ...result.body })
  } catch (error) {
    console.warn('[Public Data API unavailable]', error.message)
    response.setHeader('Cache-Control', 'no-store')
    const requestUrl = new URL(request.url, 'https://weather.local')
    return response.status(200).json({ available: false, type: requestUrl.searchParams.get('type') })
  }
}

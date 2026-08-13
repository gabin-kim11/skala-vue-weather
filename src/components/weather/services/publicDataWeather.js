import axios from 'axios'

const KST_OFFSET = 9 * 60 * 60 * 1000
const PUBLIC_DATA_CACHE_TTL = 10 * 60 * 1000
const publicDataCache = new Map()
const pendingRequests = new Map()
const pad = (value) => String(value).padStart(2, '0')
const getKstNow = () => new Date(Date.now() + KST_OFFSET)
const formatKstDate = (date) => `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`

const getUvBaseTime = () => {
  const kst = getKstNow()
  const availableHour = Math.floor(kst.getUTCHours() / 3) * 3
  return `${formatKstDate(kst)}${pad(availableHour)}`
}

const requestPublicData = async (params) => {
  const cacheKey = new URLSearchParams(params).toString()
  const cached = publicDataCache.get(cacheKey)
  if (cached && Date.now() - cached.savedAt < PUBLIC_DATA_CACHE_TTL) return cached.data
  if (pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey)

  const request = axios.get('/api/public-data', { params, timeout: 20000 })
    .then((response) => {
      if (response.data.available !== false) {
        publicDataCache.set(cacheKey, { data: response.data, savedAt: Date.now() })
      }
      return response.data
    })
    .catch(() => ({ available: false, type: params.type }))
    .finally(() => pendingRequests.delete(cacheKey))
  pendingRequests.set(cacheKey, request)
  return request
}

export const fetchPublicDataWeather = async (city) => {
  const kst = getKstNow()
  const requests = [
    requestPublicData({ type: 'uv', areaNo: city.uvAreaNo, time: getUvBaseTime() }),
    requestPublicData({ type: 'air', sido: city.airSido, station: city.airStation }),
    requestPublicData({ type: 'sun', location: city.name, date: formatKstDate(kst) }),
  ]
  const [uv, air, sun] = await Promise.all(requests)
  const result = { publicData: {} }

  if (uv.available !== false && Number.isFinite(uv.value)) {
    result.sun = { uvMax: uv.value }
    result.publicData.uv = uv
  }
  if (air.available !== false) {
    result.airQuality = air
    result.publicData.air = air
  }
  if (sun.available !== false) {
    result.sun = { ...result.sun, sunrise: sun.sunrise, sunset: sun.sunset }
    result.publicData.sun = sun
  }

  return result
}

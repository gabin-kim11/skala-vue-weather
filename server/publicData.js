const PUBLIC_DATA_BASE = 'https://apis.data.go.kr'

const asNumber = (value) => {
  if (value === null || value === undefined || value === '' || value === '-') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

const fetchWithRetry = async (url) => {
  let response
  let body
  for (let attempt = 0; attempt < 2; attempt += 1) {
    response = await fetch(url)
    body = await response.text()
    if (response.ok || response.status < 500 || attempt === 1) break
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  if (!response.ok) throw new Error(`PUBLIC_DATA_HTTP_${response.status}`)
  return body
}

const requestJson = async (url) => {
  const body = await fetchWithRetry(url)
  let data
  try {
    data = JSON.parse(body)
  } catch {
    throw new Error('PUBLIC_DATA_INVALID_JSON')
  }
  const header = data?.response?.header
  if (header && !['00', '0', 'NORMAL_SERVICE'].includes(String(header.resultCode))) {
    throw new Error(header.resultMsg || `PUBLIC_DATA_${header.resultCode}`)
  }
  return data
}

const appendCommonParams = (url, serviceKey) => {
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('pageNo', '1')
  url.searchParams.set('numOfRows', '100')
}

const fetchUvIndex = async (requestUrl, serviceKey) => {
  const areaNo = requestUrl.searchParams.get('areaNo')
  const time = requestUrl.searchParams.get('time')
  if (!/^\d{10}$/.test(areaNo ?? '') || !/^\d{10}$/.test(time ?? '')) {
    return { status: 400, body: { error: 'INVALID_UV_PARAMETERS' } }
  }

  const url = new URL(`${PUBLIC_DATA_BASE}/1360000/LivingWthrIdxServiceV5/getUVIdxV5`)
  appendCommonParams(url, serviceKey)
  url.searchParams.set('dataType', 'JSON')
  url.searchParams.set('areaNo', areaNo)
  url.searchParams.set('time', time)

  const data = await requestJson(url)
  const rawItem = data?.response?.body?.items?.item
  const item = Array.isArray(rawItem) ? rawItem[0] : rawItem
  if (!item) return { status: 404, body: { error: 'UV_DATA_NOT_FOUND' } }

  return {
    status: 200,
    body: {
      value: asNumber(item.h0 ?? item.today ?? item.uvIndex),
      forecast3h: asNumber(item.h3),
      areaNo: item.areaNo ?? areaNo,
      measuredAt: item.date ?? time,
      source: 'KMA_LIVING_WEATHER_INDEX',
    },
  }
}

const fetchAirQuality = async (requestUrl, serviceKey) => {
  const sido = requestUrl.searchParams.get('sido')?.trim()
  const stationHint = requestUrl.searchParams.get('station')?.trim()
  if (!sido || sido.length > 10 || (stationHint?.length ?? 0) > 30) {
    return { status: 400, body: { error: 'INVALID_AIR_PARAMETERS' } }
  }

  if (!stationHint) return { status: 400, body: { error: 'AIR_STATION_REQUIRED' } }

  const airUrl = new URL(`${PUBLIC_DATA_BASE}/B552584/ArpltnInforInqireSvc/getMsrstnAcctoRltmMesureDnsty`)
  appendCommonParams(airUrl, serviceKey)
  airUrl.searchParams.set('numOfRows', '24')
  airUrl.searchParams.set('returnType', 'json')
  airUrl.searchParams.set('stationName', stationHint)
  airUrl.searchParams.set('dataTerm', 'DAILY')
  airUrl.searchParams.set('ver', '1.4')

  const airData = await requestJson(airUrl)
  const rawItems = airData?.response?.body?.items ?? []
  const items = Array.isArray(rawItems) ? rawItems : [rawItems]
  const item = items.find((entry) => asNumber(entry?.pm10Value) !== null || asNumber(entry?.pm25Value) !== null)
  if (!item) return { status: 404, body: { error: 'AIR_DATA_NOT_FOUND' } }

  return {
    status: 200,
    body: {
      stationName: stationHint,
      sido,
      measuredAt: item.dataTime,
      aqi: asNumber(item.khaiValue),
      pm10: asNumber(item.pm10Value),
      pm25: asNumber(item.pm25Value),
      ozone: asNumber(item.o3Value),
      source: 'AIR_KOREA',
    },
  }
}

const readXmlTag = (xml, tag) => {
  const match = xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([^<\\]]+)(?:\\]\\]>)?</${tag}>`, 'i'))
  return match?.[1]?.trim() ?? null
}

const formatSunTime = (value) => {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (digits.length < 4) return null
  return `${digits.slice(-4, -2)}:${digits.slice(-2)}`
}

const fetchSunTimes = async (requestUrl, serviceKey) => {
  const location = requestUrl.searchParams.get('location')?.trim()
  const date = requestUrl.searchParams.get('date')
  if (!location || location.length > 20 || !/^\d{8}$/.test(date ?? '')) {
    return { status: 400, body: { error: 'INVALID_SUN_PARAMETERS' } }
  }

  const url = new URL(`${PUBLIC_DATA_BASE}/B090041/openapi/service/RiseSetInfoService/getAreaRiseSetInfo`)
  url.searchParams.set('serviceKey', serviceKey)
  url.searchParams.set('locdate', date)
  url.searchParams.set('location', location)

  const xml = await fetchWithRetry(url)
  const resultCode = readXmlTag(xml, 'resultCode')
  if (resultCode && !['00', '0'].includes(resultCode)) {
    throw new Error(readXmlTag(xml, 'resultMsg') || `PUBLIC_DATA_${resultCode}`)
  }

  const sunrise = formatSunTime(readXmlTag(xml, 'sunrise'))
  const sunset = formatSunTime(readXmlTag(xml, 'sunset'))
  if (!sunrise || !sunset) return { status: 404, body: { error: 'SUN_DATA_NOT_FOUND' } }

  return {
    status: 200,
    body: {
      location: readXmlTag(xml, 'location') ?? location,
      date: readXmlTag(xml, 'locdate') ?? date,
      sunrise,
      sunset,
      source: 'KASI_RISE_SET',
    },
  }
}

export const fetchPublicData = async (requestUrl, serviceKey) => {
  const type = requestUrl.searchParams.get('type')
  if (type === 'uv') return fetchUvIndex(requestUrl, serviceKey)
  if (type === 'air') return fetchAirQuality(requestUrl, serviceKey)
  if (type === 'sun') return fetchSunTimes(requestUrl, serviceKey)
  return { status: 400, body: { error: 'INVALID_PUBLIC_DATA_TYPE' } }
}

import axios from 'axios'

import { toKmaGrid } from '../utils/kmaGrid'
import { describeWeatherCode } from '../utils/weatherCode'

const pad = (value) => String(value).padStart(2, '0')
const KST_OFFSET = 9 * 60 * 60 * 1000
const FORECAST_BASE_HOURS = [2, 5, 8, 11, 14, 17, 20, 23]
const KMA_CACHE_TTL = { current: 5 * 60 * 1000, forecast: 10 * 60 * 1000 }
const kmaCache = new Map()
const pendingRequests = new Map()

const formatKstDate = (date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`

const getKstNow = () => new Date(Date.now() + KST_OFFSET)

const getCurrentBaseTime = () => {
  const kst = getKstNow()
  // 초단기실황은 매시 40분경 생성되므로 그 이전에는 직전 시각 자료를 요청한다.
  if (kst.getUTCMinutes() < 40) kst.setUTCHours(kst.getUTCHours() - 1)
  return {
    baseDate: formatKstDate(kst),
    baseTime: `${pad(kst.getUTCHours())}00`,
  }
}

const getForecastBaseTime = () => {
  // 단기예보 발표 직후의 생성 시간을 고려해 현재보다 10분 이전에 사용 가능한 회차를 고른다.
  const availableAt = new Date(getKstNow().getTime() - 10 * 60 * 1000)
  const baseHour = [...FORECAST_BASE_HOURS].reverse().find((hour) => hour <= availableAt.getUTCHours())
  if (baseHour !== undefined) {
    return { baseDate: formatKstDate(availableAt), baseTime: `${pad(baseHour)}00` }
  }

  availableAt.setUTCDate(availableAt.getUTCDate() - 1)
  return { baseDate: formatKstDate(availableAt), baseTime: '2300' }
}

const parsePrecipitation = (value) => {
  if (typeof value === 'number') return value
  if (!value || value === '강수없음' || value === '강수 없음') return 0
  const parsed = Number.parseFloat(String(value).replace(/[^0-9.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
}

const weatherCodeFromKma = (sky = 1, precipitationType = 0) => {
  const precipitationCodes = {
    1: 61,
    2: 66,
    3: 71,
    4: 80,
    5: 51,
    6: 66,
    7: 71,
  }
  if (precipitationCodes[precipitationType]) return precipitationCodes[precipitationType]
  if (Number(sky) === 4) return 3
  if (Number(sky) === 3) return 2
  return 0
}

const describePrecipitation = (code) => {
  const descriptions = {
    1: { status: '비', icon: '🌧️', sentence: '현재 위치에 비가 내리고 있어요.' },
    2: { status: '비 또는 눈', icon: '🌨️', sentence: '비와 눈이 섞여 내릴 수 있어요.' },
    3: { status: '눈', icon: '❄️', sentence: '현재 위치에 눈이 내리고 있어요.' },
    5: { status: '빗방울', icon: '🌦️', sentence: '가벼운 빗방울이 관측되고 있어요.' },
    6: { status: '빗방울·눈날림', icon: '🌨️', sentence: '빗방울과 눈날림이 관측되고 있어요.' },
    7: { status: '눈날림', icon: '❄️', sentence: '가벼운 눈날림이 관측되고 있어요.' },
  }
  return descriptions[code] ?? null
}

const readKmaItems = (response) => {
  const header = response.data?.response?.header
  if (header?.resultCode !== '00') throw new Error(header?.resultMsg || 'KMA_API_ERROR')
  return response.data?.response?.body?.items?.item ?? []
}

const requestKma = async (type, latitude, longitude) => {
  const { nx, ny } = toKmaGrid(latitude, longitude)
  const { baseDate, baseTime } = type === 'forecast' ? getForecastBaseTime() : getCurrentBaseTime()
  const cacheKey = `${type}:${baseDate}:${baseTime}:${nx}:${ny}`
  const cached = kmaCache.get(cacheKey)
  if (cached && Date.now() - cached.savedAt < KMA_CACHE_TTL[type]) return cached.data
  if (pendingRequests.has(cacheKey)) return pendingRequests.get(cacheKey)

  const request = axios.get('/api/kma', {
    params: {
      type,
      pageNo: 1,
      numOfRows: 1000,
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx,
      ny,
    },
    timeout: 12000,
  }).then((response) => {
    const data = { items: readKmaItems(response), baseDate, baseTime, grid: { nx, ny } }
    kmaCache.set(cacheKey, { data, savedAt: Date.now() })
    return data
  }).finally(() => pendingRequests.delete(cacheKey))

  pendingRequests.set(cacheKey, request)
  return request
}

export const fetchKmaCurrentWeather = async ({ latitude, longitude }) => {
  const { items, baseDate, baseTime, grid } = await requestKma('current', latitude, longitude)
  const values = Object.fromEntries(items.map((item) => [item.category, item.obsrValue]))
  const precipitationType = Number(values.PTY ?? 0)

  return {
    temperature: Number(values.T1H),
    apparentTemperature: Number(values.T1H),
    humidity: Number(values.REH),
    windSpeed: Math.round(Number(values.WSD) * 36) / 10,
    precipitation: parsePrecipitation(values.RN1),
    precipitationType,
    condition: describePrecipitation(precipitationType),
    observedAt: `${baseDate}${baseTime}`,
    grid,
  }
}

export const fetchKmaForecast = async ({ latitude, longitude }) => {
  const { items, baseDate, baseTime, grid } = await requestKma('forecast', latitude, longitude)
  const grouped = new Map()

  items.forEach((item) => {
    const key = `${item.fcstDate}${item.fcstTime}`
    const entry = grouped.get(key) ?? { date: item.fcstDate, time: item.fcstTime }
    entry[item.category] = item.fcstValue
    grouped.set(key, entry)
  })

  const nowKey = `${formatKstDate(getKstNow())}${pad(getKstNow().getUTCHours())}00`
  const timeline = [...grouped.entries()]
    .filter(([key]) => key >= nowKey)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, values]) => {
      const weatherCode = weatherCodeFromKma(Number(values.SKY), Number(values.PTY))
      const temperature = Number(values.TMP)
      return {
        time: `${values.date.slice(0, 4)}-${values.date.slice(4, 6)}-${values.date.slice(6, 8)}T${values.time.slice(0, 2)}:${values.time.slice(2, 4)}:00+09:00`,
        temperature,
        apparentTemperature: temperature,
        precipitationProbability: Number(values.POP ?? 0),
        precipitation: parsePrecipitation(values.PCP),
        humidity: Number(values.REH),
        windSpeed: Math.round(Number(values.WSD ?? 0) * 36) / 10,
        weatherCode,
      }
    })
    .filter((item) => Number.isFinite(item.temperature))

  const dailyGroups = new Map()
  timeline.forEach((item) => {
    const date = item.time.slice(0, 10)
    const day = dailyGroups.get(date) ?? []
    day.push(item)
    dailyGroups.set(date, day)
  })

  const forecast = [...dailyGroups.entries()].slice(0, 5).map(([date, hours]) => {
    const representative = hours.find((item) => item.time.slice(11, 13) === '12') ?? hours[Math.floor(hours.length / 2)]
    const condition = describeWeatherCode(representative.weatherCode)
    return {
      date,
      max: Math.round(Math.max(...hours.map((item) => item.temperature))),
      min: Math.round(Math.min(...hours.map((item) => item.temperature))),
      precipitation: Math.max(...hours.map((item) => item.precipitationProbability ?? 0)),
      ...condition,
    }
  })

  return {
    hourly: timeline.slice(0, 10),
    forecast,
    issuedAt: `${baseDate}${baseTime}`,
    grid,
  }
}

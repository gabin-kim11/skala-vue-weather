import axios from 'axios'

import { toKmaGrid } from '../utils/kmaGrid'

const pad = (value) => String(value).padStart(2, '0')

const getKstBaseTime = () => {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  // 초단기실황은 매시 40분경 생성되므로 그 이전에는 직전 시각 자료를 요청한다.
  if (kst.getUTCMinutes() < 40) kst.setUTCHours(kst.getUTCHours() - 1)
  return {
    baseDate: `${kst.getUTCFullYear()}${pad(kst.getUTCMonth() + 1)}${pad(kst.getUTCDate())}`,
    baseTime: `${pad(kst.getUTCHours())}00`,
  }
}

const parsePrecipitation = (value) => {
  if (typeof value === 'number') return value
  if (!value || value === '강수없음') return 0
  const parsed = Number.parseFloat(String(value).replace(/[^0-9.]/g, ''))
  return Number.isFinite(parsed) ? parsed : 0
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

export const fetchKmaCurrentWeather = async ({ latitude, longitude }) => {
  const serviceKey = import.meta.env.VITE_KMA_SERVICE_KEY?.trim()
  const usesProductionProxy = import.meta.env.PROD || import.meta.env.VITE_KMA_PROXY_ENABLED === 'true'
  if (!serviceKey && !usesProductionProxy) throw new Error('KMA_SERVICE_KEY_MISSING')

  const { nx, ny } = toKmaGrid(latitude, longitude)
  const { baseDate, baseTime } = getKstBaseTime()
  const response = await axios.get('/api/kma', {
    params: {
      ...(serviceKey ? { serviceKey } : {}),
      pageNo: 1,
      numOfRows: 1000,
      dataType: 'JSON',
      base_date: baseDate,
      base_time: baseTime,
      nx,
      ny,
    },
    timeout: 8000,
  })

  const header = response.data?.response?.header
  if (header?.resultCode !== '00') throw new Error(header?.resultMsg || 'KMA_API_ERROR')

  const items = response.data?.response?.body?.items?.item ?? []
  const values = Object.fromEntries(items.map((item) => [item.category, item.obsrValue]))
  const precipitationType = Number(values.PTY ?? 0)

  return {
    temperature: Number(values.T1H),
    apparentTemperature: Number(values.T1H),
    humidity: Number(values.REH),
    windSpeed: Number(values.WSD),
    precipitation: parsePrecipitation(values.RN1),
    precipitationType,
    condition: describePrecipitation(precipitationType),
    observedAt: `${baseDate}${baseTime}`,
    grid: { nx, ny },
  }
}

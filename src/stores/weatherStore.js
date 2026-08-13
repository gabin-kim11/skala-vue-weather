import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import axios from 'axios'

import { cityCatalog } from '../components/weather/data/cities'
import { fetchKmaCurrentWeather } from '../components/weather/services/kmaWeather'
import { describeWeatherCode } from '../components/weather/utils/weatherCode'

const API_URL = 'https://api.open-meteo.com/v1/forecast'
const AIR_QUALITY_API_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality'
// 별도 설정이 없어도 선택한 도시의 실시간 예보를 사용한다.
// 호출을 끄고 준비된 데이터만 확인하려는 경우에만 false로 설정한다.
const OPEN_METEO_ENABLED = import.meta.env.VITE_OPEN_METEO_ENABLED !== 'false'
const WEATHER_CACHE_TTL = 10 * 60 * 1000
const MIN_FORECAST_REQUEST_INTERVAL = 350
const MAX_RATE_LIMIT_RETRIES = 2
const NATIONWIDE_BATCH_SIZE = 4

const forecastCache = new Map()
const forecastRequests = new Map()
let forecastRequestQueue = Promise.resolve()
let lastForecastRequestAt = 0

const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

const getRetryDelay = (error, attempt) => {
  const retryAfter = error?.response?.headers?.['retry-after']
  if (retryAfter) {
    const seconds = Number(retryAfter)
    if (Number.isFinite(seconds)) return Math.min(seconds * 1000, 30_000)

    const retryAt = Date.parse(retryAfter)
    if (Number.isFinite(retryAt)) return Math.min(Math.max(retryAt - Date.now(), 0), 30_000)
  }
  return 1000 * 2 ** attempt
}

const requestWithRateLimitRetry = async (request) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await request()
    } catch (error) {
      if (error?.response?.status !== 429 || attempt >= MAX_RATE_LIMIT_RETRIES) throw error
      await wait(getRetryDelay(error, attempt))
    }
  }
}

// Open-Meteo 요청을 한 줄로 세워 브라우저 한 곳에서 순간 호출 제한을 넘지 않게 한다.
const scheduleForecastRequest = (request) => {
  const scheduled = forecastRequestQueue.then(async () => {
    const remainingDelay = MIN_FORECAST_REQUEST_INTERVAL - (Date.now() - lastForecastRequestAt)
    if (remainingDelay > 0) await wait(remainingDelay)
    lastForecastRequestAt = Date.now()
    return requestWithRateLimitRetry(request)
  })
  forecastRequestQueue = scheduled.catch(() => undefined)
  return scheduled
}

const forecastCacheKey = (city) => `${Number(city.latitude).toFixed(4)},${Number(city.longitude).toFixed(4)}`

const fetchForecastData = (city) => {
  const cacheKey = forecastCacheKey(city)
  const cached = forecastCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.data)
  if (forecastRequests.has(cacheKey)) return forecastRequests.get(cacheKey)

  const request = scheduleForecastRequest(async () => {
    const response = await axios.get(API_URL, {
      params: {
        latitude: city.latitude,
        longitude: city.longitude,
        current:
          'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation',
        hourly:
          'temperature_2m,apparent_temperature,precipitation_probability,weather_code,wind_speed_10m',
        daily:
          'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,uv_index_max',
        timezone: 'Asia/Seoul',
        forecast_days: 5,
      },
      timeout: 6500,
    })
    forecastCache.set(cacheKey, { data: response.data, expiresAt: Date.now() + WEATHER_CACHE_TTL })
    return response.data
  }).finally(() => forecastRequests.delete(cacheKey))

  forecastRequests.set(cacheKey, request)
  return request
}

const createMockHourly = (city) => {
  const start = new Date()
  start.setMinutes(0, 0, 0)

  return Array.from({ length: 10 }, (_, index) => {
    const time = new Date(start.getTime() + index * 60 * 60 * 1000)
    const temperatureSwing = Math.sin((index / 9) * Math.PI) * 3
    const isRainy = city.mock.weatherCode >= 51
    return {
      time: time.toISOString(),
      temperature: Math.round((city.mock.temperature + temperatureSwing) * 10) / 10,
      apparentTemperature: Math.round((city.mock.apparentTemperature + temperatureSwing) * 10) / 10,
      precipitationProbability: isRainy ? Math.max(18, 72 - index * 5) : 8 + ((index * 7) % 18),
      windSpeed: Math.round((city.mock.windSpeed + Math.sin(index) * 2) * 10) / 10,
      weatherCode: city.mock.weatherCode,
    }
  })
}

const createMockCity = (city) => {
  const condition = describeWeatherCode(city.mock.weatherCode)
  return {
    ...city,
    current: {
      ...city.mock,
      status: condition.label,
      icon: condition.icon,
      sentence: condition.sentence,
    },
    hourly: createMockHourly(city),
    forecast: Array.from({ length: 5 }, (_, index) => ({
      date: new Date(Date.now() + index * 86400000).toISOString().slice(0, 10),
      max: city.mock.temperature + Math.round(Math.sin(index) * 2),
      min: city.mock.temperature - 6 + Math.round(Math.cos(index) * 2),
      precipitation: city.mock.weatherCode >= 51 ? Math.max(20, 70 - index * 9) : 10 + index * 5,
      ...describeWeatherCode(index === 2 ? 2 : city.mock.weatherCode),
    })),
    sun: { sunrise: '05:48', sunset: '19:28', uvMax: city.mock.weatherCode === 0 ? 7 : 4 },
    airQuality: {
      pm10: city.mock.weatherCode === 0 ? 28 : 41,
      pm25: city.mock.weatherCode === 0 ? 14 : 22,
      aqi: city.mock.weatherCode === 0 ? 42 : 58,
      source: 'prepared',
    },
    source: 'mock',
  }
}

const readStorage = (key, fallback) => {
  const savedValue = window.localStorage.getItem(key)
  if (savedValue === null) return fallback

  try {
    return JSON.parse(savedValue)
  } catch {
    // 이전 버전에서 문자열을 JSON 인코딩 없이 저장한 경우도 복원한다.
    return typeof fallback === 'string' ? savedValue : fallback
  }
}

const requestBrowserPosition = (options) =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('GEOLOCATION_UNSUPPORTED'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  })

const getBrowserPosition = async () => {
  try {
    // 실제 기기 좌표를 우선 요청한다.
    return await requestBrowserPosition({
      enableHighAccuracy: true,
      timeout: 7000,
      maximumAge: 5 * 60 * 1000,
    })
  } catch (error) {
    // 권한 거부는 재요청해도 같은 결과이므로 그대로 전달한다.
    if (error?.code === 1 || error?.message === 'GEOLOCATION_UNSUPPORTED') throw error

    // 정밀 GPS가 느린 실내 환경에서는 최근의 일반 위치를 한 번 더 사용한다.
    return requestBrowserPosition({
      enableHighAccuracy: false,
      timeout: 6000,
      maximumAge: 30 * 60 * 1000,
    })
  }
}

const getGeolocationPermissionState = async () => {
  if (!navigator.permissions?.query) return 'unknown'

  try {
    const permission = await navigator.permissions.query({ name: 'geolocation' })
    return permission.state
  } catch {
    return 'unknown'
  }
}

const distanceScore = (city, latitude, longitude) =>
  Math.pow(city.latitude - latitude, 2) + Math.pow(city.longitude - longitude, 2)

const createLocationCity = (latitude, longitude) => {
  const nearestCity = cityCatalog.reduce((nearest, city) =>
    distanceScore(city, latitude, longitude) < distanceScore(nearest, latitude, longitude) ? city : nearest,
  )
  return {
    ...nearestCity,
    id: 'current_location',
    guideId: nearestCity.id,
    name: nearestCity.name,
    area: `${nearestCity.area} 인근 · GPS`,
    latitude,
    longitude,
  }
}

export const useWeatherStore = defineStore('weather', () => {
  // 여러 View가 함께 사용하는 값은 Pinia가 소유한다.
  const weatherList = ref(cityCatalog.map(createMockCity))
  const selectedCityId = ref(weatherList.value[0].id)
  const temperatureUnit = ref('celsius')
  const favoriteCityIds = ref([])
  const isLoading = ref(false)
  const isNationwideLoading = ref(false)
  const errorMessage = ref('')
  const lastUpdatedAt = ref(null)
  const nationwideUpdatedAt = ref(null)
  const isHydrated = ref(false)
  const locationStatus = ref('idle')
  const locationMessage = ref('위치 확인 전')
  const weatherDataSource = ref('mock')
  const currentLocationCity = ref(null)
  let activeLocationRequest = 0
  let activeSelectedWeatherRequest = 0

  const selectedCityInfo = computed(
    () => weatherList.value.find((city) => city.id === selectedCityId.value) ?? weatherList.value[0],
  )
  const favoriteCount = computed(() => favoriteCityIds.value.length)
  const unitLabel = computed(() => (temperatureUnit.value === 'celsius' ? '°C' : '°F'))
  const currentLocationName = computed(() => currentLocationCity.value?.name ?? selectedCityInfo.value.name)

  const hydratePreferences = () => {
    if (isHydrated.value) return
    const savedCityId = readStorage('skala-weather-selected-city', weatherList.value[0].id)
    selectedCityId.value = cityCatalog.some((city) => city.id === savedCityId) ? savedCityId : weatherList.value[0].id
    const savedUnit = readStorage('skala-weather-unit', 'celsius')
    const savedFavorites = readStorage('skala-weather-favorites', [])
    temperatureUnit.value = ['celsius', 'fahrenheit'].includes(savedUnit) ? savedUnit : 'celsius'
    favoriteCityIds.value = Array.isArray(savedFavorites) ? savedFavorites : []
    isHydrated.value = true
  }

  const formatTemperature = (celsius) => {
    const value = temperatureUnit.value === 'celsius' ? celsius : (celsius * 9) / 5 + 32
    return `${Math.round(value)}${unitLabel.value}`
  }

  const selectCity = (cityOrId) => {
    const nextId = typeof cityOrId === 'string' ? cityOrId : cityOrId.id
    selectedCityId.value = nextId
    if (nextId !== currentLocationCity.value?.id) {
      const nextCity = weatherList.value.find((city) => city.id === nextId)
      if (nextCity) locationMessage.value = `선택한 도시 · ${nextCity.name}`
    }
    // 지도·도시 목록에서 고른 지역 한 곳만 즉시 실시간으로 갱신한다.
    void refreshSelectedCity()
  }

  const restoreCurrentLocation = () => {
    const currentCity = currentLocationCity.value
    if (!currentCity || !weatherList.value.some((city) => city.id === currentCity.id)) return false
    selectedCityId.value = currentCity.id
    locationMessage.value = locationStatus.value === 'granted'
      ? `GPS 현재 위치 · ${currentCity.name}`
      : `${currentCity.name} 기본 위치`
    return true
  }

  const toggleUnit = () => {
    temperatureUnit.value = temperatureUnit.value === 'celsius' ? 'fahrenheit' : 'celsius'
  }

  const toggleFavorite = (cityId) => {
    favoriteCityIds.value = favoriteCityIds.value.includes(cityId)
      ? favoriteCityIds.value.filter((id) => id !== cityId)
      : [...favoriteCityIds.value, cityId]
  }

  const fetchCityWeather = async (city, { includeAirQuality = true } = {}) => {
    // 필요할 때만 호출하며, 명시적으로 비활성화한 환경에서는 준비된 데이터로 전환한다.
    if (!OPEN_METEO_ENABLED) return createMockCity(city)

    // 가장 중요한 날씨 응답을 부가 정보보다 먼저 기다린다.
    const forecastData = await fetchForecastData(city)
    const airQualityResponse = includeAirQuality
      ? await requestWithRateLimitRetry(() =>
          axios.get(AIR_QUALITY_API_URL, {
            params: {
              latitude: city.latitude,
              longitude: city.longitude,
              current: 'pm10,pm2_5,us_aqi',
              timezone: 'Asia/Seoul',
              forecast_days: 1,
            },
            timeout: 4500,
          }),
        ).catch(() => null)
      : null

    const { current, daily, hourly } = forecastData
    const condition = describeWeatherCode(current.weather_code)
    const currentHourIndex = Math.max(
      0,
      hourly.time.findIndex((time) => time >= current.time.slice(0, 13) + ':00'),
    )

    return {
      ...city,
      current: {
        temperature: current.temperature_2m,
        apparentTemperature: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        windSpeed: current.wind_speed_10m,
        precipitation: current.precipitation,
        weatherCode: current.weather_code,
        status: condition.label,
        icon: condition.icon,
        sentence: condition.sentence,
      },
      hourly: hourly.time.slice(currentHourIndex, currentHourIndex + 10).map((time, offset) => {
        const index = currentHourIndex + offset
        return {
          time,
          temperature: hourly.temperature_2m[index],
          apparentTemperature: hourly.apparent_temperature[index],
          precipitationProbability: hourly.precipitation_probability[index],
          windSpeed: hourly.wind_speed_10m[index],
          weatherCode: hourly.weather_code[index],
        }
      }),
      forecast: daily.time.map((date, index) => {
        const dailyCondition = describeWeatherCode(daily.weather_code[index])
        return {
          date,
          max: daily.temperature_2m_max[index],
          min: daily.temperature_2m_min[index],
          precipitation: daily.precipitation_probability_max[index],
          ...dailyCondition,
        }
      }),
      sun: {
        sunrise: daily.sunrise[0].slice(11, 16),
        sunset: daily.sunset[0].slice(11, 16),
        uvMax: daily.uv_index_max[0],
      },
      airQuality: airQualityResponse
        ? {
            pm10: Math.round(airQualityResponse.data.current.pm10),
            pm25: Math.round(airQualityResponse.data.current.pm2_5),
            aqi: Math.round(airQualityResponse.data.current.us_aqi),
            source: 'open-meteo',
          }
        : city.airQuality ?? createMockCity(city).airQuality,
      source: 'open-meteo',
    }
  }

  const mergeKmaObservation = async (weather) => {
    try {
      const observation = await fetchKmaCurrentWeather(weather)
      const condition = observation.condition
      return {
        ...weather,
        current: {
          ...weather.current,
          temperature: Number.isFinite(observation.temperature)
            ? observation.temperature
            : weather.current.temperature,
          apparentTemperature: Number.isFinite(observation.apparentTemperature)
            ? observation.apparentTemperature
            : weather.current.apparentTemperature,
          humidity: Number.isFinite(observation.humidity) ? observation.humidity : weather.current.humidity,
          windSpeed: Number.isFinite(observation.windSpeed) ? observation.windSpeed : weather.current.windSpeed,
          precipitation: observation.precipitation,
          ...(condition
            ? { status: condition.status, icon: condition.icon, sentence: condition.sentence }
            : {}),
        },
        kma: {
          observedAt: observation.observedAt,
          grid: observation.grid,
        },
        source: 'kma',
      }
    } catch (error) {
      if (error.message !== 'KMA_SERVICE_KEY_MISSING') console.warn('[KMA API]', error)
      return weather
    }
  }

  const refreshSelectedCity = async () => {
    const city = selectedCityInfo.value
    const requestId = ++activeSelectedWeatherRequest
    isLoading.value = true
    errorMessage.value = ''
    try {
      const weather = await mergeKmaObservation(await fetchCityWeather(city))
      const existingIndex = weatherList.value.findIndex((item) => item.id === city.id)
      if (existingIndex >= 0) weatherList.value.splice(existingIndex, 1, weather)
      else weatherList.value.unshift(weather)
      lastUpdatedAt.value = new Date()
      if (selectedCityId.value === city.id) weatherDataSource.value = weather.source ?? 'mock'
    } catch (error) {
      console.error('[Weather API]', error)
      if (selectedCityId.value === city.id) {
        weatherDataSource.value = 'mock'
        errorMessage.value = '실시간 연결에 실패해 준비된 날씨를 표시합니다.'
      }
    } finally {
      if (requestId === activeSelectedWeatherRequest) isLoading.value = false
    }
  }

  const loadNationwideWeather = async ({ force = false } = {}) => {
    if (isNationwideLoading.value) return
    if (
      !force &&
      nationwideUpdatedAt.value &&
      Date.now() - new Date(nationwideUpdatedAt.value).getTime() < WEATHER_CACHE_TTL
    ) return

    isNationwideLoading.value = true
    try {
      // 전국 도시 화면을 열었을 때만 작은 묶음으로 순차 요청한다.
      for (let index = 0; index < cityCatalog.length; index += NATIONWIDE_BATCH_SIZE) {
        const chunk = cityCatalog.slice(index, index + NATIONWIDE_BATCH_SIZE)
        const chunkWeather = await Promise.all(
          chunk.map(async (city) => {
            try {
              return await fetchCityWeather(city, { includeAirQuality: false })
            } catch (error) {
              console.warn(`[${city.name} Weather]`, error)
              return createMockCity(city)
            }
          }),
        )

        chunkWeather.forEach((weather) => {
          const existingIndex = weatherList.value.findIndex((item) => item.id === weather.id)
          const existingWeather = weatherList.value[existingIndex]
          if (weather.id === selectedCityId.value && existingWeather?.source !== 'mock') return
          if (existingIndex >= 0) weatherList.value.splice(existingIndex, 1, weather)
          else weatherList.value.push(weather)
        })
      }
      nationwideUpdatedAt.value = new Date()
      lastUpdatedAt.value = new Date()
    } finally {
      isNationwideLoading.value = false
    }
  }

  const initializeLocationWeather = async (userInitiated = false) => {
    if (locationStatus.value === 'locating') return false
    const requestId = ++activeLocationRequest
    locationStatus.value = 'locating'
    locationMessage.value = '현재 위치 확인 중'

    const permissionState = await getGeolocationPermissionState()
    // 허용 상태만 자동 실행한다. 미결정·차단 상태는 반드시 사용자의 클릭에서 요청한다.
    if (!userInitiated && permissionState !== 'granted') {
      // 위치 권한은 선택 사항이다. 권한이 없어도 저장된 선택 도시의 실시간 날씨로 바로 시작한다.
      locationStatus.value = 'fallback'
      locationMessage.value = permissionState === 'denied'
        ? `GPS 권한 없음 · 선택한 도시 ${selectedCityInfo.value.name}`
        : `선택한 도시 · ${selectedCityInfo.value.name}`
      return false
    }

    let targetCity = cityCatalog[0]
    let hasGpsPermission = false
    let geolocationError = null
    const savedGps = readStorage('skala-weather-last-gps', null)
    const canUseRecentGps =
      !userInitiated &&
      Number.isFinite(savedGps?.latitude) &&
      Number.isFinite(savedGps?.longitude) &&
      Date.now() - Number(savedGps?.savedAt ?? 0) < 10 * 60 * 1000

    try {
      const position = canUseRecentGps ? null : await getBrowserPosition()
      if (requestId !== activeLocationRequest) return
      const latitude = position?.coords.latitude ?? savedGps.latitude
      const longitude = position?.coords.longitude ?? savedGps.longitude
      targetCity = createLocationCity(latitude, longitude)
      hasGpsPermission = true
      if (position) {
        window.localStorage.setItem(
          'skala-weather-last-gps',
          JSON.stringify({
            latitude,
            longitude,
            accuracy: position.coords.accuracy,
            savedAt: Date.now(),
          }),
        )
      }
    } catch (error) {
      if (requestId !== activeLocationRequest) return
      // 위치 사용을 명시적으로 거부했거나 확인할 수 없을 때만 서울을 기본 위치로 사용한다.
      geolocationError = error
      console.warn('[Geolocation]', error)
    }

    currentLocationCity.value = targetCity
    selectedCityId.value = targetCity.id
    isLoading.value = true
    errorMessage.value = ''

    // 좌표를 얻는 즉시 화면을 열고, 실시간 값은 바로 이어서 교체한다.
    if (hasGpsPermission) {
      const provisionalWeather = createMockCity(targetCity)
      weatherList.value = [provisionalWeather, ...weatherList.value.filter((city) => city.id !== targetCity.id)]
      locationStatus.value = 'granted'
      locationMessage.value = `GPS 현재 위치 · ${targetCity.name}`
    } else {
      locationStatus.value = 'fallback'
      locationMessage.value = geolocationError?.code === 1 ? 'GPS 권한 차단 · 서울' : 'GPS 확인 실패 · 서울'
    }

    // 창문을 열기 전에 GPS 위치의 핵심 날씨만 먼저 준비한다.
    let primaryWeather
    try {
      primaryWeather = await fetchCityWeather(targetCity, { includeAirQuality: false })
      weatherDataSource.value = primaryWeather.source ?? 'mock'
    } catch (error) {
      console.warn('[Primary Location Weather]', error)
      primaryWeather = createMockCity(targetCity)
      weatherDataSource.value = 'mock'
      errorMessage.value = hasGpsPermission
        ? '현재 위치의 실시간 예보를 불러오지 못해 준비된 날씨를 먼저 표시합니다.'
        : '실시간 연결에 실패해 서울의 준비된 날씨를 표시합니다.'
    }

    if (hasGpsPermission) {
      weatherList.value = [primaryWeather, ...weatherList.value.filter((city) => city.id !== targetCity.id)]
      locationStatus.value = 'granted'
      locationMessage.value = `GPS 현재 위치 · ${targetCity.name}`
    } else {
      const seoulIndex = weatherList.value.findIndex((city) => city.id === targetCity.id)
      if (seoulIndex >= 0) weatherList.value.splice(seoulIndex, 1, primaryWeather)
      else weatherList.value.unshift(primaryWeather)
      locationStatus.value = 'fallback'
      locationMessage.value = geolocationError?.code === 1 ? 'GPS 권한 차단 · 서울' : 'GPS 확인 실패 · 서울'
      errorMessage.value ||= geolocationError?.code === 1
        ? '위치 권한이 차단되어 서울 날씨를 표시합니다. 브라우저에서 위치를 허용한 뒤 다시 찾아주세요.'
        : '현재 위치를 확인하지 못해 서울 날씨를 표시합니다. 위치 설정을 확인한 뒤 다시 찾아주세요.'
    }
    lastUpdatedAt.value = new Date()
    isLoading.value = false

    // 기상청 실황과 대기질은 첫 화면을 막지 않고 뒤에서 보완한다.
    void (async () => {
      try {
        const enrichedWeather = await mergeKmaObservation(await fetchCityWeather(targetCity))
        if (requestId !== activeLocationRequest) return
        if (hasGpsPermission) {
          const currentIndex = weatherList.value.findIndex((city) => city.id === targetCity.id)
          if (currentIndex >= 0) weatherList.value.splice(currentIndex, 1, enrichedWeather)
          else weatherList.value.unshift(enrichedWeather)
        } else {
          const seoulIndex = weatherList.value.findIndex((city) => city.id === targetCity.id)
          if (seoulIndex >= 0) weatherList.value.splice(seoulIndex, 1, enrichedWeather)
        }
        if (selectedCityId.value === targetCity.id) weatherDataSource.value = enrichedWeather.source ?? 'mock'
        lastUpdatedAt.value = new Date()
      } catch (error) {
        console.warn('[Location Weather Enrichment]', error)
      }
    })()
    return true
  }

  const refreshWeather = async () => {
    await refreshSelectedCity()
  }

  // Store의 상태를 감시하여 새로고침 뒤에도 개인 설정이 유지되게 한다.
  watch(selectedCityId, (id) => {
    window.localStorage.setItem('skala-weather-selected-city', JSON.stringify(id))
  })
  watch(temperatureUnit, (unit) => {
    window.localStorage.setItem('skala-weather-unit', JSON.stringify(unit))
  })
  watch(favoriteCityIds, (ids) => window.localStorage.setItem('skala-weather-favorites', JSON.stringify(ids)), {
    deep: true,
  })

  return {
    errorMessage,
    favoriteCityIds,
    favoriteCount,
    formatTemperature,
    hydratePreferences,
    initializeLocationWeather,
    isLoading,
    isNationwideLoading,
    lastUpdatedAt,
    loadNationwideWeather,
    locationMessage,
    locationStatus,
    currentLocationName,
    refreshWeather,
    restoreCurrentLocation,
    selectCity,
    selectedCityId,
    selectedCityInfo,
    temperatureUnit,
    toggleFavorite,
    toggleUnit,
    unitLabel,
    weatherDataSource,
    weatherList,
    nationwideUpdatedAt,
  }
})

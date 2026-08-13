import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

import { cityCatalog } from '../components/weather/data/cities'
import { fetchKmaCurrentWeather, fetchKmaForecast } from '../components/weather/services/kmaWeather'
import { fetchPublicDataWeather } from '../components/weather/services/publicDataWeather'
import { describeWeatherCode } from '../components/weather/utils/weatherCode'

const WEATHER_CACHE_TTL = 10 * 60 * 1000
const NATIONWIDE_BATCH_SIZE = 3

const createPendingCity = (city) => ({
  ...city,
  current: {
    temperature: null,
    apparentTemperature: null,
    humidity: null,
    windSpeed: null,
    precipitation: null,
    weatherCode: 0,
    status: '확인 중',
    icon: '',
    sentence: '실시간 기상청 응답을 기다리고 있어요.',
  },
  hourly: [],
  forecast: [],
  source: 'pending',
})

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
  const weatherList = ref(cityCatalog.map(createPendingCity))
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
  const weatherDataSource = ref('pending')
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
    const savedCityValue = window.localStorage.getItem('skala-weather-selected-city')
    const savedCityId = readStorage('skala-weather-selected-city', weatherList.value[0].id)
    const hasSavedCity = savedCityValue !== null && cityCatalog.some((city) => city.id === savedCityId)
    selectedCityId.value = hasSavedCity ? savedCityId : weatherList.value[0].id
    if (hasSavedCity) {
      locationStatus.value = 'selected'
      locationMessage.value = `선택한 도시 · ${selectedCityInfo.value.name}`
    }
    const savedUnit = readStorage('skala-weather-unit', 'celsius')
    const savedFavorites = readStorage('skala-weather-favorites', [])
    temperatureUnit.value = ['celsius', 'fahrenheit'].includes(savedUnit) ? savedUnit : 'celsius'
    favoriteCityIds.value = Array.isArray(savedFavorites) ? savedFavorites : []
    isHydrated.value = true
  }

  const formatTemperature = (celsius) => {
    if (!Number.isFinite(celsius)) return '--'
    const value = temperatureUnit.value === 'celsius' ? celsius : (celsius * 9) / 5 + 32
    return `${Math.round(value)}${unitLabel.value}`
  }

  const selectCity = (cityOrId) => {
    const nextId = typeof cityOrId === 'string' ? cityOrId : cityOrId.id
    selectedCityId.value = nextId
    if (nextId !== currentLocationCity.value?.id) {
      const nextCity = weatherList.value.find((city) => city.id === nextId)
      if (nextCity) {
        locationStatus.value = 'selected'
        locationMessage.value = `선택한 도시 · ${nextCity.name}`
      }
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

  const mergeKmaWeather = async (weather) => {
    const [observationResult, forecastResult] = await Promise.allSettled([
      fetchKmaCurrentWeather(weather),
      fetchKmaForecast(weather),
    ])

    const observation = observationResult.status === 'fulfilled' ? observationResult.value : null
    const kmaForecast = forecastResult.status === 'fulfilled' ? forecastResult.value : null
    if (!observation && !kmaForecast) return weather

    const firstForecast = kmaForecast?.hourly?.[0]
    const forecastCondition = firstForecast ? describeWeatherCode(firstForecast.weatherCode) : null
    const currentCondition = observation?.condition ?? forecastCondition
    return {
      ...weather,
      current: {
        ...weather.current,
        temperature: Number.isFinite(observation?.temperature)
          ? observation.temperature
          : (firstForecast?.temperature ?? weather.current.temperature),
        apparentTemperature: Number.isFinite(observation?.apparentTemperature)
          ? observation.apparentTemperature
          : (firstForecast?.apparentTemperature ?? weather.current.apparentTemperature),
        humidity: Number.isFinite(observation?.humidity)
          ? observation.humidity
          : (firstForecast?.humidity ?? weather.current.humidity),
        windSpeed: Number.isFinite(observation?.windSpeed)
          ? observation.windSpeed
          : (firstForecast?.windSpeed ?? weather.current.windSpeed),
        precipitation: observation?.precipitation ?? firstForecast?.precipitation ?? weather.current.precipitation,
        weatherCode: firstForecast?.weatherCode ?? weather.current.weatherCode,
        ...(currentCondition
          ? { status: currentCondition.label ?? currentCondition.status, icon: currentCondition.icon, sentence: currentCondition.sentence }
          : {}),
      },
      hourly: kmaForecast?.hourly?.length ? kmaForecast.hourly : weather.hourly,
      forecast: kmaForecast?.forecast?.length ? kmaForecast.forecast : weather.forecast,
      kma: {
        observedAt: observation?.observedAt,
        forecastIssuedAt: kmaForecast?.issuedAt,
        grid: observation?.grid ?? kmaForecast?.grid,
      },
      source: 'kma',
    }
  }

  const fetchPreferredWeather = async (city) => {
    const existingWeather = weatherList.value.find((item) => item.id === city.id)
    const baseWeather = existingWeather ? { ...existingWeather, ...city } : createPendingCity(city)
    const [weather, publicData] = await Promise.all([
      mergeKmaWeather(baseWeather),
      fetchPublicDataWeather(city),
    ])
    return {
      ...weather,
      ...publicData,
      sun: { ...weather.sun, ...publicData.sun },
      publicData: { ...weather.publicData, ...publicData.publicData },
    }
  }

  const refreshSelectedCity = async () => {
    const city = selectedCityInfo.value
    const requestId = ++activeSelectedWeatherRequest
    isLoading.value = true
    errorMessage.value = ''
    try {
      const weather = await fetchPreferredWeather(city)
      const existingIndex = weatherList.value.findIndex((item) => item.id === city.id)
      if (existingIndex >= 0) weatherList.value.splice(existingIndex, 1, weather)
      else weatherList.value.unshift(weather)
      lastUpdatedAt.value = new Date()
      if (selectedCityId.value === city.id) {
        weatherDataSource.value = weather.source ?? 'pending'
        if (weather.source === 'pending') {
          errorMessage.value = '기상청 날씨를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
        }
      }
    } catch {
      if (selectedCityId.value === city.id) {
        weatherDataSource.value = 'pending'
        errorMessage.value = '실시간 날씨를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
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
      // 전국 도시 화면을 열었을 때만 기상청 요청을 작은 묶음으로 순차 처리한다.
      for (let index = 0; index < cityCatalog.length; index += NATIONWIDE_BATCH_SIZE) {
        const chunk = cityCatalog.slice(index, index + NATIONWIDE_BATCH_SIZE)
        const chunkWeather = await Promise.all(chunk.map((city) => fetchPreferredWeather(city)))

        chunkWeather.forEach((weather) => {
          const existingIndex = weatherList.value.findIndex((item) => item.id === weather.id)
          const existingWeather = weatherList.value[existingIndex]
          if (weather.id === selectedCityId.value && existingWeather?.source !== 'pending') return
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

  const refreshCities = async (cityIds) => {
    const uniqueIds = [...new Set(cityIds)]
    const cities = uniqueIds.map((id) => cityCatalog.find((city) => city.id === id)).filter(Boolean)
    const results = await Promise.all(cities.map((city) => fetchPreferredWeather(city)))
    results.forEach((weather) => {
      const existingIndex = weatherList.value.findIndex((item) => item.id === weather.id)
      if (existingIndex >= 0) weatherList.value.splice(existingIndex, 1, weather)
      else weatherList.value.push(weather)
    })
    lastUpdatedAt.value = new Date()
  }

  const initializeLocationWeather = async (userInitiated = false) => {
    // 저장되었거나 방금 고른 도시는 자동 GPS보다 우선한다.
    // GPS 전환은 사용자가 '위치 다시 찾기'를 눌렀을 때만 수행한다.
    if (!userInitiated && locationStatus.value === 'selected') return false
    if (locationStatus.value === 'locating') return false
    const requestId = ++activeLocationRequest
    locationStatus.value = 'locating'
    locationMessage.value = '현재 위치 확인 중'

    const permissionState = await getGeolocationPermissionState()
    // 처음 방문한 prompt/unknown 상태에서는 브라우저의 GPS 권한 창을 띄운다.
    // 이미 차단한 상태에서만 자동 재요청하지 않고 저장된 선택 도시로 시작한다.
    if (!userInitiated && permissionState === 'denied') {
      locationStatus.value = 'fallback'
      locationMessage.value = `GPS 권한 없음 · 선택한 도시 ${selectedCityInfo.value.name}`
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
    }

    currentLocationCity.value = targetCity
    selectedCityId.value = targetCity.id
    isLoading.value = true
    errorMessage.value = ''

    // 좌표를 얻는 즉시 화면을 열고, 실시간 값은 바로 이어서 교체한다.
    if (hasGpsPermission) {
      const provisionalWeather = createPendingCity(targetCity)
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
      primaryWeather = await fetchPreferredWeather(targetCity)
      weatherDataSource.value = primaryWeather.source ?? 'pending'
    } catch {
      primaryWeather = createPendingCity(targetCity)
      weatherDataSource.value = 'pending'
      errorMessage.value = hasGpsPermission
        ? '현재 위치의 기상청 날씨를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.'
        : '기상청 연결에 실패했습니다. 잠시 후 다시 시도해주세요.'
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
    refreshCities,
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

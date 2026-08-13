import { computed, onActivated, onBeforeUnmount, onMounted, ref, watch, watchEffect } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'

import { useWeatherStore } from '../../../stores/weatherStore'

export const useWeatherApplication = () => {
  const route = useRoute()
  const router = useRouter()
  const weatherStore = useWeatherStore()

  // Pinia의 ref 상태는 storeToRefs를 사용해야 구조 분해 후에도 반응성을 유지한다.
  const {
    errorMessage,
    favoriteCityIds,
    favoriteCount,
    isLoading,
    lastUpdatedAt,
    locationMessage,
    locationStatus,
    selectedCityInfo,
    temperatureUnit,
    weatherList,
    weatherDataSource,
  } = storeToRefs(weatherStore)
  const {
    formatTemperature,
    hydratePreferences,
    initializeLocationWeather,
    refreshWeather,
    selectCity,
    toggleFavorite,
    toggleUnit,
  } = weatherStore

  // URL의 ?search= 값을 초기값으로 사용해 새로고침해도 검색 문맥을 복원한다.
  const searchQuery = ref(typeof route.query.search === 'string' ? route.query.search : '')

  const filteredWeatherList = computed(() => {
    const keyword = searchQuery.value.trim()
    if (!keyword) return weatherList.value
    return weatherList.value.filter((city) => city.name.includes(keyword) || city.area.includes(keyword))
  })

  const selectedStatusMessage = computed(() => `${selectedCityInfo.value.name}이 선택되었습니다.`)

  const clearSearch = () => {
    searchQuery.value = ''
  }

  // 교수님 예제처럼 검색어를 주소창 쿼리와 동기화한다.
  watch(searchQuery, (newQuery) => {
    router.replace({
      name: 'weather-home',
      query: { search: newQuery.trim() || undefined },
    })
  })

  // 브라우저의 뒤로/앞으로 가기로 URL이 바뀌어도 입력창을 맞춘다.
  watch(
    () => route.query.search,
    (query) => {
      const nextQuery = typeof query === 'string' ? query : ''
      if (nextQuery !== searchQuery.value) searchQuery.value = nextQuery
    },
  )

  // 과제 요구사항: 선택 도시의 이전값과 새 값을 명시적으로 감시한다.
  watch(selectedCityInfo, (newCity, oldCity) => {
    console.log(`[watch] 선택 도시: ${oldCity?.name ?? '없음'} -> ${newCity.name}`)
  })

  // 과제 요구사항: 콜백에서 읽은 검색어와 computed 결과를 자동 추적한다.
  watchEffect(() => {
    console.log(`[watchEffect] 검색어 '${searchQuery.value}', 결과 ${filteredWeatherList.value.length}개`)
  })

  const initialize = () => {
    hydratePreferences()
    if (!lastUpdatedAt.value) initializeLocationWeather()
    // 지도·도시 목록에서 고른 지역은 홈으로 돌아와도 유지한다.
    // GPS 위치로 전환하는 동작은 사용자가 현재 위치 버튼을 눌렀을 때만 실행한다.
  }

  const useCurrentLocation = () => initializeLocationWeather(true)

  const retryLocationAfterPermissionChange = () => {
    if (['needs-permission', 'fallback'].includes(locationStatus.value)) initializeLocationWeather()
  }

  onMounted(() => {
    initialize()
    window.addEventListener('focus', retryLocationAfterPermissionChange)
  })
  onBeforeUnmount(() => window.removeEventListener('focus', retryLocationAfterPermissionChange))
  // KeepAlive에서 다시 활성화될 때 URL 검색어를 화면에 복원한다.
  onActivated(() => {
    searchQuery.value = typeof route.query.search === 'string' ? route.query.search : ''
  })

  return {
    clearSearch,
    errorMessage,
    favoriteCityIds,
    favoriteCount,
    filteredWeatherList,
    formatTemperature,
    isLoading,
    lastUpdatedAt,
    locationMessage,
    locationStatus,
    refreshWeather,
    searchQuery,
    selectCity,
    selectedCityInfo,
    selectedStatusMessage,
    temperatureUnit,
    toggleFavorite,
    toggleUnit,
    useCurrentLocation,
    weatherDataSource,
    weatherList,
  }
}

<script setup>
import { computed, onMounted, reactive } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import BaseDashboardCard from '../components/weather/BaseDashboardCard.vue'
import WeatherCityCard from '../components/weather/WeatherCityCard.vue'
import WeatherSearchBar from '../components/weather/WeatherSearchBar.vue'
import { getCityGuide } from '../components/weather/data/cityGuides'
import { useWeatherStore } from '../stores/weatherStore'

const router = useRouter()
const weatherStore = useWeatherStore()
const { favoriteCityIds, isNationwideLoading, selectedCityInfo, weatherList } = storeToRefs(weatherStore)
const { formatTemperature, hydratePreferences, loadNationwideWeather, selectCity, toggleFavorite } = weatherStore

const filters = reactive({
  query: '',
  scope: 'all',
})

const cities = computed(() => weatherList.value.filter((city) => city.id !== 'current_location'))
const filteredCities = computed(() => {
  const keyword = filters.query.trim()
  return cities.value.filter((city) => {
    const matchesScope = filters.scope === 'all' || favoriteCityIds.value.includes(city.id)
    const matchesQuery = !keyword || city.name.includes(keyword) || city.area.includes(keyword)
    return matchesScope && matchesQuery
  })
})

const weatherMode = (city) => {
  const code = city.current.weatherCode
  if (city.current.temperature <= 2 || [71, 73, 75, 77, 85, 86].includes(code)) return 'snowy'
  if ((city.current.precipitation ?? 0) > 0 || (code >= 51 && code < 70) || [80, 81, 82].includes(code)) return 'rainy'
  if (city.current.windSpeed >= 15 || [2, 3, 45, 48].includes(code)) return 'cloudy'
  return 'sunny'
}

const cityHighlight = (city) => {
  const mode = ['rainy', 'snowy'].includes(weatherMode(city)) ? 'indoor' : 'outdoor'
  return getCityGuide(city.guideId ?? city.id).places[mode][0][0]
}

const openCity = (city) => {
  selectCity(city)
  router.push({ name: 'weather-detail', params: { cityId: city.guideId ?? city.id } })
}

onMounted(() => {
  hydratePreferences()
  void loadNationwideWeather()
})
</script>

<template>
  <main class="cities-page" :style="{ '--scene': `url(${selectedCityInfo.background})` }">

    <section class="cities-hero">
      <div>
        <p>CITY WEATHER WINDOWS</p>
        <h1>도시마다 다른 풍경,<br /><em>지금의 날씨까지.</em></h1>
      </div>
      <p>같은 하늘도 도시의 표정에 따라 다르게 보여요.<br />풍경을 고르면 오늘의 여행 추천으로 이어집니다.</p>
    </section>

    <BaseDashboardCard label="도시 목록 필터">
      <template #controls>
        <div class="scope-tabs">
          <button type="button" :class="{ active: filters.scope === 'all' }" @click="filters.scope = 'all'">전체 도시 <span>{{ cities.length }}</span></button>
          <button type="button" :class="{ active: filters.scope === 'favorites' }" @click="filters.scope = 'favorites'">즐겨찾기 <span>{{ favoriteCityIds.length }}</span></button>
        </div>
        <WeatherSearchBar v-model="filters.query" :result-count="filteredCities.length" />
      </template>
      <template #footer>
        검색과 즐겨찾기 상태를 조합한 computed 결과 {{ filteredCities.length }}개
      </template>
    </BaseDashboardCard>

    <section class="city-grid" aria-live="polite">
      <WeatherCityCard
        v-for="city in filteredCities"
        :key="city.id"
        :city="city"
        :display-temperature="formatTemperature(city.current.temperature)"
        :favorite="favoriteCityIds.includes(city.id)"
        :highlight="cityHighlight(city)"
        :mode="weatherMode(city)"
        :selected="city.id === selectedCityInfo.id"
        @select="openCity"
        @toggle-favorite="toggleFavorite"
      />

      <div v-if="!filteredCities.length" class="empty-state glass">
        <strong>{{ filters.scope === 'favorites' ? '아직 저장한 도시가 없어요.' : '검색 결과가 없어요.' }}</strong>
        <p>{{ filters.scope === 'favorites' ? '전체 도시에서 ☆을 눌러 나만의 하늘 목록을 만들어보세요.' : '다른 지역 이름으로 다시 찾아보세요.' }}</p>
        <button v-if="filters.scope === 'favorites'" type="button" @click="filters.scope = 'all'">전체 도시 보기</button>
      </div>
    </section>

    <p v-if="isNationwideLoading" class="loading-note">전국의 실시간 하늘을 차례로 읽는 중…</p>
  </main>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
.cities-page { min-height: 100vh; padding: 16px 24px 64px; overflow: hidden; color: #f8faff; font-family: Pretendard, sans-serif; background: linear-gradient(135deg, rgb(12 23 47 / 93%), rgb(69 65 101 / 68%) 48%, rgb(11 25 47 / 92%)), radial-gradient(circle at 80% 11%, rgb(255 196 213 / 26%), transparent 30rem), radial-gradient(circle at 12% 73%, rgb(164 195 255 / 22%), transparent 31rem), var(--scene) center / cover fixed; }
.glass { background: linear-gradient(125deg, rgb(255 255 255 / 16%), rgb(255 255 255 / 5%)); border: 1px solid rgb(255 255 255 / 22%); box-shadow: 0 28px 70px rgb(2 9 23 / 24%), inset 0 1px 0 rgb(255 255 255 / 18%); backdrop-filter: blur(28px) saturate(122%); }
.cities-header { display: flex; width: min(1460px, 100%); height: 72px; margin: 0 auto; padding: 0 21px; align-items: center; justify-content: space-between; border-radius: 22px; }
.brand { display: inline-flex; align-items: center; gap: 11px; color: inherit; font-size: 15px; font-weight: 700; text-decoration: none; }.brand-mark { display: grid; width: 37px; height: 37px; place-items: center; color: #172039; background: linear-gradient(145deg, #fff, #d8ff45); border-radius: 50%; }.brand small { display: block; margin-top: 4px; font-size: 11px; letter-spacing: 1.6px; }
.cities-header nav { display: flex; gap: 22px; }.cities-header nav a { color: rgb(255 255 255 / 72%); font-size: 14px; text-decoration: none; }
.cities-hero { display: flex; width: min(1460px, 100%); margin: 0 auto; padding: 76px 18px 48px; align-items: end; justify-content: space-between; gap: 40px; }
.cities-hero > div > p { margin: 0 0 15px; color: #d8ff45; font-size: 12px; font-weight: 700; letter-spacing: 2.2px; }.cities-hero h1 { margin: 0; font-size: clamp(43px, 5.2vw, 76px); line-height: 1.06; letter-spacing: -.055em; }.cities-hero h1 em { color: transparent; background: linear-gradient(100deg, #fff, #d4ddff 52%, #ffd3df); background-clip: text; -webkit-background-clip: text; font-style: normal; }.cities-hero > p { margin: 0 0 7px; color: rgb(240 244 255 / 60%); font-size: 15px; line-height: 1.7; }
.scope-tabs { display: flex; gap: 5px; }.scope-tabs button { min-height: 44px; padding: 0 16px; color: rgb(255 255 255 / 60%); background: transparent; border: 0; border-radius: 13px; font-size: 14px; cursor: pointer; }.scope-tabs button span { margin-left: 7px; color: rgb(255 255 255 / 40%); }.scope-tabs button.active { color: #18213b; background: linear-gradient(125deg, #fff, #e5ddff); font-weight: 700; }.scope-tabs button.active span { color: #7c7891; }
.city-grid { display: grid; width: min(1460px, 100%); margin: 0 auto; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
.empty-state { padding: 54px; grid-column: 1 / -1; text-align: center; border-radius: 28px; }.empty-state strong { font-size: 21px; }.empty-state p { color: rgb(255 255 255 / 55%); font-size: 14px; }.empty-state button { min-height: 40px; padding: 0 15px; color: #18213b; background: #d8ff45; border: 0; border-radius: 20px; cursor: pointer; }.loading-note { width: min(1460px, 100%); margin: 18px auto 0; color: rgb(255 255 255 / 48%); font-size: 13px; }
@media (max-width: 1050px) { .city-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.cities-hero { padding-top: 58px; }.cities-hero > p { display: none; } }
@media (max-width: 680px) { .cities-page { padding: 10px 11px 42px; }.cities-header { height: 64px; padding: 0 14px; border-radius: 18px; }.cities-header nav { gap: 12px; }.cities-header nav a:first-child { display: none; }.cities-hero { padding: 48px 7px 32px; }.cities-hero h1 { font-size: 42px; }.scope-tabs { display: grid; grid-template-columns: 1fr 1fr; }.city-grid { grid-template-columns: 1fr; gap: 14px; } }
/* Shared layout rhythm */
.cities-page { padding: 0 var(--layout-gutter) var(--section-gap); overflow: visible; overflow-x: clip; }
.cities-header,.cities-hero,.city-grid,.loading-note { width: min(var(--layout-max), 100%); }
.cities-header { min-height: 72px; height: auto; padding: 0 24px; border-radius: var(--radius-md); }
.cities-hero { padding: clamp(56px, 7vw, 96px) 8px clamp(36px, 4vw, 56px); gap: 48px; }
.cities-hero h1 { font-size: var(--title-page); line-height: 1.08; }
.city-grid { gap: var(--card-gap); }
.scope-tabs button { min-height: 46px; }
@media (max-width: 680px) { .cities-page { padding: 10px var(--layout-gutter) 42px; }.cities-header { min-height: 64px; border-radius: var(--radius-md); }.city-grid { gap: var(--card-gap); } }
@media (max-width: 900px) { .cities-header nav a:first-child { display: none; }.cities-hero { align-items: flex-start; flex-direction: column; }.cities-hero > p { display: block; }.city-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) { .cities-header .brand small { display: none; }.cities-header nav a:not(:last-child) { display: none; }.city-grid { grid-template-columns: 1fr; }.scope-tabs button { min-width: 0; padding: 0 10px; } }
@media (max-width: 680px) { .cities-page { padding-top: 0; } }
</style>

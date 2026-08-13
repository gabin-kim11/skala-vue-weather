<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import koreaProvinceMap from '../assets/map/south-korea-provinces.svg?raw'
import { useWeatherStore } from '../stores/weatherStore'

const weatherStore = useWeatherStore()
const router = useRouter()
const { favoriteCityIds, isLoading, lastUpdatedAt, locationMessage, selectedCityInfo, weatherDataSource, weatherList } =
  storeToRefs(weatherStore)
const { formatTemperature, hydratePreferences, initializeLocationWeather, refreshWeather, selectCity, toggleFavorite } = weatherStore

const query = ref('')
const isZooming = ref(false)
const zoomedCity = ref(null)
let zoomTimer

const filteredCities = computed(() => {
  const keyword = query.value.trim()
  const cities = weatherList.value.filter((city) => city.id !== 'current_location')
  if (!keyword) return cities
  return cities.filter((city) => city.name.includes(keyword) || city.area.includes(keyword))
})

const favoriteCities = computed(() =>
  favoriteCityIds.value
    .map((cityId) => weatherList.value.find((city) => city.id === cityId))
    .filter(Boolean),
)

const provinceMapConfig = {
  서울특별시: { cityId: 'seoul', label: '서울', x: 32, y: 20.2 },
  부산광역시: { cityId: 'busan', label: '부산', x: 81.8, y: 62 },
  대구광역시: { cityId: 'daegu', label: '대구', x: 69.5, y: 50.7 },
  인천광역시: { cityId: 'incheon', label: '인천', x: 17.5, y: 22 },
  광주광역시: { cityId: 'gwangju', label: '광주', x: 27.8, y: 62.7 },
  대전광역시: { cityId: 'daejeon', label: '대전', x: 41.5, y: 43.6 },
  울산광역시: { cityId: 'ulsan', label: '울산', x: 86, y: 55.8 },
  세종특별자치시: { cityId: 'sejong', label: '세종', x: 38.2, y: 38.8 },
  경기도: { cityId: 'suwon', label: '경기', x: 35.5, y: 13.8 },
  강원도: { cityId: 'chuncheon', label: '강원', x: 63, y: 16.5 },
  충청북도: { cityId: 'cheongju', label: '충북', x: 52, y: 34.2 },
  충청남도: { cityId: 'hongseong', label: '충남', x: 28.5, y: 37.8 },
  전라북도: { cityId: 'jeonju', label: '전북', x: 35.3, y: 52.8 },
  전라남도: { cityId: 'muan', label: '전남', x: 31, y: 68.2 },
  경상북도: { cityId: 'andong', label: '경북', x: 73.5, y: 41.5 },
  경상남도: { cityId: 'changwon', label: '경남', x: 61.8, y: 59.3 },
  제주특별자치도: { cityId: 'jeju', label: '제주', x: 20.8, y: 95.1 },
}

const mapRegions = computed(() =>
  Object.entries(provinceMapConfig)
    .map(([provinceName, config]) => ({
      ...config,
      provinceName,
      city: weatherList.value.find((city) => city.id === config.cityId),
    }))
    .filter((region) => region.city),
)

const renderedProvinceMap = computed(() =>
  koreaProvinceMap.replace(/<path\b([^>]*?)\sid="([^"]+)"([^>]*)\/>/g, (path, before, provinceName, after) => {
    const config = provinceMapConfig[provinceName]
    if (!config) return path
    const isActive = selectedCityInfo.value.id === config.cityId
    return `<path${before} id="${provinceName}"${after} class="province-shape${isActive ? ' is-active' : ''}" data-city-id="${config.cityId}" role="button" tabindex="0" aria-label="${provinceName} 날씨 선택"/>`
  }),
)

const regionStyle = (region) => ({ left: `${region.x}%`, top: `${region.y}%` })

const currentLocation = computed(() => weatherList.value.find((city) => city.id === 'current_location'))

const mapZoomStyle = computed(() => {
  if (!zoomedCity.value) return { '--zoom-x': '50%', '--zoom-y': '50%' }
  const region = mapRegions.value.find((item) => item.cityId === zoomedCity.value.id)
  return region ? { '--zoom-x': `${region.x}%`, '--zoom-y': `${region.y}%` } : { '--zoom-x': '50%', '--zoom-y': '50%' }
})

const chooseRegion = (cityId) => {
  const city = weatherList.value.find((item) => item.id === cityId)
  if (city) chooseCity(city)
}

const handleProvinceInteraction = (event) => {
  const cityId = event.target.closest?.('[data-city-id]')?.dataset.cityId
  if (cityId) chooseRegion(cityId)
}

const chooseCity = async (city) => {
  if (isZooming.value) return
  selectCity(city)
  zoomedCity.value = city
  await nextTick()
  window.requestAnimationFrame(() => {
    isZooming.value = true
  })
  zoomTimer = window.setTimeout(() => {
    router.push({ name: 'weather-detail', params: { cityId: city.guideId ?? city.id } })
  }, 1150)
}

onMounted(async () => {
  hydratePreferences()
  if (!lastUpdatedAt.value) {
    const initializedFromLocation = await initializeLocationWeather()
    if (!initializedFromLocation) await refreshWeather()
  }
})

onBeforeUnmount(() => window.clearTimeout(zoomTimer))
</script>

<template>
  <main
    class="map-page"
    :style="{ '--scene': `url(${selectedCityInfo.background})` }"
  >

    <div class="map-layout">
      <aside class="region-panel glass">
        <div class="panel-title">
          <p>REGION FINDER</p>
          <h1>어느 지역의<br />하늘을 볼까요?</h1>
          <span>{{ locationMessage }} · {{ weatherDataSource === 'kma' ? '기상청 실황' : weatherDataSource === 'open-meteo' ? '실시간 예보' : '준비된 날씨' }}</span>
        </div>

        <button
          v-if="currentLocation"
          class="current-location"
          type="button"
          :disabled="isZooming"
          :class="{ active: selectedCityInfo.id === currentLocation.id }"
          @click="chooseCity(currentLocation)"
        >
          <span>◎</span>
          <span>내 현재 위치<small>GPS로 확인한 위치</small></span>
          <strong>{{ formatTemperature(currentLocation.current.temperature) }}</strong>
        </button>

        <section class="favorite-panel" aria-labelledby="favorite-title">
          <header>
            <div>
              <p>MY SKY LIST</p>
              <h2 id="favorite-title">즐겨찾기</h2>
            </div>
            <span>{{ favoriteCities.length }}</span>
          </header>
          <div v-if="favoriteCities.length" class="favorite-list">
            <div v-for="city in favoriteCities" :key="city.id" class="favorite-chip">
              <button type="button" :disabled="isZooming" @click="chooseCity(city)">
                <span>{{ city.name }}</span>
                <strong>{{ formatTemperature(city.current.temperature) }}</strong>
              </button>
              <button
                class="remove-favorite"
                type="button"
                :aria-label="`${city.name} 즐겨찾기 삭제`"
                @click="toggleFavorite(city.id)"
              >
                ★
              </button>
            </div>
          </div>
          <p v-else class="favorite-empty">도시 옆 ☆을 누르면 여기에 모아볼 수 있어요.</p>
        </section>

        <label class="region-search">
          <span aria-hidden="true">⌕</span>
          <input v-model="query" type="search" placeholder="시·도 또는 도시 검색" />
          <small>{{ filteredCities.length }}</small>
        </label>

        <div class="region-list">
          <div
            v-for="city in filteredCities"
            :key="city.id"
            class="region-row"
            :class="{ active: selectedCityInfo.id === city.id }"
          >
            <button class="city-option" type="button" :disabled="isZooming" @click="chooseCity(city)">
              <span>{{ city.area }}<strong>{{ city.name }}</strong></span>
              <span>{{ city.current.icon }} {{ formatTemperature(city.current.temperature) }}</span>
            </button>
            <button
              class="favorite-toggle"
              type="button"
              :aria-pressed="favoriteCityIds.includes(city.id)"
              :aria-label="`${city.name} ${favoriteCityIds.includes(city.id) ? '즐겨찾기 삭제' : '즐겨찾기 추가'}`"
              @click="toggleFavorite(city.id)"
            >
              {{ favoriteCityIds.includes(city.id) ? '★' : '☆' }}
            </button>
          </div>
        </div>
      </aside>

      <section
        class="map-canvas glass"
        :class="{ 'is-zooming': isZooming }"
        aria-label="대한민국 지역별 날씨 지도"
      >
        <div class="map-caption">
          <div>
            <p>LIVE WEATHER MAP</p>
            <h2>대한민국</h2>
          </div>
          <span><i></i> 지도 또는 지역명을 눌러 날씨 보기</span>
        </div>

        <div class="korea-map" :style="mapZoomStyle">
          <div
            class="province-map-art"
            aria-label="대한민국 시도 선택 지도"
            @click="handleProvinceInteraction"
            @keydown.enter.space.prevent="handleProvinceInteraction"
            v-html="renderedProvinceMap"
          ></div>
          <button
            v-for="region in mapRegions"
            :key="region.cityId"
            class="province-label"
            :class="{ active: selectedCityInfo.id === region.cityId }"
            :style="regionStyle(region)"
            type="button"
            :disabled="isZooming"
            :aria-label="`${region.provinceName} 날씨 선택`"
            @click="chooseRegion(region.cityId)"
          >
            <span>{{ region.label }}</span>
            <small v-if="selectedCityInfo.id === region.cityId">{{ formatTemperature(region.city.current.temperature) }}</small>
          </button>
        </div>

        <article class="selected-weather-card">
          <div>
            <p>SELECTED REGION</p>
            <h3>{{ selectedCityInfo.area }} · {{ selectedCityInfo.name }}</h3>
            <span>{{ selectedCityInfo.current.status }}</span>
          </div>
          <strong>{{ formatTemperature(selectedCityInfo.current.temperature) }}</strong>
          <dl>
            <div><dt>체감</dt><dd>{{ formatTemperature(selectedCityInfo.current.apparentTemperature) }}</dd></div>
            <div><dt>습도</dt><dd>{{ selectedCityInfo.current.humidity }}%</dd></div>
            <div><dt>바람</dt><dd>{{ selectedCityInfo.current.windSpeed }} km/h</dd></div>
          </dl>
          <RouterLink
            :to="`/weather/${selectedCityInfo.guideId ?? selectedCityInfo.id}`"
            @click.prevent="chooseCity(selectedCityInfo)"
          >
            이 도시의 오늘 여행 <span>→</span>
          </RouterLink>
        </article>

        <Transition name="city-focus">
          <div v-if="isZooming" class="city-focus-card" aria-live="polite">
            <span>{{ selectedCityInfo.area }}</span>
            <strong>{{ selectedCityInfo.name }}</strong>
            <p>{{ selectedCityInfo.current.status }} · {{ formatTemperature(selectedCityInfo.current.temperature) }}</p>
            <small>오늘의 여행 장면을 여는 중</small>
          </div>
        </Transition>

        <p v-if="isLoading" class="loading-note">전국의 하늘을 읽는 중…</p>
      </section>
    </div>
  </main>
</template>

<style scoped>
.map-page {
  min-height: 100vh;
  padding: 12px 18px 24px;
  overflow-x: clip;
  color: #f7f9ff;
  font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background:
    linear-gradient(135deg, rgb(17 24 48 / 91%), rgb(77 70 105 / 57%) 48%, rgb(17 27 49 / 91%)),
    radial-gradient(circle at 76% 15%, rgb(255 198 209 / 25%), transparent 28rem),
    radial-gradient(circle at 20% 70%, rgb(164 190 255 / 23%), transparent 30rem),
    var(--scene) center / cover fixed;
}

.glass {
  background: linear-gradient(125deg, rgb(255 255 255 / 18%), rgb(255 255 255 / 6%));
  border: 1px solid rgb(255 255 255 / 26%);
  box-shadow: 0 28px 70px rgb(2 9 23 / 28%), inset 0 1px 0 rgb(255 255 255 / 20%);
  backdrop-filter: blur(30px) saturate(118%);
}

.map-header {
  display: grid;
  width: min(1880px, 100%);
  height: 76px;
  margin: 0 auto 12px;
  padding: 0 24px;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  border-radius: 22px;
}
.brand { display: inline-flex; align-items: center; gap: 11px; color: inherit; font-size: 15px; font-weight: 700; line-height: 1; text-decoration: none; }
.brand-mark { display: grid; width: 37px; height: 37px; place-items: center; color: #172039; background: linear-gradient(145deg, #fff, #d8ff45); border-radius: 50%; }
.brand small { display: block; margin-top: 5px; font-size: 11px; letter-spacing: 1.7px; }
.map-header-copy { display: flex; align-items: center; gap: 12px; }
.map-header-copy span { font-size: 14px; font-weight: 650; }
.map-header-copy small { padding-left: 12px; color: rgb(255 255 255 / 53%); border-left: 1px solid rgb(255 255 255 / 23%); font-size: 13px; }
.close-map { justify-self: end; color: inherit; font-size: 15px; text-decoration: none; }
.close-map span { margin-left: 8px; color: #d8ff45; }

.map-layout { display: grid; width: min(1880px, 100%); min-height: calc(100vh - 112px); margin: 0 auto; grid-template-columns: 360px minmax(0, 1fr); gap: 14px; }
.region-panel, .map-canvas { border-radius: 32px; }
.region-panel { display: flex; min-height: 0; padding: 38px 26px 25px; flex-direction: column; }
.panel-title p, .map-caption p, .selected-weather-card p { margin: 0 0 8px; color: #f7d5df; font-size: 12px; font-weight: 700; letter-spacing: 2.1px; }
.panel-title h1 { margin: 0; font-size: clamp(28px, 2.5vw, 38px); line-height: 1.18; letter-spacing: -.035em; }
.panel-title > span { display: block; margin: 15px 0 24px; color: rgb(238 243 255 / 57%); font-size: 14px; }
.current-location { display: grid; min-height: 70px; padding: 0 17px; grid-template-columns: auto 1fr auto; align-items: center; gap: 12px; color: #fff; text-align: left; background: linear-gradient(120deg, rgb(243 207 219 / 22%), rgb(255 255 255 / 7%)); border: 1px solid rgb(255 222 232 / 34%); border-radius: 18px; cursor: pointer; }
.current-location > span:first-child { color: #ffdce5; font-size: 19px; }
.current-location span small { display: block; color: rgb(255 255 255 / 52%); font-size: 12px; font-weight: 400; }
.current-location strong { font-size: 16px; }
.current-location.active { color: #28304c; background: linear-gradient(135deg, #fff8fb, #e8d7ff); }
.current-location.active span small { color: rgb(18 27 49 / 56%); }
.favorite-panel { margin-top: 17px; padding: 19px; background: linear-gradient(125deg, rgb(255 255 255 / 11%), rgb(255 255 255 / 4%)); border: 1px solid rgb(255 255 255 / 14%); border-radius: 19px; }
.favorite-panel > header { display: flex; align-items: center; justify-content: space-between; }
.favorite-panel header p { margin: 0 0 3px; color: #d8ff45; font-size: 11px; font-weight: 700; letter-spacing: 1.7px; }
.favorite-panel h2 { margin: 0; font-size: 15px; }
.favorite-panel header > span { display: grid; width: 28px; height: 28px; place-items: center; color: #25304c; background: linear-gradient(145deg, #fff, #d8ff45); border-radius: 50%; font-size: 13px; font-weight: 700; }
.favorite-list { display: flex; margin-top: 13px; padding-bottom: 2px; gap: 8px; overflow-x: auto; scrollbar-width: thin; }
.favorite-chip { display: flex; min-width: 112px; height: 48px; overflow: hidden; flex: 0 0 auto; background: linear-gradient(125deg, rgb(248 239 250 / 19%), rgb(188 206 255 / 12%)); border: 1px solid rgb(255 255 255 / 17%); border-radius: 13px; }
.favorite-chip > button:first-child { display: flex; min-width: 0; padding: 0 4px 0 11px; flex: 1; align-items: flex-start; justify-content: center; flex-direction: column; color: #fff; text-align: left; background: transparent; border: 0; cursor: pointer; }
.favorite-chip span { font-size: 14px; font-weight: 650; }.favorite-chip strong { color: rgb(255 255 255 / 55%); font-size: 12px; }
.remove-favorite { width: 31px; padding: 0; color: #ffe0a8; background: transparent; border: 0; cursor: pointer; }
.favorite-empty { margin: 12px 0 0; color: rgb(255 255 255 / 43%); font-size: 12px; line-height: 1.5; }
.region-search { display: flex; min-height: 54px; margin: 17px 0 11px; padding: 0 15px; align-items: center; gap: 10px; background: linear-gradient(115deg, rgb(255 255 255 / 12%), rgb(255 255 255 / 5%)); border: 1px solid rgb(255 255 255 / 15%); border-radius: 15px; }
.region-search input { min-width: 0; flex: 1; color: #fff; background: transparent; border: 0; outline: 0; }
.region-search input::placeholder { color: rgb(255 255 255 / 42%); }
.region-search small { color: rgb(255 255 255 / 45%); }
.region-list { min-height: 0; padding-right: 3px; overflow-y: auto; scrollbar-width: thin; }
.region-row { display: grid; min-height: 68px; margin-bottom: 5px; grid-template-columns: minmax(0, 1fr) 44px; align-items: stretch; border-bottom: 1px solid rgb(255 255 255 / 9%); border-radius: 15px; transition: background 180ms ease, box-shadow 180ms ease; }
.city-option { display: flex; width: 100%; padding: 10px 7px 10px 12px; align-items: center; justify-content: space-between; color: rgb(255 255 255 / 72%); text-align: left; background: transparent; border: 0; cursor: pointer; }
.city-option span:first-child { font-size: 12px; }
.city-option span:first-child strong { display: block; color: #fff; font-size: 14px; }
.city-option > span:last-child { font-size: 15px; }
.favorite-toggle { color: rgb(255 255 255 / 47%); background: transparent; border: 0; font-size: 18px; cursor: pointer; }
.favorite-toggle[aria-pressed='true'] { color: #ffe4a9; text-shadow: 0 0 12px rgb(255 220 145 / 55%); }
.region-row:hover { background: rgb(255 255 255 / 7%); }
.region-row.active { color: #28304c; background: linear-gradient(110deg, rgb(255 220 230 / 94%), rgb(219 226 255 / 86%)); box-shadow: 0 12px 28px rgb(20 22 48 / 18%); }
.region-row.active .city-option { color: #28304c; }.region-row.active .city-option span:first-child strong { color: #121b31; }.region-row.active .favorite-toggle { color: #5d5872; }

.map-canvas { position: relative; min-height: max(920px, calc(100vh - 112px)); overflow: hidden; background: radial-gradient(circle at 43% 48%, rgb(255 217 229 / 9%), transparent 34rem), linear-gradient(150deg, rgb(255 255 255 / 13%), rgb(109 104 151 / 8%)); }
.map-caption { position: absolute; z-index: 6; top: 40px; right: 46px; left: 46px; display: flex; align-items: start; justify-content: space-between; }
.map-caption h2 { margin: 0; font-size: 36px; }
.map-caption > span { color: rgb(255 255 255 / 57%); font-size: 13px; }
.map-caption i { display: inline-block; width: 7px; height: 7px; margin-right: 6px; background: #ffd6e0; border-radius: 50%; box-shadow: 0 0 14px #ffd6e0; }
.korea-map {
  position: absolute;
  top: 53%;
  left: 1%;
  width: min(76%, 1050px);
  aspect-ratio: 470 / 759;
  transform: translateY(-50%) scale(1);
  transform-origin: var(--zoom-x) var(--zoom-y);
  transition: transform 1050ms cubic-bezier(.2,.72,.22,1), filter 600ms ease;
  will-change: transform;
}
.province-map-art { position: absolute; inset: 0; filter: saturate(.92) drop-shadow(0 32px 48px rgb(4 8 27 / 24%)); }
.province-map-art :deep(svg) { display: block; width: 100%; height: 100%; overflow: visible; }
.province-map-art :deep(.province-shape) { cursor: pointer; transition: fill 180ms ease, filter 180ms ease, opacity 180ms ease; }
.province-map-art :deep(.province-shape:hover),
.province-map-art :deep(.province-shape:focus-visible) { fill: #f6dce8 !important; filter: brightness(1.08); outline: none; }
.province-map-art :deep(.province-shape.is-active) { fill: #fff0f5 !important; filter: brightness(1.12) drop-shadow(0 0 12px rgb(255 214 229 / 72%)); }
.map-canvas.is-zooming .korea-map { z-index: 11; transform: translateY(-50%) scale(2.18); filter: saturate(1.04); }
.map-canvas.is-zooming .map-caption,
.map-canvas.is-zooming .selected-weather-card,
.map-canvas.is-zooming .loading-note { opacity: 0; transform: translateY(-8px); pointer-events: none; }
.map-caption, .selected-weather-card, .loading-note { transition: opacity 300ms ease, transform 300ms ease; }
.province-label { position: absolute; z-index: 4; display: flex; min-width: 32px; min-height: 26px; padding: 3px 6px; align-items: center; justify-content: center; flex-direction: column; color: #404a6a; background: rgb(255 255 255 / 42%); border: 1px solid rgb(255 255 255 / 48%); border-radius: 9px; box-shadow: 0 5px 14px rgb(23 31 63 / 12%); font-size: 12px; font-weight: 750; line-height: 1.05; cursor: pointer; transform: translate(-50%, -50%); backdrop-filter: blur(4px); transition: color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease; }
.province-label small { margin-top: 3px; font-size: 10px; font-weight: 800; }
.province-label:hover,.province-label:focus-visible { z-index: 8; color: #232d4d; background: rgb(255 250 252 / 90%); outline: none; box-shadow: 0 8px 18px rgb(20 27 59 / 20%); transform: translate(-50%, -50%) scale(1.08); }
.province-label.active { z-index: 9; min-width: 52px; min-height: 43px; color: #303754; background: linear-gradient(135deg, #fff9fb, #dfdcff); border-color: rgb(255 255 255 / 78%); box-shadow: 0 10px 24px rgb(16 22 54 / 24%), 0 0 18px rgb(255 211 225 / 45%); transform: translate(-50%, -50%) scale(1.05); }

.selected-weather-card { position: absolute; z-index: 9; right: 36px; bottom: 36px; display: grid; width: 360px; padding: 29px; grid-template-columns: 1fr auto; color: #fff; background: linear-gradient(140deg, rgb(10 22 45 / 82%), rgb(255 255 255 / 12%)); border: 1px solid rgb(255 255 255 / 24%); border-radius: 26px; box-shadow: 0 28px 65px rgb(0 7 20 / 34%); backdrop-filter: blur(26px) saturate(130%); }
.selected-weather-card h3 { margin: 0 0 4px; font-size: 19px; }
.selected-weather-card > div > span { color: rgb(255 255 255 / 60%); font-size: 14px; }
.selected-weather-card > strong { font-size: 36px; line-height: 1; }
.selected-weather-card dl { display: grid; margin: 22px 0; grid-column: 1 / -1; grid-template-columns: repeat(3, 1fr); }
.selected-weather-card dl div { padding-left: 12px; border-left: 1px solid rgb(255 255 255 / 15%); }
.selected-weather-card dt { color: rgb(255 255 255 / 48%); font-size: 11px; }
.selected-weather-card dd { margin: 3px 0 0; font-size: 14px; }
.selected-weather-card a { display: flex; height: 43px; padding: 0 14px; grid-column: 1 / -1; align-items: center; justify-content: space-between; color: #303754; background: linear-gradient(120deg, #fff, #f3dbe8 52%, #dce4ff); border-radius: 11px; font-size: 14px; font-weight: 700; text-decoration: none; }
.loading-note { position: absolute; right: 34px; top: 86px; margin: 0; color: rgb(255 255 255 / 58%); font-size: 13px; }

.city-focus-card { position: absolute; z-index: 30; top: 50%; left: 50%; display: flex; width: min(300px, calc(100% - 48px)); padding: 26px; align-items: center; flex-direction: column; color: #303754; text-align: center; background: linear-gradient(145deg, rgb(255 252 253 / 94%), rgb(222 226 255 / 88%)); border: 1px solid rgb(255 255 255 / 80%); border-radius: 26px; box-shadow: 0 28px 70px rgb(7 10 34 / 38%); transform: translate(-50%, -50%); backdrop-filter: blur(24px); }
.city-focus-card span { color: #777d9a; font-size: 12px; letter-spacing: 1.5px; }
.city-focus-card strong { margin: 5px 0 2px; font-size: 34px; letter-spacing: -.04em; }
.city-focus-card p { margin: 0 0 14px; font-size: 15px; font-weight: 650; }
.city-focus-card small { color: #767b96; font-size: 12px; }
.city-focus-enter-active, .city-focus-leave-active { transition: 450ms 300ms cubic-bezier(.2,.72,.22,1); }
.city-focus-enter-from, .city-focus-leave-to { opacity: 0; transform: translate(-50%, -44%) scale(.9); }

@media (max-width: 980px) {
  .map-page { overflow: visible; }
  .map-header { grid-template-columns: 1fr auto; }
  .map-header-copy { display: none; }
  .map-layout { grid-template-columns: 1fr; }
  .region-panel { max-height: 560px; }
  .region-list { display: grid; grid-template-columns: repeat(2, 1fr); gap: 5px; }
  .map-canvas { min-height: 940px; }
  .korea-map { left: 0; width: min(92%, 880px); }
}

@media (max-width: 620px) {
  .map-page { padding: 9px; }
  .map-header { height: 64px; padding: 0 13px; border-radius: 18px; }
  .close-map { font-size: 0; }
  .close-map span { font-size: 18px; }
  .region-panel { padding: 24px 16px 16px; }
  .region-list { grid-template-columns: 1fr; }
  .map-canvas { min-height: 820px; }
  .map-caption { right: 20px; left: 20px; }
  .korea-map { top: 42%; left: -7%; width: 114%; height: auto; }
  .province-label { min-width: 27px; min-height: 22px; padding: 2px 4px; border-radius: 7px; font-size: 10px; }
  .province-label.active { min-width: 44px; min-height: 36px; }
  .selected-weather-card { top: auto; right: 14px; bottom: 14px; left: 14px; width: auto; }
}

/* Shared layout rhythm — map keeps a wider working canvas */
.map-page { padding: 0 var(--layout-gutter) 24px; }
.map-layout { position: relative; display: block; width: 100%; max-width: none; min-height: calc(100vh - 104px); }
.map-header { min-height: 72px; height: auto; margin-bottom: var(--card-gap); border-radius: var(--radius-md); }
.close-map { min-height: 44px; display: inline-flex; align-items: center; }
.region-panel,.map-canvas { border-radius: var(--radius-lg); }
.region-panel { position: absolute; z-index: 25; top: 24px; left: 24px; width: 350px; max-height: calc(100% - 48px); padding: 32px 24px 24px; background: linear-gradient(145deg, rgb(19 31 57 / 94%), rgb(61 57 90 / 90%)); box-shadow: 0 30px 80px rgb(2 8 23 / 38%); }
.panel-title h1 { font-size: clamp(30px, 2.4vw, 40px); }
.favorite-panel { margin-top: var(--card-gap); }
.region-list { padding-bottom: 12px; }
.city-option,.favorite-toggle,.current-location { min-height: 48px; }
.map-canvas {
  width: 100%;
  min-height: max(760px, calc(100vh - 76px));
  background:
    radial-gradient(circle at 50% 43%, rgb(255 220 230 / 13%), transparent 34rem),
    linear-gradient(180deg, #101f3b 0%, #303d61 52%, #74718d 100%);
}
.map-canvas::before {
  position: absolute;
  z-index: 0;
  inset: -8%;
  background: url('/korea-illustrated-map.png') center / cover no-repeat;
  content: '';
  filter: blur(42px) saturate(.72);
  opacity: .28;
  pointer-events: none;
}
.korea-map {
  top: 50%;
  left: 50%;
  width: auto;
  height: min(calc(100vh - 180px), 680px);
  max-width: none;
  transform: translate(-50%, -50%) scale(1);
}
.map-canvas.is-zooming .korea-map { transform: translate(-50%, -50%) scale(2.18); }
.map-caption { top: 40px; right: 48px; left: 410px; }
.selected-weather-card { padding: 28px; border-radius: var(--radius-md); }
.selected-weather-card a { min-height: 46px; height: auto; }
@media (max-width: 1100px) { .map-layout { display: grid; min-height: 0; grid-template-columns: 1fr; gap: var(--card-gap); }.region-panel { position: relative; top: auto; left: auto; width: auto; max-height: 620px; }.map-canvas { min-height: 820px; }.korea-map { height: min(640px, calc(100vh - 190px)); }.map-caption { left: 48px; } }
@media (max-width: 620px) { .map-page { padding: 9px var(--layout-gutter) 28px; }.map-header { min-height: 64px; border-radius: var(--radius-md); }.region-panel,.map-canvas { border-radius: var(--radius-lg); }.map-caption { right: 20px; left: 20px; } }
@media (max-width: 760px) { .region-list { grid-template-columns: 1fr; }.map-canvas { min-height: 800px; }.map-caption > span { display: none; }.selected-weather-card { right: 12px; bottom: 12px; left: 12px; width: auto; }.selected-weather-card dl { gap: 8px; }.korea-map { top: 43%; left: 50%; width: auto; height: min(520px, 105vw); } }
@media (max-width: 760px) { .map-page { padding-top: 0; } }
</style>

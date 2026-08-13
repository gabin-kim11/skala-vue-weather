<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'

import WeatherCharacter from '../components/weather/WeatherCharacter.vue'
import { getCityGuide } from '../components/weather/data/cityGuides'
import { useWeatherStore } from '../stores/weatherStore'

const route = useRoute()
const router = useRouter()
const weatherStore = useWeatherStore()
const { weatherList, selectedCityInfo } = storeToRefs(weatherStore)
const { formatTemperature, selectCity } = weatherStore

const routeCityId = computed(() => String(route.params.cityId || 'seoul'))
const city = computed(() => weatherList.value.find((item) => item.id === routeCityId.value) ?? selectedCityInfo.value)
const hasLiveWeather = computed(() => city.value.source !== 'pending')
const guide = computed(() => getCityGuide(city.value.guideId ?? city.value.id))
const isWet = computed(() => (city.value.current.precipitation ?? 0) > 0 || city.value.current.weatherCode >= 51)
const isCold = computed(() => city.value.current.temperature <= 7)
const recommendationMode = computed(() => (isWet.value || isCold.value ? 'indoor' : 'outdoor'))
const places = computed(() => guide.value.places[recommendationMode.value])
const foods = computed(() => guide.value.foods)
const activities = computed(() => guide.value.activities[recommendationMode.value])
const place = computed(() => places.value[0])
const moodCopy = computed(() => {
  if (isWet.value) return '빗소리와 잘 어울리는 실내 코스로 방향을 바꿨어요.'
  if (isCold.value) return '따뜻한 공간에서 오래 머물 수 있는 코스를 골랐어요.'
  if (city.value.current.windSpeed >= 15) return '바람을 느끼되 쉬어갈 곳이 가까운 코스가 좋아요.'
  return '걷기 좋은 하늘이라 도시의 표정을 천천히 만나봐요.'
})

onMounted(() => {
  const matchedCity = weatherList.value.find((item) => item.id === routeCityId.value)
  if (!matchedCity) {
    router.replace('/map')
    return
  }
  selectCity(matchedCity)
})
</script>

<template>
  <main class="detail-page" :style="{ '--scene': `url(${city.background})` }">

    <section class="journey-hero glass">
      <div class="journey-copy">
        <p class="eyebrow">{{ city.area }} · WEATHER JOURNEY</p>
        <h1 v-if="hasLiveWeather">{{ city.name }}의 오늘은<br /><em>{{ place[0] }}</em>으로 가요.</h1>
        <h1 v-else>{{ city.name }}의 실시간 날씨를<br /><em>확인하고 있어요.</em></h1>
        <p v-if="hasLiveWeather" class="weather-note">{{ moodCopy }}</p>
        <p v-else class="weather-note">기상청 응답이 도착하면 오늘의 장소를 추천해 드릴게요.</p>

        <div v-if="hasLiveWeather" class="weather-line">
          <strong>{{ formatTemperature(city.current.temperature) }}</strong>
          <span>{{ city.current.status }}<small>{{ city.current.sentence }}</small></span>
        </div>

        <div v-if="hasLiveWeather" class="recommendation-card">
          <span>01 · TODAY'S PLACE</span>
          <h2>{{ place[0] }}</h2>
          <p>{{ place[1] }}</p>
          <dl>
            <div><dt>체감</dt><dd>{{ formatTemperature(city.current.apparentTemperature) }}</dd></div>
            <div><dt>습도</dt><dd>{{ city.current.humidity }}%</dd></div>
            <div><dt>바람</dt><dd>{{ city.current.windSpeed }} km/h</dd></div>
          </dl>
        </div>
      </div>

      <div class="city-scene">
        <div class="landmark-layer">
          <i></i><i></i><i></i><i></i><i></i>
        </div>
        <WeatherCharacter
          :weather-code="city.current.weatherCode"
          :temperature="city.current.temperature"
          :precipitation="city.current.precipitation"
          :wind-speed="city.current.windSpeed"
          :label="`${city.name} 여행을 함께하는 구름 고양이`"
        />
        <p>구름 고양이와 {{ city.name }}의 오늘을 천천히 둘러봐요.</p>
      </div>
    </section>

    <section v-if="hasLiveWeather" class="journey-grid">
      <article class="guide-card places-card glass">
        <span>01 · PLACES TO GO</span>
        <h2>놀러 가면 좋을 곳</h2>
        <ol>
          <li v-for="(item, index) in places" :key="item[0]">
            <b>0{{ index + 1 }}</b>
            <div><strong>{{ item[0] }}</strong><p>{{ item[1] }}</p></div>
          </li>
        </ol>
      </article>
      <article class="guide-card foods-card glass">
        <span>02 · LOCAL TASTE</span>
        <h2>먹기 좋은 음식</h2>
        <ol>
          <li v-for="(item, index) in foods" :key="item[0]">
            <b>0{{ index + 1 }}</b>
            <div><strong>{{ item[0] }}</strong><p>{{ item[1] }}</p></div>
          </li>
        </ol>
      </article>
      <article class="guide-card activities-card glass">
        <span>03 · THINGS TO DO</span>
        <h2>하기 좋은 활동</h2>
        <ol>
          <li v-for="(item, index) in activities" :key="item[0]">
            <b>0{{ index + 1 }}</b>
            <div><strong>{{ item[0] }}</strong><p>{{ item[1] }}</p></div>
          </li>
        </ol>
      </article>
    </section>
    <section v-else class="detail-loading glass" aria-live="polite">실시간 날씨와 여행 추천을 불러오는 중…</section>

    <footer>
      <RouterLink to="/map">← 전국 지도로 돌아가기</RouterLink>
      <RouterLink to="/">메인 날씨 보기 →</RouterLink>
    </footer>
  </main>
</template>

<style scoped>
.detail-page { min-height: 100vh; padding: 14px 20px 48px; overflow: hidden; color: #f9fbff; font-family: Pretendard, sans-serif; background: linear-gradient(130deg, rgb(9 18 38 / 88%), rgb(40 43 73 / 60%), rgb(9 19 35 / 88%)), radial-gradient(circle at 80% 15%, rgb(252 203 215 / 35%), transparent 28rem), var(--scene) center / cover fixed; }
.glass { background: linear-gradient(125deg, rgb(255 255 255 / 17%), rgb(255 255 255 / 5%)); border: 1px solid rgb(255 255 255 / 23%); box-shadow: 0 28px 70px rgb(2 9 23 / 25%), inset 0 1px 0 rgb(255 255 255 / 21%); backdrop-filter: blur(30px) saturate(130%); }
.detail-header { display: flex; width: min(1440px, 100%); height: 72px; margin: 0 auto 14px; padding: 0 20px; align-items: center; justify-content: space-between; border-radius: 22px; }
.brand { display: inline-flex; align-items: center; gap: 11px; color: inherit; font-size: 15px; font-weight: 700; text-decoration: none; }
.brand-mark { display: grid; width: 37px; height: 37px; place-items: center; color: #172039; background: linear-gradient(145deg, #fff, #d8ff45); border-radius: 50%; }
.brand small { display: block; margin-top: 4px; font-size: 11px; letter-spacing: 1.5px; }
.detail-header nav { display: flex; align-items: center; gap: 10px; }
.detail-header a, .detail-header button { color: inherit; background: transparent; border: 0; font-size: 14px; text-decoration: none; cursor: pointer; }
.detail-header button { min-height: 38px; padding: 0 14px; border: 1px solid rgb(255 255 255 / 25%); border-radius: 20px; }
.journey-hero { display: grid; width: min(1440px, 100%); min-height: 720px; margin: 0 auto; padding: 64px; grid-template-columns: .94fr 1.06fr; gap: 48px; overflow: hidden; border-radius: 34px; }
.journey-copy { position: relative; z-index: 3; align-self: center; }
.eyebrow, .journey-grid article > span { margin: 0 0 16px; color: #d8ff45; font-size: 12px; font-weight: 700; letter-spacing: 2.2px; }
h1 { margin: 0; font-size: clamp(44px, 5vw, 72px); line-height: 1.09; letter-spacing: -.05em; }
h1 em { color: transparent; background: linear-gradient(105deg, #fff, #cbd9ff 50%, #d8ff45); background-clip: text; -webkit-background-clip: text; font-style: normal; }
.weather-note { max-width: 520px; margin: 24px 0; color: rgb(242 246 255 / 67%); font-size: 14px; }
.weather-line { display: flex; margin: 28px 0; align-items: center; gap: 20px; }
.weather-line > strong { font-size: 58px; letter-spacing: -.06em; }
.weather-line span { font-size: 15px; font-weight: 700; }
.weather-line small { display: block; max-width: 260px; margin-top: 4px; color: rgb(255 255 255 / 55%); font-size: 13px; font-weight: 400; }
.recommendation-card { max-width: 540px; padding: 24px; background: linear-gradient(125deg, rgb(255 255 255 / 14%), rgb(255 255 255 / 4%)); border: 1px solid rgb(255 255 255 / 18%); border-radius: 22px; }
.recommendation-card > span { color: #d8ff45; font-size: 11px; letter-spacing: 1.8px; }
.recommendation-card h2 { margin: 9px 0 5px; font-size: 27px; }
.recommendation-card > p { margin: 0; color: rgb(255 255 255 / 61%); font-size: 14px; }
.recommendation-card dl { display: grid; margin: 20px 0 0; padding-top: 16px; grid-template-columns: repeat(3, 1fr); border-top: 1px solid rgb(255 255 255 / 15%); }
.recommendation-card dl div { padding-left: 13px; border-left: 1px solid rgb(255 255 255 / 13%); }
.recommendation-card dl div:first-child { padding-left: 0; border: 0; }
.recommendation-card dt { color: rgb(255 255 255 / 45%); font-size: 11px; }
.recommendation-card dd { margin: 3px 0 0; font-size: 14px; }
.city-scene { position: relative; min-height: 590px; align-self: center; overflow: hidden; background: linear-gradient(180deg, rgb(255 255 255 / 14%), rgb(125 150 218 / 12%)), var(--scene) center / cover; border: 1px solid rgb(255 255 255 / 27%); border-radius: 48% 48% 28px 28px; box-shadow: inset 0 1px 0 rgb(255 255 255 / 28%), 0 35px 70px rgb(1 7 20 / 25%); }
.city-scene::after { position: absolute; right: 0; bottom: 0; left: 0; height: 32%; background: linear-gradient(180deg, transparent, rgb(10 18 38 / 52%)); content: ''; }
.city-scene :deep(.character-wrap) { position: absolute; z-index: 4; right: 12%; bottom: 6%; width: 56%; height: 82%; }
.city-scene > p { position: absolute; z-index: 6; right: 30px; bottom: 24px; left: 30px; margin: 0; color: rgb(255 255 255 / 72%); font-size: 13px; letter-spacing: .5px; }
.landmark-layer { position: absolute; z-index: 2; right: 8%; bottom: 15%; left: 8%; display: flex; height: 25%; align-items: end; gap: 4px; opacity: .5; }
.landmark-layer i { display: block; width: 20%; height: 55%; background: linear-gradient(180deg, rgb(240 224 231 / 72%), rgb(113 128 179 / 35%)); border-radius: 45% 45% 4px 4px; }
.landmark-layer i:nth-child(2) { height: 86%; }.landmark-layer i:nth-child(3) { height: 42%; }.landmark-layer i:nth-child(4) { height: 68%; }.landmark-layer i:nth-child(5) { height: 35%; }
.journey-grid { display: grid; width: min(1440px, 100%); margin: 14px auto 0; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.detail-loading { width: min(1440px, 100%); margin: 14px auto 0; padding: 52px; color: rgb(255 255 255 / 65%); border-radius: 28px; text-align: center; }
.journey-grid article { min-height: 360px; padding: 34px; border-radius: 28px; }
.journey-grid h2 { margin: 0 0 24px; font-size: 26px; letter-spacing: -.03em; }
.guide-card { position: relative; overflow: hidden; }
.guide-card::after { position: absolute; right: -50px; bottom: -70px; width: 190px; aspect-ratio: 1; background: radial-gradient(circle, rgb(216 255 69 / 13%), transparent 69%); border-radius: 50%; content: ''; pointer-events: none; }
.foods-card::after { background: radial-gradient(circle, rgb(255 191 176 / 18%), transparent 69%); }
.activities-card::after { background: radial-gradient(circle, rgb(170 204 255 / 19%), transparent 69%); }
.guide-card ol { position: relative; z-index: 2; display: grid; margin: 0; padding: 0; list-style: none; }
.guide-card li { display: grid; min-height: 72px; padding: 13px 0; grid-template-columns: 42px 1fr; align-items: start; border-top: 1px solid rgb(255 255 255 / 13%); }
.guide-card li > b { display: grid; width: 28px; height: 28px; place-items: center; color: #172039; background: linear-gradient(145deg, #fff, #d8ff45); border-radius: 50%; font-size: 12px; }
.foods-card li > b { background: linear-gradient(145deg, #fff, #ffc7bb); }
.activities-card li > b { background: linear-gradient(145deg, #fff, #bdd3ff); }
.guide-card strong { display: block; margin-bottom: 5px; font-size: 15px; }
.guide-card li p { margin: 0; color: rgb(255 255 255 / 56%); font-size: 13px; line-height: 1.5; }
footer { display: flex; width: min(1440px, 100%); margin: 0 auto; padding: 34px 8px 0; justify-content: space-between; } footer a { color: rgb(255 255 255 / 69%); font-size: 14px; text-decoration: none; }
@media (max-width: 1100px) { .journey-grid { grid-template-columns: 1fr; }.journey-grid article { min-height: 0; } }
@media (max-width: 900px) { .journey-hero { padding: 42px; grid-template-columns: 1fr; }.city-scene { min-height: 560px; } }
/* Shared layout rhythm */
.detail-page { padding: 0 var(--layout-gutter) var(--section-gap); overflow: visible; overflow-x: clip; }
.detail-header,.journey-hero,.journey-grid,footer { width: min(var(--layout-max), 100%); }
.detail-header { min-height: 72px; height: auto; margin-bottom: var(--card-gap); padding: 0 24px; border-radius: var(--radius-md); }
.detail-header a,.detail-header button { min-height: 44px; display: inline-flex; align-items: center; }
.journey-hero { min-height: 680px; padding: var(--card-padding); gap: clamp(32px, 4vw, 56px); border-radius: var(--radius-lg); }
h1 { font-size: var(--title-page); }
.weather-note { font-size: var(--text-body); line-height: 1.7; }
.recommendation-card { padding: 28px; border-radius: var(--radius-md); }
.journey-grid { margin-top: var(--card-gap); gap: var(--card-gap); }
.journey-grid article { min-height: 380px; padding: var(--card-padding); border-radius: var(--radius-lg); }
.guide-card li { min-height: 84px; padding: 16px 0; }
footer { padding-top: 40px; }
@media (max-width: 600px) { .detail-page { padding: 10px var(--layout-gutter) 36px; }.detail-header nav a { display: none; }.journey-hero { padding: var(--card-padding); border-radius: var(--radius-lg); } h1 { font-size: 40px; }.city-scene { min-height: 440px; }.city-scene :deep(.character-wrap) { right: 3%; width: 72%; }.journey-grid article { padding: var(--card-padding); }.route-card li { grid-template-columns: 105px 1fr; } }
@media (max-width: 1050px) { .detail-header nav a:first-child { display: none; }.journey-hero { grid-template-columns: 1fr; }.city-scene { min-height: 560px; } }
@media (max-width: 720px) { .detail-header { padding: 8px 14px; }.detail-header .brand small { display: none; }.detail-header nav a { display: none; }.detail-header button { white-space: nowrap; }.weather-line { align-items: flex-start; flex-direction: column; }.recommendation-card dl { gap: 12px; }.journey-grid { grid-template-columns: 1fr; } }
@media (max-width: 720px) { .detail-page { padding-top: 0; } }
</style>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import WeatherCharacter from '../components/weather/WeatherCharacter.vue'
import { describeWeatherCode } from '../components/weather/utils/weatherCode'
import { useWeatherStore } from '../stores/weatherStore'

const weatherStore = useWeatherStore()
const { favoriteCityIds, lastUpdatedAt, selectedCityInfo, weatherList } = storeToRefs(weatherStore)
const { formatTemperature, hydratePreferences, refreshWeather, selectCity, toggleFavorite } = weatherStore

const activities = [
  { id: 'walk', label: '가볍게 걷기', ideal: 20 },
  { id: 'outing', label: '야외 나들이', ideal: 23 },
  { id: 'exercise', label: '운동하기', ideal: 17 },
  { id: 'photo', label: '사진 산책', ideal: 19 },
]

const activeActivityId = ref('walk')
const startHourIndex = ref(0)
const endHourIndex = ref(6)
const compareCityIds = ref([])
const checkedItems = ref([])

const hourly = computed(() => (selectedCityInfo.value.hourly ?? []).slice(0, 10))
const activeActivity = computed(() => activities.find((item) => item.id === activeActivityId.value) ?? activities[0])

const formatHour = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value?.slice(11, 16) ?? '--:--'
  const hour = date.getHours()
  if (hour === 0) return '자정'
  if (hour === 12) return '낮 12시'
  return hour < 12 ? `오전 ${hour}시` : `오후 ${hour - 12}시`
}

const scoreHour = (hour) => {
  const rain = hour.precipitationProbability ?? 0
  const wind = hour.windSpeed ?? 0
  const temperature = hour.apparentTemperature ?? hour.temperature ?? 20
  const cloudyPhotoBonus = activeActivityId.value === 'photo' && [1, 2, 3].includes(hour.weatherCode) ? 11 : 0
  const exerciseWindPenalty = activeActivityId.value === 'exercise' ? Math.max(0, wind - 12) * 2.2 : Math.max(0, wind - 18)
  return Math.max(
    5,
    Math.min(100, Math.round(100 - rain * 1.05 - Math.abs(temperature - activeActivity.value.ideal) * 3.1 - exerciseWindPenalty + cloudyPhotoBonus)),
  )
}

const plannedHours = computed(() => {
  const start = Math.min(startHourIndex.value, endHourIndex.value)
  const end = Math.max(startHourIndex.value, endHourIndex.value)
  return hourly.value.slice(start, end + 1).map((item, index) => ({
    ...item,
    originalIndex: start + index,
    score: scoreHour(item),
    weather: describeWeatherCode(item.weatherCode),
  }))
})

const bestHour = computed(() => plannedHours.value.reduce((best, item) => (!best || item.score > best.score ? item : best), null))
const planMode = computed(() => ((bestHour.value?.precipitationProbability ?? 0) >= 55 ? 'indoor' : 'outdoor'))
const schedule = computed(() => {
  const hours = plannedHours.value
  if (!hours.length) return []
  const best = bestHour.value ?? hours[0]
  const before = hours.find((hour) => hour.originalIndex < best.originalIndex) ?? hours[0]
  const after = [...hours].reverse().find((hour) => hour.originalIndex > best.originalIndex) ?? hours.at(-1)
  return [
    {
      step: '01',
      time: formatHour(before.time),
      title: '천천히 출발하기',
      copy: `체감 ${formatTemperature(before.apparentTemperature ?? before.temperature)}, 이동하기 전 하늘을 한 번 확인해요.`,
    },
    {
      step: '02',
      time: formatHour(best.time),
      title: planMode.value === 'indoor' ? '실내 코스로 전환' : `${activeActivity.value.label} 좋은 틈`,
      copy: `쾌적도 ${best.score}점 · 비 ${best.precipitationProbability ?? 0}% · 바람 ${best.windSpeed ?? 0} km/h`,
      featured: true,
    },
    {
      step: '03',
      time: formatHour(after.time),
      title: '날씨가 바뀌기 전 돌아오기',
      copy: `마지막 예보는 ${after.weather.label}. 귀가 전에 알림을 다시 확인해요.`,
    },
  ]
})

const maxRain = computed(() => Math.max(0, ...hourly.value.map((item) => item.precipitationProbability ?? 0)))
const maxWind = computed(() => Math.max(selectedCityInfo.value.current.windSpeed ?? 0, ...hourly.value.map((item) => item.windSpeed ?? 0)))
const maxTemperature = computed(() => Math.max(selectedCityInfo.value.current.temperature ?? 0, ...hourly.value.map((item) => item.temperature ?? 0)))
const minTemperature = computed(() => Math.min(selectedCityInfo.value.current.temperature ?? 0, ...hourly.value.map((item) => item.temperature ?? 0)))

const alerts = computed(() => {
  const result = []
  if (maxRain.value >= 70) result.push({ level: 'warning', label: '강한 비 가능성', copy: `오늘 시간대별 강수확률이 최대 ${maxRain.value}%예요. 실내 대안을 함께 준비하세요.` })
  else if (maxRain.value >= 40) result.push({ level: 'notice', label: '비 소식', copy: `강수확률이 최대 ${maxRain.value}%까지 올라가요. 작은 우산이 있으면 안심이에요.` })
  if (maxTemperature.value >= 33) result.push({ level: 'warning', label: '폭염 주의', copy: '한낮의 긴 야외 활동을 피하고 물을 자주 마셔주세요.' })
  if (minTemperature.value <= -10) result.push({ level: 'warning', label: '한파 주의', copy: '노출 부위를 감싸고 짧은 간격으로 실내에서 쉬어주세요.' })
  if (maxWind.value >= 35) result.push({ level: 'warning', label: '강풍 주의', copy: `바람이 최대 ${Math.round(maxWind.value)} km/h예요. 간판과 낙하물에 주의하세요.` })
  const aqi = selectedCityInfo.value.airQuality?.aqi ?? 0
  if (aqi >= 101) result.push({ level: 'warning', label: '공기질 나쁨', copy: '오래 머무는 야외 일정은 줄이고 마스크를 챙겨주세요.' })
  if (!result.length) result.push({ level: 'safe', label: '특별한 위험기상 없음', copy: '현재 예보는 안정적이에요. 출발 전 한 번만 새로고침하면 충분해요.' })
  return result
})

const checklist = computed(() => {
  const current = selectedCityInfo.value.current
  const items = [
    { id: 'battery', label: '휴대전화 배터리', reason: '예보와 길찾기를 확인해요' },
  ]
  if (maxRain.value >= 35) items.unshift({ id: 'umbrella', label: '접이식 우산', reason: `최대 강수확률 ${maxRain.value}%` })
  if ((selectedCityInfo.value.sun?.uvMax ?? 0) >= 6) items.push({ id: 'sunscreen', label: '선크림·모자', reason: `자외선 ${Math.round(selectedCityInfo.value.sun.uvMax)} 단계` })
  if (current.apparentTemperature <= 12) items.push({ id: 'outer', label: '가벼운 겉옷', reason: `체감 ${formatTemperature(current.apparentTemperature)}` })
  if (current.apparentTemperature >= 27) items.push({ id: 'water', label: '시원한 물', reason: '더위에 자주 수분을 보충해요' })
  if ((selectedCityInfo.value.airQuality?.aqi ?? 0) >= 81) items.push({ id: 'mask', label: '보건용 마스크', reason: '공기질이 평소보다 답답해요' })
  if (maxWind.value >= 20) items.push({ id: 'hair', label: '모자 대신 머리끈', reason: `바람 최대 ${Math.round(maxWind.value)} km/h` })
  return items
})

const toggleChecked = (id) => {
  checkedItems.value = checkedItems.value.includes(id)
    ? checkedItems.value.filter((item) => item !== id)
    : [...checkedItems.value, id]
}

const checkedProgress = computed(() => {
  if (!checklist.value.length) return 100
  return Math.round((checklist.value.filter((item) => checkedItems.value.includes(item.id)).length / checklist.value.length) * 100)
})

const airQualityLabel = computed(() => {
  const value = selectedCityInfo.value.airQuality?.aqi ?? 0
  if (value <= 50) return '좋음'
  if (value <= 100) return '보통'
  if (value <= 150) return '나쁨'
  return '매우 나쁨'
})

const uvLabel = computed(() => {
  const value = selectedCityInfo.value.sun?.uvMax ?? 0
  if (value < 3) return '낮음'
  if (value < 6) return '보통'
  if (value < 8) return '높음'
  return '매우 높음'
})

const laundryScore = computed(() => {
  const humidity = selectedCityInfo.value.current.humidity ?? 50
  return Math.max(8, Math.min(100, Math.round(105 - maxRain.value * 1.1 - Math.max(0, humidity - 45) * 0.65 + Math.min(maxWind.value, 18) * 0.7)))
})

const laundryLabel = computed(() => (laundryScore.value >= 75 ? '아주 좋아요' : laundryScore.value >= 50 ? '말릴 만해요' : '실내 건조 추천'))

const daylight = computed(() => {
  const [sunriseHour, sunriseMinute] = (selectedCityInfo.value.sun?.sunrise ?? '05:48').split(':').map(Number)
  const [sunsetHour, sunsetMinute] = (selectedCityInfo.value.sun?.sunset ?? '19:28').split(':').map(Number)
  const total = sunsetHour * 60 + sunsetMinute - sunriseHour * 60 - sunriseMinute
  return `${Math.floor(total / 60)}시간 ${total % 60}분`
})

const catalogWeather = computed(() => weatherList.value.filter((city) => city.id !== 'current_location'))
const comparedCities = computed(() => compareCityIds.value.map((id) => catalogWeather.value.find((city) => city.id === id)).filter(Boolean))
const bestComparisonCity = computed(() => comparedCities.value.reduce((best, city) => {
  const rain = Math.max(0, ...(city.hourly ?? []).slice(0, 6).map((item) => item.precipitationProbability ?? 0))
  const score = 100 - rain * 0.8 - Math.abs((city.current.apparentTemperature ?? city.current.temperature) - 21) * 2 - Math.max(0, city.current.windSpeed - 18)
  return !best || score > best.score ? { city, score: Math.round(score) } : best
}, null))

const toggleCompare = (cityId) => {
  if (compareCityIds.value.includes(cityId)) {
    compareCityIds.value = compareCityIds.value.filter((id) => id !== cityId)
    return
  }
  if (compareCityIds.value.length < 4) compareCityIds.value = [...compareCityIds.value, cityId]
}

const selectPlannerCity = (cityId) => {
  selectCity(cityId)
  startHourIndex.value = 0
  endHourIndex.value = Math.min(6, hourly.value.length - 1)
  checkedItems.value = []
}

watch(compareCityIds, (ids) => window.localStorage.setItem('skala-weather-compare', JSON.stringify(ids)), { deep: true })
watch(checkedItems, (ids) => window.localStorage.setItem(`skala-weather-checklist-${selectedCityInfo.value.id}`, JSON.stringify(ids)), { deep: true })
watch(() => selectedCityInfo.value.id, (id) => {
  try { checkedItems.value = JSON.parse(window.localStorage.getItem(`skala-weather-checklist-${id}`) ?? '[]') } catch { checkedItems.value = [] }
})

onMounted(() => {
  hydratePreferences()
  if (!lastUpdatedAt.value || selectedCityInfo.value.source === 'mock') void refreshWeather()
  try {
    const saved = JSON.parse(window.localStorage.getItem('skala-weather-compare') ?? '[]')
    compareCityIds.value = Array.isArray(saved) ? saved.filter((id) => catalogWeather.value.some((city) => city.id === id)).slice(0, 4) : []
  } catch { compareCityIds.value = [] }
  if (compareCityIds.value.length < 2) {
    const initial = [...new Set([selectedCityInfo.value.guideId ?? selectedCityInfo.value.id, ...favoriteCityIds.value, 'seoul', 'busan', 'jeju'])]
    compareCityIds.value = initial.filter((id) => catalogWeather.value.some((city) => city.id === id)).slice(0, 4)
  }
  try { checkedItems.value = JSON.parse(window.localStorage.getItem(`skala-weather-checklist-${selectedCityInfo.value.id}`) ?? '[]') } catch { checkedItems.value = [] }
})
</script>

<template>
  <main class="planner-page" :style="{ '--scene': `url(${selectedCityInfo.background})` }">

    <div class="planner-shell">
      <section class="planner-hero glass">
        <div class="hero-copy">
          <p class="eyebrow">{{ selectedCityInfo.area }} · PERSONAL WEATHER ROUTINE</p>
          <h1>날씨를 보는 데서 끝나지 않고,<br /><em>오늘을 계획해요.</em></h1>
          <p>시간을 고르면 가장 좋은 틈과 준비물, 위험기상까지 한 번에 정리해 드려요.</p>
          <div class="city-picker" aria-label="플래너 도시 선택">
            <label for="planner-city">기준 도시</label>
            <select id="planner-city" :value="selectedCityInfo.guideId ?? selectedCityInfo.id" @change="selectPlannerCity($event.target.value)">
              <option v-for="city in catalogWeather" :key="city.id" :value="city.id">{{ city.name }}</option>
            </select>
          </div>
        </div>
        <div class="hero-weather">
          <span>{{ selectedCityInfo.current.status }}</span>
          <strong>{{ formatTemperature(selectedCityInfo.current.temperature) }}</strong>
          <small>{{ selectedCityInfo.current.sentence }}</small>
          <WeatherCharacter :weather-code="selectedCityInfo.current.weatherCode" :temperature="selectedCityInfo.current.temperature" :precipitation="selectedCityInfo.current.precipitation" :wind-speed="selectedCityInfo.current.windSpeed" />
        </div>
      </section>

      <section class="planner-grid">
        <article class="day-planner glass">
          <div class="section-heading">
            <div><span>01 · OUTING PLANNER</span><h2>오늘의 외출 시간표</h2></div>
            <strong v-if="bestHour">BEST {{ formatHour(bestHour.time) }}</strong>
          </div>
          <div class="plan-controls">
            <label>하고 싶은 일<select v-model="activeActivityId"><option v-for="activity in activities" :key="activity.id" :value="activity.id">{{ activity.label }}</option></select></label>
            <label>출발<select v-model.number="startHourIndex"><option v-for="(hour, index) in hourly" :key="`start-${hour.time}`" :value="index">{{ formatHour(hour.time) }}</option></select></label>
            <label>귀가<select v-model.number="endHourIndex"><option v-for="(hour, index) in hourly" :key="`end-${hour.time}`" :value="index">{{ formatHour(hour.time) }}</option></select></label>
          </div>
          <div class="hour-rail" aria-label="시간대별 활동 쾌적도">
            <div v-for="hour in plannedHours" :key="hour.time" :class="{ best: hour.time === bestHour?.time }">
              <span>{{ formatHour(hour.time).replace('오전 ', '').replace('오후 ', '') }}</span>
              <i :style="{ height: `${Math.max(18, hour.score)}%` }"></i>
              <b>{{ hour.score }}</b>
              <small>{{ hour.precipitationProbability ?? 0 }}%</small>
            </div>
          </div>
          <div class="schedule-list">
            <article v-for="item in schedule" :key="item.step" :class="{ featured: item.featured }"><b>{{ item.step }}</b><time>{{ item.time }}</time><div><strong>{{ item.title }}</strong><p>{{ item.copy }}</p></div></article>
          </div>
        </article>

        <aside class="alerts glass">
          <div class="section-heading"><div><span>02 · WEATHER ALERT</span><h2>미리 보는 주의사항</h2></div></div>
          <div class="alert-list">
            <article v-for="alert in alerts" :key="alert.label" :class="alert.level"><i></i><div><strong>{{ alert.label }}</strong><p>{{ alert.copy }}</p></div></article>
          </div>
          <p class="alert-footnote">현재 시점부터 약 10시간의 예보를 기준으로 자동 판단해요.</p>
        </aside>
      </section>

      <section class="readiness-grid">
        <article class="checklist-card glass">
          <div class="section-heading"><div><span>03 · READY TO GO</span><h2>날씨 준비물</h2></div><strong>{{ checkedProgress }}%</strong></div>
          <div class="progress"><i :style="{ width: `${checkedProgress}%` }"></i></div>
          <button v-for="item in checklist" :key="item.id" type="button" :class="{ checked: checkedItems.includes(item.id) }" @click="toggleChecked(item.id)"><i>{{ checkedItems.includes(item.id) ? '✓' : '' }}</i><span><strong>{{ item.label }}</strong><small>{{ item.reason }}</small></span></button>
        </article>

        <article class="indices-card glass">
          <div class="section-heading"><div><span>04 · LIFE INDEX</span><h2>오늘의 생활지수</h2></div></div>
          <div class="index-grid">
            <div><span>공기질</span><strong>{{ airQualityLabel }}</strong><small>PM2.5 {{ selectedCityInfo.airQuality?.pm25 ?? '--' }} ㎍/㎥</small><i :style="{ width: `${Math.min(100, selectedCityInfo.airQuality?.aqi ?? 0)}%` }"></i></div>
            <div><span>자외선</span><strong>{{ uvLabel }}</strong><small>UV {{ Math.round(selectedCityInfo.sun?.uvMax ?? 0) }}</small><i :style="{ width: `${Math.min(100, (selectedCityInfo.sun?.uvMax ?? 0) * 10)}%` }"></i></div>
            <div><span>빨래</span><strong>{{ laundryLabel }}</strong><small>건조 점수 {{ laundryScore }}</small><i :style="{ width: `${laundryScore}%` }"></i></div>
            <div><span>해가 머무는 시간</span><strong>{{ daylight }}</strong><small>{{ selectedCityInfo.sun?.sunrise }} — {{ selectedCityInfo.sun?.sunset }}</small><i style="width: 76%"></i></div>
          </div>
        </article>
      </section>

      <section class="compare-card glass">
        <div class="section-heading">
          <div><span>05 · FAVORITE COMPARE</span><h2>어디로 갈지 한눈에 비교</h2><p>2개에서 4개 도시를 골라 오늘의 외출 조건을 비교해요.</p></div>
          <strong v-if="bestComparisonCity">추천 · {{ bestComparisonCity.city.name }}</strong>
        </div>
        <div class="compare-picker">
          <button v-for="city in catalogWeather" :key="city.id" type="button" :class="{ active: compareCityIds.includes(city.id) }" :aria-pressed="compareCityIds.includes(city.id)" :disabled="!compareCityIds.includes(city.id) && compareCityIds.length >= 4" @click="toggleCompare(city.id)">{{ city.name }}</button>
        </div>
        <div class="compare-table" :style="{ '--columns': Math.max(2, comparedCities.length) }">
          <article v-for="city in comparedCities" :key="city.id" :class="{ winner: bestComparisonCity?.city.id === city.id }">
            <div class="compare-scene" :style="{ backgroundImage: `linear-gradient(180deg, transparent, rgb(10 17 35 / 72%)), url(${city.background})` }"><button type="button" :aria-label="`${city.name} 즐겨찾기`" @click="toggleFavorite(city.id)">{{ favoriteCityIds.includes(city.id) ? '★' : '☆' }}</button><span>{{ city.area }}</span><strong>{{ city.name }}</strong></div>
            <dl><div><dt>기온</dt><dd>{{ formatTemperature(city.current.temperature) }}</dd></div><div><dt>강수</dt><dd>{{ Math.max(0, ...(city.hourly ?? []).slice(0, 6).map(item => item.precipitationProbability ?? 0)) }}%</dd></div><div><dt>바람</dt><dd>{{ city.current.windSpeed }} km/h</dd></div><div><dt>공기질</dt><dd>{{ city.airQuality?.aqi ? `AQI ${city.airQuality.aqi}` : '확인 중' }}</dd></div></dl>
            <RouterLink :to="`/weather/${city.id}`">도시 상세 보기 ↗</RouterLink>
          </article>
          <p v-if="comparedCities.length < 2" class="compare-empty">비교할 도시를 두 곳 이상 골라주세요.</p>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.planner-page { min-height: 100vh; padding: 14px 20px 60px; color: #f8faff; font-family: Pretendard, sans-serif; background: radial-gradient(circle at 82% 8%, rgb(237 189 210 / 24%), transparent 30rem), radial-gradient(circle at 14% 34%, rgb(102 143 216 / 30%), transparent 34rem), linear-gradient(135deg, rgb(8 17 35 / 95%), rgb(41 45 77 / 89%) 52%, rgb(9 20 38 / 96%)), var(--scene) center / cover fixed; }
.glass { background: linear-gradient(125deg, rgb(255 255 255 / 16%), rgb(255 255 255 / 5%)); border: 1px solid rgb(255 255 255 / 20%); box-shadow: 0 24px 70px rgb(3 8 24 / 24%), inset 0 1px 0 rgb(255 255 255 / 20%); backdrop-filter: blur(28px) saturate(125%); }
.planner-header { display: flex; width: min(1460px, 100%); height: 70px; margin: 0 auto 14px; padding: 0 20px; align-items: center; justify-content: space-between; border-radius: 22px; }
.brand { display: inline-flex; align-items: center; gap: 11px; color: inherit; font-size: 14px; font-weight: 750; text-decoration: none; }.brand-mark { display: grid; width: 36px; height: 36px; place-items: center; color: #172039; background: linear-gradient(145deg, #fff, #d8ff45); border-radius: 50%; }.brand small { display: block; margin-top: 3px; font-size: 11px; letter-spacing: 1.4px; }.planner-header nav { display: flex; align-items: center; gap: 8px; }.planner-header nav a,.planner-header nav button { min-height: 36px; padding: 0 13px; color: inherit; background: transparent; border: 1px solid transparent; border-radius: 18px; font-size: 14px; text-decoration: none; cursor: pointer; }.planner-header nav button { border-color: rgb(255 255 255 / 20%); }
.planner-shell { display: grid; width: min(1460px, 100%); margin: auto; gap: 14px; }.planner-hero { position: relative; display: grid; min-height: 420px; padding: 52px 58px; grid-template-columns: 1.15fr .85fr; overflow: hidden; border-radius: 34px; }.planner-hero::before { position: absolute; inset: 0; background: linear-gradient(90deg, rgb(9 18 38 / 72%), rgb(11 20 38 / 18%)), var(--scene) center / cover; opacity: .68; content: ''; }.hero-copy,.hero-weather { position: relative; z-index: 2; }.hero-copy { align-self: center; }.eyebrow,.section-heading span { display: block; margin-bottom: 10px; color: #d8ff45; font-size: 12px; font-weight: 750; letter-spacing: 1.8px; }.hero-copy h1 { margin: 0; font-size: clamp(30px, 3.7vw, 52px); line-height: 1.14; letter-spacing: -.045em; }.hero-copy h1 em { color: #dce7ff; font-style: normal; }.hero-copy > p { max-width: 590px; margin: 18px 0 24px; color: rgb(255 255 255 / 65%); font-size: 15px; }.city-picker { display: inline-flex; padding: 7px 8px 7px 14px; align-items: center; gap: 12px; background: rgb(10 20 40 / 30%); border: 1px solid rgb(255 255 255 / 22%); border-radius: 24px; }.city-picker label { color: rgb(255 255 255 / 58%); font-size: 12px; }.city-picker select,.plan-controls select { min-height: 34px; padding: 0 30px 0 12px; color: white; color-scheme: dark; background: rgb(255 255 255 / 10%); border: 0; border-radius: 18px; outline: none; font-size: 14px; }.hero-weather { min-height: 300px; padding: 42px 42px 0; overflow: hidden; align-self: stretch; background: linear-gradient(145deg, rgb(255 255 255 / 18%), rgb(255 255 255 / 4%)); border: 1px solid rgb(255 255 255 / 20%); border-radius: 28px; }.hero-weather > span { font-size: 15px; }.hero-weather > strong { display: block; font-size: clamp(50px, 6vw, 82px); line-height: 1; letter-spacing: -.07em; }.hero-weather > small { color: rgb(255 255 255 / 60%); font-size: 13px; }.hero-weather :deep(.character-wrap) { position: absolute; right: -5%; bottom: -36%; width: 65%; height: 115%; }
.planner-grid,.readiness-grid { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(320px, .7fr); gap: 14px; }.day-planner,.alerts,.checklist-card,.indices-card,.compare-card { padding: 32px; border-radius: 28px; }.section-heading { display: flex; margin-bottom: 22px; align-items: flex-start; justify-content: space-between; gap: 20px; }.section-heading h2 { margin: 0; font-size: clamp(22px, 2.3vw, 30px); letter-spacing: -.035em; }.section-heading > strong { padding: 8px 12px; color: #182038; background: linear-gradient(135deg, #fff, #d8ff45); border-radius: 18px; font-size: 12px; white-space: nowrap; }.section-heading p { margin: 7px 0 0; color: rgb(255 255 255 / 54%); font-size: 13px; }.plan-controls { display: grid; grid-template-columns: 1.6fr 1fr 1fr; gap: 8px; }.plan-controls label { display: grid; padding: 9px 10px 9px 13px; grid-template-columns: 1fr auto; align-items: center; color: rgb(255 255 255 / 55%); background: rgb(255 255 255 / 6%); border: 1px solid rgb(255 255 255 / 13%); border-radius: 18px; font-size: 12px; }.hour-rail { display: flex; height: 180px; margin: 22px 0; padding: 20px 12px 12px; align-items: end; gap: 6px; background: linear-gradient(180deg, rgb(7 14 30 / 24%), transparent); border-radius: 20px; }.hour-rail > div { display: grid; height: 100%; flex: 1; grid-template-rows: 19px 1fr 20px 18px; justify-items: center; color: rgb(255 255 255 / 45%); font-size: 11px; }.hour-rail i { width: min(18px, 52%); min-height: 12px; align-self: end; background: linear-gradient(180deg, rgb(205 218 255 / 68%), rgb(255 255 255 / 16%)); border-radius: 10px 10px 3px 3px; transition: height .35s ease; }.hour-rail .best i { background: linear-gradient(180deg, #d8ff45, #9fcfff); box-shadow: 0 0 25px rgb(216 255 69 / 28%); }.hour-rail b { color: rgb(255 255 255 / 76%); font-size: 12px; }.hour-rail .best b { color: #d8ff45; }.schedule-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }.schedule-list article { display: grid; min-height: 130px; padding: 17px; grid-template-columns: 28px 1fr; grid-template-rows: 22px 1fr; background: rgb(255 255 255 / 5%); border: 1px solid rgb(255 255 255 / 12%); border-radius: 18px; }.schedule-list article.featured { background: linear-gradient(145deg, rgb(216 255 69 / 15%), rgb(255 255 255 / 5%)); border-color: rgb(216 255 69 / 35%); }.schedule-list article > b { display: grid; width: 23px; height: 23px; place-items: center; color: #182038; background: #d8ff45; border-radius: 50%; font-size: 11px; }.schedule-list time { color: rgb(255 255 255 / 50%); font-size: 12px; text-align: right; }.schedule-list article > div { grid-column: 1 / -1; padding-top: 10px; }.schedule-list strong { font-size: 15px; }.schedule-list p,.alert-list p { margin: 5px 0 0; color: rgb(255 255 255 / 54%); font-size: 12px; line-height: 1.55; }
.alert-list { display: grid; gap: 9px; }.alert-list article { display: grid; padding: 16px; grid-template-columns: 12px 1fr; gap: 11px; background: rgb(255 255 255 / 6%); border: 1px solid rgb(255 255 255 / 11%); border-radius: 17px; }.alert-list i { width: 8px; height: 8px; margin-top: 5px; background: #d8ff45; border-radius: 50%; box-shadow: 0 0 14px currentColor; }.alert-list .warning i { color: #ff9d88; background: #ff9d88; }.alert-list .notice i { color: #8fd3ff; background: #8fd3ff; }.alert-list strong { font-size: 14px; }.alert-footnote { margin: 18px 0 0; color: rgb(255 255 255 / 40%); font-size: 11px; }
.readiness-grid { grid-template-columns: .8fr 1.2fr; }.progress { height: 4px; margin-bottom: 16px; overflow: hidden; background: rgb(255 255 255 / 10%); border-radius: 4px; }.progress i { display: block; height: 100%; background: linear-gradient(90deg, #8ecfff, #d8ff45); transition: width .3s ease; }.checklist-card > button { display: flex; width: 100%; padding: 12px 5px; align-items: center; gap: 12px; color: inherit; background: transparent; border: 0; border-top: 1px solid rgb(255 255 255 / 11%); text-align: left; cursor: pointer; }.checklist-card > button > i { display: grid; width: 24px; height: 24px; flex: 0 0 auto; place-items: center; border: 1px solid rgb(255 255 255 / 32%); border-radius: 50%; font-size: 13px; font-style: normal; }.checklist-card > button.checked > i { color: #172039; background: #d8ff45; border-color: #d8ff45; }.checklist-card > button.checked span { opacity: .48; }.checklist-card button strong,.checklist-card button small { display: block; }.checklist-card button strong { font-size: 14px; }.checklist-card button small { margin-top: 2px; color: rgb(255 255 255 / 48%); font-size: 11px; }.index-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 9px; }.index-grid > div { padding: 17px; background: rgb(255 255 255 / 6%); border: 1px solid rgb(255 255 255 / 11%); border-radius: 18px; }.index-grid span,.index-grid small,.index-grid strong { display: block; }.index-grid span { color: rgb(255 255 255 / 49%); font-size: 11px; }.index-grid strong { margin: 4px 0 2px; font-size: 15px; }.index-grid small { color: rgb(255 255 255 / 49%); font-size: 11px; }.index-grid i { display: block; height: 3px; max-width: 100%; margin-top: 13px; background: linear-gradient(90deg, #9ad4ff, #d8ff45); border-radius: 3px; }
.compare-picker { display: flex; margin-bottom: 18px; flex-wrap: wrap; gap: 5px; }.compare-picker button { min-height: 31px; padding: 0 11px; color: rgb(255 255 255 / 60%); background: rgb(255 255 255 / 5%); border: 1px solid rgb(255 255 255 / 12%); border-radius: 16px; font-size: 12px; cursor: pointer; }.compare-picker button.active { color: #182038; background: #d8ff45; border-color: #d8ff45; }.compare-picker button:disabled { opacity: .28; cursor: not-allowed; }.compare-table { display: grid; grid-template-columns: repeat(var(--columns), minmax(0, 1fr)); gap: 8px; }.compare-table > article { padding: 9px; background: rgb(255 255 255 / 5%); border: 1px solid rgb(255 255 255 / 11%); border-radius: 20px; }.compare-table > article.winner { border-color: rgb(216 255 69 / 45%); box-shadow: inset 0 0 25px rgb(216 255 69 / 5%); }.compare-scene { position: relative; display: flex; min-height: 125px; padding: 14px; flex-direction: column; justify-content: end; overflow: hidden; background-position: center; background-size: cover; border-radius: 14px; }.compare-scene button { position: absolute; z-index: 2; top: 12px; right: 12px; display: grid; width: 36px; height: 36px; padding: 0; place-items: center; color: #d8ff45; background: rgb(11 20 39 / 45%); border: 1px solid rgb(255 255 255 / 28%); border-radius: 50%; font-size: 21px; line-height: 1; cursor: pointer; }.compare-scene span { font-size: 11px; opacity: .64; }.compare-scene strong { font-size: 17px; }.compare-table dl { display: grid; grid-template-columns: repeat(2, 1fr); margin: 10px 0; }.compare-table dl div { padding: 8px; border-bottom: 1px solid rgb(255 255 255 / 8%); }.compare-table dt { color: rgb(255 255 255 / 42%); font-size: 11px; }.compare-table dd { margin: 2px 0 0; font-size: 13px; }.compare-table article > a { display: block; padding: 8px; color: #d8ff45; font-size: 12px; text-align: right; text-decoration: none; }.compare-empty { color: rgb(255 255 255 / 48%); font-size: 13px; }
@media (max-width: 1000px) { .planner-grid,.readiness-grid { grid-template-columns: 1fr; }.compare-table { grid-template-columns: repeat(2, 1fr); }.planner-hero { grid-template-columns: 1fr; gap: 18px; }.hero-weather { min-height: 280px; } }
/* Shared layout rhythm */
.planner-page { padding: 0 var(--layout-gutter) var(--section-gap); }
.planner-header,.planner-shell { width: min(var(--layout-max), 100%); }
.planner-header { min-height: 72px; height: auto; margin-bottom: var(--card-gap); padding: 0 24px; border-radius: var(--radius-md); }
.planner-header nav a,.planner-header nav button { min-height: 44px; }
.planner-shell { gap: var(--card-gap); }
.planner-hero { min-height: 440px; padding: var(--card-padding); border-radius: var(--radius-lg); }
.planner-grid,.readiness-grid { grid-template-columns: minmax(0, 1.5fr) minmax(340px, .7fr); gap: var(--card-gap); }
.day-planner,.alerts,.checklist-card,.indices-card,.compare-card { padding: var(--card-padding); border-radius: var(--radius-lg); }
.section-heading { margin-bottom: 28px; }
.section-heading h2 { font-size: clamp(26px, 2.5vw, 34px); }
.plan-controls { gap: 12px; }.plan-controls label { min-height: 54px; }
.schedule-list,.index-grid,.compare-table { gap: 14px; }
.checklist-card > button { min-height: 58px; }
.compare-picker { gap: 8px; }.compare-picker button { min-height: 38px; }
@media (max-width: 1000px) { .planner-grid,.readiness-grid { grid-template-columns: 1fr; } }
@media (max-width: 680px) { .planner-page { padding: 10px var(--layout-gutter) 38px; }.planner-header nav a { display: none; }.planner-hero { padding: var(--card-padding); border-radius: var(--radius-lg); }.hero-copy h1 { font-size: 34px; }.hero-weather { padding: 28px; }.day-planner,.alerts,.checklist-card,.indices-card,.compare-card { padding: var(--card-padding); border-radius: var(--radius-lg); }.plan-controls { grid-template-columns: 1fr 1fr; }.plan-controls label:first-child { grid-column: 1 / -1; }.schedule-list { grid-template-columns: 1fr; }.hour-rail { overflow-x: auto; }.hour-rail > div { min-width: 44px; }.index-grid,.compare-table { grid-template-columns: 1fr; }.compare-table > article { display: grid; grid-template-columns: 1fr 1fr; }.compare-scene { grid-row: 1 / 3; }.compare-table article > a { align-self: end; } }

@media (max-width: 1180px) { .planner-header nav a { display: none; }.planner-header nav button { min-height: 44px; }.planner-hero { grid-template-columns: 1fr; }.hero-weather { min-height: 320px; }.compare-table { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 760px) { .planner-header { padding: 8px 14px; }.planner-header .brand small { display: none; }.planner-hero { min-height: 0; }.plan-controls { grid-template-columns: 1fr; }.plan-controls label:first-child { grid-column: auto; }.schedule-list,.index-grid,.compare-table { grid-template-columns: 1fr; }.section-heading { align-items: flex-start; flex-direction: column; }.section-heading > strong { align-self: flex-start; }.compare-table > article { display: block; }.compare-scene { min-height: 170px; }.compare-picker { max-height: 146px; overflow-y: auto; } }
@media (max-width: 760px) { .planner-page { padding-top: 0; } }
</style>

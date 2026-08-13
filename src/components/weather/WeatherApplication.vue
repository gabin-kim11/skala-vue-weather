<script setup>
import { computed, ref } from 'vue'

import WeatherCharacter from './WeatherCharacter.vue'
import { useWeatherApplication } from './composables/useWeatherApplication'
import { describeWeatherCode } from './utils/weatherCode'

const {
  errorMessage,
  formatTemperature,
  lastUpdatedAt,
  locationMessage,
  locationStatus,
  selectedCityInfo,
  useCurrentLocation,
  weatherDataSource,
} = useWeatherApplication()

const activities = [
  { id: 'walk', label: '산책', icon: '↗', accent: '#d8ff45' },
  { id: 'run', label: '러닝', icon: '◎', accent: '#ff7a55' },
  { id: 'laundry', label: '빨래', icon: '◇', accent: '#74c9ff' },
  { id: 'photo', label: '사진', icon: '□', accent: '#caa8ff' },
]
const activeActivityId = ref('walk')
const showWindowOpening = ref(true)
const isOpeningReady = computed(() => ['granted', 'fallback', 'selected'].includes(locationStatus.value))
const needsLocationPermission = computed(() => locationStatus.value === 'needs-permission')
const needsPermissionReset = computed(() => locationMessage.value.includes('다시 허용'))
const openingActionLabel = computed(() => {
  if (isOpeningReady.value) return '바로 들어가기'
  if (needsLocationPermission.value) return needsPermissionReset.value ? '권한 확인 후 다시 시도' : 'GPS 위치로 시작하기'
  return '내 위치 찾는 중'
})

const finishWindowOpening = () => {
  showWindowOpening.value = false
}

const handleOpeningAction = () => {
  if (isOpeningReady.value) finishWindowOpening()
  else if (needsLocationPermission.value) useCurrentLocation()
}

const activeActivity = computed(
  () => activities.find((activity) => activity.id === activeActivityId.value) ?? activities[0],
)

const formatHour = (dateString) => {
  const hour = new Date(dateString).getHours()
  if (Number.isNaN(hour)) return dateString.slice(11, 16)
  if (hour === 0) return '자정'
  if (hour === 12) return '낮 12시'
  return hour < 12 ? `오전 ${hour}시` : `오후 ${hour - 12}시`
}

const scoreHour = (hour, activityId) => {
  const rain = hour.precipitationProbability ?? 0
  const wind = hour.windSpeed ?? 0
  const temperature = hour.apparentTemperature ?? hour.temperature
  const code = hour.weatherCode ?? 0

  if (activityId === 'run') {
    return 100 - rain * 1.2 - Math.abs(temperature - 17) * 4 - Math.max(0, wind - 14) * 2
  }
  if (activityId === 'laundry') {
    return 105 - rain * 1.6 + Math.min(wind, 14) * 1.3 + Math.max(0, temperature - 18) * 0.7
  }
  if (activityId === 'photo') {
    const skyBonus = [1, 2, 3].includes(code) ? 18 : 4
    return 78 + skyBonus - rain * 0.85 - Math.max(0, wind - 18)
  }
  return 100 - rain * 1.1 - Math.abs(temperature - 21) * 2.6 - Math.max(0, wind - 16) * 2
}

const activityTimeline = computed(() =>
  (selectedCityInfo.value.hourly ?? []).slice(0, 8).map((hour) => ({
    ...hour,
    score: Math.max(5, Math.min(100, Math.round(scoreHour(hour, activeActivityId.value)))),
    weather: describeWeatherCode(hour.weatherCode),
  })),
)

const bestHour = computed(() =>
  activityTimeline.value.reduce((best, hour) => (!best || hour.score > best.score ? hour : best), null),
)

const activityAdvice = computed(() => {
  const score = bestHour.value?.score ?? 0
  const time = bestHour.value ? formatHour(bestHour.value.time) : '잠시 후'
  const messages = {
    walk: `${time}, 바람이 가장 편안해요. 이어폰 하나 챙겨 천천히 걸어보세요.`,
    run: `${time}, 체감온도가 가장 안정적이에요. 가벼운 페이스가 잘 맞습니다.`,
    laundry: `${time}부터 건조 효율이 좋아져요. 두 시간 정도 넉넉히 펼쳐두세요.`,
    photo: `${time}, 하늘의 결이 가장 풍부해요. 역광을 살려 찍어보세요.`,
  }
  if (score < 45) return '오늘은 실내 계획이 더 편안해요. 다음 맑은 틈을 기다려볼까요?'
  return messages[activeActivityId.value]
})

const weatherStory = computed(() => {
  const current = selectedCityInfo.value.current
  const rain = current.precipitation ?? 0
  if (rain > 0 || current.weatherCode >= 51) return ['빗소리를 곁에 두고', '조금 느리게 움직여요.']
  if (current.windSpeed >= 18) return ['바람이 말을 거는 날,', '가벼운 계획이 좋아요.']
  if (current.temperature >= 28) return ['해가 높기 전에', '먼저 움직여요.']
  if (current.weatherCode <= 1) return ['창문을 활짝 열고', '좋은 틈을 골라봐요.']
  return ['구름 사이의 빛을 따라', '오늘의 속도를 골라요.']
})

const weatherDate = computed(() =>
  new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date()),
)

const updateText = computed(() => {
  if (!lastUpdatedAt.value) return '예보 준비 중'
  return `${new Intl.DateTimeFormat('ko-KR', { hour: '2-digit', minute: '2-digit' }).format(lastUpdatedAt.value)} 업데이트`
})

const windWord = computed(() => {
  const wind = selectedCityInfo.value.current.windSpeed
  if (wind < 5) return '고요'
  if (wind < 12) return '산들'
  if (wind < 20) return '씽씽'
  return '강풍'
})

const detailCityId = computed(() => selectedCityInfo.value.guideId ?? selectedCityInfo.value.id)
const characterMessage = computed(() => {
  const current = selectedCityInfo.value.current
  if ((current.precipitation ?? 0) > 0 || current.weatherCode >= 51) return '구름 고양이가 우산을 꼭 쥐고 사뿐히 걸어요.'
  if (current.temperature <= 7) return '목도리에 폭 파묻혀 포근하게 몸을 녹여요.'
  if (current.windSpeed >= 15 || [2, 3, 45, 48].includes(current.weatherCode)) return '모자를 잡고 귀와 꼬리로 바람을 느껴요.'
  return '기분 좋은 하늘에 방방 뛰며 앞발을 흔들어요.'
})

</script>

<template>
  <main
    class="weather-page"
    :style="{
      '--accent': activeActivity.accent,
      '--scene': `url(${selectedCityInfo.background})`,
    }"
  >
    <section
      v-if="showWindowOpening"
      class="window-opening"
      :class="{ 'is-ready': isOpeningReady }"
      aria-label="오늘의 날씨를 여는 중"
      @animationend.self="finishWindowOpening"
    >
      <div
        class="opening-scene"
        :style="{ backgroundImage: `url(${selectedCityInfo.background})` }"
      >
        <div class="opening-weather">
          <template v-if="isOpeningReady && weatherDataSource === 'kma'">
            <p>{{ locationMessage }} · {{ selectedCityInfo.area }}</p>
            <span>{{ selectedCityInfo.current.status }}</span>
            <strong>{{ formatTemperature(selectedCityInfo.current.temperature) }}</strong>
            <small>오늘의 틈을 열고 있어요</small>
          </template>
          <template v-else-if="isOpeningReady">
            <p>{{ locationMessage }} · {{ selectedCityInfo.area }}</p>
            <strong class="permission-title">실시간 날씨를 불러오고 있어요</strong>
            <small>기상청 응답이 도착하면 오늘의 창이 열려요.</small>
          </template>
          <template v-else>
            <p>GPS WEATHER · FIRST</p>
            <strong class="permission-title">
              {{ needsLocationPermission ? '내 위치의 하늘부터 열어볼까요?' : '현재 위치를 찾고 있어요' }}
            </strong>
            <small>
              {{ needsPermissionReset ? '브라우저의 위치 권한을 허용으로 바꾼 뒤 다시 눌러주세요.' : needsLocationPermission ? '위치 사용을 허용하면 GPS 날씨가 가장 먼저 나와요.' : '잠시만 기다려주세요.' }}
            </small>
          </template>
        </div>
      </div>
      <div class="opening-pane opening-pane-left"><span class="opening-handle"></span></div>
      <div class="opening-pane opening-pane-right"><span class="opening-handle"></span></div>
      <button
        type="button"
        :disabled="!isOpeningReady && !needsLocationPermission"
        @click="handleOpeningAction"
      >
        {{ openingActionLabel }}
      </button>
    </section>


    <div id="top" class="page-shell">
      <p v-if="errorMessage" class="error-note">{{ errorMessage }}</p>

      <section class="hero">
        <article class="weather-window" :style="{ backgroundImage: `url(${selectedCityInfo.background})` }">
          <div class="window-shade"></div>
          <div class="window-copy">
            <p class="overline">{{ locationMessage }} · {{ selectedCityInfo.area }} · {{ weatherDate }}</p>
            <h1 v-if="weatherDataSource === 'kma'">
              <span>{{ weatherStory[0] }}</span>
              <em>{{ weatherStory[1] }}</em>
            </h1>
            <h1 v-else><span>실시간 하늘을</span><em>불러오고 있어요.</em></h1>
            <p class="hero-intro">오늘의 숫자와 하루를 보내기 좋은 순간을 한 창에 담았어요.</p>
          </div>

          <div class="window-weather">
            <div v-if="weatherDataSource === 'kma'" class="weather-primary">
              <span>{{ selectedCityInfo.current.status }}</span>
              <strong>{{ formatTemperature(selectedCityInfo.current.temperature) }}</strong>
              <small>{{ selectedCityInfo.current.sentence }}</small>
            </div>
            <div v-else class="weather-primary"><strong>확인 중…</strong><small>준비된 숫자 대신 기상청 응답을 기다려요.</small></div>
            <dl v-if="weatherDataSource === 'kma'">
              <div><dt>체감</dt><dd>{{ formatTemperature(selectedCityInfo.current.apparentTemperature) }}</dd></div>
              <div><dt>습도</dt><dd>{{ selectedCityInfo.current.humidity }}%</dd></div>
              <div><dt>바람</dt><dd>{{ selectedCityInfo.current.windSpeed }} km/h</dd></div>
            </dl>
            <div class="window-actions">
              <RouterLink :to="`/weather/${detailCityId}`">오늘의 {{ selectedCityInfo.name }} 여행 <span>↗</span></RouterLink>
              <button type="button" :disabled="locationStatus === 'locating'" @click="useCurrentLocation">위치 다시 찾기</button>
            </div>
          </div>

          <span class="window-frame frame-vertical" aria-hidden="true"></span>
          <span class="window-frame frame-horizontal" aria-hidden="true"></span>
          <p class="window-caption">{{ weatherDataSource === 'kma' ? 'KMA LIVE' : 'KMA 연결 중' }} · {{ updateText }}</p>
        </article>

        <aside class="character-stage">
          <div class="character-bubble">
            <span>구름 고양이의 오늘</span>
            <strong>{{ characterMessage }}</strong>
            <RouterLink :to="`/weather/${detailCityId}`">같이 놀러 가기 ↗</RouterLink>
          </div>
          <WeatherCharacter
            :weather-code="selectedCityInfo.current.weatherCode"
            :temperature="selectedCityInfo.current.temperature"
            :precipitation="selectedCityInfo.current.precipitation"
            :wind-speed="selectedCityInfo.current.windSpeed"
          />
          <div class="character-place-tag"><i></i>{{ selectedCityInfo.name }} · 오늘의 동행</div>
        </aside>
      </section>

      <section v-if="weatherDataSource === 'kma'" class="now-strip" aria-label="현재 날씨 세부 정보">
        <p class="strip-lead">지금의 공기</p>
        <article><small>체감</small><strong>{{ formatTemperature(selectedCityInfo.current.apparentTemperature) }}</strong></article>
        <article><small>습도</small><strong>{{ selectedCityInfo.current.humidity }}%</strong></article>
        <article><small>바람</small><strong>{{ windWord }} · {{ selectedCityInfo.current.windSpeed }} km/h</strong></article>
        <article><small>자외선</small><strong>{{ Number.isFinite(selectedCityInfo.sun?.uvMax) ? `UV ${Math.round(selectedCityInfo.sun.uvMax)}` : '확인 중' }}</strong></article>
        <article><small>해 뜨고 지는 시각</small><strong>{{ selectedCityInfo.sun?.sunrise ?? '--:--' }} · {{ selectedCityInfo.sun?.sunset ?? '--:--' }}</strong></article>
      </section>
      <section v-else class="live-loading" aria-live="polite">실시간 날씨와 생활지수를 불러오는 중…</section>

      <section v-if="weatherDataSource === 'kma'" id="rhythm" class="rhythm-section">
        <div class="section-title">
          <div>
            <p class="overline">LIFE WINDOW · HOURLY</p>
            <h2>오늘의 좋은 틈</h2>
          </div>
          <p>하고 싶은 일을 고르면 앞으로 8시간 중<br />가장 좋은 순간을 찾아드려요.</p>
        </div>

        <div class="activity-tabs" role="tablist" aria-label="활동 선택">
          <button
            v-for="activity in activities"
            :key="activity.id"
            type="button"
            role="tab"
            :aria-selected="activeActivityId === activity.id"
            :class="{ active: activeActivityId === activity.id }"
            @click="activeActivityId = activity.id"
          >
            <span>{{ activity.icon }}</span>{{ activity.label }}
          </button>
        </div>

        <div class="rhythm-board">
          <article class="best-window">
            <p>BEST WINDOW</p>
            <strong>{{ bestHour ? formatHour(bestHour.time) : '계산 중' }}</strong>
            <span class="score"><b>{{ bestHour?.score ?? '—' }}</b>/100</span>
            <div class="score-line"><i :style="{ width: `${bestHour?.score ?? 0}%` }"></i></div>
            <p class="advice">{{ activityAdvice }}</p>
          </article>

          <div class="hourly-chart" aria-label="시간별 활동 추천 지수">
            <article v-for="(hour, index) in activityTimeline" :key="hour.time" :class="{ best: hour.time === bestHour?.time }">
              <time :datetime="hour.time">{{ index === 0 ? '지금' : formatHour(hour.time).replace('오전 ', '').replace('오후 ', '') }}</time>
              <div class="bar-track"><i :style="{ height: `${hour.score}%` }"></i></div>
              <span>{{ hour.weather.icon }}</span>
              <strong>{{ formatTemperature(hour.temperature) }}</strong>
              <small>{{ hour.precipitationProbability }}%</small>
            </article>
          </div>
        </div>
        <p class="chart-legend"><span></span>활동 적합도 · 강수 확률과 체감온도, 바람을 함께 계산했어요.</p>
      </section>

      <section v-if="weatherDataSource === 'kma'" id="forecast" class="forecast-section">
        <div class="section-title">
          <div>
            <p class="overline">FIVE SMALL TOMORROWS</p>
            <h2>다가오는 날들</h2>
          </div>
          <p>온도보다 하루의 인상을 먼저 읽어보세요.</p>
        </div>

        <div class="forecast-list">
          <article v-for="(day, index) in selectedCityInfo.forecast" :key="day.date">
            <div class="day-name">
              <span>{{ String(index + 1).padStart(2, '0') }}</span>
              <strong>{{ index === 0 ? '오늘' : new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(new Date(`${day.date}T12:00:00`)) }}</strong>
            </div>
            <p>{{ day.label }}</p>
            <span class="forecast-icon">{{ day.icon }}</span>
            <div class="temp-range"><i></i></div>
            <strong>{{ formatTemperature(day.max) }} <small>{{ formatTemperature(day.min) }}</small></strong>
            <p class="rain">비 {{ day.precipitation ?? 0 }}%</p>
          </article>
        </div>
      </section>

      <section class="city-directory-cta">
        <div class="directory-scene" :style="{ backgroundImage: `url(${selectedCityInfo.background})` }">
          <span class="directory-shade"></span>
          <div>
            <p class="overline">PLAN · COMPARE · 17 CITY WINDOWS</p>
            <h2>날씨를 고르고<br />오늘을 계획해요</h2>
            <p>시간대별 외출 계획과 준비물부터 도시 비교까지 한 화면에서 확인하세요.<br />도시마다 다른 풍경도 이어서 둘러볼 수 있어요.</p>
          </div>
          <nav>
            <RouterLink to="/planner">오늘 플래너 열기 <span>↗</span></RouterLink>
            <RouterLink to="/cities">전국 도시 둘러보기 <span>↗</span></RouterLink>
            <RouterLink to="/map">지도에서 찾기 <span>⌖</span></RouterLink>
          </nav>
        </div>
      </section>

      <footer>
        <div class="brand footer-brand"><span class="brand-mark">O</span><span>오늘의 틈<small>WEATHER FOR LIFE</small></span></div>
        <p>날씨를 확인하는 데서 그치지 않고,<br />오늘을 잘 보내는 순간을 제안합니다.</p>
        <small><RouterLink to="/about">서비스 소개</RouterLink> · KMA · AIRKOREA · DATA.GO.KR</small>
      </footer>
    </div>
  </main>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
:global(html) { scroll-behavior: smooth; }
:global(body) { color: #171914; background: #efeee6; }
:global(button), :global(input) { font: inherit; }

.weather-page {
  min-height: 100vh;
  overflow-x: clip;
  color: #171914;
  background:
    radial-gradient(circle at 11% 22%, rgb(216 255 69 / 16%), transparent 22rem),
    #efeee6;
  font-family: Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.site-header {
  position: relative;
  z-index: 20;
  display: grid;
  width: min(var(--layout-max), calc(100% - (var(--layout-gutter) * 2)));
  height: 92px;
  margin: 0 auto;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  border-bottom: 1px solid #171914;
}

.brand { display: inline-flex; align-items: center; gap: 11px; color: inherit; font-size: 15px; font-weight: 700; line-height: 1; text-decoration: none; }
.brand-mark { display: grid; width: 37px; height: 37px; place-items: center; color: #d8ff45; background: #171914; border-radius: 50%; font-family: inherit; font-style: normal; font-weight: 700; }
.brand small { display: block; margin-top: 5px; font-size: 11px; font-weight: 600; letter-spacing: 1.7px; }
.site-header nav { display: flex; gap: clamp(18px, 2vw, 32px); }
.site-header nav a { color: inherit; font-size: 15px; font-weight: 600; text-decoration: none; }
.header-tools { display: flex; justify-content: flex-end; gap: 8px; }
.header-tools button, .city-trigger { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; color: inherit; background: transparent; border: 1px solid #aaa99f; border-radius: 30px; cursor: pointer; text-decoration: none; }
.unit-button { width: 44px; }
.city-trigger { min-width: 122px; padding: 0 16px; }
.location-button { padding: 0 15px; gap: 7px; }
.location-button:disabled { opacity: .58; cursor: wait; }

.city-drawer { position: absolute; top: 76px; right: 0; width: min(560px, calc(100vw - 32px)); padding: 25px; background: #fffef8; border: 1px solid #171914; border-radius: 20px; box-shadow: 0 24px 70px rgb(33 34 28 / 18%); }
.drawer-head { display: flex; align-items: start; justify-content: space-between; }
.drawer-head small { font-size: 12px; font-weight: 700; letter-spacing: 2px; }
.drawer-head h2 { margin: 7px 0 20px; font-size: 24px; }
.drawer-head h2 { margin-bottom: 4px; }
.drawer-count { margin: 0 0 18px; color: rgb(255 255 255 / 58%); font-size: 14px; }
.drawer-head > button { width: 32px; height: 32px; color: inherit; background: transparent; border: 1px solid #bbb; border-radius: 50%; cursor: pointer; }
.search-box { display: flex; height: 49px; padding: 0 14px; align-items: center; gap: 9px; background: #efeee6; border: 1px solid transparent; border-radius: 12px; }
.search-box:focus-within { border-color: #171914; }
.search-box input { min-width: 0; flex: 1; background: transparent; border: 0; outline: 0; }
.search-box button { padding: 4px 7px; color: inherit; background: transparent; border: 0; font-size: 14px; cursor: pointer; }
.drawer-grid { display: grid; max-height: 420px; margin-top: 12px; grid-template-columns: repeat(2, 1fr); gap: 8px; overflow-y: auto; padding-right: 3px; scrollbar-width: thin; }
.drawer-grid > button { display: flex; padding: 14px; align-items: center; justify-content: space-between; color: inherit; text-align: left; background: transparent; border: 1px solid #d6d4c8; border-radius: 12px; cursor: pointer; }
.drawer-grid > button.active { background: #d8ff45; border-color: #171914; }
.drawer-grid span small { display: block; margin-top: 4px; color: #74756d; font-size: 13px; font-weight: 400; }
.drawer-grid strong { font-size: 18px; }
.no-city { padding: 24px; text-align: center; }
.drop-enter-active, .drop-leave-active { transition: 180ms ease; }
.drop-enter-from, .drop-leave-to { opacity: 0; transform: translateY(-8px); }

.page-shell { width: min(var(--layout-max), calc(100% - (var(--layout-gutter) * 2))); margin: 0 auto; }
.error-note { margin: 18px 0 -10px; padding: 12px 16px; color: #6c2b1d; background: #ffd5c8; border-radius: 10px; font-size: 15px; }
.hero { display: grid; min-height: 690px; padding: 78px 0 58px; grid-template-columns: 1.05fr .95fr; align-items: center; gap: 72px; }
.overline { margin: 0 0 19px; font-size: 13px; font-weight: 700; letter-spacing: 2.2px; text-transform: uppercase; }
.hero h1 { margin: 0; font-family: inherit; font-size: clamp(42px, 4.7vw, 64px); font-weight: 650; line-height: 1.16; letter-spacing: -.045em; }
.hero h1 span, .hero h1 em { display: block; }
.hero h1 em { color: #4d55ea; font-family: inherit; font-style: normal; font-weight: 600; }
.hero-intro { max-width: 490px; margin: 34px 0; color: #5e6058; font-size: 16px; line-height: 1.75; }
.hero-actions { display: flex; align-items: center; gap: 12px; }
.hero-actions a, .hero-actions button { display: inline-flex; height: 52px; padding: 0 21px; align-items: center; gap: 22px; color: inherit; background: transparent; border: 1px solid #171914; border-radius: 4px; font-size: 15px; font-weight: 600; text-decoration: none; cursor: pointer; }
.hero-actions a { color: #fff; background: #171914; }
.hero-actions a span { color: #d8ff45; }
.hero-actions button:disabled { opacity: .55; cursor: wait; }

.weather-portrait { position: relative; margin: 0; }
.weather-portrait::before { position: absolute; right: -36px; bottom: -35px; width: 170px; height: 170px; background: var(--accent); border-radius: 50%; content: ''; }
.portrait-image { position: relative; min-height: 530px; overflow: hidden; background-position: center; background-size: cover; border-radius: 50% 50% 8px 8px; box-shadow: 0 32px 70px rgb(26 29 20 / 14%); isolation: isolate; }
.portrait-image::after { position: absolute; inset: 0; z-index: -1; background: linear-gradient(180deg, rgb(22 28 23 / 0%), rgb(22 28 23 / 52%)); content: ''; }
.weather-stamp { position: absolute; top: 11%; left: 9%; display: flex; flex-direction: column; color: white; text-shadow: 0 2px 22px rgb(0 0 0 / 25%); }
.weather-stamp span { font-size: 15px; font-weight: 600; letter-spacing: 1px; }
.weather-stamp strong { font-size: clamp(58px, 6vw, 82px); font-weight: 600; letter-spacing: -.05em; line-height: 1.05; }
.orbit { position: absolute; border: 1px solid rgb(255 255 255 / 52%); border-radius: 50%; }
.orbit-one { right: 11%; bottom: 18%; width: 108px; height: 108px; }
.orbit-two { right: 17%; bottom: 24%; width: 16px; height: 16px; background: var(--accent); border: 0; }
.portrait-caption { position: absolute; right: 25px; bottom: 17px; left: 25px; margin: 0; color: white; font-size: 12px; letter-spacing: 1.8px; }

.now-strip { display: grid; padding: 24px; grid-template-columns: 1.2fr repeat(5, 1fr); border-top: 1px solid #171914; border-bottom: 1px solid #171914; }
.now-strip > * { min-height: 52px; padding: 0 23px; border-right: 1px solid #bbb9ae; }
.now-strip > :first-child { padding-left: 0; }
.now-strip > :last-child { padding-right: 0; border-right: 0; }
.strip-lead { display: flex; margin: 0; align-items: center; font-size: 20px; font-weight: 600; }
.now-strip article { display: flex; flex-direction: column; justify-content: center; gap: 6px; }
.now-strip small { color: #77786f; font-size: 13px; }
.now-strip strong { font-size: 15px; font-weight: 600; }
.live-loading { padding: 28px; color: rgb(230 236 255 / 68%); border-top: 1px solid rgb(255 255 255 / 17%); border-bottom: 1px solid rgb(255 255 255 / 17%); text-align: center; }

.rhythm-section, .forecast-section, .city-postcards { padding: var(--card-padding); }
.section-title { display: flex; margin-bottom: clamp(28px, 3vw, 40px); align-items: end; justify-content: space-between; gap: 28px; }
.section-title h2 { margin: 0; font-size: var(--title-section); letter-spacing: -.04em; }
.section-title > p { margin: 0; color: #6c6e65; font-size: 15px; line-height: 1.7; }
.activity-tabs { display: grid; margin-bottom: 18px; grid-template-columns: repeat(4, 1fr); border: 1px solid #171914; }
.activity-tabs button { display: flex; height: 66px; align-items: center; justify-content: center; gap: 11px; color: inherit; background: transparent; border: 0; border-right: 1px solid #171914; cursor: pointer; }
.activity-tabs button:last-child { border-right: 0; }
.activity-tabs button.active { background: var(--accent); }
.activity-tabs button span { font-size: 20px; }
.rhythm-board { display: grid; min-height: 430px; grid-template-columns: .72fr 1.28fr; background: #171914; }
.best-window { padding: 52px; color: white; border-right: 1px solid #55564f; }
.best-window > p:first-child { margin: 0 0 24px; color: var(--accent); font-size: 13px; font-weight: 700; letter-spacing: 2.4px; }
.best-window > strong { display: block; max-width: 350px; font-size: clamp(38px, 4.4vw, 56px); font-weight: 600; line-height: 1.08; letter-spacing: -.04em; }
.score { display: block; margin: 34px 0 10px; color: #979890; font-size: 15px; }
.score b { color: white; font-size: 26px; }
.score-line { height: 3px; overflow: hidden; background: #4e5049; }
.score-line i { display: block; height: 100%; background: var(--accent); transition: width 250ms ease; }
.best-window .advice { max-width: 390px; margin: 27px 0 0; color: #b9bbb2; font-size: 14px; line-height: 1.75; }
.hourly-chart { display: grid; padding: 42px 34px 30px; grid-template-columns: repeat(8, 1fr); gap: 7px; }
.hourly-chart article { display: grid; min-width: 0; grid-template-rows: 28px 1fr 31px 28px 20px; justify-items: center; color: white; }
.hourly-chart time { color: #8f9188; font-size: 13px; }
.bar-track { position: relative; width: 9px; height: 190px; align-self: end; overflow: hidden; background: #373832; border-radius: 10px; }
.bar-track i { position: absolute; right: 0; bottom: 0; left: 0; background: #64665e; border-radius: inherit; transition: height 250ms ease, background-color 250ms ease; }
.hourly-chart article.best .bar-track { width: 13px; }
.hourly-chart article.best .bar-track i { background: var(--accent); }
.hourly-chart article > span { align-self: center; font-size: 18px; }
.hourly-chart article > strong { font-size: 14px; }
.hourly-chart article > small { color: #85877f; font-size: 13px; }
.chart-legend { margin: 13px 0 0; color: #77786f; font-size: 14px; }
.chart-legend span { display: inline-block; width: 6px; height: 6px; margin-right: 7px; background: var(--accent); border-radius: 50%; }

.forecast-section { border-top: 1px solid #bdbcb2; }
.forecast-list { border-top: 1px solid #171914; }
.forecast-list article { display: grid; min-height: 112px; padding: 0 20px; grid-template-columns: 1.3fr 1.2fr .5fr 1.2fr 1fr .55fr; align-items: center; gap: 18px; border-bottom: 1px solid #bdbcb2; }
.day-name { display: flex; align-items: center; gap: 28px; }
.day-name span { color: #91928a; font-size: 13px; }
.day-name strong { font-size: 18px; }
.forecast-list p { color: #696b63; font-size: 15px; }
.forecast-icon { font-size: 25px; }
.temp-range { height: 4px; overflow: hidden; background: #d4d2c7; border-radius: 4px; }
.temp-range i { display: block; width: 68%; height: 100%; margin-left: 16%; background: #4d55ea; border-radius: inherit; }
.forecast-list > article > strong { font-size: 18px; text-align: right; }
.forecast-list > article > strong small { margin-left: 10px; color: #8d8e86; font-size: 14px; font-weight: 500; }
.forecast-list .rain { text-align: right; }

.city-postcards { border-top: 1px solid #bdbcb2; }
.section-title.compact h2 { font-size: clamp(30px, 3.2vw, 38px); }
.section-title.compact button, .section-title.compact a { padding: 0 0 5px; color: inherit; background: transparent; border: 0; border-bottom: 1px solid #171914; font-size: 15px; cursor: pointer; text-decoration: none; }
.postcard-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.postcard-grid article { position: relative; overflow: hidden; background: #e3e1d7; border: 1px solid transparent; }
.postcard-grid article.selected { border-color: #171914; }
.postcard-main { width: 100%; padding: 0; color: inherit; text-align: left; background: transparent; border: 0; cursor: pointer; }
.postcard-photo { display: block; height: 170px; background-position: center; background-size: cover; filter: saturate(.75); }
.postcard-copy { display: block; padding: 18px; }
.postcard-copy small, .postcard-copy strong, .postcard-copy em { display: block; }
.postcard-copy small { color: #77786f; font-size: 12px; }
.postcard-copy strong { margin: 8px 0 16px; font-size: 24px; }
.postcard-copy em { font-size: 15px; font-style: normal; }
.favorite { position: absolute; top: 10px; right: 10px; display: grid; width: 34px; height: 34px; place-items: center; color: #171914; background: #fffef8; border: 0; border-radius: 50%; cursor: pointer; }

footer { display: grid; padding: 52px 0 66px; grid-template-columns: 1fr 1fr auto; align-items: end; border-top: 1px solid #171914; }
footer p { margin: 0; color: #5d5f57; font-size: 15px; line-height: 1.7; }
footer > small { color: #77786f; font-size: 11px; letter-spacing: 1.4px; }

.window-opening {
  position: fixed;
  z-index: 500;
  inset: 0;
  overflow: hidden;
  background: linear-gradient(135deg, #0b1931, #2a385d 54%, #0c1b34);
}
.opening-scene {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: cover;
  transform: scale(1.08);
}
.opening-scene::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, rgb(8 19 40 / 54%), rgb(39 55 87 / 19%), rgb(7 17 34 / 54%));
  content: '';
}
.opening-weather {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  flex-direction: column;
  color: white;
  text-align: center;
  text-shadow: 0 12px 40px rgb(2 9 21 / 45%);
  opacity: 0;
  transform: translate(-50%, -44%);
}
.opening-weather p { margin: 0 0 12px; font-size: 14px; font-weight: 600; letter-spacing: 1.4px; }
.opening-weather > span { font-size: 18px; }
.opening-weather strong { margin: 3px 0; font-size: clamp(62px, 9vw, 96px); font-weight: 600; letter-spacing: -.06em; line-height: 1; }
.opening-weather .permission-title { max-width: 620px; margin: 10px 0 16px; font-size: clamp(28px, 4.5vw, 58px); letter-spacing: -.045em; line-height: 1.12; }
.opening-weather small { color: rgb(255 255 255 / 70%); font-size: 14px; }
.opening-pane {
  position: absolute;
  z-index: 4;
  top: 0;
  bottom: 0;
  width: 50%;
  background:
    linear-gradient(125deg, rgb(255 255 255 / 20%), rgb(255 255 255 / 5%)),
    linear-gradient(180deg, rgb(28 44 74 / 42%), rgb(9 22 44 / 58%));
  border: 10px solid rgb(213 226 255 / 22%);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 18%), 0 0 80px rgb(1 8 22 / 32%);
  backdrop-filter: blur(26px) saturate(125%);
}
.opening-pane::before,
.opening-pane::after {
  position: absolute;
  background: linear-gradient(90deg, rgb(255 255 255 / 30%), rgb(183 203 240 / 15%));
  content: '';
}
.opening-pane::before { top: 50%; right: 0; left: 0; height: 7px; }
.opening-pane::after { top: 0; bottom: 0; width: 7px; }
.opening-pane-left { left: 0; transform-origin: left center; }
.opening-pane-left::after { right: 10%; }
.opening-pane-right { right: 0; transform-origin: right center; }
.opening-pane-right::after { left: 10%; }
.opening-handle {
  position: absolute;
  top: 50%;
  width: 9px;
  height: 55px;
  background: linear-gradient(90deg, #e9effb, #9eacc5);
  border-radius: 8px;
  box-shadow: 0 8px 20px rgb(1 7 18 / 22%);
  transform: translateY(-50%);
}
.opening-pane-left .opening-handle { right: 25px; }
.opening-pane-right .opening-handle { left: 25px; }
.window-opening > button {
  position: absolute;
  z-index: 8;
  right: 24px;
  bottom: 22px;
  padding: 10px 15px;
  color: white;
  background: linear-gradient(120deg, rgb(255 255 255 / 17%), rgb(255 255 255 / 6%));
  border: 1px solid rgb(255 255 255 / 26%);
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  backdrop-filter: blur(16px);
}
.window-opening > button:disabled { cursor: wait; opacity: .68; }
.window-opening.is-ready { animation: opening-exit 3.4s ease forwards; }
.window-opening.is-ready .opening-scene { animation: opening-scene-in 3.2s ease forwards; }
.window-opening.is-ready .opening-weather { animation: opening-weather-in 1.25s 1.2s ease forwards; }
.window-opening.is-ready .opening-pane-left { animation: pane-open-left 1.45s .55s cubic-bezier(.58,.02,.18,1) forwards; }
.window-opening.is-ready .opening-pane-right { animation: pane-open-right 1.45s .55s cubic-bezier(.58,.02,.18,1) forwards; }
@keyframes pane-open-left { to { opacity: .12; transform: perspective(1100px) rotateY(-78deg) translateX(-45%); } }
@keyframes pane-open-right { to { opacity: .12; transform: perspective(1100px) rotateY(78deg) translateX(45%); } }
@keyframes opening-scene-in { to { transform: scale(1); } }
@keyframes opening-weather-in { to { opacity: 1; transform: translate(-50%, -50%); } }
@keyframes opening-exit { 0%, 84% { opacity: 1; } 100% { opacity: 0; visibility: hidden; } }

.location-summary {
  max-width: 520px;
  margin: 0 0 25px;
  padding: 20px;
  background: linear-gradient(125deg, rgb(255 255 255 / 17%), rgb(255 255 255 / 6%));
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: 21px;
  box-shadow: 0 22px 48px rgb(2 9 22 / 18%), inset 0 1px 0 rgb(255 255 255 / 19%);
  backdrop-filter: blur(24px) saturate(130%);
}
.location-summary-head { display: flex; align-items: start; justify-content: space-between; }
.location-summary-head p { margin: 0 0 4px; color: var(--accent); font-size: 11px; font-weight: 700; letter-spacing: 1.8px; }
.location-summary-head span { color: rgb(255 255 255 / 61%); font-size: 13px; }
.location-summary-head button { padding: 6px 9px; color: rgb(255 255 255 / 68%); background: rgb(255 255 255 / 7%); border: 1px solid rgb(255 255 255 / 14%); border-radius: 12px; font-size: 12px; cursor: pointer; }
.location-current { display: flex; margin: 15px 0; align-items: center; gap: 18px; }
.location-current > strong { font-size: clamp(42px, 4.6vw, 58px); font-weight: 600; letter-spacing: -.055em; line-height: 1; }
.location-current div { display: flex; flex-direction: column; gap: 3px; }
.location-current b { font-size: 14px; }
.location-current span { color: rgb(255 255 255 / 57%); font-size: 13px; }
.location-summary dl { display: grid; margin: 0; padding: 13px 0; grid-template-columns: repeat(3, 1fr); border-top: 1px solid rgb(255 255 255 / 13%); border-bottom: 1px solid rgb(255 255 255 / 13%); }
.location-summary dl div { padding-left: 12px; border-left: 1px solid rgb(255 255 255 / 12%); }
.location-summary dl div:first-child { padding-left: 0; border-left: 0; }
.location-summary dt { color: rgb(255 255 255 / 48%); font-size: 11px; }
.location-summary dd { margin: 2px 0 0; font-size: 14px; font-weight: 600; }
.location-summary > a { display: flex; margin-top: 12px; justify-content: space-between; color: rgb(255 255 255 / 70%); font-size: 13px; text-decoration: none; }
.location-summary > a span { color: var(--accent); }

.weather-portrait::after {
  position: absolute;
  z-index: 4;
  right: -14px;
  bottom: -16px;
  left: -14px;
  height: 24px;
  background: linear-gradient(180deg, rgb(255 255 255 / 35%), rgb(119 137 173 / 30%));
  border: 1px solid rgb(255 255 255 / 29%);
  border-radius: 4px 4px 14px 14px;
  box-shadow: 0 16px 30px rgb(1 8 22 / 22%);
  content: '';
  backdrop-filter: blur(14px);
}
.portrait-image { border-width: 9px; border-radius: 34px; }
.window-bar { position: absolute; z-index: 3; background: linear-gradient(90deg, rgb(255 255 255 / 45%), rgb(152 172 211 / 25%)); box-shadow: 0 2px 10px rgb(2 10 25 / 18%); }
.window-bar-vertical { top: 0; bottom: 0; left: 50%; width: 8px; transform: translateX(-50%); }
.window-bar-horizontal { top: 51%; right: 0; left: 0; height: 8px; transform: translateY(-50%); }

/* Illustration-led glass theme */
.weather-page {
  position: relative;
  color: #f7f9ff;
  background-color: transparent;
  background-image:
    linear-gradient(135deg, rgb(9 18 38 / 84%) 0%, rgb(35 42 73 / 58%) 43%, rgb(9 21 37 / 86%) 100%),
    radial-gradient(circle at 18% 14%, rgb(158 192 255 / 42%), transparent 31rem),
    radial-gradient(circle at 83% 62%, color-mix(in srgb, var(--accent) 28%, transparent), transparent 34rem),
    var(--scene);
  background-attachment: fixed;
  background-position: center;
  background-size: cover;
  isolation: isolate;
}
.weather-page::before,
.weather-page::after { position: fixed; z-index: -1; pointer-events: none; content: ''; }
.weather-page::before {
  inset: 0;
  background:
    linear-gradient(115deg, rgb(255 255 255 / 7%), transparent 34%, rgb(130 154 218 / 10%)),
    repeating-linear-gradient(112deg, rgb(255 255 255 / 2%) 0 1px, transparent 1px 7px);
  mix-blend-mode: screen;
}
.weather-page::after {
  top: -18vw; right: -14vw; width: 55vw; height: 55vw;
  background: radial-gradient(circle, rgb(192 218 255 / 24%), rgb(128 115 244 / 9%) 40%, transparent 70%);
  filter: blur(10px);
}
.site-header {
  position: sticky; top: 14px;
  width: min(1420px, calc(100% - 40px)); height: 72px; margin-top: 14px; padding: 0 20px;
  background: linear-gradient(125deg, rgb(255 255 255 / 16%), rgb(255 255 255 / 5%));
  border: 1px solid rgb(255 255 255 / 24%); border-radius: 22px;
  box-shadow: 0 20px 50px rgb(4 11 25 / 22%), inset 0 1px 0 rgb(255 255 255 / 25%);
  backdrop-filter: blur(28px) saturate(135%);
}
.brand-mark {
  color: #162038;
  background: linear-gradient(145deg, #ffffff, var(--accent));
  box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 26%, transparent);
}
.site-header nav a { color: rgb(255 255 255 / 78%); }
.site-header nav a:hover { color: #fff; }
.header-tools button, .city-trigger {
  color: #fff;
  background: linear-gradient(120deg, rgb(255 255 255 / 14%), rgb(255 255 255 / 5%));
  border-color: rgb(255 255 255 / 25%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 13%);
}
.city-drawer {
  color: #f9fbff;
  background: linear-gradient(145deg, rgb(27 40 68 / 92%), rgb(14 25 48 / 84%)), var(--scene);
  background-position: center; background-size: cover;
  border-color: rgb(255 255 255 / 26%);
  box-shadow: 0 30px 90px rgb(2 8 22 / 48%), inset 0 1px 0 rgb(255 255 255 / 18%);
  backdrop-filter: blur(32px) saturate(125%);
}
.drawer-head > button,
.drawer-grid > button {
  color: inherit;
  background: linear-gradient(120deg, rgb(255 255 255 / 11%), rgb(255 255 255 / 4%));
  border-color: rgb(255 255 255 / 18%);
}
.drawer-grid > button.active {
  color: #141b2e;
  background: linear-gradient(135deg, rgb(255 255 255 / 94%), color-mix(in srgb, var(--accent) 76%, white));
  border-color: rgb(255 255 255 / 72%);
}
.drawer-grid span small { color: currentColor; opacity: .62; }
.search-box {
  background: linear-gradient(110deg, rgb(255 255 255 / 13%), rgb(255 255 255 / 6%));
  border-color: rgb(255 255 255 / 14%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 12%);
}
.search-box input { color: #fff; }
.search-box input::placeholder { color: rgb(255 255 255 / 46%); }
.search-box:focus-within { border-color: rgb(255 255 255 / 54%); }
.page-shell { padding-top: 1px; }
.overline { color: rgb(220 231 255 / 74%); }
.hero h1 { color: #fff; text-shadow: 0 18px 50px rgb(5 12 28 / 28%); }
.hero h1 em {
  color: transparent;
  background: linear-gradient(105deg, #fff, #cbd9ff 48%, var(--accent));
  background-clip: text; -webkit-background-clip: text;
}
.hero-intro { color: rgb(240 244 255 / 70%); }
.hero-actions a,
.hero-actions button {
  color: #fff;
  background: linear-gradient(120deg, rgb(255 255 255 / 17%), rgb(255 255 255 / 6%));
  border-color: rgb(255 255 255 / 29%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 16%);
  backdrop-filter: blur(15px);
}
.hero-actions a {
  background: linear-gradient(125deg, rgb(255 255 255 / 28%), rgb(255 255 255 / 9%));
  box-shadow: 0 14px 34px rgb(4 11 25 / 19%), inset 0 1px 0 rgb(255 255 255 / 28%);
}
.weather-portrait::before {
  background: radial-gradient(circle at 30% 30%, rgb(255 255 255 / 82%), var(--accent) 32%, rgb(124 142 239 / 45%) 70%);
  box-shadow: 0 0 60px color-mix(in srgb, var(--accent) 26%, transparent);
}
.portrait-image {
  border: 1px solid rgb(255 255 255 / 26%);
  box-shadow: 0 38px 90px rgb(2 9 23 / 38%), inset 0 1px 0 rgb(255 255 255 / 21%);
}
.now-strip {
  padding: 20px;
  background: linear-gradient(120deg, rgb(255 255 255 / 15%), rgb(255 255 255 / 5%));
  border: 1px solid rgb(255 255 255 / 22%); border-radius: 24px;
  box-shadow: 0 24px 55px rgb(3 10 24 / 18%), inset 0 1px 0 rgb(255 255 255 / 19%);
  backdrop-filter: blur(24px) saturate(130%);
}
.now-strip > * { border-color: rgb(255 255 255 / 17%); }
.now-strip small { color: rgb(230 236 255 / 58%); }
.rhythm-section,
.forecast-section,
.city-postcards {
  margin-top: var(--card-gap); padding: var(--card-padding);
  background: linear-gradient(135deg, rgb(255 255 255 / 13%), rgb(255 255 255 / 4%));
  border: 1px solid rgb(255 255 255 / 20%); border-radius: var(--radius-lg);
  box-shadow: 0 32px 80px rgb(2 9 23 / 20%), inset 0 1px 0 rgb(255 255 255 / 18%);
  backdrop-filter: blur(32px) saturate(125%);
}
.section-title > p { color: rgb(236 241 255 / 62%); }
.activity-tabs {
  overflow: hidden;
  background: linear-gradient(110deg, rgb(255 255 255 / 11%), rgb(255 255 255 / 4%));
  border-color: rgb(255 255 255 / 21%); border-radius: 18px;
}
.activity-tabs button { color: rgb(255 255 255 / 72%); border-color: rgb(255 255 255 / 16%); }
.activity-tabs button.active {
  color: #11192c;
  background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 86%, white), rgb(255 255 255 / 78%));
  box-shadow: 0 8px 28px color-mix(in srgb, var(--accent) 19%, transparent);
}
.rhythm-board {
  overflow: hidden;
  background: linear-gradient(120deg, rgb(6 14 32 / 74%), rgb(28 35 63 / 54%)), var(--scene);
  background-position: center; background-size: cover;
  border: 1px solid rgb(255 255 255 / 17%); border-radius: 24px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 12%);
}
.best-window { background: linear-gradient(135deg, rgb(255 255 255 / 10%), rgb(255 255 255 / 2%)); border-color: rgb(255 255 255 / 15%); }
.best-window .advice { color: rgb(235 240 255 / 67%); }
.bar-track { background: rgb(255 255 255 / 11%); box-shadow: inset 0 1px 3px rgb(0 0 0 / 28%); }
.bar-track i { background: linear-gradient(to top, rgb(255 255 255 / 22%), rgb(255 255 255 / 50%)); }
.chart-legend { color: rgb(232 238 255 / 58%); }
.forecast-section,
.city-postcards { border-top-color: rgb(255 255 255 / 20%); }
.forecast-list {
  overflow: hidden;
  background: linear-gradient(115deg, rgb(255 255 255 / 9%), rgb(255 255 255 / 3%));
  border: 1px solid rgb(255 255 255 / 16%); border-radius: 22px;
}
.forecast-list article { border-color: rgb(255 255 255 / 13%); }
.forecast-list p,
.day-name span,
.forecast-list > article > strong small { color: rgb(232 238 255 / 60%); }
.temp-range { background: rgb(255 255 255 / 12%); }
.temp-range i { background: linear-gradient(90deg, #a7b8ff, var(--accent)); }
.section-title.compact button, .section-title.compact a { color: #fff; border-color: rgb(255 255 255 / 55%); }
.postcard-grid article {
  background: linear-gradient(135deg, rgb(255 255 255 / 13%), rgb(255 255 255 / 5%));
  border-color: rgb(255 255 255 / 15%); border-radius: 18px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 12%); backdrop-filter: blur(20px);
}
.postcard-grid article.selected {
  border-color: color-mix(in srgb, var(--accent) 70%, white);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 28%, transparent), inset 0 1px 0 rgb(255 255 255 / 18%);
}
.postcard-main { color: #fff; }
.postcard-photo { position: relative; filter: saturate(.82) contrast(.96); }
.postcard-copy small { color: rgb(232 238 255 / 55%); }
.favorite {
  color: #fff;
  background: linear-gradient(145deg, rgb(255 255 255 / 25%), rgb(255 255 255 / 9%));
  border: 1px solid rgb(255 255 255 / 26%); backdrop-filter: blur(18px);
}
.error-note {
  color: #fff;
  background: linear-gradient(110deg, rgb(255 109 91 / 38%), rgb(255 255 255 / 8%));
  border: 1px solid rgb(255 194 183 / 32%); backdrop-filter: blur(18px);
}
footer { border-color: rgb(255 255 255 / 22%); }
footer p,
footer > small { color: rgb(232 238 255 / 58%); }

.city-directory-cta { margin-top: var(--card-gap); padding: var(--card-padding); background: linear-gradient(135deg, rgb(255 255 255 / 13%), rgb(255 255 255 / 4%)); border: 1px solid rgb(255 255 255 / 20%); border-radius: var(--radius-lg); box-shadow: 0 32px 80px rgb(2 9 23 / 20%), inset 0 1px 0 rgb(255 255 255 / 18%); backdrop-filter: blur(32px) saturate(125%); }
.directory-scene { position: relative; display: grid; min-height: 430px; padding: clamp(32px, 4vw, 56px); overflow: hidden; grid-template-columns: 1fr auto; align-items: end; color: #fff; background-position: center; background-size: cover; border: 1px solid rgb(255 255 255 / 22%); border-radius: var(--radius-md); box-shadow: 0 28px 70px rgb(1 8 23 / 30%); isolation: isolate; }
.directory-shade { position: absolute; z-index: -1; inset: 0; background: linear-gradient(110deg, rgb(8 17 37 / 82%), rgb(17 30 54 / 44%) 58%, rgb(11 19 37 / 18%)), linear-gradient(0deg, rgb(7 15 31 / 58%), transparent 58%); }
.directory-scene > div { max-width: 610px; }.directory-scene h2 { margin: 0; font-size: clamp(39px, 4.6vw, 62px); line-height: 1.06; letter-spacing: -.05em; }.directory-scene > div > p:last-child { margin: 20px 0 0; color: rgb(255 255 255 / 64%); font-size: 14px; line-height: 1.65; }
.directory-scene nav { display: flex; align-items: stretch; flex-direction: column; gap: 9px; }.directory-scene nav a { display: flex; width: 210px; min-height: 48px; padding: 0 15px; align-items: center; justify-content: space-between; color: #18213b; background: linear-gradient(120deg, #fff, #d8ff45); border-radius: 14px; font-size: 13px; font-weight: 700; text-decoration: none; }.directory-scene nav a:last-child { color: #fff; background: rgb(255 255 255 / 10%); border: 1px solid rgb(255 255 255 / 20%); backdrop-filter: blur(16px); }

/* One weather window + animated companion */
.hero {
  min-height: 680px;
  padding: clamp(36px, 4vw, 56px) 0 28px;
  grid-template-columns: minmax(0, 1.22fr) minmax(330px, .78fr);
  align-items: stretch;
  gap: 24px;
}
.weather-window {
  position: relative;
  min-height: 600px;
  overflow: hidden;
  background-position: center;
  background-size: cover;
  border: 1px solid rgb(255 255 255 / 28%);
  border-radius: 34px;
  box-shadow: 0 38px 90px rgb(2 9 23 / 38%), inset 0 1px 0 rgb(255 255 255 / 24%);
  isolation: isolate;
}
.window-shade { position: absolute; z-index: -1; inset: 0; background: linear-gradient(115deg, rgb(8 17 37 / 76%) 0%, rgb(22 34 59 / 46%) 54%, rgb(15 23 46 / 22%) 100%), linear-gradient(0deg, rgb(7 15 31 / 55%), transparent 48%); }
.window-copy { position: absolute; z-index: 4; top: 46px; right: 42px; left: 46px; max-width: 620px; }
.window-copy h1 { font-size: clamp(40px, 4vw, 61px); }
.window-copy .hero-intro { max-width: 430px; margin: 22px 0 0; font-size: 15px; }
.window-weather { position: absolute; z-index: 5; right: 34px; bottom: 36px; left: 34px; display: grid; padding: 22px; grid-template-columns: .9fr 1.1fr; align-items: end; gap: 18px; background: linear-gradient(125deg, rgb(255 255 255 / 17%), rgb(255 255 255 / 6%)); border: 1px solid rgb(255 255 255 / 24%); border-radius: 22px; box-shadow: 0 24px 55px rgb(3 10 24 / 19%), inset 0 1px 0 rgb(255 255 255 / 19%); backdrop-filter: blur(25px) saturate(130%); }
.weather-primary { display: flex; min-width: 0; flex-direction: column; }
.weather-primary > span { font-size: 15px; font-weight: 650; }
.weather-primary > strong { font-size: clamp(48px, 5vw, 72px); font-weight: 600; letter-spacing: -.065em; line-height: 1; }
.weather-primary > small { margin-top: 7px; overflow: hidden; color: rgb(255 255 255 / 61%); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.window-weather dl { display: grid; margin: 0; padding: 16px 0; grid-template-columns: repeat(3, 1fr); border-top: 1px solid rgb(255 255 255 / 15%); border-bottom: 1px solid rgb(255 255 255 / 15%); }
.window-weather dl div { padding-left: 13px; border-left: 1px solid rgb(255 255 255 / 14%); }
.window-weather dl div:first-child { padding-left: 0; border-left: 0; }
.window-weather dt { color: rgb(255 255 255 / 46%); font-size: 11px; }
.window-weather dd { margin: 4px 0 0; font-size: 14px; font-weight: 650; }
.window-actions { display: flex; grid-column: 1 / -1; justify-content: space-between; gap: 10px; }
.window-actions a, .window-actions button { display: inline-flex; min-height: 38px; padding: 0 13px; align-items: center; justify-content: space-between; color: #fff; background: rgb(255 255 255 / 8%); border: 1px solid rgb(255 255 255 / 17%); border-radius: 12px; font-size: 12px; text-decoration: none; cursor: pointer; }
.window-actions a { min-width: 190px; color: #172039; background: linear-gradient(120deg, #fff, var(--accent)); font-weight: 700; }
.window-frame { position: absolute; z-index: 3; background: linear-gradient(90deg, rgb(255 255 255 / 44%), rgb(150 170 211 / 20%)); box-shadow: 0 2px 10px rgb(2 10 25 / 16%); opacity: .5; }
.frame-vertical { top: 0; bottom: 0; left: 71%; width: 7px; }
.frame-horizontal { top: 59%; right: 0; left: 0; height: 7px; }
.window-caption { position: absolute; z-index: 4; top: 22px; right: 25px; margin: 0; color: rgb(255 255 255 / 65%); font-size: 11px; letter-spacing: 1.3px; }
.character-stage { position: relative; min-height: 600px; overflow: hidden; background: linear-gradient(145deg, rgb(255 255 255 / 16%), rgb(255 255 255 / 4%)); border: 1px solid rgb(255 255 255 / 22%); border-radius: 34px; box-shadow: 0 32px 80px rgb(2 9 23 / 23%), inset 0 1px 0 rgb(255 255 255 / 19%); backdrop-filter: blur(26px) saturate(125%); }
.character-stage::before { position: absolute; right: -18%; bottom: -15%; width: 115%; aspect-ratio: 1.6; background: radial-gradient(ellipse, color-mix(in srgb, var(--accent) 30%, transparent), transparent 67%); content: ''; }
.character-stage :deep(.character-wrap) { position: absolute; z-index: 3; right: 5%; bottom: 5%; left: 5%; height: 62%; min-height: 0; }
.character-stage :deep(.character-rig) { width: min(88%, 400px); }
.character-bubble { position: absolute; z-index: 8; top: 26px; right: 26px; left: 26px; padding: 17px 18px; background: linear-gradient(125deg, rgb(13 25 49 / 54%), rgb(255 255 255 / 8%)); border: 1px solid rgb(255 255 255 / 19%); border-radius: 18px; backdrop-filter: blur(18px); }
.character-bubble span { display: block; margin-bottom: 5px; color: var(--accent); font-size: 11px; font-weight: 700; letter-spacing: 1.7px; }
.character-bubble strong { display: block; padding-right: 98px; font-size: 15px; line-height: 1.5; }
.character-bubble a { position: absolute; top: 50%; right: 17px; color: rgb(255 255 255 / 74%); font-size: 12px; text-decoration: none; transform: translateY(-50%); }
.character-place-tag { position: absolute; z-index: 8; right: 24px; bottom: 22px; left: 24px; display: flex; min-height: 38px; align-items: center; gap: 8px; color: rgb(255 255 255 / 71%); font-size: 12px; }
.character-place-tag i { width: 7px; height: 7px; background: var(--accent); border-radius: 50%; box-shadow: 0 0 13px var(--accent); }

@media (max-width: 980px) {
  .site-header, .page-shell { width: min(calc(100% - (var(--layout-gutter) * 2)), 820px); }
  .rhythm-section, .forecast-section, .city-postcards { padding: 48px 36px; }
  .site-header { grid-template-columns: 1fr auto; }
  .site-header nav { display: none; }
  .hero { min-height: 0; padding-top: 58px; grid-template-columns: 1fr; gap: 20px; }
  .weather-window { min-height: 620px; }
  .character-stage { min-height: 560px; }
  .character-stage :deep(.character-wrap) { right: 12%; left: 12%; }
  .weather-portrait { width: min(620px, 100%); }
  .portrait-image { min-height: 490px; }
  .now-strip { grid-template-columns: repeat(3, 1fr); }
  .now-strip > * { padding: 14px 18px; border-bottom: 1px solid #bbb9ae; }
  .now-strip > :nth-child(3) { border-right: 0; }
  .rhythm-board { grid-template-columns: 1fr; }
  .best-window { border-right: 0; border-bottom: 1px solid #55564f; }
  .forecast-list article { grid-template-columns: 1.1fr 1fr .4fr .8fr; }
  .temp-range, .forecast-list .rain { display: none; }
  .postcard-grid { grid-template-columns: repeat(2, 1fr); }
}

@media (max-width: 620px) {
  .site-header, .page-shell { width: calc(100% - (var(--layout-gutter) * 2)); }
  .site-header { height: 78px; }
  .brand { font-size: 14px; }
  .brand-mark { width: 33px; height: 33px; }
  .unit-button { display: none; }
  .city-trigger { min-width: 102px; padding: 0 10px; }
  .city-drawer { top: 68px; right: -1px; padding: 18px; }
  .drawer-grid { grid-template-columns: 1fr; }
  .hero { padding: 46px 0; }
  .hero h1 { font-size: clamp(38px, 11vw, 50px); }
  .location-button { width: 42px; padding: 0; justify-content: center; font-size: 0; }
  .location-button span { font-size: 15px; }
  .hero-intro { margin: 25px 0; font-size: 14px; }
  .weather-window { min-height: 680px; border-radius: 25px; }
  .window-copy { top: 35px; right: 24px; left: 24px; }
  .window-weather { right: 18px; bottom: 20px; left: 18px; grid-template-columns: 1fr; }
  .window-actions { flex-direction: column; }
  .window-actions a, .window-actions button { width: 100%; }
  .frame-vertical { left: 50%; }
  .character-stage { min-height: 510px; border-radius: 25px; }
  .character-stage :deep(.character-wrap) { right: 8%; bottom: 7%; left: 8%; height: 61%; }
  .character-stage :deep(.character-rig) { width: min(88%, 300px); }
  .character-bubble strong { padding-right: 0; }
  .character-bubble a { position: static; display: inline-block; margin-top: 9px; transform: none; }
  .hero-actions { align-items: stretch; flex-direction: column; }
  .hero-actions a, .hero-actions button { justify-content: space-between; }
  .portrait-image { min-height: 410px; }
  .weather-portrait::before { right: -25px; width: 120px; height: 120px; }
  .now-strip { grid-template-columns: repeat(2, 1fr); }
  .now-strip > * { border-right: 1px solid #bbb9ae !important; }
  .now-strip > :nth-child(even) { border-right: 0 !important; }
  .strip-lead { font-size: 16px; }
  .rhythm-section, .forecast-section, .city-postcards { margin-top: var(--card-gap); padding: var(--card-padding); border-radius: var(--radius-lg); }
  .city-directory-cta { margin-top: var(--card-gap); padding: var(--card-padding); border-radius: var(--radius-lg); }
  .directory-scene { min-height: 480px; padding: 32px 24px; grid-template-columns: 1fr; align-content: end; gap: 28px; border-radius: 20px; }
  .directory-scene nav a { width: 100%; }
  .section-title { align-items: start; flex-direction: column; gap: 16px; }
  .activity-tabs { grid-template-columns: repeat(2, 1fr); }
  .activity-tabs button:nth-child(2) { border-right: 0; }
  .activity-tabs button:nth-child(-n+2) { border-bottom: 1px solid #171914; }
  .best-window { padding: 38px 28px; }
  .hourly-chart { padding: 34px 15px 25px; overflow-x: auto; }
  .hourly-chart article { min-width: 46px; }
  .forecast-list article { min-height: 92px; padding: 0 4px; grid-template-columns: 1fr .7fr .35fr 1fr; gap: 8px; }
  .forecast-list article > p:not(.rain) { display: none; }
  .day-name { gap: 10px; }
  .postcard-grid { grid-template-columns: 1fr; }
  .postcard-main { display: grid; grid-template-columns: 135px 1fr; }
  .postcard-photo { height: 150px; }
  footer { grid-template-columns: 1fr; gap: 26px; }
}

@media (prefers-reduced-motion: reduce) {
  :global(html) { scroll-behavior: auto; }
  *, *::before, *::after { transition: none !important; }
}

/* Responsive layout safeguards */
@media (max-width: 1180px) {
  .site-header { grid-template-columns: minmax(0, 1fr) auto; }
  .site-header nav { display: none; }
  .header-tools { min-width: 0; }
  .location-button { max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .now-strip { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .strip-lead { grid-column: 1 / -1; min-height: 44px; border-right: 0; border-bottom: 1px solid rgb(255 255 255 / 17%); }
}

@media (max-width: 1080px) {
  .hero { min-height: 0; grid-template-columns: 1fr; }
  .weather-window,.character-stage { min-height: 600px; }
  .character-stage :deep(.character-wrap) { right: 12%; left: 12%; }
  .rhythm-board { grid-template-columns: 1fr; }
  .best-window { border-right: 0; border-bottom: 1px solid rgb(255 255 255 / 15%); }
  .forecast-list article { grid-template-columns: 1.1fr 1fr .4fr .8fr; }
  .temp-range,.forecast-list .rain { display: none; }
}

@media (max-width: 760px) {
  .site-header { min-height: 68px; height: auto; padding: 10px 14px; }
  .brand small { display: none; }
  .header-tools { gap: 6px; }
  .location-button { width: 44px; padding: 0; font-size: 0; }
  .location-button span { font-size: 16px; }
  .unit-button { display: none; }
  .city-trigger { min-width: 104px; padding: 0 10px; font-size: 13px; }
  .hero { padding-top: 30px; }
  .weather-window { min-height: 680px; }
  .window-copy { top: 34px; right: 24px; left: 24px; }
  .window-weather { right: 18px; bottom: 20px; left: 18px; grid-template-columns: 1fr; }
  .window-actions { align-items: stretch; flex-direction: column; }
  .window-actions a,.window-actions button { width: 100%; min-height: 44px; }
  .character-stage { min-height: 520px; }
  .now-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .now-strip > * { padding: 12px; }
  .activity-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .activity-tabs button { min-width: 0; border-bottom: 1px solid rgb(255 255 255 / 16%); }
  .activity-tabs button:nth-child(2) { border-right: 0; }
  .section-title { align-items: flex-start; flex-direction: column; }
  .hourly-chart { overflow-x: auto; }
  .hourly-chart article { min-width: 52px; }
  .forecast-list article { min-height: 98px; padding: 0 8px; grid-template-columns: 1fr .4fr .8fr; }
  .forecast-list article > p { display: none; }
  .directory-scene { grid-template-columns: 1fr; gap: 28px; }
  .directory-scene nav,.directory-scene nav a { width: 100%; }
}
</style>

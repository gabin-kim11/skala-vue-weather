<script setup>
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'

import WeatherCharacter from '../components/weather/WeatherCharacter.vue'
import { useWeatherStore } from '../stores/weatherStore'

const weatherStore = useWeatherStore()
const { lastUpdatedAt, selectedCityInfo } = storeToRefs(weatherStore)
const { hydratePreferences, initializeLocationWeather, refreshWeather } = weatherStore
const detailCityId = computed(() => selectedCityInfo.value.guideId ?? selectedCityInfo.value.id)

const features = [
  {
    number: '01',
    title: '내 위치의 하늘부터',
    copy: 'GPS를 허용하면 현재 위치를 가장 먼저 읽고, 허용하지 않으면 서울 날씨로 편안하게 시작해요.',
    tag: 'LOCATION FIRST',
  },
  {
    number: '02',
    title: '숫자를 하루의 문장으로',
    copy: '기온만 나열하지 않고 산책, 여행, 빨래처럼 지금 하려는 일에 가장 좋은 시간을 찾아드려요.',
    tag: 'LIFE FORECAST',
  },
  {
    number: '03',
    title: '전국 17개의 다른 표정',
    copy: '도시의 특징을 담은 풍경과 날씨별 추천 장소, 음식, 활동을 한 흐름으로 만날 수 있어요.',
    tag: 'CITY JOURNEY',
  },
  {
    number: '04',
    title: '구름 고양이와 함께',
    copy: '맑음, 비, 추위, 바람에 맞춰 움직이는 작은 동행자가 오늘의 날씨를 더 쉽게 전해줘요.',
    tag: 'WEATHER FRIEND',
  },
]

const journey = [
  ['01', '창문 열기', '현재 위치 또는 서울의 오늘을 가장 먼저 보여드려요.'],
  ['02', '좋은 틈 찾기', '시간대별 강수, 체감온도, 바람을 함께 계산해요.'],
  ['03', '도시 고르기', '지도와 도시 목록에서 전국의 다른 하늘을 탐색해요.'],
  ['04', '오늘 계획하기', '일정, 위험기상, 준비물과 생활지수를 한 번에 확인해요.'],
]

onMounted(async () => {
  hydratePreferences()
  if (!lastUpdatedAt.value) {
    const initializedFromLocation = await initializeLocationWeather()
    if (!initializedFromLocation) await refreshWeather()
  }
})
</script>

<template>
  <main class="about-page" :style="{ '--scene': `url(${selectedCityInfo.background})` }">

    <div class="about-shell">
      <section class="about-hero glass">
        <div class="hero-shade"></div>
        <div class="hero-copy">
          <p class="eyebrow">ABOUT · A WINDOW FOR YOUR DAY</p>
          <h1>날씨와 하루 사이,<br /><em>좋은 틈을 열어요.</em></h1>
          <p>‘오늘의 틈’은 날씨를 확인하는 데서 멈추지 않고,<br />오늘을 언제 어디서 어떻게 보내면 좋을지 함께 골라주는 생활 날씨 서비스예요.</p>
          <div class="hero-actions">
            <RouterLink to="/planner">내 하루 계획하기 <span>↗</span></RouterLink>
            <RouterLink to="/cities">전국의 하늘 보기</RouterLink>
          </div>
        </div>

        <aside class="live-window">
          <WeatherCharacter
            :weather-code="selectedCityInfo.current.weatherCode"
            :temperature="selectedCityInfo.current.temperature"
            :precipitation="selectedCityInfo.current.precipitation"
            :wind-speed="selectedCityInfo.current.windSpeed"
          />
        </aside>
      </section>

      <section class="manifesto glass">
        <p>WHY WE MADE IT</p>
        <div>
          <h2><span>“우산을 챙길까?”보다</span><span>“오늘은 언제 나가면 좋을까?”</span></h2>
          <p>
            <span>같은 23°C라도 비와 바람, 햇빛, 내가 하려는 일에 따라 하루의 느낌은 달라져요.</span>
            <span>그래서 오늘의 틈은 수치를 생활의 언어로 바꾸고, 날씨가 계획을 방해하기 전에 더 나은 선택지를 제안합니다.</span>
          </p>
        </div>
      </section>

      <section class="feature-section">
        <div class="section-heading">
          <div><p>WHAT MAKES US DIFFERENT</p><h2>오늘의 날씨가<br />내 이야기가 되는 방법</h2></div>
          <p>복잡한 예보는 뒤로 숨기고,<br />지금 필요한 선택을 앞으로 가져왔어요.</p>
        </div>
        <div class="feature-grid">
          <article v-for="feature in features" :key="feature.number" class="glass">
            <span>{{ feature.number }}</span>
            <small>{{ feature.tag }}</small>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.copy }}</p>
            <i></i>
          </article>
        </div>
      </section>

      <section class="journey-section glass">
        <div class="journey-title">
          <p>HOW IT FLOWS</p>
          <h2>창문을 열고,<br />오늘로 이어지는 네 걸음</h2>
        </div>
        <ol>
          <li v-for="item in journey" :key="item[0]">
            <b>{{ item[0] }}</b>
            <div><strong>{{ item[1] }}</strong><p>{{ item[2] }}</p></div>
          </li>
        </ol>
      </section>

      <section class="trust-grid">
        <article class="data-card glass">
          <div class="card-label"><span>DATA & TRUST</span><i></i></div>
          <h2>보이는 건 부드럽게,<br />정보는 꼼꼼하게.</h2>
          <p>현재 날씨와 예보는 기상청 API허브, 자외선은 기상청 생활기상지수, 공기질은 에어코리아, 일출·일몰은 한국천문연구원 API에서 직접 가져와요.</p>
          <dl>
            <div><dt>날씨·자외선</dt><dd>기상청 실시간 API</dd></div>
            <div><dt>공기질·해 시각</dt><dd>공공데이터포털</dd></div>
            <div><dt>API 키</dt><dd>Vercel 서버에서 보호</dd></div>
          </dl>
        </article>

        <article class="privacy-card glass">
          <div class="card-label"><span>LOCATION & PRIVACY</span><i></i></div>
          <h2>위치는 허용할 때만,<br />선택은 언제나 사용자에게.</h2>
          <p>GPS는 브라우저에서 사용자가 직접 허용했을 때만 요청해요. 거부하거나 확인할 수 없으면 서울을 기본 위치로 사용하며, 즐겨찾기와 체크리스트는 현재 기기에만 저장됩니다.</p>
          <ul>
            <li><span>01</span>GPS 허용 시 현재 위치 우선</li>
            <li><span>02</span>거부 시 서울 날씨 제공</li>
            <li><span>03</span>개인 설정은 기기 안에 저장</li>
          </ul>
        </article>
      </section>

      <section class="closing-cta glass">
        <div>
          <p>OPEN YOUR WEATHER WINDOW</p>
          <h2>{{ selectedCityInfo.name }}의 오늘,<br />어떤 틈을 열어볼까요?</h2>
        </div>
        <nav>
          <RouterLink to="/planner">오늘 플래너 시작하기 <span>↗</span></RouterLink>
          <RouterLink :to="`/weather/${detailCityId}`">{{ selectedCityInfo.name }} 여행 보기</RouterLink>
        </nav>
      </section>

      <footer>
        <div class="brand"><span class="brand-mark">O</span><span>오늘의 틈<small>WEATHER FOR LIFE</small></span></div>
        <p>날씨와 하루 사이, 좋은 틈을 여는 생활 날씨 서비스</p>
        <RouterLink to="/">메인으로 돌아가기 ↑</RouterLink>
      </footer>
    </div>
  </main>
</template>

<style scoped>
:global(*) { box-sizing: border-box; }
.about-page { min-height: 100vh; padding: 14px 20px 52px; overflow: hidden; color: #f8faff; font-family: Pretendard, sans-serif; background: radial-gradient(circle at 82% 9%, rgb(255 196 213 / 25%), transparent 31rem), radial-gradient(circle at 10% 48%, rgb(143 183 255 / 22%), transparent 36rem), linear-gradient(135deg, rgb(8 17 35 / 96%), rgb(51 51 83 / 89%) 52%, rgb(8 20 38 / 97%)), var(--scene) center / cover fixed; }
.glass { background: linear-gradient(125deg, rgb(255 255 255 / 16%), rgb(255 255 255 / 5%)); border: 1px solid rgb(255 255 255 / 21%); box-shadow: 0 28px 76px rgb(2 8 23 / 24%), inset 0 1px 0 rgb(255 255 255 / 20%); backdrop-filter: blur(28px) saturate(126%); }
.about-header { position: relative; z-index: 10; display: grid; width: min(1460px, 100%); height: 72px; margin: 0 auto 14px; padding: 0 20px; grid-template-columns: 1fr auto 1fr; align-items: center; border-radius: 22px; }
.brand { display: inline-flex; align-items: center; gap: 11px; color: inherit; font-size: 14px; font-weight: 750; text-decoration: none; }.brand-mark { display: grid; width: 36px; height: 36px; place-items: center; color: #172039; background: linear-gradient(145deg, #fff, #d8ff45); border-radius: 50%; }.brand small { display: block; margin-top: 4px; font-size: 11px; letter-spacing: 1.5px; }.about-header nav { display: flex; gap: 26px; }.about-header nav a { color: rgb(255 255 255 / 67%); font-size: 14px; text-decoration: none; }.home-link { justify-self: end; padding: 10px 14px; color: #182039; background: linear-gradient(125deg, #fff, #d8ff45); border-radius: 18px; font-size: 13px; font-weight: 700; text-decoration: none; }.home-link span { margin-left: 8px; }
.about-shell { display: grid; width: min(1460px, 100%); margin: auto; gap: 14px; }.about-hero { position: relative; display: grid; min-height: 650px; padding: 70px 64px; grid-template-columns: 1.06fr .94fr; gap: 58px; align-items: center; overflow: hidden; border-radius: 36px; isolation: isolate; }.about-hero::before { position: absolute; z-index: -2; inset: 0; background: var(--scene) center / cover; content: ''; }.hero-shade { position: absolute; z-index: -1; inset: 0; background: linear-gradient(105deg, rgb(7 16 35 / 88%) 7%, rgb(18 27 51 / 58%) 55%, rgb(14 22 43 / 28%)), linear-gradient(0deg, rgb(5 14 30 / 47%), transparent 56%); }.eyebrow,.section-heading > div > p,.manifesto > p,.journey-title > p,.closing-cta > div > p { margin: 0 0 16px; color: #d8ff45; font-size: 12px; font-weight: 750; letter-spacing: 2px; }.hero-copy h1 { margin: 0; font-size: clamp(46px, 5.5vw, 78px); line-height: 1.07; letter-spacing: -.055em; }.hero-copy h1 em { color: transparent; background: linear-gradient(100deg, #fff, #d3deff 50%, #ffd0db); background-clip: text; -webkit-background-clip: text; font-style: normal; }.hero-copy > p { margin: 26px 0; color: rgb(245 247 255 / 65%); font-size: 15px; line-height: 1.8; }.hero-actions { display: flex; flex-wrap: wrap; gap: 8px; }.hero-actions a { display: inline-flex; min-height: 45px; padding: 0 16px; align-items: center; justify-content: space-between; color: #fff; background: rgb(255 255 255 / 8%); border: 1px solid rgb(255 255 255 / 19%); border-radius: 14px; font-size: 13px; text-decoration: none; }.hero-actions a:first-child { min-width: 170px; color: #182039; background: linear-gradient(120deg, #fff, #d8ff45); border: 0; font-weight: 700; }.live-window { position: relative; min-height: 480px; overflow: hidden; background: linear-gradient(145deg, rgb(255 255 255 / 24%), rgb(147 169 216 / 9%)), var(--scene) center / cover; border: 1px solid rgb(255 255 255 / 31%); border-radius: 42% 42% 27px 27px; box-shadow: inset 0 1px 0 rgb(255 255 255 / 30%), 0 38px 80px rgb(1 7 21 / 30%); }.live-window::after { position: absolute; inset: 0; background: linear-gradient(180deg, rgb(255 226 231 / 18%), transparent 45%, rgb(8 18 36 / 42%)); content: ''; }.live-label { position: absolute; z-index: 5; top: 28px; left: 28px; display: flex; align-items: center; gap: 7px; font-size: 11px; letter-spacing: .8px; }.live-label span { width: 6px; height: 6px; background: #d8ff45; border-radius: 50%; box-shadow: 0 0 12px #d8ff45; }.live-weather { position: absolute; z-index: 5; top: 64px; left: 34px; }.live-weather > span,.live-weather > small { display: block; }.live-weather > span { font-size: 13px; }.live-weather > strong { display: block; font-size: 67px; line-height: 1; letter-spacing: -.07em; }.live-weather > small { margin-top: 6px; color: rgb(255 255 255 / 57%); font-size: 12px; }.live-window :deep(.character-wrap) { position: absolute; z-index: 4; right: 0; bottom: -9%; width: 68%; height: 80%; }.window-frame { position: absolute; z-index: 4; display: block; background: linear-gradient(90deg, rgb(255 255 255 / 48%), rgb(143 162 205 / 20%)); box-shadow: 0 2px 10px rgb(2 9 23 / 18%); opacity: .54; }.frame-x { top: 53%; right: 0; left: 0; height: 7px; }.frame-y { top: 0; bottom: 0; left: 66%; width: 7px; }
.live-window { background: linear-gradient(180deg, rgb(255 235 240 / 12%), rgb(8 18 36 / 30%)), var(--scene) center / cover; border-radius: 240px 240px 30px 30px; isolation: isolate; }
.live-window::after { z-index: 1; background: radial-gradient(circle at 50% 12%, rgb(255 255 255 / 18%), transparent 42%), linear-gradient(180deg, transparent 50%, rgb(8 18 36 / 30%)); pointer-events: none; }
.live-window :deep(.character-wrap) { z-index: 2; right: 14%; bottom: -1%; left: 14%; width: auto; height: 78%; }
.manifesto { display: grid; min-height: 340px; padding: 60px 64px; grid-template-columns: .43fr 1fr; align-items: start; border-radius: 30px; }.manifesto > div { display: grid; grid-template-columns: 1.3fr .7fr; align-items: start; gap: clamp(40px, 3.2vw, 58px); }.manifesto h2 { margin: 0; font-size: clamp(30px, 2.7vw, 40px); line-height: 1.4; letter-spacing: -.015em; }.manifesto h2 span { display: block; white-space: nowrap; }.manifesto > div > p { display: grid; margin: 7px 0 0; gap: 12px; color: rgb(255 255 255 / 59%); font-size: 15px; line-height: 1.95; word-break: keep-all; }
.feature-section { padding: 90px 5px 64px; }.section-heading { display: flex; margin: 0 25px 38px; align-items: end; justify-content: space-between; gap: 30px; }.section-heading h2 { margin: 0; font-size: clamp(35px, 4vw, 56px); line-height: 1.1; letter-spacing: -.05em; }.section-heading > p { margin: 0 0 5px; color: rgb(255 255 255 / 52%); font-size: 14px; line-height: 1.7; }.feature-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }.feature-grid article { position: relative; min-height: 300px; padding: 29px; overflow: hidden; border-radius: 26px; }.feature-grid article > span { display: grid; width: 34px; height: 34px; place-items: center; color: #172039; background: linear-gradient(145deg, #fff, #d8ff45); border-radius: 50%; font-size: 12px; font-weight: 750; }.feature-grid article > small { display: block; margin-top: 54px; color: #d8ff45; font-size: 11px; letter-spacing: 1.4px; }.feature-grid h3 { margin: 10px 0; font-size: 22px; letter-spacing: -.035em; }.feature-grid p { margin: 0; color: rgb(255 255 255 / 53%); font-size: 13px; line-height: 1.7; }.feature-grid article > i { position: absolute; right: -35px; bottom: -45px; width: 145px; aspect-ratio: 1; background: radial-gradient(circle, rgb(216 255 69 / 14%), transparent 67%); border-radius: 50%; }
.journey-section { display: grid; min-height: 500px; padding: 60px 64px; grid-template-columns: .8fr 1.2fr; gap: 70px; align-items: center; border-radius: 30px; }.journey-title h2 { margin: 0; font-size: clamp(34px, 3.8vw, 54px); line-height: 1.1; letter-spacing: -.05em; }.journey-section ol { margin: 0; padding: 0; list-style: none; }.journey-section li { display: grid; min-height: 92px; padding: 18px 5px; grid-template-columns: 48px 1fr; align-items: start; border-top: 1px solid rgb(255 255 255 / 14%); }.journey-section li > b { display: grid; width: 29px; height: 29px; place-items: center; color: #172039; background: #d8ff45; border-radius: 50%; font-size: 11px; }.journey-section li strong { font-size: 14px; }.journey-section li p { margin: 5px 0 0; color: rgb(255 255 255 / 52%); font-size: 13px; }
.trust-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }.trust-grid article { min-height: 470px; padding: 50px; border-radius: 30px; }.card-label { display: flex; align-items: center; gap: 10px; color: #d8ff45; font-size: 11px; font-weight: 750; letter-spacing: 1.8px; }.card-label i { width: 44px; height: 1px; background: #d8ff45; }.trust-grid h2 { margin: 55px 0 20px; font-size: clamp(30px, 3.2vw, 44px); line-height: 1.14; letter-spacing: -.045em; }.trust-grid article > p { max-width: 570px; margin: 0; color: rgb(255 255 255 / 58%); font-size: 14px; line-height: 1.8; }.data-card dl { display: grid; margin: 42px 0 0; grid-template-columns: repeat(3, 1fr); }.data-card dl div { padding-left: 15px; border-left: 1px solid rgb(255 255 255 / 13%); }.data-card dl div:first-child { padding-left: 0; border: 0; }.data-card dt { color: rgb(255 255 255 / 42%); font-size: 11px; }.data-card dd { margin: 6px 0 0; font-size: 13px; }.privacy-card ul { display: grid; margin: 34px 0 0; padding: 0; list-style: none; }.privacy-card li { display: flex; min-height: 47px; align-items: center; gap: 13px; border-top: 1px solid rgb(255 255 255 / 12%); font-size: 13px; }.privacy-card li span { color: #d8ff45; font-size: 11px; }
.closing-cta { display: flex; min-height: 330px; padding: 60px 64px; align-items: center; justify-content: space-between; gap: 40px; background: linear-gradient(115deg, rgb(255 255 255 / 17%), rgb(255 255 255 / 4%)), var(--scene) center / cover; border-radius: 30px; isolation: isolate; }.closing-cta h2 { margin: 0; font-size: clamp(36px, 4.3vw, 60px); line-height: 1.1; letter-spacing: -.05em; }.closing-cta nav { display: flex; flex-direction: column; gap: 8px; }.closing-cta nav a { display: flex; width: 220px; min-height: 48px; padding: 0 15px; align-items: center; justify-content: space-between; color: #182039; background: linear-gradient(120deg, #fff, #d8ff45); border-radius: 14px; font-size: 13px; font-weight: 700; text-decoration: none; }.closing-cta nav a:last-child { color: #fff; background: rgb(8 18 36 / 38%); border: 1px solid rgb(255 255 255 / 20%); backdrop-filter: blur(15px); }
footer { display: flex; min-height: 120px; padding: 30px 8px 0; align-items: center; justify-content: space-between; border-top: 1px solid rgb(255 255 255 / 15%); } footer p,footer > a { color: rgb(255 255 255 / 48%); font-size: 12px; text-decoration: none; }
@media (max-width: 1050px) { .about-hero { grid-template-columns: 1fr; }.live-window { min-height: 470px; }.manifesto,.journey-section { grid-template-columns: 1fr; gap: 35px; }.feature-grid { grid-template-columns: repeat(2, 1fr); }.trust-grid { grid-template-columns: 1fr; } }
@media (max-width: 700px) { .about-page { padding: 10px 11px 36px; }.about-header { height: 64px; padding: 0 14px; grid-template-columns: 1fr auto; border-radius: 18px; }.about-header nav { display: none; }.home-link { font-size: 12px; }.about-hero { min-height: 0; padding: 40px 22px 22px; gap: 32px; border-radius: 25px; }.hero-copy h1 { font-size: 42px; }.hero-copy > p br { display: none; }.live-window { min-height: 390px; }.manifesto { padding: 36px 23px; }.manifesto > div { grid-template-columns: 1fr; gap: 22px; }.manifesto h2 span { white-space: normal; }.feature-section { padding: 62px 0 32px; }.section-heading { margin: 0 8px 25px; align-items: start; flex-direction: column; }.feature-grid { grid-template-columns: 1fr; }.feature-grid article { min-height: 250px; }.journey-section,.trust-grid article,.closing-cta { padding: 36px 23px; border-radius: 24px; }.data-card dl { grid-template-columns: 1fr; gap: 16px; }.data-card dl div { padding: 0 0 12px; border: 0; border-bottom: 1px solid rgb(255 255 255 / 12%); }.closing-cta { align-items: stretch; flex-direction: column; }.closing-cta nav a { width: 100%; } footer { align-items: flex-start; flex-direction: column; gap: 18px; } footer p { margin: 0; } }
/* Shared layout rhythm */
.about-page { padding: 0 var(--layout-gutter) var(--section-gap); overflow: visible; overflow-x: clip; }
.about-header,.about-shell { width: min(var(--layout-max), 100%); }
.about-header { min-height: 72px; height: auto; margin-bottom: var(--card-gap); padding: 0 24px; border-radius: var(--radius-md); }
.about-shell { gap: var(--card-gap); }
.about-hero { min-height: 620px; padding: clamp(40px, 4.5vw, 64px); gap: clamp(32px, 4vw, 56px); border-radius: var(--radius-lg); }
.hero-copy h1 { font-size: var(--title-page); line-height: 1.08; }
.manifesto,.journey-section,.trust-grid article,.closing-cta { padding: var(--card-padding); border-radius: var(--radius-lg); }
.manifesto { min-height: 320px; grid-template-columns: .38fr 1fr; }
.feature-section { padding: var(--section-gap) 5px 56px; }
.feature-grid,.trust-grid { gap: var(--card-gap); }
.journey-section { gap: clamp(36px, 5vw, 70px); }
.hero-actions a,.closing-cta nav a { min-height: 48px; }
@media (max-width: 700px) { .about-page { padding: 10px var(--layout-gutter) 36px; }.about-header { min-height: 64px; border-radius: var(--radius-md); }.about-hero { padding: var(--card-padding); border-radius: var(--radius-lg); }.manifesto,.journey-section,.trust-grid article,.closing-cta { padding: var(--card-padding); border-radius: var(--radius-lg); } }
@media (max-width: 1050px) { .about-header { grid-template-columns: 1fr auto; }.about-header nav { display: none; }.manifesto > div { grid-template-columns: 1fr; }.feature-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 700px) { .about-header .brand small { display: none; }.home-link { padding: 0 12px; min-height: 44px; display: inline-flex; align-items: center; }.feature-grid { grid-template-columns: 1fr; }.data-card dl { grid-template-columns: 1fr; }.closing-cta { align-items: stretch; flex-direction: column; }.closing-cta nav,.closing-cta nav a { width: 100%; } }
@media (prefers-reduced-motion: reduce) { *,*::before,*::after { scroll-behavior: auto !important; animation: none !important; transition: none !important; } }
@media (max-width: 700px) { .about-page { padding-top: 0; } }
</style>

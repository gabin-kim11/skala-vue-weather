<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import WeatherCharacter from '../components/weather/WeatherCharacter.vue'
import seoulScene from '../assets/cities/seoul.png'

const route = useRoute()
const requestedPath = computed(() => {
  try {
    return decodeURI(route.fullPath)
  } catch {
    return route.fullPath
  }
})
</script>

<template>
  <main class="not-found-page" :style="{ '--scene': `url(${seoulScene})` }">
    <section class="not-found-card">
      <div class="not-found-copy">
        <p class="error-label">404 · WINDOW NOT FOUND</p>
        <h1>이 주소에는<br /><em>열린 날씨 창이 없어요.</em></h1>
        <p class="error-description">
          주소가 잘못 입력되었거나 페이지가 이동했을 수 있어요.<br />오늘의 날씨가 있는 곳으로 다시 안내해 드릴게요.
        </p>
        <code>{{ requestedPath }}</code>

        <nav aria-label="404 페이지 이동 메뉴">
          <RouterLink to="/">오늘 날씨로 돌아가기 <span aria-hidden="true">↗</span></RouterLink>
          <RouterLink to="/map">지도에서 도시 찾기 <span aria-hidden="true">⌖</span></RouterLink>
        </nav>
      </div>

      <div class="error-window" aria-hidden="true">
        <span class="error-number">404</span>
        <WeatherCharacter :weather-code="3" :temperature="18" :wind-speed="18" />
      </div>
    </section>
  </main>
</template>

<style scoped>
.not-found-page {
  display: grid;
  min-height: 100vh;
  padding: var(--layout-gutter);
  place-items: center;
  color: #fff;
  background:
    linear-gradient(110deg, rgb(7 16 35 / 93%), rgb(19 31 57 / 72%) 58%, rgb(9 20 39 / 82%)),
    var(--scene) center / cover;
}

.not-found-card {
  display: grid;
  width: min(1180px, 100%);
  min-height: 610px;
  padding: clamp(30px, 5vw, 72px);
  grid-template-columns: minmax(0, 1.06fr) minmax(360px, .94fr);
  align-items: center;
  gap: clamp(32px, 6vw, 80px);
  overflow: hidden;
  background: linear-gradient(125deg, rgb(255 255 255 / 14%), rgb(255 255 255 / 5%));
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: var(--radius-lg);
  box-shadow: 0 34px 90px rgb(2 8 23 / 42%), inset 0 1px 0 rgb(255 255 255 / 20%);
  backdrop-filter: blur(25px) saturate(120%);
}

.error-label {
  margin: 0 0 18px;
  color: #d8ff45;
  font-size: 12px;
  font-weight: 750;
  letter-spacing: 2px;
}

h1 {
  margin: 0;
  font-size: clamp(42px, 5.2vw, 70px);
  line-height: 1.08;
  letter-spacing: -.055em;
  word-break: keep-all;
}

h1 em {
  color: transparent;
  background: linear-gradient(100deg, #fff, #d2dcff 48%, #ffd0dc);
  background-clip: text;
  -webkit-background-clip: text;
  font-style: normal;
}

.error-description {
  margin: 26px 0 16px;
  color: rgb(255 255 255 / 66%);
  font-size: 15px;
  line-height: 1.85;
  word-break: keep-all;
}

code {
  display: block;
  max-width: 100%;
  padding: 12px 14px;
  overflow: hidden;
  color: rgb(255 255 255 / 58%);
  background: rgb(6 15 32 / 36%);
  border: 1px solid rgb(255 255 255 / 13%);
  border-radius: 12px;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

nav {
  display: flex;
  margin-top: 24px;
  flex-wrap: wrap;
  gap: 8px;
}

nav a {
  display: inline-flex;
  min-height: 48px;
  padding: 0 17px;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  color: #172039;
  background: linear-gradient(120deg, #fff, #d8ff45);
  border-radius: 14px;
  font-size: 13px;
  font-weight: 750;
  text-decoration: none;
}

nav a:last-child {
  color: #fff;
  background: rgb(255 255 255 / 8%);
  border: 1px solid rgb(255 255 255 / 19%);
}

.error-window {
  position: relative;
  min-height: 440px;
  overflow: hidden;
  background: linear-gradient(180deg, rgb(255 235 240 / 15%), rgb(8 18 36 / 28%)), var(--scene) center / cover;
  border: 1px solid rgb(255 255 255 / 32%);
  border-radius: 220px 220px 28px 28px;
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 32%), 0 30px 70px rgb(2 8 23 / 28%);
}

.error-window::after {
  position: absolute;
  z-index: 1;
  inset: 0;
  background: linear-gradient(180deg, transparent 45%, rgb(8 18 36 / 38%));
  content: '';
}

.error-number {
  position: absolute;
  z-index: 1;
  top: 30px;
  left: 50%;
  color: rgb(255 255 255 / 28%);
  font-size: clamp(72px, 9vw, 118px);
  font-weight: 800;
  line-height: 1;
  letter-spacing: -.08em;
  transform: translateX(-50%);
}

.error-window :deep(.character-wrap) {
  position: absolute;
  z-index: 2;
  right: 12%;
  bottom: -3%;
  left: 12%;
  width: auto;
  height: 76%;
}

@media (max-width: 900px) {
  .not-found-card { grid-template-columns: 1fr; }
  .error-window { min-height: 430px; }
}

@media (max-width: 700px) {
  .not-found-page { min-height: 100vh; padding: 14px; }
  .not-found-card { min-height: 0; padding: 34px 22px 22px; border-radius: 24px; }
  h1 { font-size: 42px; }
  .error-description br { display: none; }
  nav { flex-direction: column; }
  nav a { width: 100%; }
  .error-window { min-height: 350px; border-radius: 180px 180px 22px 22px; }
  .error-window :deep(.character-wrap) { right: 8%; left: 8%; height: 78%; }
}
</style>

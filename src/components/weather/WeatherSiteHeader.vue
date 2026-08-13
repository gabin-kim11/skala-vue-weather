<script setup>
import { ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'

import { useWeatherStore } from '../../stores/weatherStore'

const route = useRoute()
const weatherStore = useWeatherStore()
const { currentLocationName, isLoading, temperatureUnit } = storeToRefs(weatherStore)
const { refreshWeather, toggleUnit } = weatherStore
const isMenuOpen = ref(false)

const links = [
  { to: '/', label: '오늘 날씨' },
  { to: '/planner', label: '오늘 플래너' },
  { to: '/cities', label: '전국 도시' },
  { to: '/map', label: '전국 지도' },
  { to: '/about', label: '서비스 소개' },
]

watch(() => route.fullPath, () => { isMenuOpen.value = false })
</script>

<template>
  <header class="global-header">
    <div class="global-header-inner">
      <RouterLink class="global-brand" to="/" aria-label="오늘의 틈 홈">
        <span>오늘의 틈<small>WEATHER FOR LIFE</small></span>
      </RouterLink>

      <nav class="desktop-nav" aria-label="주요 메뉴">
        <RouterLink v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</RouterLink>
      </nav>

      <div class="global-tools">
        <button
          class="refresh-control"
          type="button"
          :aria-label="isLoading ? '날씨 갱신 중' : '날씨 새로고침'"
          :disabled="isLoading"
          @click="refreshWeather"
        >
          <span aria-hidden="true">↻</span><span class="refresh-label">{{ isLoading ? '갱신 중' : '새로고침' }}</span>
        </button>
        <RouterLink class="city-control" to="/map"><span aria-hidden="true">⌖</span><b>{{ currentLocationName }}</b></RouterLink>
        <button class="unit-control" type="button" aria-label="온도 단위 변경" @click="toggleUnit">{{ temperatureUnit === 'celsius' ? '°C' : '°F' }}</button>
        <button
          class="menu-control"
          type="button"
          :aria-label="isMenuOpen ? '메뉴 닫기' : '메뉴 열기'"
          :aria-expanded="isMenuOpen"
          aria-controls="global-mobile-menu"
          @click="isMenuOpen = !isMenuOpen"
        >
          <span aria-hidden="true">{{ isMenuOpen ? '×' : '☰' }}</span><span class="menu-label">메뉴</span>
        </button>
      </div>
    </div>

    <nav v-if="isMenuOpen" id="global-mobile-menu" class="mobile-nav" aria-label="모바일 메뉴">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}<span>↗</span></RouterLink>
    </nav>
  </header>
</template>

<style scoped>
.global-header { position: sticky; z-index: 200; top: 0; width: 100%; margin: 0; color: #172039; background: #fff; border-bottom: 1px solid #dfe2e9; box-shadow: 0 12px 34px rgb(13 24 45 / 12%); }
.global-header-inner { display: grid; width: min(var(--layout-max), calc(100% - (var(--layout-gutter) * 2))); min-height: 76px; margin: auto; grid-template-columns: minmax(185px, 1fr) auto minmax(265px, 1fr); align-items: center; gap: 24px; }
.global-brand { display: inline-flex; width: fit-content; align-items: center; color: inherit; font-size: 16px; font-weight: 750; line-height: 1; text-decoration: none; }
.global-brand small { display: block; margin-top: 5px; color: #6c7485; font-size: 11px; font-weight: 650; letter-spacing: 1.3px; }
.desktop-nav { display: flex; align-items: stretch; align-self: stretch; gap: clamp(18px, 2vw, 30px); }
.desktop-nav a { position: relative; display: inline-flex; align-items: center; color: #5f6879; font-size: 14px; font-weight: 650; text-decoration: none; white-space: nowrap; }
.desktop-nav a::after { position: absolute; right: 0; bottom: 0; left: 0; height: 3px; background: #172039; border-radius: 3px 3px 0 0; content: ''; opacity: 0; transform: scaleX(.5); transition: 160ms ease; }
.desktop-nav a:hover,.desktop-nav a.router-link-active { color: #172039; }.desktop-nav a.router-link-active::after { opacity: 1; transform: scaleX(1); }
.global-tools { display: flex; min-width: 0; justify-content: flex-end; gap: 7px; }
.global-tools button,.city-control { display: inline-flex; min-height: 44px; padding: 0 13px; align-items: center; justify-content: center; gap: 7px; color: #30394b; background: #f4f5f8; border: 1px solid #e1e4ea; border-radius: 22px; font-size: 13px; text-decoration: none; cursor: pointer; white-space: nowrap; }
.global-tools button:hover,.city-control:hover { background: #eceff4; }.global-tools button:disabled { opacity: .5; }
.city-control { max-width: 130px; }.city-control b { overflow: hidden; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.unit-control { width: 44px; padding: 0 !important; font-weight: 750; }
.menu-control { display: none !important; }.mobile-nav { display: none; }
@media (max-width: 1180px) {
  .global-header-inner { grid-template-columns: minmax(175px, 1fr) auto; }
  .desktop-nav { display: none; }
  .menu-control { display: inline-flex !important; }
  .mobile-nav { display: grid; width: min(var(--layout-max), calc(100% - (var(--layout-gutter) * 2))); margin: 0 auto; padding: 8px 0 14px; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
  .mobile-nav a { display: flex; min-height: 46px; padding: 0 14px; align-items: center; justify-content: space-between; color: #30394b; background: #f3f5f8; border: 1px solid #e2e5eb; border-radius: 12px; font-size: 14px; font-weight: 650; text-decoration: none; }
  .mobile-nav a.router-link-active { color: #172039; background: #eaff9b; border-color: #c8df69; }
}
@media (max-width: 700px) { .global-header-inner { min-height: 68px; gap: 8px; }.global-brand small { display: none; }.global-brand { font-size: 14px; }.refresh-label,.unit-control { display: none !important; }.refresh-control { width: 42px; padding: 0 !important; }.city-control { max-width: 104px; padding: 0 10px; }.menu-control { width: 44px; padding: 0 !important; }.menu-label { display: none; }.mobile-nav { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 390px) { .global-brand > span:last-child { display: none; }.global-header-inner { grid-template-columns: auto 1fr; }.global-tools { gap: 4px; }.city-control { max-width: 92px; } }
</style>

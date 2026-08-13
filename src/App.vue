<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import WeatherSiteHeader from './components/weather/WeatherSiteHeader.vue'

const route = useRoute()
const showSiteHeader = computed(() => !route.meta.hideHeader)
</script>

<template>
  <div class="app-shell">
    <WeatherSiteHeader v-if="showSiteHeader" />
    <div class="app-route">
      <RouterView v-slot="{ Component, route }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" :key="route.name" />
        </Transition>
      </RouterView>
    </div>
  </div>
</template>

<style>
.app-shell,
.app-route {
  width: 100%;
  min-width: 0;
}

.app-shell {
  min-height: 100vh;
  overflow-x: clip;
  background: #101b31;
}

.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 160ms ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .page-fade-enter-active,
  .page-fade-leave-active {
    transition: none;
  }
}
</style>

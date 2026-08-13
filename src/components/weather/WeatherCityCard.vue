<script setup>
defineProps({
  city: { type: Object, required: true },
  displayTemperature: { type: String, required: true },
  favorite: { type: Boolean, default: false },
  highlight: { type: String, required: true },
  mode: { type: String, default: 'sunny' },
  selected: { type: Boolean, default: false },
})

defineEmits(['select', 'toggle-favorite'])
</script>

<template>
  <article class="city-card" :class="[`weather-${mode}`, { selected }]">
    <button class="city-card-main" type="button" @click="$emit('select', city)">
      <span class="city-art" :style="{ backgroundImage: `url(${city.background})` }">
        <span class="weather-overlay" aria-hidden="true">
          <i class="sun-glow"></i><i class="cloud-bank"></i><i class="rain-lines"></i><i class="snow-dots"></i>
        </span>
      </span>
      <span class="card-gradient"></span>
      <span class="city-card-top">
        <small>{{ city.area }}</small>
        <span>{{ city.source !== 'pending' ? `${city.current.icon} ${city.current.status}` : '실시간 확인 중' }}</span>
      </span>
      <span class="city-card-copy">
        <strong>{{ city.name }}</strong>
        <em>{{ city.source !== 'pending' ? displayTemperature : '—' }}</em>
        <small>{{ city.source !== 'pending' ? `오늘의 첫 추천 · ${highlight}` : '공공 API 응답을 기다리고 있어요' }}</small>
      </span>
      <span class="detail-arrow">여행 보기 ↗</span>
    </button>
    <button
      class="city-favorite"
      type="button"
      :aria-pressed="favorite"
      :aria-label="`${city.name} ${favorite ? '즐겨찾기 삭제' : '즐겨찾기 추가'}`"
      @click="$emit('toggle-favorite', city.id)"
    >
      {{ favorite ? '★' : '☆' }}
    </button>
  </article>
</template>

<style scoped>
.city-card { position: relative; min-height: 420px; overflow: hidden; background: linear-gradient(125deg, rgb(255 255 255 / 16%), rgb(255 255 255 / 5%)); border: 1px solid rgb(255 255 255 / 22%); border-radius: var(--radius-lg); box-shadow: 0 28px 70px rgb(2 9 23 / 24%), inset 0 1px 0 rgb(255 255 255 / 18%); transition: transform 260ms ease, border-color 260ms ease, box-shadow 260ms ease; backdrop-filter: blur(28px) saturate(122%); }
.city-card:hover { z-index: 2; border-color: rgb(255 255 255 / 42%); box-shadow: 0 34px 82px rgb(2 9 23 / 38%); transform: translateY(-5px); }
.city-card.selected { border-color: rgb(216 255 69 / 60%); }
.city-card-main { position: absolute; inset: 0; width: 100%; padding: 0; color: #fff; text-align: left; background: transparent; border: 0; cursor: pointer; }
.city-art { position: absolute; inset: 0; background-position: center; background-size: cover; transform: scale(1.01); transition: transform 700ms cubic-bezier(.2,.72,.22,1); }
.city-card:hover .city-art { transform: scale(1.055); }
.card-gradient { position: absolute; inset: 0; background: linear-gradient(180deg, rgb(9 18 37 / 10%) 22%, rgb(8 16 35 / 34%) 55%, rgb(7 14 31 / 90%) 100%); }
.city-card-top { position: absolute; top: 22px; right: 22px; left: 22px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.city-card-top small { color: rgb(255 255 255 / 72%); font-size: 12px; letter-spacing: .5px; }
.city-card-top > span { padding: 8px 10px; background: rgb(15 28 53 / 35%); border: 1px solid rgb(255 255 255 / 20%); border-radius: 20px; font-size: 12px; white-space: nowrap; backdrop-filter: blur(12px); }
.city-card-copy { position: absolute; right: 25px; bottom: 30px; left: 25px; display: grid; grid-template-columns: 1fr auto; align-items: end; }
.city-card-copy > strong { font-size: 30px; letter-spacing: -.04em; }
.city-card-copy > em { font-size: 31px; font-style: normal; font-weight: 650; letter-spacing: -.05em; }
.city-card-copy > small { margin-top: 7px; grid-column: 1 / -1; color: rgb(255 255 255 / 57%); font-size: 12px; }
.detail-arrow { position: absolute; right: 25px; bottom: 13px; color: #d8ff45; font-size: 11px; opacity: 0; transform: translateY(5px); transition: 180ms ease; }
.city-card:hover .detail-arrow { opacity: 1; transform: translateY(0); }
.city-favorite { position: absolute; z-index: 8; top: 67px; right: 22px; display: grid; width: 36px; height: 36px; padding: 0; place-items: center; color: #fff; background: rgb(15 28 53 / 34%); border: 1px solid rgb(255 255 255 / 22%); border-radius: 50%; font-size: 17px; line-height: 1; cursor: pointer; backdrop-filter: blur(13px); }
.city-favorite[aria-pressed='true'] { color: #ffe2a1; background: rgb(42 45 66 / 53%); }
.weather-overlay { position: absolute; inset: 0; overflow: hidden; }
.weather-overlay i { position: absolute; display: block; pointer-events: none; }
.sun-glow { top: 8%; right: 9%; width: 28%; aspect-ratio: 1; background: radial-gradient(circle, rgb(255 244 187 / 52%), rgb(255 207 165 / 15%) 43%, transparent 70%); border-radius: 50%; opacity: 0; }
.cloud-bank { top: -7%; right: -10%; left: -10%; height: 53%; background: radial-gradient(ellipse at 22% 54%, rgb(225 230 246 / 72%), transparent 33%), radial-gradient(ellipse at 62% 30%, rgb(191 201 224 / 69%), transparent 36%), linear-gradient(180deg, rgb(91 102 137 / 54%), transparent); opacity: 0; filter: blur(7px); }
.rain-lines { inset: -15%; background: repeating-linear-gradient(105deg, transparent 0 16px, rgb(205 226 255 / 46%) 17px 19px, transparent 20px 31px); opacity: 0; animation: rain-shift 1.1s linear infinite; }
.snow-dots { inset: -8%; background-image: radial-gradient(circle, rgb(255 255 255 / 84%) 0 2px, transparent 3px), radial-gradient(circle, rgb(255 255 255 / 64%) 0 3px, transparent 4px); background-position: 0 0, 23px 31px; background-size: 54px 62px, 79px 91px; opacity: 0; animation: snow-shift 5s linear infinite; }
.weather-sunny .sun-glow { opacity: 1; animation: sun-breathe 4.2s ease-in-out infinite; }
.weather-cloudy .cloud-bank { opacity: .82; animation: cloud-drift 9s ease-in-out infinite alternate; }
.weather-rainy .cloud-bank { opacity: .9; }
.weather-rainy .rain-lines { opacity: .75; }
.weather-rainy .city-art { filter: saturate(.72) brightness(.8) contrast(.94); }
.weather-snowy .cloud-bank { opacity: .56; }
.weather-snowy .snow-dots { opacity: .82; }
.weather-snowy .city-art { filter: saturate(.62) brightness(1.03); }
@keyframes rain-shift { to { transform: translate(-25px, 45px); } }
@keyframes snow-shift { to { transform: translate(12px, 60px); } }
@keyframes cloud-drift { to { transform: translateX(5%); } }
@keyframes sun-breathe { 50% { opacity: .76; transform: scale(1.08); } }
@media (max-width: 680px) { .city-card { min-height: 390px; } }
@media (prefers-reduced-motion: reduce) { .city-card, .city-art, .weather-overlay i { animation: none !important; transition: none !important; } }
</style>

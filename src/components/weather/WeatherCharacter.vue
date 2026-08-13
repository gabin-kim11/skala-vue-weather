<script setup>
import { computed } from 'vue'

import characterSprite from '../../assets/character/cloud-cat-sprite.png'

const props = defineProps({
  weatherCode: { type: Number, default: 0 },
  temperature: { type: Number, default: 20 },
  precipitation: { type: Number, default: 0 },
  windSpeed: { type: Number, default: 0 },
  label: { type: String, default: '오늘의 날씨를 함께 보내는 구름 고양이' },
})

const mode = computed(() => {
  if (props.temperature <= 7 || [71, 73, 75, 77, 85, 86].includes(props.weatherCode)) return 'cold'
  if (props.precipitation > 0 || props.weatherCode >= 51) return 'rainy'
  if (props.windSpeed >= 15 || [2, 3, 45, 48].includes(props.weatherCode)) return 'cloudy'
  return 'sunny'
})

const actionLabel = computed(() => ({
  sunny: '방방 뛰며 앞발을 흔드는 중',
  rainy: '우산을 들고 빗방울 사이를 사뿐히 걷는 중',
  cold: '눈을 감고 목도리에 폭 파묻힌 중',
  cloudy: '바람에 귀와 꼬리를 펄럭이며 모자를 잡는 중',
})[mode.value])

const spriteStyle = computed(() => ({ backgroundImage: `url(${characterSprite})` }))
</script>

<template>
  <div class="character-wrap" :class="`is-${mode}`" role="img" :aria-label="`${label}, ${actionLabel}`">
    <span class="character-aura" aria-hidden="true"></span>

    <div class="character-rig" aria-hidden="true">
      <span class="art-layer art-base" :style="spriteStyle"></span>
    </div>

    <span class="character-shadow" aria-hidden="true"></span>
    <i class="weather-particle particle-one" aria-hidden="true"></i>
    <i class="weather-particle particle-two" aria-hidden="true"></i>
    <i class="weather-particle particle-three" aria-hidden="true"></i>
  </div>
</template>

<style scoped>
.character-wrap {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 360px;
  isolation: isolate;
}

.character-aura {
  position: absolute;
  z-index: 1;
  top: 9%;
  left: 50%;
  width: 76%;
  aspect-ratio: 1;
  background: radial-gradient(circle, rgb(255 245 252 / 46%), rgb(169 195 255 / 14%) 48%, transparent 73%);
  border: 1px solid rgb(255 255 255 / 16%);
  border-radius: 50%;
  transform: translateX(-50%);
  animation: aura-breathe 5.4s ease-in-out infinite;
}

.character-rig {
  position: absolute;
  z-index: 3;
  bottom: 2%;
  left: 50%;
  width: min(112%, 540px);
  aspect-ratio: 1;
  transform: translateX(-50%);
  transform-origin: 50% 91%;
  filter: drop-shadow(0 26px 23px rgb(11 18 39 / 22%));
}

.art-layer {
  position: absolute;
  inset: 0;
  background-repeat: no-repeat;
  background-size: 200% 200%;
  pointer-events: none;
  transform-origin: 50% 50%;
}

.is-sunny .art-layer { background-position: 0% 0%; }
.is-rainy .art-layer { background-position: 100% 0%; }
.is-cold .art-layer { background-position: 0% 100%; }
.is-cloudy .art-layer { background-position: 100% 100%; }

.art-base { z-index: 2; transform-origin: 50% 72%; }
.art-hair { z-index: 3; clip-path: polygon(22% 10%, 80% 10%, 82% 64%, 18% 64%); transform-origin: 50% 42%; }
.art-head { z-index: 4; clip-path: ellipse(29% 25% at 48% 37%); transform-origin: 48% 51%; }
.art-arm { z-index: 5; transform-origin: 50% 50%; }
.art-prop { z-index: 6; }
.expression-glow { display: none; }

.character-shadow {
  position: absolute;
  z-index: 2;
  right: 23%;
  bottom: 2%;
  left: 23%;
  height: 7%;
  background: radial-gradient(ellipse, rgb(8 14 34 / 32%), transparent 70%);
  filter: blur(8px);
  animation: shadow-breathe 4.8s ease-in-out infinite;
}

.weather-particle { position: absolute; z-index: 8; display: block; opacity: 0; pointer-events: none; }
.particle-one { top: 21%; left: 12%; }.particle-two { top: 14%; right: 11%; animation-delay: -1.1s !important; }.particle-three { right: 8%; bottom: 25%; animation-delay: -2.2s !important; }

/* 맑음: 잠깐 미소 → 몸을 낮춤 → 점프 → 손을 두 번 흔듦 → 사뿐히 착지 */
.is-sunny .character-rig { animation: sunny-jump 4.8s cubic-bezier(.4, 0, .2, 1) infinite; }
.is-sunny .art-head { animation: happy-head 4.8s ease-in-out infinite; }
.is-sunny .art-hair { animation: sunny-hair 4.8s ease-in-out infinite; }
.is-sunny .art-arm {
  clip-path: polygon(13% 19%, 42% 19%, 44% 63%, 12% 63%);
  transform-origin: 34% 48%;
  animation: friendly-wave 1.05s ease-in-out infinite;
}
.is-sunny .art-prop { clip-path: polygon(55% 22%, 98% 22%, 98% 86%, 55% 86%); transform-origin: 70% 56%; animation: tail-swish 1.9s ease-in-out infinite; }
.is-sunny .weather-particle { width: 7px; aspect-ratio: 1; background: #fff3bd; border-radius: 50%; box-shadow: 0 0 13px #fff2a1; animation: sparkle 2.7s ease-in-out infinite; }

/* 비: 우산은 늦게 따라오고, 머리와 몸은 작은 보폭으로 서로 다른 박자로 움직임 */
.is-rainy .character-rig { animation: rainy-step 3.5s ease-in-out infinite; }
.is-rainy .art-head { animation: rainy-look 4.7s ease-in-out infinite; }
.is-rainy .art-hair { animation: rainy-hair 3.5s ease-in-out infinite; }
.is-rainy .art-arm { clip-path: polygon(25% 25%, 62% 25%, 65% 74%, 25% 74%); transform-origin: 47% 49%; animation: umbrella-hand 3.5s ease-in-out infinite; }
.is-rainy .art-prop { clip-path: polygon(22% 0, 98% 0, 98% 68%, 22% 68%); transform-origin: 69% 42%; animation: umbrella-sway 3.5s ease-in-out infinite; }
.is-rainy .weather-particle { width: 3px; height: 20px; background: linear-gradient(#eef8ff, #9fc7f6); border-radius: 6px; animation: rain-drop 1.15s linear infinite; }

/* 추위: 몸 전체의 잔떨림 위에 머리·머리카락이 더 작은 엇박자로 움직임 */
.is-cold .character-rig { animation: cold-shiver .56s ease-in-out infinite; }
.is-cold .art-head { animation: cozy-nod 3.6s ease-in-out infinite; }
.is-cold .art-hair { animation: cold-hair .72s ease-in-out infinite; }
.is-cold .art-arm { clip-path: polygon(16% 26%, 79% 26%, 79% 76%, 16% 76%); animation: hug-scarf 2.8s ease-in-out infinite; }
.is-cold .art-prop { clip-path: polygon(11% 21%, 88% 21%, 88% 89%, 11% 89%); animation: scarf-breathe 2.8s ease-in-out infinite; }
.is-cold .weather-particle { width: 7px; aspect-ratio: 1; background: #fff; border-radius: 50%; box-shadow: 0 0 8px rgb(255 255 255 / 70%); animation: snow-fall 3.1s ease-in-out infinite; }

/* 바람: 머리카락, 모자를 잡은 팔, 몸이 각기 다른 폭과 지연으로 바람을 받음 */
.is-cloudy .character-rig { animation: windy-balance 3.6s ease-in-out infinite; }
.is-cloudy .art-head { animation: windy-head 3.6s ease-in-out infinite; }
.is-cloudy .art-hair { clip-path: polygon(31% 14%, 99% 14%, 99% 78%, 31% 78%); transform-origin: 54% 47%; animation: tail-in-wind 2.2s ease-in-out infinite; }
.is-cloudy .art-arm { clip-path: polygon(22% 8%, 70% 8%, 71% 67%, 22% 67%); transform-origin: 50% 43%; animation: hold-hat 3.6s ease-in-out infinite; }
.is-cloudy .art-prop { clip-path: polygon(18% 0, 72% 0, 72% 38%, 18% 38%); transform-origin: 48% 27%; animation: hat-in-wind 2.2s ease-in-out infinite; }
.is-cloudy .weather-particle { width: 30px; height: 12px; border: 2px solid rgb(209 228 255 / 75%); border-top-color: transparent; border-left-color: transparent; border-radius: 50%; animation: wind-line 2.1s linear infinite; }

@keyframes sunny-jump { 0%,12%,49%,100% { transform: translateX(-50%) translateY(0) scaleY(1); } 17% { transform: translateX(-50%) translateY(6px) scaleY(.975); } 26%,36% { transform: translateX(-50%) translateY(-23px) rotate(-1deg); } 43% { transform: translateX(-50%) translateY(3px) scaleY(.985); } }
@keyframes happy-head { 0%,13%,48%,100% { transform: rotate(0); } 24%,37% { transform: rotate(2.5deg) translateY(-2px); } 56%,69% { transform: rotate(-2deg); } }
@keyframes sunny-hair { 0%,13%,48%,100% { transform: translateY(0); } 27%,37% { transform: translateY(4px) scaleY(1.015); } }
@keyframes friendly-wave { 0%,10%,52%,100% { transform: rotate(0); } 18%,31%,44% { transform: rotate(-6deg); } 24%,37%,49% { transform: rotate(6deg); } }
@keyframes tail-swish { 0%,100% { transform: rotate(-1deg); } 50% { transform: rotate(5deg) translateY(-3px); } }
@keyframes sparkle { 0%,100% { opacity: .12; transform: translateY(7px) scale(.55); } 50% { opacity: 1; transform: translateY(-12px) scale(1.15); } }

@keyframes rainy-step { 0%,100% { transform: translateX(-50%) translateY(0) rotate(0); } 32% { transform: translateX(-50%) translateY(-5px) rotate(-.8deg); } 68% { transform: translateX(-50%) translateY(2px) rotate(.8deg); } }
@keyframes rainy-look { 0%,37%,100% { transform: rotate(0); } 52%,72% { transform: rotate(3deg); } }
@keyframes rainy-hair { 0%,100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
@keyframes umbrella-hand { 0%,100% { transform: rotate(0); } 50% { transform: rotate(-2deg) translateY(-2px); } }
@keyframes umbrella-sway { 0%,100% { transform: rotate(0); } 50% { transform: rotate(2deg) translateY(-3px); } }
@keyframes rain-drop { from { opacity: 0; transform: translate(14px,-28px) rotate(12deg); } 28% { opacity: .9; } to { opacity: 0; transform: translate(-12px,64px) rotate(12deg); } }

@keyframes cold-shiver { 0%,100% { transform: translateX(-50%) rotate(-.25deg); } 50% { transform: translateX(calc(-50% + 1.5px)) rotate(.25deg); } }
@keyframes cozy-nod { 0%,100% { transform: rotate(0); } 48%,65% { transform: rotate(2deg) translateY(2px); } }
@keyframes cold-hair { 0%,100% { transform: translateX(-.5px); } 50% { transform: translateX(.5px); } }
@keyframes hug-scarf { 0%,100% { transform: scale(1); } 50% { transform: scale(.993) translateY(1px); } }
@keyframes scarf-breathe { 0%,100% { transform: translateY(0); } 50% { transform: translateY(2px) scaleY(1.01); } }
@keyframes snow-fall { 0% { opacity: 0; transform: translateY(-18px) rotate(0); } 24% { opacity: .9; } 100% { opacity: 0; transform: translate(13px,58px) rotate(90deg); } }

@keyframes windy-balance { 0%,100% { transform: translateX(-50%) rotate(0); } 34% { transform: translateX(-50%) rotate(-1.4deg); } 67% { transform: translateX(-50%) rotate(1.4deg); } }
@keyframes windy-head { 0%,100% { transform: rotate(0); } 45%,71% { transform: rotate(-2.5deg); } }
@keyframes tail-in-wind { 0%,100% { transform: rotate(0) skewX(0); } 50% { transform: rotate(-3deg) skewX(-2deg) translateX(-4px); } }
@keyframes hold-hat { 0%,100% { transform: rotate(0); } 50% { transform: rotate(-2deg) translateY(-2px); } }
@keyframes hat-in-wind { 0%,100% { transform: rotate(0); } 50% { transform: rotate(3deg) translate(2px,-2px); } }
@keyframes wind-line { from { opacity: 0; transform: translateX(36px) scaleX(.7); } 35% { opacity: .85; } to { opacity: 0; transform: translateX(-62px) scaleX(1.18); } }

@keyframes aura-breathe { 0%,100% { opacity: .65; transform: translateX(-50%) scale(.96); } 50% { opacity: 1; transform: translateX(-50%) scale(1.04); } }
@keyframes shadow-breathe { 0%,100% { opacity: .74; transform: scaleX(1); } 50% { opacity: .43; transform: scaleX(.88); } }

@media (prefers-reduced-motion: reduce) {
  .character-wrap *, .character-wrap *::before, .character-wrap *::after { animation: none !important; }
}
</style>

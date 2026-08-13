<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  resultCount: { type: Number, default: 0 },
})

const emit = defineEmits(['update:modelValue', 'clear'])

const updateQuery = (event) => emit('update:modelValue', event.target.value)
const clearQuery = () => {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<template>
  <label class="weather-search-bar">
    <span aria-hidden="true">⌕</span>
    <input
      :value="modelValue"
      type="search"
      aria-label="도시 또는 시·도 검색"
      placeholder="도시 또는 시·도 검색"
      @input="updateQuery"
    />
    <small>{{ resultCount }}</small>
    <button v-if="modelValue" type="button" aria-label="검색어 지우기" @click="clearQuery">×</button>
  </label>
</template>

<style scoped>
.weather-search-bar {
  display: flex;
  width: min(360px, 42vw);
  min-height: 46px;
  padding: 0 10px 0 14px;
  align-items: center;
  gap: 9px;
  background: rgb(255 255 255 / 8%);
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 14px;
}

input {
  min-width: 0;
  flex: 1;
  color: #fff;
  background: transparent;
  border: 0;
  outline: 0;
}

input::placeholder,
small {
  color: rgb(255 255 255 / 42%);
}

button {
  display: grid;
  width: 30px;
  height: 30px;
  padding: 0;
  place-items: center;
  color: #fff;
  background: rgb(255 255 255 / 10%);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}

@media (max-width: 680px) {
  .weather-search-bar { width: 100%; }
}
</style>

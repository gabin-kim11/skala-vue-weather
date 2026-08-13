<script setup>
defineProps({
  label: { type: String, required: true },
})
</script>

<template>
  <section class="base-dashboard-card" :aria-label="label">
    <div class="base-dashboard-controls">
      <slot name="controls" />
    </div>
    <slot />
    <footer v-if="$slots.footer" class="base-dashboard-footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.base-dashboard-card {
  width: min(var(--layout-max), 100%);
  margin: 0 auto var(--card-gap);
  padding: 12px;
  color: #f8faff;
  background: linear-gradient(125deg, rgb(255 255 255 / 16%), rgb(255 255 255 / 5%));
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: var(--radius-md);
  box-shadow: 0 28px 70px rgb(2 9 23 / 24%), inset 0 1px 0 rgb(255 255 255 / 18%);
  backdrop-filter: blur(28px) saturate(122%);
}

.base-dashboard-controls {
  display: flex;
  min-height: 46px;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
}

.base-dashboard-footer {
  padding: 10px 5px 0;
  color: rgb(255 255 255 / 48%);
  font-size: 12px;
}

@media (max-width: 680px) {
  .base-dashboard-controls {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>

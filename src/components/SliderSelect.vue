<script setup>
import { computed } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'

const props = defineProps({
  modelValue: { required: true },
  options: { type: Array, required: true },
  fill: { type: Boolean, default: false }
})
defineEmits(['update:modelValue'])

const count = computed(() => props.options.length)

const indicatorStyle = computed(() => {
  const i = Math.max(0, props.options.findIndex(o => o.value === props.modelValue))
  return {
    left: `calc(${(i * 100) / count.value}% + 3px)`,
    width: `calc(${100 / count.value}% - 6px)`
  }
})

function isActive(opt) {
  return props.modelValue === opt.value
}
</script>

<template>
  <div class="slider-select" :class="{ 'slider-select--fill': fill }">
    <div class="slider-select__indicator" :style="indicatorStyle"></div>
    <button
      v-for="opt in options"
      :key="String(opt.value)"
      type="button"
      class="slider-select__btn"
      :class="{ 'slider-select__btn--active': isActive(opt) }"
      :style="isActive(opt) && opt.color ? { color: opt.color } : null"
      @click="$emit('update:modelValue', opt.value)"
    >
      <SvgIcon v-if="opt.icon" :name="opt.icon" :size="12" />
      <span>{{ opt.label }}</span>
    </button>
  </div>
</template>

<style scoped>
.slider-select {
  display: flex;
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  overflow: hidden;
  background: var(--color-surface);
}

.slider-select--fill {
  flex: 1;
  min-width: 0;
}

.slider-select__indicator {
  position: absolute;
  top: 3px;
  left: 3px;
  height: calc(100% - 6px);
  background: var(--color-primary-light);
  border-radius: calc(var(--rounded-md) - 1px);
  transition: left 0.2s ease;
}

.slider-select__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  padding: var(--spacing-xs) var(--spacing-md);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: color var(--transition-fast);
  white-space: nowrap;
  position: relative;
  z-index: 1;
  flex: 1 1 0;
}

.slider-select__btn:hover { color: var(--color-text-heading); }
.slider-select__btn--active { color: var(--color-primary); }
.slider-select__btn--active:hover { color: var(--color-primary); }
</style>

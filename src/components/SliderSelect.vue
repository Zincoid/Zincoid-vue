<script setup>
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import SvgIcon from '@/components/SvgIcon.vue'

const props = defineProps({
  modelValue: { required: true },
  options: { type: Array, required: true },
  fill: { type: Boolean, default: false },
  even: { type: Boolean, default: false } // equal-width segments instead of content-sized
})
defineEmits(['update:modelValue'])

const root = ref(null)
const indicatorStyle = ref({ left: '3px', width: '0px' })

function isActive(opt) {
  return props.modelValue === opt.value
}

// Size each button to its own label, then hand out leftover space
// proportionally so long labels never spill outside their hover box.
// With `even`, segments stay equal-width instead. The sliding indicator
// tracks the active button's real geometry in both modes.
function layout() {
  const el = root.value
  if (!el) return
  const btns = [...el.querySelectorAll('.slider-select__btn')]
  if (!btns.length) return
  if (props.even) {
    btns.forEach(b => { b.style.flexGrow = '' })
  } else {
    btns.forEach(b => { b.style.flexGrow = '0' })
    const natural = btns.map(b => b.offsetWidth)
    btns.forEach((b, i) => { b.style.flexGrow = String(natural[i] || 1) })
  }
  const i = Math.max(0, props.options.findIndex(o => o.value === props.modelValue))
  const active = btns[i]
  if (!active) return
  indicatorStyle.value = {
    left: `${active.offsetLeft + 3}px`,
    width: `${Math.max(0, active.offsetWidth - 6)}px`
  }
}

let resizeObserver
onMounted(() => {
  nextTick(layout)
  window.addEventListener('resize', layout)
  resizeObserver = new ResizeObserver(() => layout())
  if (root.value) resizeObserver.observe(root.value)
})
onBeforeUnmount(() => {
  window.removeEventListener('resize', layout)
  resizeObserver?.disconnect()
})

watch(() => props.modelValue, () => nextTick(layout))
watch(() => props.options, () => nextTick(layout), { deep: true })
</script>

<template>
  <div ref="root" class="slider-select" :class="{ 'slider-select--fill': fill, 'slider-select--even': even }">
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

.slider-select--even .slider-select__btn {
  flex: 1 1 0;
}

.slider-select__indicator {
  position: absolute;
  top: 3px;
  height: calc(100% - 6px);
  background: var(--color-primary-light);
  border-radius: calc(var(--rounded-md) - 1px);
  transition: left 0.2s ease, width 0.2s ease;
}

.slider-select__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
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
  flex: 0 1 auto;
}

.slider-select__btn:hover { color: var(--color-text-heading); }
.slider-select__btn--active { color: var(--color-primary); }
.slider-select__btn--active:hover { color: var(--color-primary); }
</style>

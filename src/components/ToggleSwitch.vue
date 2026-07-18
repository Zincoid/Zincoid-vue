<script setup>
defineProps({
  modelValue: { type: Boolean, required: true },
  label: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})
defineEmits(['update:modelValue'])
</script>

<template>
  <div class="toggle">
    <label class="toggle__switch">
      <input
        type="checkbox"
        :checked="modelValue"
        :disabled="disabled"
        @change="$emit('update:modelValue', $event.target.checked)"
      />
      <span class="toggle__slider" :class="{ 'toggle__slider--disabled': disabled }"></span>
    </label>
    <span v-if="label" class="toggle__label">{{ label }}</span>
  </div>
</template>

<style scoped>
.toggle { display: flex; align-items: center; gap: var(--spacing-sm); white-space: nowrap; }
.toggle__switch { cursor: pointer; display: flex; align-items: center; }
.toggle__switch input { display: none; }
.toggle__slider { position: relative; width: 44px; height: 24px; background: var(--color-border); border-radius: var(--rounded-full); transition: background var(--transition-fast); }
.toggle__slider::after { content: ''; position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; background: white; border-radius: var(--rounded-full); transition: transform var(--transition-fast); }
.toggle input:checked + .toggle__slider { background: #f0ad4e; }
.toggle input:checked + .toggle__slider::after { transform: translateX(20px); }
.toggle__label { font-size: var(--text-sm); color: var(--color-text-secondary); }
.toggle__slider--disabled { opacity: 0.5; }
</style>

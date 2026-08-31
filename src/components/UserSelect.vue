<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { userAPI } from '@/api'
import SvgIcon from '@/components/SvgIcon.vue'

const props = defineProps({
  modelValue: { type: Number, default: null },
  placeholder: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])

const { t } = useI18n()

const root = ref(null)
const query = ref('')
const results = ref([])
const open = ref(false)
const selected = ref(null)
let searchTimer = null
let seq = 0

function onDocClick(e) {
  if (!root.value?.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

watch(() => props.modelValue, async (v) => {
  if (v == null) {
    selected.value = null
    return
  }
  if (selected.value?.id === v) return
  try {
    const { data } = await userAPI.getDetail(v)
    selected.value = data.data
  } catch { /* ignore */ }
}, { immediate: true })

function onInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(search, 300)
}

async function search() {
  const kw = query.value.trim()
  const id = ++seq
  if (!kw) {
    results.value = []
    return
  }
  try {
    const { data } = await userAPI.getList(1, 8, null, kw)
    if (seq === id) results.value = data.data.records || []
  } catch { /* ignore */ }
}

function pick(user) {
  selected.value = user
  query.value = ''
  results.value = []
  open.value = false
  emit('update:modelValue', user.id)
}

function clearUser() {
  selected.value = null
  emit('update:modelValue', null)
}
</script>

<template>
  <div ref="root" class="user-select" :class="{ 'user-select--open': open }">
    <template v-if="selected">
      <div class="user-select__chosen">
        <img v-if="selected.avatar" :src="selected.avatar" class="user-select__avatar" />
        <span v-else class="user-select__avatar user-select__avatar--placeholder">{{ (selected.nickname || '?')[0].toUpperCase() }}</span>
        <span class="user-select__info">
          <span class="user-select__name">{{ selected.nickname || selected.username }}</span>
          <span class="user-select__username">@{{ selected.username }}</span>
        </span>
        <button class="user-select__clear" :title="t('common.clear')" @click.stop="clearUser">
          <SvgIcon name="close" :size="12" />
        </button>
      </div>
    </template>
    <input
      v-else
      v-model="query"
      type="text"
      class="field__input user-select__input"
      :placeholder="placeholder"
      @input="onInput"
      @focus="open = true"
    />
    <Transition name="dropdown">
      <div v-if="open && !selected" class="user-select__dropdown" @mousedown.prevent>
        <button
          v-for="u in results"
          :key="u.id"
          type="button"
          class="user-select__option"
          @click="pick(u)"
        >
          <img v-if="u.avatar" :src="u.avatar" class="user-select__avatar" />
          <span v-else class="user-select__avatar user-select__avatar--placeholder">{{ (u.nickname || '?')[0].toUpperCase() }}</span>
          <span class="user-select__info">
            <span class="user-select__name">{{ u.nickname }}</span>
            <span class="user-select__username">@{{ u.username }}</span>
          </span>
        </button>
        <p v-if="query.trim() && !results.length" class="user-select__empty">{{ t('common.noResults') }}</p>
        <p v-else-if="!query.trim()" class="user-select__empty">{{ t('common.typeToSearch') }}</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.user-select { position: relative; width: 100%; }

.user-select__chosen {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-xs) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  background: var(--color-surface);
  width: 100%;
  box-sizing: border-box;
  transition: border-color var(--transition-fast);
}
.user-select__chosen:hover { border-color: var(--color-text-secondary); }

.user-select__input { width: 100%; box-sizing: border-box; }

.user-select__avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--rounded-full);
  object-fit: cover;
  flex-shrink: 0;
}
.user-select__avatar--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: white;
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
}

.user-select__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.user-select__name {
  font-size: var(--text-sm);
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-select__username {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-select__clear {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  border: none;
  border-radius: var(--rounded-full);
  background: transparent;
  color: var(--color-text-tertiary);
  cursor: pointer;
  flex-shrink: 0;
  transition: color var(--transition-fast), background var(--transition-fast);
}
.user-select__clear:hover { color: var(--color-danger); background: var(--color-danger-bg); }

.user-select__dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 20;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  box-shadow: var(--shadow-lg);
  max-height: 280px;
  overflow-y: auto;
  padding: var(--spacing-xs);
  scrollbar-width: thin;
  scrollbar-color: rgba(128, 128, 128, 0.35) transparent;
}
.user-select__dropdown::-webkit-scrollbar { width: 6px; }
.user-select__dropdown::-webkit-scrollbar-track { background: transparent; }
.user-select__dropdown::-webkit-scrollbar-thumb {
  background: rgba(128, 128, 128, 0.35);
  border-radius: var(--rounded-full);
}
.user-select__dropdown::-webkit-scrollbar-thumb:hover { background: rgba(128, 128, 128, 0.55); }

.user-select__option {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  border-radius: var(--rounded-md);
  transition: background var(--transition-fast);
}
.user-select__option:hover { background: var(--color-bg-alt); }
[data-theme="dark"] .user-select__option:hover { background: #23252f; }
.user-select__option:hover .user-select__name { color: var(--color-text-heading); }
.user-select__option:active { background: var(--color-primary-light); }

.user-select__empty {
  padding: var(--spacing-md);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  text-align: center;
}

.dropdown-enter-active, .dropdown-leave-active { transition: opacity .15s ease, transform .15s ease; }
.dropdown-enter-from, .dropdown-leave-to { opacity: 0; transform: translateY(-4px); }
</style>

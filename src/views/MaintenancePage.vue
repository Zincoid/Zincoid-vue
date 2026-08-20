<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
const { t } = useI18n()
const { getMessage } = useError()
const route = useRoute()
const reason = computed(() => {
  const r = route.query.reason
  return Array.isArray(r) ? r[0] : r
})
const reasonText = computed(() => {
  if (reason.value) return getMessage({ response: { data: { message: reason.value } } })
  return ''
})
</script>

<template>
  <div class="maintenance container-narrow">
    <pre class="maintenance__ascii">
 __  __   _   ___ _  _ _____
|  \/  | /_\ |_ _| \| |_   _|
| |\/| |/ _ \ | || .' | | |
|_|  |_/_/ \_\___|_|\_| |_|
    </pre>
    <h1>503</h1>
    <p v-if="reasonText" class="maintenance__reason">{{ t('maintenance.reason') }}{{ reasonText }}</p>
    <p>{{ t('maintenance.message') }}</p>
    <router-link to="/" class="btn btn--outline">{{ t('maintenance.retry') }}</router-link>
  </div>
</template>

<style scoped>
.maintenance {
  text-align: center;
  padding: var(--spacing-5xl) 0;
}
.maintenance__ascii {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xl);
  line-height: 1.5;
  background: none;
  border: none;
  text-align: left;
  display: inline-block;
  max-width: 100%;
  overflow-x: auto;
}
h1 { font-size: 4rem; color: var(--color-danger); margin-bottom: var(--spacing-sm); }
p { color: var(--color-text-secondary); margin-bottom: var(--spacing-2xl); padding: 0 var(--spacing-md); }
.maintenance__reason { color: var(--color-danger); font-weight: var(--weight-medium); margin-bottom: var(--spacing-xs); }
.btn { display: inline-flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-lg); border-radius: var(--rounded-md); font-size: var(--text-sm); font-weight: var(--weight-medium); cursor: pointer; transition: all var(--transition-fast); text-decoration: none; }
.btn--outline { border: 1px solid var(--color-border); color: var(--color-text); background: transparent; }
.btn--outline:hover { border-color: var(--color-primary); color: var(--color-primary); }
</style>

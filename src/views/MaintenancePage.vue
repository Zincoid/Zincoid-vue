<script setup>
import { useI18n } from '@/composables/useI18n'
const { t } = useI18n()
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
}
h1 { font-size: 4rem; color: var(--color-danger); margin-bottom: var(--spacing-sm); }
p { color: var(--color-text-secondary); margin-bottom: var(--spacing-2xl); }
.btn { display: inline-flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-sm) var(--spacing-lg); border-radius: var(--rounded-md); font-size: var(--text-sm); font-weight: var(--weight-medium); cursor: pointer; transition: all var(--transition-fast); text-decoration: none; }
.btn--outline { border: 1px solid var(--color-border); color: var(--color-text); background: transparent; }
.btn--outline:hover { border-color: var(--color-primary); color: var(--color-primary); }
</style>

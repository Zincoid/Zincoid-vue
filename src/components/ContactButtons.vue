<script setup>
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()

const props = defineProps({
  contacts: { type: [String, Object], default: '' },
  iconOnly: { type: Boolean, default: false }
})

const parsed = computed(() => {
  if (!props.contacts) return []
  const obj = typeof props.contacts === 'string' ? tryParse(props.contacts) : props.contacts
  if (!obj) return []

  const platforms = {
    website:  { icon: 'website', label: t('common.website'),   href: v => v.startsWith('http') ? v : `https://${v}` },
    email:    { icon: 'email',   label: t('common.email'),     href: v => `mailto:${v}` },
    github:   { icon: 'github',  label: 'GitHub',    href: v => v },
    bilibili: { icon: 'bilibili', label: 'Bilibili', href: v => v },
    twitter:  { icon: 'twitter', label: t('common.twitter'),   href: v => v }
  }

  return Object.entries(obj)
    .filter(([, v]) => v)
    .map(([key, value]) => {
      const p = platforms[key] || { icon: 'link', label: key, href: v => v.startsWith('http') ? v : `https://${v}` }
      return { ...p, key, value: value.trim() }
    })
})

function tryParse(str) {
  try { return JSON.parse(str) } catch { return null }
}
</script>

<template>
  <div class="contact-buttons" :class="{ 'contact-buttons--icon-only': iconOnly }" v-if="parsed.length">
    <a
      v-for="c in parsed"
      :key="c.key"
      :href="c.href(c.value)"
      class="contact-btn"
      :class="`contact-btn--${c.icon}`"
      target="_blank"
      rel="noopener noreferrer"
      :title="c.label"
    >
      <!-- Email -->
      <svg v-if="c.icon === 'email'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
      <!-- GitHub -->
      <svg v-else-if="c.icon === 'github'" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
      <!-- Bilibili -->
      <svg v-else-if="c.icon === 'bilibili'" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.813 4.653h.854c1.51.054 2.769.578 3.773 1.574 1.004.995 1.524 2.249 1.56 3.76v7.36c-.036 1.51-.556 2.769-1.56 3.773s-2.262 1.524-3.773 1.56H5.333c-1.51-.036-2.769-.556-3.773-1.56S.036 18.858 0 17.347v-7.36c.036-1.511.556-2.765 1.56-3.76 1.004-.996 2.262-1.52 3.773-1.574h.774l-1.174-1.12a1.234 1.234 0 0 1-.373-.906c0-.356.124-.662.373-.92.249-.257.555-.385.92-.385.364 0 .676.128.933.385L9.333 4.64h5.334l2.027-1.893c.267-.267.578-.4.933-.4.356 0 .662.133.92.4.257.266.385.578.385.933 0 .356-.128.662-.384.907l-1.174 1.12.44-.053zm-9.707.906c-1.036.018-1.898.382-2.587 1.093-.688.71-1.046 1.569-1.073 2.573v7.36c.027 1.005.385 1.869 1.073 2.59.689.72 1.551 1.087 2.587 1.093h9.787c1.035-.006 1.898-.373 2.586-1.094.689-.72 1.047-1.584 1.074-2.589v-7.36c-.027-1.004-.385-1.863-1.074-2.573-.688-.71-1.55-1.075-2.586-1.093H8.106zm1.56 5.333c.356 0 .662.133.92.4.257.267.385.578.385.934v2.666c0 .356-.128.667-.384.934-.257.266-.564.4-.921.4-.355 0-.666-.134-.933-.4-.267-.267-.4-.578-.4-.934v-2.666c0-.356.133-.667.4-.934.267-.267.578-.4.933-.4zm6.667 0c.355 0 .666.133.933.4.267.267.4.578.4.934v2.666c0 .356-.133.667-.4.934-.267.266-.578.4-.933.4-.356 0-.667-.134-.934-.4-.266-.267-.4-.578-.4-.934v-2.666c0-.356.134-.667.4-.934.267-.267.578-.4.934-.4z"/></svg>
      <!-- Generic link -->
      <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      <span v-if="!iconOnly">{{ c.label }}</span>
    </a>
  </div>
</template>

<style scoped>
.contact-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
}

.contact-buttons--icon-only {
  flex-direction: column;
  flex-wrap: nowrap;
  gap: var(--spacing-xs);
}

.contact-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--rounded-full);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  text-decoration: none;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  background: var(--color-surface);
  transition: all var(--transition-fast);
}

.contact-buttons--icon-only .contact-btn {
  padding: 8px;
  border-radius: var(--rounded-lg);
}

.contact-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
  transform: translateY(-1px);
}

.contact-buttons--icon-only .contact-btn:hover {
  border-color: var(--color-border);
  background: var(--color-surface);
}

@media (max-width: 600px) {
  .contact-buttons--icon-only {
    flex-direction: row;
  }
}
</style>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'

const { t } = useI18n()
const { getMessage } = useError()
const router = useRouter()
const auth = useAuthStore()

const form = ref({ username: '', password: '', nickname: '' })
const error = ref('')
const loading = ref(false)

async function handleSubmit() {
  if (!form.value.username || !form.value.password) {
    error.value = t('auth.required')
    return
  }
  if (form.value.password.length < 6) {
    error.value = t('auth.passwordLength')
    return
  }
  loading.value = true
  error.value = ''
  try {
    await auth.register(form.value)
    router.push('/')
  } catch (err) {
    error.value = getMessage(err, 'auth.registerFailed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page container-narrow">
    <h1 class="auth-page__title">Register</h1>
    <p class="auth-page__subtitle">Join Zincoid's community</p>

    <form class="auth-form" @submit.prevent="handleSubmit">
      <div class="field">
        <label class="field__label">{{ t('auth.username') }} <span class="field__required">*</span></label>
        <input v-model="form.username" class="field__input" type="text" />
      </div>
      <div class="field">
        <label class="field__label">{{ t('auth.password') }} <span class="field__required">*</span></label>
        <input v-model="form.password" class="field__input" type="password" />
      </div>
      <div class="field">
        <label class="field__label">{{ t('profile.nickname') }}</label>
        <input v-model="form.nickname" class="field__input" type="text" />
      </div>

      <p v-if="error" class="auth-form__error">{{ error }}</p>

      <button class="btn btn--primary btn--lg btn--full" type="submit" :disabled="loading">
        {{ loading ? t('common.loading') : t('auth.register') }}
      </button>
    </form>

    <p class="auth-page__switch">
      {{ t('auth.hasAccount') }}
      <span class="auth-form__switch-btn" @click="$router.push('/login')">{{ t('auth.loginHere') }}</span>
    </p>
  </div>
</template>

<style scoped>
.auth-page { text-align: center; padding-top: var(--spacing-2xl); }
.auth-page__title { font-size: var(--text-4xl); margin-bottom: var(--spacing-xs); }
.auth-page__subtitle { color: var(--color-text-secondary); margin-bottom: var(--spacing-2xl); }
.auth-form { max-width: 400px; margin: 0 auto; display: flex; flex-direction: column; gap: var(--spacing-lg); text-align: left; }
.auth-form__error { color: var(--color-danger); font-size: var(--text-sm); padding: var(--spacing-sm) var(--spacing-md); background: var(--color-danger-bg); border-radius: var(--rounded-sm); }
.auth-page__switch { margin-top: var(--spacing-xl); font-size: var(--text-sm); color: var(--color-text-secondary); }

.auth-form .field__input { border-radius: var(--rounded-sm); }
.auth-form .btn--primary { background: #111827; }
.auth-form .btn--primary:hover { background: #1f2937; }
</style>

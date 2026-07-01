<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { authAPI } from '@/api'

const { t } = useI18n()
const { getMessage } = useError()
const router = useRouter()

const form = ref({ email: '', code: '', newPassword: '', confirmPassword: '' })
const error = ref('')
const success = ref('')
const loading = ref(false)
const sending = ref(false)
const countdown = ref(0)
let countdownTimer = null

onUnmounted(() => { if (countdownTimer) clearInterval(countdownTimer) })

async function handleSendCode() {
  if (!form.value.email) {
    error.value = t('auth.emailRequired')
    return
  }
  if (!/\S+@\S+\.\S+/.test(form.value.email)) {
    error.value = t('auth.invalidEmailFormat')
    return
  }
  sending.value = true
  error.value = ''
  try {
    await authAPI.sendCode(form.value.email)
    countdown.value = 60
    countdownTimer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) clearInterval(countdownTimer)
    }, 1000)
  } catch (err) {
    error.value = getMessage(err, 'common.failed')
  } finally {
    sending.value = false
  }
}

async function handleSubmit() {
  if (!form.value.email || !form.value.code || !form.value.newPassword) {
    error.value = t('auth.required')
    return
  }
  if (!/\S+@\S+\.\S+/.test(form.value.email)) {
    error.value = t('auth.invalidEmailFormat')
    return
  }
  if (!form.value.code.trim()) {
    error.value = t('auth.codeRequired')
    return
  }
  if (form.value.newPassword.length < 6 || form.value.newPassword.length > 100) {
    error.value = t('auth.passwordLength')
    return
  }
  if (form.value.newPassword !== form.value.confirmPassword) {
    error.value = t('auth.passwordMismatch')
    return
  }
  loading.value = true
  error.value = ''
  try {
    await authAPI.forgotPassword({
      email: form.value.email,
      code: form.value.code,
      newPassword: form.value.newPassword,
      confirmPassword: form.value.confirmPassword
    })
    success.value = t('auth.resetSuccess')
  } catch (err) {
    error.value = getMessage(err, 'common.failed')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="forgot-page">
    <div class="forgot-card">
      <h1 class="forgot-card__title">{{ t('auth.forgotPasswordTitle') }}</h1>
      <p class="forgot-card__desc">{{ t('auth.forgotPasswordDesc') }}</p>

      <form v-if="!success" class="forgot-form" novalidate @submit.prevent="handleSubmit">
        <div class="field">
          <label class="field__label">{{ t('auth.email') }}</label>
          <div style="display:flex;gap:var(--spacing-sm)">
            <input v-model="form.email" class="field__input" style="flex:1" type="email" autocomplete="email" />
            <button class="btn btn--outline" :disabled="sending || countdown > 0" @click="handleSendCode" type="button">
              {{ countdown > 0 ? countdown + 's' : (sending ? '...' : t('auth.sendCode')) }}
            </button>
          </div>
        </div>
        <div class="field">
          <label class="field__label">{{ t('auth.code') }}</label>
          <input v-model="form.code" class="field__input" type="text" maxlength="6" autocomplete="off" />
        </div>
        <div class="field">
          <label class="field__label">{{ t('auth.newPassword') }}</label>
          <input v-model="form.newPassword" class="field__input" type="password" autocomplete="new-password" />
        </div>
        <div class="field">
          <label class="field__label">{{ t('auth.confirmPassword') }}</label>
          <input v-model="form.confirmPassword" class="field__input" type="password" autocomplete="off" />
        </div>

        <p v-if="error" class="forgot-form__error">{{ error }}</p>

        <button class="btn btn--primary btn--lg btn--full" type="submit" :disabled="loading">
          {{ loading ? t('auth.resetting') : t('auth.resetPassword') }}
        </button>
      </form>

      <div v-else class="forgot-success">
        <p class="forgot-success__text">{{ success }}</p>
        <router-link to="/login" class="btn btn--primary btn--lg">{{ t('auth.backToLogin') }}</router-link>
      </div>

      <p v-if="!success" class="forgot-card__back">
        <router-link to="/login">{{ t('auth.backToLogin') }}</router-link>
      </p>
    </div>
  </div>
</template>

<style scoped>
.forgot-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - var(--navbar-height) - var(--spacing-4xl));
  padding: var(--spacing-3xl);
}

.forgot-card {
  width: 100%;
  max-width: 420px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  padding: var(--spacing-3xl);
}

.forgot-card__title {
  font-size: var(--text-2xl);
  text-align: center;
  margin-bottom: var(--spacing-xs);
}

.forgot-card__desc {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--spacing-xl);
}

.forgot-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.forgot-form .field__input {
  border-radius: var(--rounded-sm);
  min-width: 0;
}

.forgot-form .btn--outline {
  flex-shrink: 0;
  white-space: nowrap;
}

.forgot-form__error {
  color: var(--color-danger);
  font-size: var(--text-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-danger-bg);
  border-radius: var(--rounded-sm);
}

.forgot-form .btn--primary {
  background: #111827;
}
.forgot-form .btn--primary:hover {
  background: #1f2937;
}

.forgot-success {
  text-align: center;
}

.forgot-success__text {
  color: var(--color-success, #16a34a);
  margin-bottom: var(--spacing-lg);
}

.forgot-card__back {
  text-align: center;
  margin-top: var(--spacing-lg);
  font-size: var(--text-sm);
}

.forgot-card__back a {
  color: var(--color-text-secondary);
  text-decoration: none;
}
.forgot-card__back a:hover {
  color: var(--color-text-heading);
  text-decoration: underline;
}
</style>

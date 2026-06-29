<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { authAPI } from '@/api'

const { t } = useI18n()
const { getMessage } = useError()
const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const isLogin = computed(() => route.path === '/login')

const typedCmd = ref('')
const step = ref(0)
let seqTimer = null

function startSequence() {
  step.value = 0
  typedCmd.value = ''
  clearInterval(seqTimer)
  const cmd = 'whoami'
  let i = 0
  seqTimer = setInterval(() => {
    typedCmd.value = cmd.slice(0, i + 1)
    i++
    if (i >= cmd.length) {
      clearInterval(seqTimer)
      step.value = 1
      // show output instantly, then $ prompt after a beat
      setTimeout(() => { step.value = 2 }, 400)
    }
  }, 100)
}

watch(isLogin, () => {
  step.value = 0
  typedCmd.value = ''
  clearInterval(seqTimer)
  setTimeout(startSequence, 300)
})

onMounted(startSequence)

// Conway's Game of Life
const GRID = 24
const cells = ref([]) // flat array of {x, y} for alive cells
const leftPanel = ref(null)

let grid = []       // 2D number[][] for computation (grid[y][x])
let cols = 0
let rows = 0
let gameTimer = null

function countNeighbors(g, x, y) {
  let n = 0
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      n += g[(y + dy + rows) % rows][(x + dx + cols) % cols]
    }
  }
  return n
}

function tick() {
  const ng = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const n = countNeighbors(grid, x, y)
      ng[y][x] = grid[y][x]
        ? (n === 2 || n === 3 ? 1 : 0)
        : (n === 3 ? 1 : 0)
    }
  }
  grid = ng
  flatten()
}

function flatten() {
  const alive = []
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      if (grid[y][x]) alive.push({ x, y })
  cells.value = alive
}

function resizeGrid(c, r) {
  const ng = Array.from({ length: r }, (_, y) =>
    Array.from({ length: c }, (_, x) =>
      y < rows && x < cols ? grid[y][x] : Math.random() < 0.25 ? 1 : 0
    )
  )
  cols = c; rows = r; grid = ng
  flatten()
}

onMounted(() => {
  cols = Math.floor(leftPanel.value.clientWidth / GRID)
  rows = Math.floor(leftPanel.value.clientHeight / GRID)
  grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => Math.random() < 0.2 ? 1 : 0)
  )
  flatten()
  gameTimer = setInterval(tick, 250)

  const observer = new ResizeObserver(([entry]) => {
    const nc = Math.floor(entry.target.clientWidth / GRID)
    const nr = Math.floor(entry.target.clientHeight / GRID)
    if (nc !== cols || nr !== rows) resizeGrid(nc, nr)
  })
  observer.observe(leftPanel.value)
  onUnmounted(() => {
    clearInterval(gameTimer)
    if (countdownTimer) clearInterval(countdownTimer)
    observer.disconnect()
  })
})

const form = ref({ username: '', password: '', confirmPassword: '', nickname: '', email: '', code: '' })
const error = ref('')
const loading = ref(false)
const sending = ref(false)
const countdown = ref(0)
let countdownTimer = null

async function handleSendCode() {
  if (!form.value.email || !/\S+@\S+\.\S+/.test(form.value.email)) {
    error.value = t('auth.emailRequired')
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
    error.value = getMessage(err, 'Failed to send code')
  } finally {
    sending.value = false
  }
}

async function handleLogin() {
  if (!form.value.username || !form.value.password) {
    error.value = t('auth.required')
    return
  }
  loading.value = true
  error.value = ''
  try {
    await auth.login({ username: form.value.username, password: form.value.password })
    router.push('/')
  } catch (err) {
    error.value = getMessage(err, 'auth.loginFailed')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (!form.value.username || !form.value.password || !form.value.confirmPassword) {
    error.value = t('auth.required')
    return
  }
  if (form.value.username.length < 3 || form.value.username.length > 50) {
    error.value = t('auth.usernameLength')
    return
  }
  if (form.value.password.length < 6 || form.value.password.length > 100) {
    error.value = t('auth.passwordLength')
    return
  }
  if (form.value.password !== form.value.confirmPassword) {
    error.value = t('auth.passwordMismatch')
    return
  }
  if (!form.value.email || !/\S+@\S+\.\S+/.test(form.value.email)) {
    error.value = t('auth.emailRequired')
    return
  }
  if (!form.value.code.trim()) {
    error.value = t('auth.codeRequired')
    return
  }
  loading.value = true
  error.value = ''
  try {
    await auth.register({ username: form.value.username, password: form.value.password, confirmPassword: form.value.confirmPassword, nickname: form.value.nickname, email: form.value.email, code: form.value.code })
    router.push('/')
  } catch (err) {
    error.value = getMessage(err, 'auth.registerFailed')
  } finally {
    loading.value = false
  }
}

function handleSubmit() {
  if (isLogin.value) {
    handleLogin()
  } else {
    handleRegister()
  }
}

function switchTo(path) {
  form.value = { username: '', password: '', confirmPassword: '', nickname: '', email: '', code: '' }
  if (countdownTimer) { clearInterval(countdownTimer); countdown.value = 0 }
  error.value = ''
  router.push(path)
}
</script>

<template>
  <div class="auth-split">
    <div class="auth-split__left" :class="{ 'auth-split__left--register': !isLogin }" ref="leftPanel">
      <div
        v-for="(cell, i) in cells"
        :key="i"
        class="auth-split__sq"
        :style="{
          left: cell.x * GRID + 'px',
          top: cell.y * GRID + 'px'
        }"
      ></div>
      <div class="auth-brand">
        <pre class="auth-brand__ascii" :class="{ 'auth-brand__ascii--register': !isLogin }">
███████╗██╗███╗   ██╗ ██████╗ ██████╗ ██╗██████╗ ███████╗
╚══███╔╝██║████╗  ██║██╔════╝██╔═══██╗██║██╔══██╗██╔════╝
  ███╔╝ ██║██╔██╗ ██║██║     ██║   ██║██║██║  ██║███████╗
 ███╔╝  ██║██║╚██╗██║██║     ██║   ██║██║██║  ██║╚════██║
███████╗██║██║ ╚████║╚██████╗╚██████╔╝██║██████╔╝███████║
╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═╝╚═════╝ ╚══════╝
        </pre>
        <div class="auth-terminal">
          <pre class="auth-terminal__text"><span class="auth-terminal__line"><span class="auth-terminal__prompt">$</span> ssh zincoid-website</span>
<span class="auth-terminal__line"><span class="auth-terminal__dim">&gt; authenticating...</span></span>
<span class="auth-terminal__line"><span class="auth-terminal__prompt">$</span> {{ typedCmd }}<span v-if="step === 0" class="cursor">_</span></span>
<span v-if="step >= 1" class="auth-terminal__line"><span class="auth-terminal__dim">&gt; {{ isLogin ? 'returning_user' : 'new_user' }}</span></span>
<span v-if="step === 2" class="auth-terminal__line"><span class="auth-terminal__prompt">$</span> <span class="auth-terminal__cursor">_</span></span></pre>
        </div>
      </div>
    </div>

    <div class="auth-split__right">
      <div class="auth-form-wrap">
        <div class="auth-form__tabs">
          <button
            class="auth-form__tab"
            :class="{ 'auth-form__tab--active': isLogin }"
            @click="switchTo('/login')"
          >{{ t('auth.login') }}</button>
          <button
            class="auth-form__tab"
            :class="{ 'auth-form__tab--active': !isLogin }"
            @click="switchTo('/register')"
          >{{ t('auth.register') }}</button>
        </div>

        <h2 class="auth-form__heading">{{ isLogin ? t('auth.welcomeBack') : t('auth.joinUs') }}</h2>

        <form class="auth-form" @submit.prevent="handleSubmit">
          <div class="field">
            <label class="field__label">{{ t('auth.username') }} <span v-if="!isLogin" class="field__required">*</span></label>
            <input v-model="form.username" class="field__input" type="text" autocomplete="username" />
          </div>
          <div v-if="!isLogin" class="field">
            <label class="field__label">{{ t('profile.nickname') }}</label>
            <input v-model="form.nickname" class="field__input" type="text" />
          </div>
          <div class="field">
            <label class="field__label">{{ t('auth.password') }} <span v-if="!isLogin" class="field__required">*</span></label>
            <input v-model="form.password" class="field__input" type="password" autocomplete="off" />
          </div>
          <div v-if="!isLogin" class="field">
            <label class="field__label">{{ t('auth.confirmPassword') }} <span class="field__required">*</span></label>
            <input v-model="form.confirmPassword" class="field__input" type="password" autocomplete="off" />
          </div>
          <div v-if="!isLogin" class="field">
            <label class="field__label">{{ t('auth.email') }} <span class="field__required">*</span></label>
            <div style="display:flex;gap:var(--spacing-sm)">
              <input v-model="form.email" class="field__input" style="flex:1" type="email" />
              <button class="btn btn--outline" :disabled="sending || countdown > 0" @click="handleSendCode" type="button">
                {{ countdown > 0 ? countdown + 's' : (sending ? '...' : t('auth.sendCode')) }}
              </button>
            </div>
          </div>
          <div v-if="!isLogin" class="field">
            <label class="field__label">{{ t('auth.code') }} <span class="field__required">*</span></label>
            <input v-model="form.code" class="field__input" type="text" maxlength="6" />
          </div>

          <p v-if="error" class="auth-form__error">{{ error }}</p>

          <div class="auth-form__actions">
            <button class="btn btn--primary btn--lg btn--full" type="submit" :disabled="loading">
              {{ loading ? (isLogin ? t('auth.loggingIn') : t('auth.registering')) : (isLogin ? t('auth.login') : t('auth.register')) }}
            </button>
          </div>
        </form>

        <p class="auth-form__switch">
          <template v-if="isLogin">
            {{ t('auth.noAccount') }}
            <span class="auth-form__switch-btn" @click="switchTo('/register')">{{ t('auth.registerHere') }}</span>
          </template>
          <template v-else>
            {{ t('auth.hasAccount') }}
            <span class="auth-form__switch-btn" @click="switchTo('/login')">{{ t('auth.loginHere') }}</span>
          </template>
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-split {
  display: flex;
  height: calc(100vh - var(--navbar-height));
  margin-bottom: calc(-1 * var(--spacing-4xl));
}

/* ── Left: Brand + Terminal ── */
.auth-split__left {
  flex: 0 0 585px;
  max-width: 52%;
  background:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
    #0d1117;
  background-size: 24px 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3xl);
  position: relative;
  overflow: hidden;
}

.auth-split__sq {
  position: absolute;
  width: 20px;
  height: 20px;
  margin: 2px;
  background: rgba(88, 166, 255, 0.05);
  pointer-events: none;
  z-index: 1;
}
.auth-split__left--register .auth-split__sq {
  background: rgba(63, 185, 80, 0.05);
}

.auth-brand {
  text-align: center;
  position: relative;
  z-index: 2;
}

.auth-brand__ascii {
  font-family: var(--font-mono);
  font-size: clamp(0.35rem, 1vw, 0.7rem);
  line-height: 1.25;
  color: #58a6ff;
  text-align: center;
  background: none;
  border: none;
  padding: 0;
  margin: 0 0 var(--spacing-lg);
  overflow: hidden;
  transition: color 0.3s ease;
}
.auth-brand__ascii--register {
  color: #3fb950;
}

.auth-terminal__text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.9;
  color: #c9d1d9;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
  text-align: left;
}
.auth-terminal__prompt {
  color: #58a6ff;
}
.auth-terminal__dim {
  color: #8b949e;
}
.auth-terminal__cursor {
  display: inline-block;
  animation: blink 1s step-end infinite;
  color: #58a6ff;
}
@keyframes blink {
  50% { opacity: 0; }
}

/* ── Right: Form ── */
.auth-split__right {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3xl);
  background: var(--color-bg);
}

.auth-form-wrap {
  width: 100%;
  max-width: 400px;
}

.auth-form__tabs {
  display: flex;
  margin-bottom: var(--spacing-xl);
  border-bottom: 1px solid var(--color-border);
}
.auth-form__tab {
  flex: 1;
  padding: var(--spacing-sm) 0;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}
.auth-form__tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}
.auth-form__tab:hover {
  color: var(--color-text-heading);
}

.auth-form__heading {
  font-size: var(--text-2xl);
  margin-bottom: var(--spacing-xl);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.auth-form__error {
  color: var(--color-danger);
  font-size: var(--text-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  background: var(--color-danger-bg);
  border-radius: var(--rounded-sm);
}

/* Fields overrides for auth form */
.auth-form .field__input {
  border-radius: var(--rounded-sm);
}
.field__row {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
}
.field__input--flex {
  flex: 1;
  min-width: 0;
}
.auth-form .btn--sm {
  font-size: var(--text-xs);
  white-space: nowrap;
  padding: var(--spacing-xs) var(--spacing-sm);
}
.auth-form__actions {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-lg);
}

.auth-form .btn--primary {
  background: #111827;
}
.auth-form .btn--primary:hover {
  background: #1f2937;
}

.auth-form__switch {
  margin-top: var(--spacing-lg);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: center;
}
.auth-form__switch-btn {
  color: var(--color-primary);
  font-weight: var(--weight-medium);
  cursor: pointer;
}
.auth-form__switch-btn:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

@media (max-width: 768px) {
  .auth-split {
    flex-direction: column;
    height: auto;
    min-height: auto;
    margin-bottom: 0;
  }
  .auth-split__left {
    flex: 0 0 200px;
    max-width: none;
    padding: var(--spacing-lg) var(--spacing-xl);
  }
  .auth-brand {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-3xl);
    text-align: left;
  }
  .auth-brand__ascii {
    font-size: clamp(0.35rem, 0.8vw, 0.5rem);
    margin: 0;
    flex-shrink: 0;
  }
  .auth-terminal__text {
    font-size: var(--text-xs);
  }
  .auth-split__right {
    padding: var(--spacing-xl);
    padding-bottom: var(--spacing-4xl);
  }
}
</style>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'

const { t } = useI18n()
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

// Glowing red square — dynamic grid tracking
const GRID = 40
const sqX = ref(0)
const sqY = ref(0)
const sqCols = ref(16)
const sqRows = ref(12)
let sqTimer = null
const leftPanel = ref(null)

function moveSquare() {
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]]
  const [dx, dy] = dirs[Math.floor(Math.random() * 4)]
  sqX.value = (sqX.value + dx + sqCols.value) % sqCols.value
  sqY.value = (sqY.value + dy + sqRows.value) % sqRows.value
}

onMounted(() => {
  sqX.value = Math.floor(Math.random() * sqCols.value)
  sqY.value = Math.floor(Math.random() * sqRows.value)
  sqTimer = setInterval(moveSquare, 1000)

  const observer = new ResizeObserver(([entry]) => {
    const w = entry.target.clientWidth
    const h = entry.target.clientHeight
    const nc = Math.floor(w / GRID)
    const nr = Math.floor(h / GRID)
    if (nc !== sqCols.value || nr !== sqRows.value) {
      sqCols.value = nc
      sqRows.value = nr
      sqX.value = Math.min(sqX.value, sqCols.value - 1)
      sqY.value = Math.min(sqY.value, sqRows.value - 1)
    }
  })
  if (leftPanel.value) observer.observe(leftPanel.value)
  onUnmounted(() => {
    clearInterval(sqTimer)
    observer.disconnect()
  })
})

const form = ref({ username: '', password: '', nickname: '' })
const error = ref('')
const loading = ref(false)

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
    error.value = err.response?.data?.message || t('auth.loginFailed')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
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
    await auth.register({ username: form.value.username, password: form.value.password, nickname: form.value.nickname })
    router.push('/')
  } catch (err) {
    error.value = err.response?.data?.message || t('auth.registerFailed')
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
  form.value = { username: '', password: '', nickname: '' }
  error.value = ''
  router.push(path)
}
</script>

<template>
  <div class="auth-split">
    <div class="auth-split__left" ref="leftPanel">
      <div
        class="auth-split__sq"
        :style="{
          left: sqX * GRID + 'px',
          top: sqY * GRID + 'px'
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
          <pre class="auth-terminal__text">
<span class="auth-terminal__line"><span class="auth-terminal__prompt">$</span> ssh zincoid-website</span>
<span class="auth-terminal__line"><span class="auth-terminal__dim">&gt; authenticating...</span></span>
<span class="auth-terminal__line"><span class="auth-terminal__prompt">$</span> {{ typedCmd }}<span v-if="step === 0" class="cursor">_</span></span>
<span v-if="step >= 1" class="auth-terminal__line"><span class="auth-terminal__dim">&gt; {{ isLogin ? 'returning_user' : 'new_user' }}</span></span>
<span v-if="step === 2" class="auth-terminal__line"><span class="auth-terminal__prompt">$</span> <span class="auth-terminal__cursor">_</span></span>
          </pre>
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
            <label class="field__label">{{ t('auth.username') }}</label>
            <input v-model="form.username" class="field__input" type="text" autocomplete="username" />
          </div>
          <div class="field">
            <label class="field__label">{{ t('auth.password') }}</label>
            <input v-model="form.password" class="field__input" type="password" autocomplete="off" />
          </div>
          <div v-if="!isLogin" class="field">
            <label class="field__label">{{ t('profile.nickname') }}</label>
            <input v-model="form.nickname" class="field__input" type="text" />
          </div>

          <p v-if="error" class="auth-form__error">{{ error }}</p>

          <button class="btn btn--primary btn--lg btn--full" type="submit" :disabled="loading">
            {{ loading ? t('common.loading') : (isLogin ? t('auth.login') : t('auth.register')) }}
          </button>
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
  flex: 1;
  background:
    linear-gradient(rgba(255,255,255,0.03) 2px, transparent 2px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 2px, transparent 2px),
    #0d1117;
  background-size: 40px 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-3xl);
  position: relative;
  overflow: hidden;
}

.auth-split__sq {
  position: absolute;
  width: 30px;
  height: 30px;
  margin: 5px;
  background: #ff3333;
  transition: left 0.12s ease, top 0.12s ease;
  pointer-events: none;
  z-index: 1;
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
    min-height: auto;
  }
  .auth-split__left {
    padding: var(--spacing-2xl) var(--spacing-xl);
  }
  .auth-brand__ascii {
    font-size: clamp(0.22rem, 0.6vw, 0.4rem);
  }
  .auth-terminal__text {
    font-size: var(--text-xs);
  }
  .auth-split__right {
    padding: var(--spacing-xl);
  }
}
</style>

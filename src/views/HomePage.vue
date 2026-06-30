<script setup>
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useLocaleStore } from '@/stores/locale'
import { momentAPI, articleAPI, userAPI, configAPI } from '@/api'
import MomentCard from '@/components/MomentCard.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const { t } = useI18n()
const auth = useAuthStore()
const locale = useLocaleStore()
const moments = ref([])
const articles = ref([])
const featured = ref(null)
const loading = ref(true)
const typed = ref('')
const typingDone = ref(false)
let typingTimer = null
const collapsed = ref(null) // 'moments' | 'articles' | null
const configMap = ref({})
const subtitleText = computed(() => {
  return locale.locale === 'zh' ? configMap.value['site_desc_zh'] : configMap.value['site_desc_en']
})

async function refreshFeatured() {
  try {
    const api = Math.random() < 0.5 ? momentAPI.getRandom : articleAPI.getRandom
    const res = await api()
    if (res.data.data) {
      const type = res.config.url.includes('moments') ? 'moment' : 'article'
      featured.value = { ...res.data.data, _type: type }
    }
  } catch (e) { console.error(e) }
}

// Colored squares on grid — dynamic tracking
const GRID = 24
const sqCols = ref(20)
const sqRows = ref(12)
let sqTimer = null
const heroRef = ref(null)
const squares = reactive([
  { x: 0, y: 0, cls: 'hero-terminal__sq--red' },
  { x: 0, y: 0, cls: 'hero-terminal__sq--green' },
  { x: 0, y: 0, cls: 'hero-terminal__sq--blue' }
])

function moveSquares() {
  const dirs = [[0, -1], [0, 1], [-1, 0], [1, 0]]
  for (const sq of squares) {
    const [dx, dy] = dirs[Math.floor(Math.random() * 4)]
    sq.x = (sq.x + dx + sqCols.value) % sqCols.value
    sq.y = (sq.y + dy + sqRows.value) % sqRows.value
  }
}

function clampSquares() {
  for (const sq of squares) {
    sq.x = Math.min(sq.x, sqCols.value - 1)
    sq.y = Math.min(sq.y, sqRows.value - 1)
  }
}

onMounted(() => {
  for (const sq of squares) {
    sq.x = Math.floor(Math.random() * sqCols.value)
    sq.y = Math.floor(Math.random() * sqRows.value)
  }
  sqTimer = setInterval(moveSquares, 1000)

  const observer = new ResizeObserver(([entry]) => {
    const w = entry.target.clientWidth
    const h = entry.target.clientHeight
    const nc = Math.floor(w / GRID)
    const nr = Math.floor(h / GRID)
    if (nc !== sqCols.value || nr !== sqRows.value) {
      sqCols.value = nc
      sqRows.value = nr
      clampSquares()
    }
  })
  if (heroRef.value) observer.observe(heroRef.value)

  const mq = window.matchMedia('(max-width: 1200px)')
  const onMqChange = (e) => { if (e.matches) collapsed.value = null }
  mq.addEventListener('change', onMqChange)
  onUnmounted(() => {
    clearInterval(sqTimer)
    observer.disconnect()
    mq.removeEventListener('change', onMqChange)
  })
})

function startTyping() {
  typingDone.value = false
  typed.value = ''
  const text = subtitleText.value || 'Zincoid'
  let i = 0
  clearInterval(typingTimer)
  typingTimer = setInterval(() => {
    typed.value = text.slice(0, i + 1)
    i++
    if (i >= text.length) {
      clearInterval(typingTimer)
      typingDone.value = true
    }
  }, 100)
}

// Terminal prompt typing/deleting cycle
const counts = ref({ moments: 0, articles: 0, members: 0 })

const terminalCommands = computed(() => [
  { cmd: 'ls -la ~/moments/', output: `${counts.value.moments} moments` },
  { cmd: 'ls -la ~/articles/', output: `${counts.value.articles} articles` },
  { cmd: 'ls -la ~/members/', output: `${counts.value.members} members` },
  { cmd: 'cat /etc/motd', output: 'Welcome!' },
  { cmd: 'echo $USER', output: auth.user?.nickname || 'visitor' }
])
const terminalTyped = ref('')
const terminalOutput = ref('')
const terminalDeleting = ref(false)
let terminalCycleTimer = null
let terminalPauseTimer = null
let cmdIdx = 0

function terminalCycle() {
  clearTimeout(terminalPauseTimer)
  const cmd = terminalCommands.value[cmdIdx % terminalCommands.value.length]
  let i = 0
  terminalDeleting.value = false
  terminalOutput.value = ''
  clearInterval(terminalCycleTimer)

  terminalCycleTimer = setInterval(() => {
    if (!terminalDeleting.value) {
      terminalTyped.value = cmd.cmd.slice(0, i + 1)
      i++
      if (i > cmd.cmd.length) {
        clearInterval(terminalCycleTimer)
        terminalOutput.value = cmd.output
        terminalPauseTimer = setTimeout(() => {
          terminalDeleting.value = true
          let j = cmd.cmd.length
          terminalCycleTimer = setInterval(() => {
            terminalTyped.value = cmd.cmd.slice(0, j)
            j--
            if (j < 0) {
              clearInterval(terminalCycleTimer)
              terminalOutput.value = ''
              cmdIdx++
              terminalPauseTimer = setTimeout(() => terminalCycle(), 1500)
            }
          }, 40)
        }, 3000)
      }
    }
  }, 100)
}

watch(() => locale.locale, () => {
  startTyping()
})

onMounted(async () => {
  startTyping()
  try {
    const randomAPI = Math.random() < 0.5 ? momentAPI.getRandom() : articleAPI.getRandom()
    const [mRes, aRes, mtRes, atRes, uRes, rRes, cfgRes] = await Promise.all([
      momentAPI.getHomeFeed(5),
      articleAPI.getHomeFeed(5),
      momentAPI.getTimeline(1, 1),
      articleAPI.getList(1, 1),
      userAPI.getList(1, 1),
      randomAPI,
      configAPI.get()
    ])
    moments.value = mRes.data.data || []
    articles.value = aRes.data.data || []
    counts.value.moments = mtRes.data.data.total || 0
    counts.value.articles = atRes.data.data.total || 0
    counts.value.members = uRes.data.data.total || 0
    if (rRes.data.data) {
      const type = rRes.config.url.includes('moments') ? 'moment' : 'article'
      featured.value = { ...rRes.data.data, _type: type }
    }
    const cfgs = cfgRes.data.data || {}
    for (const [key, value] of Object.entries(cfgs)) {
      configMap.value[key] = value
    }
    startTyping()
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
    terminalCycle()
  }
})
onUnmounted(() => {
  clearInterval(terminalCycleTimer)
  clearTimeout(terminalPauseTimer)
})
</script>

<template>
  <div class="home">
    <!-- Hero + Terminal -->
    <section class="hero-terminal" ref="heroRef" style="position:relative;overflow:hidden">
      <div
        v-for="(sq, i) in squares"
        :key="i"
        :class="['hero-terminal__sq', sq.cls]"
        :style="{
          left: sq.x * GRID + 'px',
          top: sq.y * GRID + 'px'
        }"
      ></div>
      <div class="hero-terminal__inner container-wide">
        <div class="hero-terminal__brand">
          <h1 class="hero-terminal__title">
            Zincoid<span class="hero-terminal__title--light">'s</span>
          </h1>
          <p class="hero-terminal__subtitle">{{ typed }} <span class="cursor cursor--square">▌</span></p>
        </div>
        <div class="hero-terminal__cli">
          <pre class="terminal__text"><span class="terminal__line"><span class="terminal__prompt">$</span> ssh zincoid-website</span>
<span class="terminal__line"><span class="terminal__dim">&gt; authenticating...</span></span>
<span class="terminal__line"><span class="terminal__prompt">$</span> whoami</span>
<span class="terminal__line"><span class="terminal__dim">&gt; {{ auth.user?.nickname || 'visitor' }}</span></span>
<span class="terminal__line"><span class="terminal__prompt">$</span> {{ terminalTyped }}<span class="terminal__cursor">_</span></span>
<span v-if="terminalOutput" class="terminal__line"><span class="terminal__dim">&gt; {{ terminalOutput }}</span></span></pre>
        </div>
      </div>
    </section>

    <!-- Featured Random -->
    <div v-if="featured" class="featured container-wide">
      <div class="featured__card">
        <div class="featured__header">
          <h2 class="featured__title"># {{ t('home.random') }}<span class="cursor">_</span></h2>
          <button class="featured__refresh" @click="refreshFeatured">
            {{ t('home.shuffle') }}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
          </button>
        </div>
        <MomentCard v-if="featured._type === 'moment'" :moment="featured" />
        <ArticleCard v-else :article="featured" />
      </div>
    </div>

    <!-- Recent Moments & Articles -->
    <LoadingSpinner v-if="loading" :message="t('common.loading')" />
    <div
      v-else
      class="recent-grid container-wide"
      :class="{
        'recent-grid--collapse-left': collapsed === 'moments',
        'recent-grid--collapse-right': collapsed === 'articles'
      }"
    >
      <!-- Moments -->
      <template v-if="collapsed !== 'moments'">
        <section class="section">
          <div class="section__card">
            <div class="section__header">
              <h2 class="section__title"># {{ t('home.recentMoments') }}<span class="cursor">_</span></h2>
              <div class="section__header-actions">
                <button class="section__collapse-btn" @click="collapsed = 'moments'" title="Collapse">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <router-link to="/moments" class="section__more">{{ t('home.viewAll') }}</router-link>
              </div>
            </div>
            <div class="moments-grid" v-if="moments.length">
              <MomentCard v-for="m in moments" :key="m.id" :moment="m" />
            </div>
            <p v-else-if="!loading" class="empty-state">{{ t('moment.empty') }}</p>
          </div>
        </section>
      </template>
      <template v-else>
        <div class="collapsed-sidebar" @click="collapsed = null">
          <span class="collapsed-sidebar__label"># {{ t('home.recentMoments') }}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </div>
      </template>

      <!-- Articles -->
      <template v-if="collapsed !== 'articles'">
        <section class="section">
          <div class="section__card">
            <div class="section__header">
              <h2 class="section__title"># {{ t('home.recentArticles') }}<span class="cursor">_</span></h2>
              <div class="section__header-actions">
                <button class="section__collapse-btn" @click="collapsed = 'articles'" title="Collapse">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                </button>
                <router-link to="/articles" class="section__more">{{ t('home.viewAll') }}</router-link>
              </div>
            </div>
            <div class="articles-list" v-if="articles.length">
              <ArticleCard v-for="a in articles" :key="a.id" :article="a" />
            </div>
            <p v-else-if="!loading" class="empty-state">{{ t('article.empty') }}</p>
          </div>
        </section>
      </template>
      <template v-else>
        <div class="collapsed-sidebar" @click="collapsed = null">
          <span class="collapsed-sidebar__label"># {{ t('home.recentArticles') }}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.home {
  padding-bottom: var(--spacing-4xl);
}

.hero-terminal__sq {
  position: absolute;
  width: 20px;
  height: 20px;
  margin: 2px;
  border-radius: 3px;
  border: 1px solid;
  transition: left 0.12s ease, top 0.12s ease;
  pointer-events: none;
  z-index: 1;
}
.hero-terminal__sq--red {
  background: rgba(255, 51, 51, 0.1);
  border-color: rgba(255, 51, 51, 0.1);
}
.hero-terminal__sq--green {
  background: rgba(63, 185, 80, 0.1);
  border-color: rgba(63, 185, 80, 0.1);
}
.hero-terminal__sq--blue {
  background: rgba(88, 166, 255, 0.1);
  border-color: rgba(88, 166, 255, 0.1);
}

/* Hero + Terminal */
.hero-terminal {
  background:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
    #0d1117;
  background-size: 24px 24px;
  display: flex;
  align-items: center;
  height: 288px;
  margin-bottom: var(--spacing-3xl);
}
.hero-terminal__inner {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-3xl);
}
.hero-terminal__brand {
  flex: 1;
  min-width: 0;
}
.hero-terminal__title {
  font-size: clamp(2rem, 6vw, 3.5rem);
  font-weight: var(--weight-bold);
  color: #f0f6fc;
  letter-spacing: -0.03em;
  margin: 0;
}
.hero-terminal__title--light {
  font-weight: var(--weight-light);
  color: #8b949e;
}
.hero-terminal__subtitle {
  font-size: var(--text-base);
  color: #8b949e;
  margin-top: var(--spacing-xs);
}
.hero-terminal__cli {
  flex-shrink: 0;
}

.terminal__text {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.9;
  color: #c9d1d9;
  background: none;
  border: none;
  padding: 0;
  margin: 0;
}
.terminal__prompt {
  color: #58a6ff;
}
.terminal__dim {
  color: #8b949e;
}
.terminal__link {
  color: #8b949e;
  text-decoration: none;
  transition: color var(--transition-fast);
}
.terminal__link:hover {
  color: #c9d1d9;
  text-decoration: underline;
}
.terminal__cursor {
  display: inline-block;
  animation: blink 1s step-end infinite;
  color: #58a6ff;
}
@keyframes blink {
  50% { opacity: 0; }
}

/* Sections */
.featured {
  margin-bottom: var(--spacing-3xl);
}
.featured__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}
.featured__title {
  font-size: var(--text-lg);
  font-weight: var(--weight-medium);
  margin-bottom: 0;
}
.featured__refresh {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--rounded-full);
  transition: all var(--transition-fast);
}
.featured__refresh:hover {
  background: var(--color-bg-alt);
}
.featured__card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  padding: var(--spacing-2xl);
}

.section {
  margin-bottom: var(--spacing-3xl);
}
.section__card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  padding: var(--spacing-2xl);
}
.section__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}
.section__title {
  font-size: var(--text-lg);
  font-weight: var(--weight-medium);
}
.section__more {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: var(--spacing-xs) var(--spacing-md);
  border-radius: var(--rounded-full);
  transition: all var(--transition-fast);
}
.section__more:hover {
  background: var(--color-bg-alt);
}

.recent-grid {
  display: grid;
  grid-template-columns: minmax(0, 4fr) minmax(0, 5fr);
  gap: var(--spacing-2xl);
  align-items: start;

}
.recent-grid--collapse-left {
  grid-template-columns: 36px 1fr;
}
.recent-grid--collapse-right {
  grid-template-columns: 1fr 36px;
}

.section__header-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}

.section__collapse-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--rounded-full);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}
.section__collapse-btn:hover {
  background: var(--color-bg-alt);
  color: var(--color-text-heading);
}

.collapsed-sidebar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-lg) var(--spacing-xs);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  cursor: pointer;
  transition: all var(--transition-fast);
  min-height: 120px;
}
.collapsed-sidebar:hover {
  border-color: #f9a8d4;
  color: #f9a8d4;
}
.collapsed-sidebar__label {
  writing-mode: vertical-rl;
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  letter-spacing: 0.1em;
}

@media (max-width: 1200px) {
  .recent-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
  .recent-grid--collapse-left,
  .recent-grid--collapse-right {
    grid-template-columns: 1fr;
  }
  .section__collapse-btn {
    display: none;
  }
  .collapsed-sidebar {
    display: none;
  }
  .section {
    margin-bottom: var(--spacing-xl);
  }
  .hero-terminal__inner {
    flex-direction: column;
    text-align: center;
  }
  .hero-terminal {
    height: auto;
    min-height: 288px;
    padding: 48px 0;
    overflow: hidden;
  }
  .hero-terminal__cli {
    overflow-x: auto;
    max-width: 100%;
    height: 168px;
    overflow-y: hidden;
  }
}

.moments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--spacing-md);
}

.articles-list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

@media (max-width: 768px) {
  .moments-grid {
    grid-template-columns: 1fr;
  }
  .section__card {
    padding: var(--spacing-lg);
    border-radius: var(--rounded-md);
  }
}
</style>

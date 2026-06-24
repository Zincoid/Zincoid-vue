<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useLocaleStore } from '@/stores/locale'
import { momentAPI, articleAPI } from '@/api'
import MomentCard from '@/components/MomentCard.vue'
import ArticleCard from '@/components/ArticleCard.vue'

const { t } = useI18n()
const auth = useAuthStore()
const locale = useLocaleStore()
const moments = ref([])
const articles = ref([])
const loading = ref(true)
const typed = ref('')
const typingDone = ref(false)
let typingTimer = null

// Glowing red square — dynamic grid tracking
const GRID = 24
const sqX = ref(0)
const sqY = ref(0)
const sqCols = ref(20)
const sqRows = ref(12)
let sqTimer = null
const heroRef = ref(null)

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
  if (heroRef.value) observer.observe(heroRef.value)
  onUnmounted(() => {
    clearInterval(sqTimer)
    observer.disconnect()
  })
})

function startTyping() {
  typingDone.value = false
  typed.value = ''
  const text = t('home.subtitle')
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

watch(() => locale.locale, () => {
  startTyping()
})

onMounted(async () => {
  startTyping()
  try {
    const [mRes, aRes] = await Promise.all([
      momentAPI.getTimeline(1, 5),
      articleAPI.getList(1, 5)
    ])
    moments.value = mRes.data.data.records || []
    articles.value = aRes.data.data.records || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="home">
    <!-- Hero + Terminal -->
    <section class="hero-terminal" ref="heroRef" style="position:relative;overflow:hidden">
      <div
        class="hero-terminal__sq"
        :style="{
          left: sqX * GRID + 'px',
          top: sqY * GRID + 'px'
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
          <pre class="terminal__text">
<span class="terminal__line"><span class="terminal__prompt">$</span> ssh zincoid-website</span>
<span class="terminal__line"><span class="terminal__dim">&gt; authenticating...</span></span>
<span class="terminal__line"><span class="terminal__prompt">$</span> whoami</span>
<span class="terminal__line"><span class="terminal__dim">&gt; {{ auth.user?.nickname || 'visitor' }}</span></span>
<span class="terminal__line"><span class="terminal__prompt">$</span> ls ~/</span>
<span class="terminal__line"><span class="terminal__dim"><router-link to="/moments" class="terminal__link">moments/</router-link>  <router-link to="/articles" class="terminal__link">articles/</router-link>  <router-link to="/users" class="terminal__link">members/</router-link></span></span>
<span class="terminal__line"><span class="terminal__prompt">$</span> <span class="terminal__cursor">_</span></span>
          </pre>
        </div>
      </div>
    </section>

    <!-- Recent Moments & Articles -->
    <div class="recent-grid container-wide">
      <section class="section">
        <div class="section__card">
          <div class="section__header">
            <h2 class="section__title"># {{ t('home.recentMoments') }}<span class="cursor">_</span></h2>
            <router-link to="/moments" class="section__more">{{ t('home.viewAll') }}</router-link>
          </div>
          <div class="moments-grid" v-if="moments.length">
            <MomentCard v-for="m in moments" :key="m.id" :moment="m" />
          </div>
          <p v-else-if="!loading" class="empty-state">{{ t('moment.empty') }}</p>
        </div>
      </section>

      <section class="section">
        <div class="section__card">
          <div class="section__header">
            <h2 class="section__title"># {{ t('home.recentArticles') }}<span class="cursor">_</span></h2>
            <router-link to="/articles" class="section__more">{{ t('home.viewAll') }}</router-link>
          </div>
          <div class="articles-list" v-if="articles.length">
            <ArticleCard v-for="a in articles" :key="a.id" :article="a" />
          </div>
          <p v-else-if="!loading" class="empty-state">{{ t('article.empty') }}</p>
        </div>
      </section>
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
  background: #ff3333;
  transition: left 0.12s ease, top 0.12s ease;
  pointer-events: none;
  z-index: 1;
}

/* Hero + Terminal */
.hero-terminal {
  background:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
    #0d1117;
  background-size: 24px 24px;
  padding: 48px 0;
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
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-2xl);
  align-items: start;
}

@media (max-width: 1200px) {
  .recent-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
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
  }
  .hero-terminal__cli {
    overflow-x: auto;
    max-width: 100%;
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

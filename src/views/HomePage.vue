<script setup>
import { ref, reactive, watch, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useLocaleStore } from '@/stores/locale'
import { momentAPI, articleAPI, userAPI, configAPI, repoAPI } from '@/api'
import { siteBrand } from '@/composables/useConfig'
import MomentCard from '@/components/MomentCard.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import RepoCard from '@/components/RepoCard.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SvgIcon from '@/components/SvgIcon.vue'

const { t } = useI18n()
const auth = useAuthStore()
const locale = useLocaleStore()
const moments = ref([])
const articles = ref([])
const repos = ref([])
const featured = ref(null)
const loading = ref(true)
const loadingDone = ref(false)
const typed = ref('')
const typingDone = ref(false)
let typingTimer = null
const configMap = ref({})
const subtitleText = computed(() => {
  return locale.locale === 'zh' ? configMap.value['site_desc_zh'] : configMap.value['site_desc_en']
})

const randomSources = [
  { type: 'moment', get: () => momentAPI.getRandom() },
  { type: 'article', get: () => articleAPI.getRandom() },
  { type: 'repo', get: () => repoAPI.getRandom() }
]

function pickRandomSource() {
  return randomSources[Math.floor(Math.random() * randomSources.length)]
}

async function refreshFeatured() {
  try {
    const source = pickRandomSource()
    const res = await source.get()
    if (res.data.data) {
      featured.value = { ...res.data.data, _type: source.type }
    }
  } catch (e) { console.error(e) }
}

// Colored squares on grid
const GRID = 24
const sqCols = ref(20)
const sqRows = ref(12)
let animTimer = null
const heroRef = ref(null)
const squares = reactive([
  { x: 0, y: 0, cls: 'hero-terminal__sq--red' },
  { x: 0, y: 0, cls: 'hero-terminal__sq--green' },
  { x: 0, y: 0, cls: 'hero-terminal__sq--blue' }
])

// Pixel raindrop animation (grid-based)
const drops = reactive([])    // [{x, y, color}]
const ripples = reactive([])  // [{cx, cy, rx, ry, opacity, color}]
const animationType = ref(null)

// Rain cycle with random phase durations
let rainPhase = 'light'
let rainPhaseTick = 0
let rainPhaseLength = 0
const randomRainLength = (phase) => phase === 'light'
  ? 50 + Math.floor(Math.random() * 100)  // 50-149 ticks
  : 30 + Math.floor(Math.random() * 70)    // 30-99 ticks

function randomizeSquares() {
  for (const sq of squares) {
    sq.x = Math.floor(Math.random() * sqCols.value)
    sq.y = Math.floor(Math.random() * sqRows.value)
  }
}

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

// ── Pixel raindrop animation ──
function spawnRipplePixel(cx, cy, color, opacity) {
  ripples.push({ cx, cy, rx: 0.5, ry: 0.2, opacity, color, age: 0 })
}

function stepRaindrop() {
  rainPhaseTick++
  if (rainPhaseTick > rainPhaseLength) {
    rainPhase = rainPhase === 'light' ? 'heavy' : 'light'
    rainPhaseLength = randomRainLength(rainPhase)
    rainPhaseTick = 0
  }
  const heavy = rainPhase === 'heavy'

  // Spawn
  const spawnRate = heavy ? 0.9 : 0.35
  if (Math.random() < spawnRate) {
    const color = Math.random() < 0.3 ? '#3fb950' : '#58a6ff'
    drops.push({ x: Math.floor(Math.random() * sqCols.value), y: -1, color, age: 0 })
  }

  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i]
    d.x += 1
    d.y += 2
    d.age++

    const offGrid = d.y >= sqRows.value - 1 || d.x >= sqCols.value
    const splash = d.age > 2 && Math.random() < 0.1
    if (offGrid || splash) {
      const sx = Math.min(Math.max(d.x, 0), sqCols.value - 1)
      const sy = offGrid ? sqRows.value - 1 : d.y
      const rippleOpacity = heavy ? 1.0 : 0.1 + Math.random() * 0.9
      spawnRipplePixel(sx, sy, d.color, rippleOpacity)
      drops.splice(i, 1)
    }
  }

  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i]
    r.rx += 1.0
    r.ry += 0.5
    r.age++
    r.opacity -= 0.055
    if (r.opacity <= 0 || r.age > 20) { ripples.splice(i, 1); continue }
  }

  rebuildRippleCells()
}

function stopRaindrop() {
  drops.splice(0)
  ripples.splice(0)
}

// Generate ellipse pixel cells from ripple data
const rippleCells = ref([])

function rebuildRippleCells() {
  const map = new Map()
  for (const r of ripples) {
    const rr = Math.round(r.rx)
    const ry = Math.max(1, Math.round(r.rx * 0.35))
    for (let dy = -ry; dy <= ry; dy++) {
      const row = Math.round(r.cy + dy)
      if (row < 0 || row >= sqRows.value) continue
      const half = Math.round(rr * Math.sqrt(1 - (dy / ry) ** 2))
      for (let dx = -half; dx <= half; dx++) {
        const col = Math.round(r.cx + dx)
        if (col >= 0 && col < sqCols.value) {
          const dist = Math.sqrt(dx * dx + (dy / 0.35) ** 2)
          const t = dist / rr
          const outer = t > 0.7 ? 0.5 : 1
          const op = animationType.value === 'raindrop_sin'
            ? r.opacity * Math.sin(t * Math.PI) * outer
            : r.opacity * (1 - t) * outer
          if (op > 0.015) {
            const key = `${r.cx}-${r.cy}-${row}-${col}`
            if (!map.has(key) || map.get(key).opacity < op) {
              map.set(key, { x: col, y: row, opacity: op, color: r.color })
            }
          }
        }
      }
    }
  }
  rippleCells.value = Array.from(map.values())
}

onMounted(() => {
  randomizeSquares()
  animTimer = setInterval(moveSquares, 1000)
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

  onUnmounted(() => {
    clearInterval(animTimer)
    observer.disconnect()
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

function startHeroAnimation() {
  if (animationType.value !== 'squares') {
    clearInterval(animTimer)
    rainPhase = 'light'
    rainPhaseTick = 0
    rainPhaseLength = randomRainLength('light')
    animTimer = setInterval(stepRaindrop, 150)
  }
}

// Terminal prompt typing/deleting cycle
const counts = ref({ moments: 0, articles: 0, members: 0, repos: 0 })

const terminalCommands = computed(() => [
  { cmd: 'ls -la ~/moments/', output: `${counts.value.moments} moments` },
  { cmd: 'ls -la ~/articles/', output: `${counts.value.articles} articles` },
  { cmd: 'ls -la ~/repos/', output: `${counts.value.repos} repos` },
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
  try {
    const randomSource = pickRandomSource()
    const [mRes, aRes, rhRes, mtRes, atRes, uRes, rRes, rpRes, cfgRes] = await Promise.all([
      momentAPI.getHomeFeed(5),
      articleAPI.getHomeFeed(5),
      repoAPI.getHomeFeed(5),
      momentAPI.getTimeline(1, 1),
      articleAPI.getList(1, 1),
      userAPI.getList(1, 1),
      randomSource.get(),
      repoAPI.getList(1, 1),
      configAPI.get()
    ])
    moments.value = mRes.data.data || []
    articles.value = aRes.data.data || []
    repos.value = rhRes.data.data || []
    counts.value.moments = mtRes.data.data.total || 0
    counts.value.articles = atRes.data.data.total || 0
    counts.value.members = uRes.data.data.total || 0
    counts.value.repos = rpRes.data.data.total || 0
    if (rRes.data.data) {
      featured.value = { ...rRes.data.data, _type: randomSource.type }
    }
    const cfgs = cfgRes.data.data || {}
    for (const [key, value] of Object.entries(cfgs)) {
      configMap.value[key] = value
    }
    const rawAnim = configMap.value['hero_animation'] || 'squares'
    const anims = ['squares', 'raindrop', 'raindrop_sin']
    animationType.value = rawAnim === 'random'
      ? anims[Math.floor(Math.random() * anims.length)]
      : rawAnim
    startHeroAnimation()
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
  clearInterval(animTimer)
})
</script>

<template>
  <div class="home">
    <!-- Hero + Terminal -->
    <section class="hero-terminal" ref="heroRef" style="position:relative;overflow:hidden">
      <template v-if="animationType === 'squares'">
        <div
          v-for="(sq, i) in squares"
          :key="i"
          :class="['hero-terminal__sq', 'hero-terminal__sq--square', sq.cls]"
          :style="{
            left: sq.x * GRID + 'px',
            top: sq.y * GRID + 'px'
          }"
        ></div>
      </template>
      <template v-else-if="animationType !== 'squares'">
        <div
          v-for="(d, i) in drops"
          :key="'d'+i"
          class="hero-terminal__sq hero-terminal__sq--drop"
          :style="{
            left: d.x * GRID + 'px',
            top: d.y * GRID + 'px',
            background: d.color,
            borderColor: d.color
          }"
        ></div>
        <div
          v-for="(c, i) in rippleCells"
          :key="c.key || ('r'+i)"
          class="hero-terminal__sq hero-terminal__sq--ripple"
          :style="{
            left: c.x * GRID + 'px',
            top: c.y * GRID + 'px',
            background: c.color,
            borderColor: c.color,
            opacity: c.opacity
          }"
        ></div>
      </template>
      <div class="hero-terminal__inner container-wide">
        <div class="hero-terminal__brand">
          <h1 class="hero-terminal__title">
            {{ siteBrand.main }}<span v-if="siteBrand.suffix" class="hero-terminal__title--light">{{ siteBrand.suffix }}</span>
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
            <SvgIcon name="refresh" :size="12" />
          </button>
        </div>
        <MomentCard v-if="featured._type === 'moment'" :moment="featured" />
        <ArticleCard v-else-if="featured._type === 'article'" :article="featured" />
        <router-link v-else :to="`/repos/${featured.id}`" class="featured__repo">
          <RepoCard :repo="featured" />
        </router-link>
      </div>
    </div>

    <!-- Recent Moments, Articles & Repos -->
    <LoadingSpinner :visible="loading" @done="loadingDone = true" />
    <div v-if="loadingDone" class="recent-grid container-wide">
      <!-- Moments -->
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

      <!-- Articles & Repos -->
      <div class="recent-col">
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

        <section class="section">
          <div class="section__card">
            <div class="section__header">
              <h2 class="section__title"># {{ t('home.recentRepos') }}<span class="cursor">_</span></h2>
              <router-link to="/repos" class="section__more">{{ t('home.viewAll') }}</router-link>
            </div>
            <div class="repo-grid" v-if="repos.length">
              <router-link v-for="repo in repos" :key="repo.id" :to="`/repos/${repo.id}`">
                <RepoCard :repo="repo" />
              </router-link>
            </div>
            <p v-else-if="!loading" class="empty-state">{{ t('repo.empty') }}</p>
          </div>
        </section>
      </div>
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
.hero-terminal__sq--square {
  border: none;
  border-radius: 0;
}
.hero-terminal__sq--red {
  background: rgba(255, 51, 51, 0.25);
  border-color: rgba(255, 51, 51, 0.25);
}
.hero-terminal__sq--green {
  background: rgba(63, 185, 80, 0.25);
  border-color: rgba(63, 185, 80, 0.25);
}
.hero-terminal__sq--blue {
  background: rgba(88, 166, 255, 0.25);
  border-color: rgba(88, 166, 255, 0.25);
}
.hero-terminal__sq--drop {
  background: #58a6ff;
  border-color: #58a6ff;
  opacity: 0.7;
  border-radius: 0 !important;
  transition: none !important;
}
.hero-terminal__sq--ripple {
  border-color: currentColor;
  background: currentColor;
  transition: none !important;
  border-radius: 0 !important;
}

/* Hero + Terminal */
.hero-terminal {
  background:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
    #0d1117;
  background-size: 24px 24px;
  background-position: 0 -1px;
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
  padding: 0 calc(24px + max(0px, min(56px, calc(56px - (100vw - 1000px) / 2))));
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
.featured__repo {
  display: block;
  color: inherit;
  text-decoration: none;
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
.recent-col { min-width: 0; }

@media (max-width: 1200px) {
  .recent-grid {
    grid-template-columns: 1fr;
    gap: var(--spacing-lg);
  }
  .section {
    margin-bottom: var(--spacing-xl);
  }
}

@media (max-width: 857px) {
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

.repo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-xl);
}
.repo-grid > * { display: flex; }
.repo-grid > * > * { flex: 1; min-width: 0; }

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

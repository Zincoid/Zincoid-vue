<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { commentAPI } from '@/api'
import { formatDate } from '@/utils/format'

const { t } = useI18n()

// Danmaku (bullet comments): /comments/public/home returns the newest first;
// spawn order matches — the newest comments fly out first, then on through
// the history and back around.
// Bullets spawn round-robin into 3 lanes. The per-lane gap (LANES * SPAWN_MS)
// is wider than the longest bullet at the near-constant px/s below, so
// same-lane bullets never overlap (each moves a different distance in the
// same duration — a long bullet goes slightly faster but starts far enough
// behind).
const comments = ref([])
const flying = ref([])
const ready = ref(false)

const trackEl = ref(null)
const LANES = 3
const SPAWN_MS = 2200
let spawnTimer = null
let seq = 0
let queueIdx = 0

function targetRoute(c) {
  if (c.targetId == null) return null
  if (c.targetType === 0) return { name: 'MomentDetail', params: { id: c.targetId } }
  if (c.targetType === 1) return { name: 'ArticleDetail', params: { id: c.targetId } }
  if (c.targetType === 4) return { name: 'RepoDetail', params: { id: c.targetId } }
  return null
}

// constant px/s across viewports: a wider track → a longer flight
function flightSeconds() {
  const w = trackEl.value?.clientWidth || 1000
  return Math.min(20, Math.max(8, (w + 300) / 95))
}

function spawn() {
  const list = comments.value
  if (!list.length) return
  const c = list[queueIdx % list.length]
  queueIdx++
  flying.value = [
    ...flying.value,
    { key: ++seq, c, route: targetRoute(c), lane: seq % LANES, dur: flightSeconds() }
  ]
}

function onFlyEnd(b) {
  flying.value = flying.value.filter(x => x.key !== b.key)
}

onMounted(async () => {
  try {
    const res = await commentAPI.getHomeFeed(20)
    const list = res.data.data || []
    comments.value = [...list].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  } catch {
    comments.value = []
  }
  ready.value = true
  if (!comments.value.length) return

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    // no animation: a static wrap of the first comments instead of flying ones
    flying.value = comments.value
      .slice(0, 8)
      .map((c, i) => ({ key: i, c, route: targetRoute(c), lane: 0, dur: 0 }))
    return
  }
  await nextTick() // track must be laid out for the width-based duration
  spawn()
  spawnTimer = setInterval(spawn, SPAWN_MS)
})

onUnmounted(() => {
  if (spawnTimer) clearInterval(spawnTimer)
})
</script>

<template>
  <section v-if="ready && comments.length" class="recent-comments">
    <div class="container-wide">
      <div class="recent-comments__header">
        <h2 class="recent-comments__title"># {{ t('home.recentComments') }}<span class="cursor">_</span></h2>
      </div>
      <div class="recent-comments__track" ref="trackEl">
        <component
          v-for="b in flying"
          :key="b.key"
          :is="b.route ? 'router-link' : 'span'"
          :to="b.route || undefined"
          class="recent-comments__item"
          :style="{ '--lane': String(b.lane), '--dur': b.dur + 's' }"
          :title="formatDate(b.c.createdAt)"
          @animationend="onFlyEnd(b)"
        >
          <span class="recent-comments__nick">{{ b.c.userNickname }}</span>
          <span v-if="b.c.parentUsername" class="recent-comments__reply">@{{ b.c.parentUsername }}</span>
          <span class="recent-comments__sep">：</span>
          <span class="recent-comments__text">{{ b.c.content }}</span>
        </component>
      </div>
    </div>
  </section>
</template>

<style scoped>
.recent-comments {
  border-top: 1px solid var(--color-border);
  padding-top: var(--spacing-3xl);
  margin-bottom: var(--spacing-4xl);
}
@media (max-width: 1200px) {
  .recent-comments {
    margin-bottom: var(--spacing-3xl);
  }
}

.recent-comments__header {
  margin-bottom: var(--spacing-xl);
}
.recent-comments__title {
  font-size: var(--text-2xl);
  font-weight: var(--weight-semibold);
  letter-spacing: -0.01em;
  margin: 0;
}

.recent-comments__track {
  /* inline-size containment: 100cqw inside the fly keyframes measures the
     track, so bullets cross it without JS width syncing */
  container-type: inline-size;
  position: relative;
  overflow: hidden;
  /* edge fade: bullets dissolve in/out instead of hard-clipping at the ends.
     Paint-only (like .spin-edge's mask) — hit testing keeps working so
     hover-pause and clicks still work in the faded zones */
  -webkit-mask-image: linear-gradient(to right, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%);
  mask-image: linear-gradient(to right, transparent 0, #000 40px, #000 calc(100% - 40px), transparent 100%);
  --dm-lane-h: 32px;
  --dm-lane-gap: 8px;
  height: calc(3 * var(--dm-lane-h) + 2 * var(--dm-lane-gap));
}

.recent-comments__item {
  position: absolute;
  left: 0;
  top: calc(var(--lane, 0) * (var(--dm-lane-h) + var(--dm-lane-gap)));
  height: var(--dm-lane-h);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  max-width: min(320px, 80%);
  padding: 0 var(--spacing-md);
  border-radius: var(--rounded-full);
  background: var(--color-bg-alt);
  color: var(--color-text);
  font-size: var(--text-sm);
  white-space: nowrap;
  text-decoration: none;
  animation: comment-fly var(--dur, 16s) linear forwards;
  will-change: transform;
}
a.recent-comments__item:hover {
  background: var(--color-primary-light);
  color: var(--color-primary);
}
.recent-comments__item:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
/* hovering (or keyboard-focusing) freezes the stream so a bullet can be clicked */
.recent-comments__track:hover .recent-comments__item,
.recent-comments__track:focus-within .recent-comments__item {
  animation-play-state: paused;
}

.recent-comments__nick {
  color: var(--color-primary);
  font-weight: var(--weight-medium);
  max-width: 9em;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
}
.recent-comments__reply {
  color: var(--color-text-secondary);
  flex-shrink: 0;
}
.recent-comments__sep {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
.recent-comments__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

@keyframes comment-fly {
  from { transform: translateX(100cqw); }
  to { transform: translateX(-100%); }
}

@media (max-width: 857px) {
  .recent-comments__item {
    max-width: min(220px, 80%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .recent-comments__track {
    container-type: normal;
    height: auto;
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-sm);
    -webkit-mask-image: none;
    mask-image: none;
  }
  .recent-comments__item {
    position: static;
    max-width: 100%;
    animation: none;
  }
}
</style>

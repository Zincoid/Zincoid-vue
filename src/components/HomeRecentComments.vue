<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { commentAPI } from '@/api'
import { formatDate } from '@/utils/format'

const { t } = useI18n()

// Danmaku (bullet comments): /comments/public/home returns the newest first;
// spawn order matches — the newest comments fly out first, then on through
// the history and back around.
// Organic rhythm: spawn intervals and lane picks are random (a uniform
// interval + lane rotation reads as a marching queue). Density comes from
// more lanes and a short refills gap; the gap floor (LANE_GAP_MIN_MS) is set
// from the worst-case catch-up over a full flight — slow narrow bullet ahead,
// fast wide one behind, with the mild duration jitter below — so same-lane
// bullets never overlap. When every lane is still spaced out the tick is
// skipped.
const comments = ref([])
const flying = ref([])
const ready = ref(false)

const trackEl = ref(null)
const LANES = 4
const SPAWN_MIN_MS = 400
const SPAWN_MAX_MS = 2600
const LANE_GAP_MIN_MS = 5900
let spawnTimer = null
let seq = 0
let queueIdx = 0
const laneBusyUntil = new Array(LANES).fill(0)

function targetRoute(c) {
  if (c.targetId == null) return null
  if (c.targetType === 0) return { name: 'MomentDetail', params: { id: c.targetId } }
  if (c.targetType === 1) return { name: 'ArticleDetail', params: { id: c.targetId } }
  if (c.targetType === 4) return { name: 'RepoDetail', params: { id: c.targetId } }
  return null
}

// the bullet grows with its content (names are never cut), so only the comment
// text is bounded — by characters, not by width. code points, so an emoji
// sliced in half can't leave a lone surrogate behind
const TEXT_MAX = 30
function clipText(s) {
  const chars = Array.from(String(s ?? ''))
  return chars.length > TEXT_MAX ? chars.slice(0, TEXT_MAX).join('') + '…' : chars.join('')
}

// constant px/s across viewports: a wider track → a longer flight
function flightSeconds() {
  const w = trackEl.value?.clientWidth || 1000
  return Math.min(20, Math.max(8, (w + 300) / 95))
}

function spawn() {
  const list = comments.value
  if (!list.length) return
  const now = performance.now()
  const free = []
  for (let i = 0; i < LANES; i++) {
    if (now >= laneBusyUntil[i]) free.push(i)
  }
  if (!free.length) return // all lanes still spaced out — skip, try next tick
  const lane = free[(Math.random() * free.length) | 0]
  laneBusyUntil[lane] = now + LANE_GAP_MIN_MS + Math.random() * 2000
  const c = list[queueIdx % list.length]
  queueIdx++
  flying.value = [
    ...flying.value,
    {
      key: ++seq,
      c,
      route: targetRoute(c),
      lane,
      // ±3% of the shared px/s baseline: enough to break lockstep, small
      // enough that the same-lane gap above still prevents any overlap
      dur: flightSeconds() * (0.97 + Math.random() * 0.06)
    }
  ]
}

function scheduleSpawn() {
  spawn()
  spawnTimer = setTimeout(
    scheduleSpawn,
    SPAWN_MIN_MS + Math.random() * (SPAWN_MAX_MS - SPAWN_MIN_MS)
  )
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
  scheduleSpawn()
})

onUnmounted(() => {
  if (spawnTimer) clearTimeout(spawnTimer)
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
          <!-- avatar mirrors CommentSection: image when present, else the
               nickname's first letter on a primary circle -->
          <span class="recent-comments__avatar" aria-hidden="true">
            <img v-if="b.c.userAvatar" :src="b.c.userAvatar" alt="" />
            <span v-else>{{ (b.c.userNickname || 'U')[0] }}</span>
          </span>
          <span class="recent-comments__nick">{{ b.c.userNickname }}</span>
          <!-- plain span, not a link: the whole bullet is already a router-link
               (nested anchors would be invalid) -->
          <span v-if="b.c.username" class="recent-comments__handle">@{{ b.c.username }}</span>
          <span class="recent-comments__sep">：</span>
          <span v-if="b.c.parentUsername" class="recent-comments__reply">@{{ b.c.parentUsername }}</span>
          <span class="recent-comments__text">{{ clipText(b.c.content) }}</span>
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
  --dm-lanes: 4; /* keep in sync with LANES in the script */
  --dm-lane-h: 32px;
  --dm-lane-gap: 8px;
  height: calc(var(--dm-lanes) * var(--dm-lane-h) + (var(--dm-lanes) - 1) * var(--dm-lane-gap));
}

.recent-comments__item {
  position: absolute;
  left: 0;
  top: calc(var(--lane, 0) * (var(--dm-lane-h) + var(--dm-lane-gap)));
  height: var(--dm-lane-h);
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  /* fit the content exactly — names are never ellipsized and the comment text
     is bounded by characters in JS, so the pill just grows wider. max-content
     is required: an absolutely-positioned auto width would be capped at the
     track's width instead */
  width: max-content;
  /* asymmetric: the avatar hugs the left edge a little */
  padding: 0 var(--spacing-md) 0 var(--spacing-sm);
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

.recent-comments__avatar {
  width: 22px;
  height: 22px;
  border-radius: var(--rounded-full);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-primary);
  color: var(--color-white);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
}
.recent-comments__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.recent-comments__nick {
  color: var(--color-primary);
  font-weight: var(--weight-medium);
}
.recent-comments__handle {
  /* same size as the reply-target @text — inherits --text-sm from the item */
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}
.recent-comments__reply {
  color: var(--color-text-secondary);
}
.recent-comments__sep {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}
.recent-comments__text {
  min-width: 0;
}

@keyframes comment-fly {
  from { transform: translateX(100cqw); }
  to { transform: translateX(-100%); }
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
    width: auto;
    max-width: 100%;
    animation: none;
  }
}
</style>

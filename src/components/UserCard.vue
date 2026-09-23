<script setup>
import { ref, reactive, onMounted, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useLocaleStore } from '@/stores/locale'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { useError } from '@/composables/useError'
import SvgIcon from '@/components/SvgIcon.vue'
import { formatActiveTime } from '@/utils/format'
import { userAPI } from '@/api'

const { t } = useI18n()
const localeStore = useLocaleStore()
const { getMessage } = useError()
const { confirm } = useConfirm()
const { toast } = useToast()
const auth = useAuthStore()

const props = defineProps({
  user: { type: Object, required: true },
  admin: { type: Boolean, default: false }
})

const emit = defineEmits(['update:user', 'delete:user'])

const router = useRouter()

const activeOuterRef = ref(null)
const activeInnerRef = ref(null)
const activeOverflow = ref(false)
const activeDistance = ref(0)

function checkActiveOverflow() {
  const inner = activeInnerRef.value
  const outer = activeOuterRef.value
  if (!inner || !outer) {
    activeOverflow.value = false
    return
  }
  const iw = inner.scrollWidth
  const ow = outer.clientWidth
  activeOverflow.value = iw > ow
  activeDistance.value = Math.max(iw - ow, 0)
}

onMounted(() => nextTick(checkActiveOverflow))
watch(() => props.user, () => nextTick(checkActiveOverflow))
watch(() => localeStore.locale, () => nextTick(checkActiveOverflow))

function goDetail() {
  crossLeave()
  router.push(`/members/${props.user.id}`)
}

// ── Sniper crosshair on hover (member cards): full-screen lines lock onto the avatar ──
const cardEl = ref(null)
const cross = reactive({ on: false, x: 0, y: 0, nav: 0, foot: 0, rotH: 0, rotV: 0, segs: [], ringRot: 0, ringArcs: [] })

// must match the CSS cross-sway keyframes (±5deg) and the svg circle below
const SWAY_DEG = 5
const RING_R = 38
const RING_GAP_DEG = 18 // gap at each line/ring contact (covers sway + line width)
// each line sways on its own clock (duration + phase) so the two never rotate
// in lockstep; both halves of one line must share the same sway values
const SWAY_H = { dur: 2.7, del: 0 }
const SWAY_V = { dur: 3.6, del: -1.2 }

// half chord of the line through the pivot against the band edges (slab clip),
// taking the max over the sway range so no edge gaps open while the lines wobble
function chordLens(deg, px, py, W, H) {
  let fwd = 0
  let back = 0
  for (const a of [deg - SWAY_DEG, deg, deg + SWAY_DEG]) {
    const rad = a * Math.PI / 180
    const ux = Math.cos(rad)
    const uy = Math.sin(rad)
    let sEnter = -Infinity
    let sExit = Infinity
    if (ux !== 0) {
      const s1 = (0 - px) / ux
      const s2 = (W - px) / ux
      sEnter = Math.max(sEnter, Math.min(s1, s2))
      sExit = Math.min(sExit, Math.max(s1, s2))
    }
    if (uy !== 0) {
      const s1 = (0 - py) / uy
      const s2 = (H - py) / uy
      sEnter = Math.max(sEnter, Math.min(s1, s2))
      sExit = Math.min(sExit, Math.max(s1, s2))
    }
    fwd = Math.max(fwd, sExit)
    back = Math.max(back, -sEnter)
  }
  return { fwd: Math.ceil(fwd) + 4, back: Math.ceil(back) + 4 }
}

// split a rotated line at the avatar pivot into two half-segments whose far
// ends land on the band edge
function segsFor(deg, px, py, W, H, sway) {
  const { fwd, back } = chordLens(deg, px, py, W, H)
  return [
    { rot: deg, len: fwd, ...sway },
    { rot: deg + 180, len: back, ...sway }
  ]
}

// ring drawn as four arcs with gaps where the lines cross it (svg angles use the
// same clockwise-positive convention as CSS rotate)
function ringArcPaths() {
  const cx = 40
  const cy = 40
  const r = RING_R
  const half = RING_GAP_DEG / 2
  const contacts = [cross.rotH, cross.rotV, cross.rotH + 180, cross.rotV + 180]
    .map(a => ((a - cross.ringRot) % 360 + 360) % 360)
    .sort((p, q) => p - q)
  const pt = (deg) => {
    const rad = deg * Math.PI / 180
    return `${(cx + r * Math.cos(rad)).toFixed(2)} ${(cy + r * Math.sin(rad)).toFixed(2)}`
  }
  cross.ringArcs = contacts.map((c, i) => {
    const a1 = c + half
    const a2 = contacts[(i + 1) % 4] - half + (i === 3 ? 360 : 0)
    return `M ${pt(a1)} A ${r} ${r} 0 0 1 ${pt(a2)}`
  })
}

function syncCross() {
  const avatar = cardEl.value?.querySelector('.user-card__avatar, .user-card__avatar-placeholder')
  if (!avatar) return
  const nav = document.querySelector('.navbar')
  const foot = document.querySelector('.footer')
  cross.nav = nav ? Math.round(nav.getBoundingClientRect().height) : 0
  const footTop = foot
    ? Math.min(Math.round(foot.getBoundingClientRect().top), window.innerHeight)
    : window.innerHeight
  cross.foot = Math.max(footTop, cross.nav)
  const r = avatar.getBoundingClientRect()
  cross.x = Math.round(r.left + r.width / 2)
  // keep the pivot inside the navbar–footer band
  cross.y = Math.round(Math.min(Math.max(r.top + r.height / 2, cross.nav + 4), cross.foot - 4))
  const W = window.innerWidth
  const H = cross.foot - cross.nav
  cross.segs = [
    ...segsFor(cross.rotH, cross.x, cross.y - cross.nav, W, H, SWAY_H),
    ...segsFor(cross.rotV, cross.x, cross.y - cross.nav, W, H, SWAY_V)
  ]
  cross.ringRot = cross.rotH - RING_GAP_DEG / 2
  ringArcPaths()
}

function crossEnter() {
  if (props.admin || !window.matchMedia('(hover: hover)').matches) return
  // fresh random tilt for each lock-on (full 0–360°; the base separation is
  // 55–125° so the angle between the lines stays ≥45° even when both sway ±5°)
  cross.rotH = Math.random() * 360
  const sep = 55 + Math.random() * 70
  cross.rotV = cross.rotH + (Math.random() < 0.5 ? sep : -sep)
  syncCross()
  cross.on = true
  window.addEventListener('scroll', syncCross, { passive: true })
  window.addEventListener('resize', syncCross)
}

function crossLeave() {
  cross.on = false
  window.removeEventListener('scroll', syncCross)
  window.removeEventListener('resize', syncCross)
}

onBeforeUnmount(crossLeave)

async function toggleStatus() {
  try {
    const next = props.user.status === 1 ? 0 : 1
    await userAPI.updateStatus(props.user.id, next)
    emit('update:user', { ...props.user, status: next })
  } catch (err) {
    if (err?.response?.status !== 401) toast(getMessage(err, 'common.failed'), 'error')
  }
}

async function handleDelete() {
  if (!await confirm(t('profile.deleteAccountConfirm'))) return
  try {
    await userAPI.deleteUser(props.user.id)
    emit('delete:user', props.user.id)
  } catch (err) {
    if (err?.response?.status !== 401) toast(getMessage(err, 'common.failed'), 'error')
  }
}
</script>

<template>
  <div ref="cardEl" class="user-card" :class="{ 'spin-edge': admin }" @click="goDetail" @mouseenter="crossEnter" @mouseleave="crossLeave">
    <img
      v-if="user.avatar"
      :src="user.avatar"
      class="user-card__avatar"
      alt=""
    />
    <span v-else class="user-card__avatar-placeholder">
      {{ (user.nickname || 'U')[0].toUpperCase() }}
    </span>
    <div class="user-card__info">
      <h4 class="user-card__name">
        <span class="user-card__name-text">{{ user.nickname }}</span>
        <span v-if="user.gender !== null && user.gender !== undefined" class="user-card__pronouns">{{ user.gender === 0 ? t('user.heHim') : t('user.sheHer') }}</span>
        <span v-if="user.status === 0" class="user-card__disabled-tag">{{ t('user.disabled') }}</span>
      </h4>
      <div class="user-card__title-wrap">
        <div class="user-card__title-inner">
          <span v-if="user.title" class="user-card__title">{{ user.title }}</span>
          <span v-else class="user-card__title">&nbsp;</span>
          <span ref="activeOuterRef" class="user-card__active" :class="{ 'user-card__active--scroll': activeOverflow }">
            <span
                ref="activeInnerRef"
                class="user-card__active-inner"
                :style="activeOverflow ? { '--distance': activeDistance + 'px' } : null"
            >{{ t('user.lastActive') }}: {{ formatActiveTime(user.activeAt) }}</span>
          </span>
        </div>
      </div>
    </div>
    <div v-if="auth.isAdmin" class="user-card__actions">
      <button class="user-card__btn" @click.stop="toggleStatus" :title="user.status === 1 ? 'Disable' : 'Enable'">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line v-if="user.status === 0" x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
          <path v-else d="m9 12 2 2 4-4"/>
        </svg>
      </button>
      <button class="user-card__btn user-card__btn--danger" @click.stop="handleDelete" title="Delete user">
        <SvgIcon name="trash" :size="14" />
      </button>
    </div>
  </div>

  <!-- into .page-content so the overlay shares its stacking context and can
       sit under the z-160 avatar/search instead of over the whole page unit -->
  <Teleport v-if="cross.on" to="main.page-content">
    <div
      class="user-crosshair user-crosshair--on"
      :style="{
        '--cross-x': cross.x + 'px',
        '--cross-y': (cross.y - cross.nav) + 'px',
        '--cross-nav': cross.nav + 'px',
        '--cross-h': (cross.foot - cross.nav) + 'px'
      }"
      aria-hidden="true"
    >
      <span
        v-for="(seg, i) in cross.segs"
        :key="i"
        class="user-crosshair__seg"
        :style="{ '--rot': seg.rot + 'deg', '--seg-len': seg.len + 'px', '--sway-dur': seg.dur + 's', '--sway-del': seg.del + 's' }"
      ><span class="user-crosshair__seg-bar"></span></span>
      <span class="user-crosshair__ring">
        <svg class="user-crosshair__ring-svg" viewBox="0 0 80 80" :style="{ '--rot': cross.ringRot + 'deg' }">
          <path v-for="(d, i) in cross.ringArcs" :key="i" :d="d" class="user-crosshair__ring-arc" />
        </svg>
      </span>
    </div>
  </Teleport>
</template>

<style scoped>
.user-card {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
  padding: var(--spacing-lg);
  cursor: pointer;
}

.user-card__avatar {
  width: 56px;
  height: 56px;
  border-radius: var(--rounded-full);
  object-fit: cover;
  border: 2px solid var(--color-border);
  flex-shrink: 0;
}

.user-card__avatar-placeholder {
  width: 56px;
  height: 56px;
  border-radius: var(--rounded-full);
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xl);
  font-weight: var(--weight-medium);
  flex-shrink: 0;
}

/* above the crosshair overlay (z 150) so lines never cover the avatar */
.user-card__avatar,
.user-card__avatar-placeholder {
  position: relative;
  z-index: 160;
}

.user-card__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.user-card__name {
  font-size: var(--text-base);
  font-weight: var(--weight-medium);
  color: var(--color-text-heading);
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  min-width: 0;
}

.user-card__name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-card__pronouns {
  font-size: var(--text-xs);
  font-weight: var(--weight-normal);
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.user-card__disabled-tag {
  font-size: var(--text-xs);
  color: var(--color-danger);
  background: var(--color-danger-bg);
  padding: 1px 6px;
  border-radius: var(--rounded-full);
  flex-shrink: 0;
  white-space: nowrap;
}

.user-card__title-wrap {
  overflow: hidden;
  height: 1.25em;
  font-size: var(--text-sm);
}
.user-card__title-inner {
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
}
.user-card:hover .user-card__title-inner {
  transform: translateY(-50%);
}
.user-card__title,
.user-card__active {
  font-size: var(--text-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 0;
  line-height: 1.25em;
}
.user-card__title {
  color: var(--color-text-secondary);
}
.user-card__active {
  color: var(--color-text-secondary);
}
.user-card__active-inner {
  display: inline-block;
  white-space: nowrap;
}
.user-card:hover .user-card__active--scroll .user-card__active-inner {
  animation: user-card-marquee 8s linear infinite;
}
@keyframes user-card-marquee {
  0%, 20% { transform: translateX(0); }
  40% { transform: translateX(calc(-1 * var(--distance))); }
  60% { transform: translateX(calc(-1 * var(--distance))); }
  80%, 100% { transform: translateX(0); }
}

.user-card__actions {
  display: flex;
  gap: var(--spacing-xs);
  flex-shrink: 0;
  margin-left: auto;
}

.user-card__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--rounded-sm);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
  z-index: 1;
}
.user-card__btn:hover {
  color: var(--color-text-heading);
  background: var(--color-bg-alt);
}
.user-card__btn--danger:hover {
  color: var(--color-danger);
  background: var(--color-danger-bg);
}

/* sniper crosshair (teleported to body): the container is clipped to the
   navbar–footer band so the lines never cover either of them */
.user-crosshair {
  position: fixed;
  top: var(--cross-nav);
  left: 0;
  right: 0;
  height: var(--cross-h);
  z-index: 150;
  pointer-events: none;
  overflow: hidden;
  opacity: 0;
  transition: opacity var(--transition-fast);
}
.user-crosshair--on { opacity: 0.1; }
/* one half-line per side: the wrapper pivots on the avatar, the bar draws in
   from the screen edge toward the avatar center */
.user-crosshair__seg {
  position: absolute;
  top: calc(var(--cross-y) - 1px);
  left: var(--cross-x);
  height: 2px;
  width: var(--seg-len);
  transform: rotate(var(--rot));
  transform-origin: 0 50%;
}
.user-crosshair__seg-bar {
  display: block;
  width: 100%;
  height: 100%;
  background: #ec66a6;
  transform: scaleX(1);
  transform-origin: 100% 50%;
}
[data-theme="dark"] .user-crosshair__seg-bar {
  background: #2952cc;
}
.user-crosshair__ring {
  position: absolute;
  width: 80px;
  height: 80px;
  top: var(--cross-y);
  left: var(--cross-x);
  transform: translate(-50%, -50%);
}
.user-crosshair__ring-svg {
  display: block;
  width: 100%;
  height: 100%;
  transform: rotate(var(--rot));
}
.user-crosshair__ring-arc {
  fill: none;
  stroke: #ec66a6;
  stroke-width: 2;
}
[data-theme="dark"] .user-crosshair__ring-arc {
  stroke: #2952cc;
}
/* on hover the lines draw in from the screen edges to the avatar center */
.user-crosshair--on .user-crosshair__seg-bar { animation: cross-seg-draw 0.35s ease-out both; }
.user-crosshair--on .user-crosshair__ring { animation: cross-ring-in 0.35s ease-out; }
@keyframes cross-seg-draw { from { transform: scaleX(0); } }
@keyframes cross-ring-in {
  from { transform: translate(-50%, -50%) scale(0.3); opacity: 0; }
}
/* once shown, each line keeps swaying ±SWAY_DEG around the avatar on its own
   clock (duration + phase per line — never in lockstep). The ring stays put:
   its gaps are wide enough to cover each line's sway. */
.user-crosshair--on .user-crosshair__seg {
  animation: cross-sway var(--sway-dur, 3s) ease-in-out infinite alternate;
  animation-delay: var(--sway-del, 0s);
}
@keyframes cross-sway {
  from { transform: rotate(calc(var(--rot) - 5deg)); }
  to { transform: rotate(calc(var(--rot) + 5deg)); }
}
</style>

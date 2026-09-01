<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { useToast } from '@/composables/useToast'
import { useAuthStore } from '@/stores/auth'
import { useConfig } from '@/composables/useConfig'
import { useConfirm } from '@/composables/useConfirm'
import { repoAPI, fileAPI, commentAPI, requestAPI } from '@/api'
import { formatDate, relativeDate } from '@/utils/format'
import MediaViewer from '@/components/MediaViewer.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import LikeButton from '@/components/LikeButton.vue'
import ShareButton from '@/components/ShareButton.vue'
import FabContainer from '@/components/FabContainer.vue'
import CommentSection from '@/components/CommentSection.vue'
import Pagination from '@/components/Pagination.vue'
import SvgIcon from '@/components/SvgIcon.vue'
import UserSelect from '@/components/UserSelect.vue'
import UploadProgress from '@/components/UploadProgress.vue'
import SliderSelect from '@/components/SliderSelect.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { getMessage } = useError()
const { toast } = useToast()
const { confirm } = useConfirm()
const auth = useAuthStore()
const { load: loadConfig, get: getConfig } = useConfig()
const origin = location.origin
const repo = ref(null)
const shareUrl = computed(() => repo.value ? `${origin}${route.path}` : '')

const relUpdate = computed(() => {
  const r = repo.value
  if (!r?.updatedAt || r.updatedAt === r.createdAt) return null
  return relativeDate(r.updatedAt)
})

function agoUnitLabel(unit, value) {
  const base = { min: 'common.minAgo', hour: 'common.hourAgo', day: 'common.dayAgo', month: 'common.monthAgo', year: 'common.yearAgo' }[unit]
  return t(value === 1 ? base + '1' : base)
}
const loading = ref(true)
const loadingDone = ref(false)
const likeLiked = ref(false)
const likeCount = ref(0)

const comments = ref([])
const commentPage = ref(1)
const commentPages = ref(1)
const commentTotal = ref(0)
const commentSize = ref(10)

// ── Transfer modal ──
const settingsOpen = ref(false)
const transferOverlayDown = ref(false)
const transferId = ref(null)
const transferring = ref(false)
const transferError = ref('')
const transferConfirming = ref(false)

function onTransferOverlayClick() {
  if (!transferOverlayDown.value) return
  transferOverlayDown.value = false
  settingsOpen.value = false
}

function openSettings() {
  transferId.value = null
  transferError.value = ''
  transferConfirming.value = false
  settingsOpen.value = true
}

async function sendTransfer() {
  if (!transferConfirming.value) {
    transferConfirming.value = true
    return
  }
  if (transferId.value == null) {
    transferError.value = t('repo.transferIdInvalid')
    return
  }
  if (transferId.value === auth.user?.id) {
    transferError.value = t('repo.transferSelf')
    return
  }
  transferring.value = true
  try {
    await requestAPI.create(transferId.value, 'REPO_TRANSFER', JSON.stringify({ repo: repo.value.id }))
    toast(t('repo.transferSuccess'), 'success')
    settingsOpen.value = false
  } catch (err) {
    toast(getMessage(err, 'repo.transferFailed'), 'error')
  } finally {
    transferring.value = false
  }
}

// ── Items pagination (load more pattern) ──
let itemsVersion = 0
const itemsPage = ref(1)
const itemsPages = ref(1)
const itemsTotal = ref(0)
const itemsRemaining = computed(() => Math.max(0, itemsTotal.value - (repo.value?.items?.length || 0)))
const itemsLoadingMore = ref(false)
const itemsSize = parseInt(getConfig('page_size', '10'))

async function fetchItems(page) {
  const version = ++itemsVersion
  const res = await repoAPI.getItems(route.params.id, page, itemsSize)
  if (version !== itemsVersion) return
  const data = res.data.data
  if (page === 1) {
    repo.value.items = data.records || []
  } else {
    repo.value.items = [...(repo.value.items || []), ...(data.records || [])]
  }
  itemsPage.value = data.page || page
  itemsPages.value = data.pages || 1
  itemsTotal.value = data.total || 0
}

async function loadMoreItems() {
  if (itemsLoadingMore.value || itemsPage.value >= itemsPages.value) return
  itemsLoadingMore.value = true
  try {
    await fetchItems(itemsPage.value + 1)
  } catch { /* ignore */ } finally {
    itemsLoadingMore.value = false
  }
}

async function fetchRepo() {
  itemsVersion++
  loading.value = true
  loadingDone.value = false
  try {
    const res = await repoAPI.getDetail(route.params.id)
    repo.value = res.data.data
    likeLiked.value = repo.value.isLiked || false
    likeCount.value = repo.value.likeCount || 0
    const [cRes, iRes] = await Promise.all([
      commentAPI.getRepo(route.params.id, commentPage.value, commentSize.value),
      !repo.value.restricted && repo.value.type !== 0 ? repoAPI.getItems(route.params.id, 1, itemsSize) : Promise.resolve(null)
    ])
    if (iRes) {
      const data = iRes.data.data
      repo.value.items = data.records || []
      itemsPage.value = data.page || 1
      itemsPages.value = data.pages || 1
      itemsTotal.value = data.total || 0
    } else {
      repo.value.items = []
    }
    comments.value = cRes.data.data.records || []
    commentPages.value = cRes.data.data.pages || 1
    commentTotal.value = cRes.data.data.total || 0
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

function onWindowResize() {
  updateGridCols()
  nextTick(updateColWidth)
}

onMounted(async () => {
  await loadConfig()
  fetchRepo()
  updateGridCols()
  window.addEventListener('resize', onWindowResize)
})
onBeforeUnmount(() => window.removeEventListener('resize', onWindowResize))
watch(() => route.params.id, fetchRepo)
watch(loadingDone, (done) => { if (done) nextTick(updateColWidth) })
watch(() => repo.value?.items?.length, () => nextTick(updateColWidth))

watch(likeLiked, (liked) => {
  if (!repo.value || !auth.user) return
  if (!repo.value.recentLikers) repo.value.recentLikers = []
  const likers = repo.value.recentLikers
  if (liked) {
    if (!likers.some(l => l.userId === auth.user.id)) {
      likers.unshift({
        userId: auth.user.id,
        avatar: auth.user.avatar,
        nickname: auth.user.nickname
      })
    }
  } else {
    const idx = likers.findIndex(l => l.userId === auth.user.id)
    if (idx !== -1) likers.splice(idx, 1)
  }
})

function typeLabel(type) {
  const map = { 0: t('repo.code'), 1: t('repo.media'), 2: t('repo.file') }
  return map[type] || ''
}

const isOwner = () => auth.user?.id === repo.value?.userId
const canEdit = () => isOwner() || auth.isAdmin

// ── Media viewer ──
const viewerSrc = ref('')
const viewerVisible = ref(false)
const mediaLoaded = ref({})
function onMediaLoad(id, e) {
  mediaLoaded.value[id] = true
  if (e?.target?.naturalWidth) {
    mediaRatio.value[id] = e.target.naturalWidth / e.target.naturalHeight
  }
}
function onVideoMeta(id, e) {
  const target = e.target
  target.currentTime = 1
  if (target.videoWidth) {
    mediaRatio.value[id] = target.videoWidth / target.videoHeight
  }
}
function previewItem(url) {
  viewerSrc.value = url
  viewerVisible.value = true
}

function formatSize(bytes) {
  if (!bytes) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i++ }
  return size.toFixed(i > 0 ? 1 : 0) + ' ' + units[i]
}

function mediaType(url) {
  if (!url) return 'other'
  const ext = url.split('.').pop().toLowerCase()
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'aac', 'flac'].includes(ext)) return 'audio'
  return 'image'
}

// ── Delete ──
async function deleteRepo() {
  if (!await confirm(t('repo.deleteConfirm'))) return
  try {
    await repoAPI.delete(repo.value.id)
    toast(t('common.deleted'), 'success')
    router.push('/repos')
  } catch { /* ignore */ }
}

async function handleComment({ content, parentId }) {
  try {
    await commentAPI.addRepo(route.params.id, { content, parentId })
    await fetchComments()
  } catch (err) {
    if (err?.response?.status !== 401) toast(getMessage(err, 'comment.postFailed'), 'error')
  }
}

async function handleDeleteComment(commentId) {
  if (!await confirm(t('comment.deleteConfirm'))) return
  try {
    await commentAPI.delete(commentId)
    await fetchComments()
  } catch (err) {
    if (err?.response?.status !== 401) toast(getMessage(err, 'comment.deleteFailed'), 'error')
  }
}

async function fetchComments() {
  const { data } = await commentAPI.getRepo(route.params.id, commentPage.value, commentSize.value)
  comments.value = data.data.records || []
  commentPages.value = data.data.pages || 1
  commentTotal.value = data.data.total || 0
}

function onCommentPageChange(p) {
  commentPage.value = p
  fetchComments()
}

// ── Access request ──
async function requestAccess() {
  if (!await confirm(t('repo.requestAccessConfirm'))) return
  try {
    await repoAPI.requestAccess(repo.value.id)
    toast(t('repo.requestAccessSent'), 'success')
  } catch (err) {
    toast(getMessage(err, 'common.failed'), 'error')
  }
}

// ── Items upload ──
const uploading = ref(false)
const uploadState = ref({
  total: 0,
  uploaded: 0,
  currentProgress: 0
})

async function handleItemFiles(e) {
  const files = e.target.files
  if (!files.length) return
  uploading.value = true
  uploadState.value = { total: files.length, uploaded: 0, currentProgress: 0 }
  try {
    for (let i = 0; i < files.length; i++) {
      uploadState.value.currentFile = i + 1
      uploadState.value.currentProgress = 0
      const { data: fileData } = await fileAPI.upload(files[i], null, null, (e) => {
        if (e.total) {
          uploadState.value.currentProgress = Math.round((e.loaded / e.total) * 100)
        }
      })
      const { data: itemData } = await repoAPI.addItem(repo.value.id, { fileId: fileData.data.id, name: files[i].name })
      itemsTotal.value += 1
      itemsPages.value = Math.ceil(itemsTotal.value / itemsSize)
      if (itemsPage.value * itemsSize >= itemsTotal.value) {
        repo.value.items = [...(repo.value.items || []), itemData.data]
      }
      uploadState.value.uploaded = i + 1
    }
  } catch (err) {
    toast(getMessage(err, 'common.uploadFailed'), 'error')
  } finally {
    try { await alignItemsTail() } catch { /* ignore */ }
    uploading.value = false
    e.target.value = ''
    uploadState.value = { total: 0, uploaded: 0, currentProgress: 0 }
  }
}

async function deleteItem(itemId) {
  try {
    await repoAPI.deleteItem(repo.value.id, itemId)
    itemsVersion++
    repo.value.items = repo.value.items.filter(i => i.id !== itemId)
    itemsTotal.value = Math.max(0, itemsTotal.value - 1)
    itemsPages.value = Math.ceil(itemsTotal.value / itemsSize)
    await alignItemsTail()
  } catch (err) {
    toast(getMessage(err, 'common.failed'), 'error')
  }
}

async function alignItemsTail() {
  const items = repo.value.items || []
  const page = Math.min(itemsPage.value, Math.max(itemsPages.value, 1))
  if (page <= 0) return
  const version = ++itemsVersion
  const res = await repoAPI.getItems(route.params.id, page, itemsSize)
  if (version !== itemsVersion) return
  const data = res.data.data
  itemsPage.value = data.page || page
  itemsPages.value = data.pages || 1
  itemsTotal.value = data.total || 0
  const prefix = (page - 1) * itemsSize
  repo.value.items = [...items.slice(0, prefix), ...(data.records || [])]
}

// ── Media grid (waterfall: items placed into the column keeping max height minimal) ──
const GRID_GAP = 12
const CUBE_H = 200
const FALLBACK_IMG_H = 200
const MEDIA_BLOCK_H = 120

const gridCols = ref(4)
const gridEl = ref(null)
const colWidth = ref(0)
const colGap = ref(GRID_GAP)
const mediaRatio = ref({})

function updateGridCols() {
  const w = window.innerWidth
  gridCols.value = w >= 1280 ? 4 : w >= 960 ? 3 : w >= 640 ? 2 : 1
}

function updateColWidth() {
  const el = gridEl.value
  if (!el || el.clientWidth === 0) return
  const gap = parseFloat(getComputedStyle(el).columnGap) || GRID_GAP
  colGap.value = gap
  const w = (el.clientWidth - gap * (gridCols.value - 1)) / gridCols.value
  if (w !== colWidth.value) colWidth.value = w
}

function cardHeight(item) {
  if (item.__loadMore) return CUBE_H
  const type = mediaType(item.url)
  const ratio = mediaRatio.value[item.id]
  if (ratio && colWidth.value > 0) {
    const h = colWidth.value / ratio
    return type === 'video' ? Math.max(MEDIA_BLOCK_H, h) : h
  }
  if (type === 'video' || type === 'audio') return MEDIA_BLOCK_H
  return FALLBACK_IMG_H
}

function bestColumn(heights) {
  let best = 0
  for (let c = 1; c < heights.length; c++) {
    if (heights[c] < heights[best]) best = c
  }
  return best
}

const itemColumns = computed(() => {
  const n = gridCols.value
  const cols = Array.from({ length: n }, () => [])
  const heights = Array(n).fill(0)
  for (const item of repo.value?.items || []) {
    const add = cardHeight(item) + colGap.value
    const c = bestColumn(heights)
    cols[c].push(item)
    heights[c] += add
  }
  if (itemsPage.value < itemsPages.value) {
    cols[bestColumn(heights)].push({ __loadMore: true })
  }
  return cols
})

// ── Drag sort ──
let dragId = null

function onDragStart(id, e) {
  dragId = id
  e.dataTransfer.effectAllowed = 'move'
  const el = e.currentTarget
  const rect = el.getBoundingClientRect()
  const clone = el.cloneNode(true)
  clone.style.cssText = `position:absolute;top:-9999px;width:${rect.width}px;opacity:0.85;border-radius:6px;overflow:hidden;`
  clone.querySelectorAll('.item-card__handle, .item-card__delete, .item-card__name, .item-row__handle, .item-row__delete').forEach(c => c.remove())
  document.body.appendChild(clone)
  e.dataTransfer.setDragImage(clone, 20, 20)
  requestAnimationFrame(() => document.body.removeChild(clone))
}

function onDragOver(id, e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}

async function onDrop(id, e) {
  e.preventDefault()
  if (dragId === null || dragId === id) return
  const from = repo.value.items.findIndex(i => i.id === dragId)
  const to = repo.value.items.findIndex(i => i.id === id)
  if (from === -1 || to === -1) return
  const dragged = repo.value.items[from]
  const target = repo.value.items[to]
  const items = [...repo.value.items]
  items[from] = target
  items[to] = dragged
  const oldItems = repo.value.items
  repo.value.items = items
  try {
    await repoAPI.swapItems(repo.value.id, dragged.id, target.id)
  } catch (err) {
    repo.value.items = oldItems
    toast(getMessage(err, 'common.failed'), 'error')
  }
  dragId = null
}

// ── Edit modal ──
const showEdit = ref(false)
const overlayDown = ref(false)
const editForm = ref({ name: '', description: '', type: 0, url: '', tags: '', coverImage: '' })
const editError = ref('')
const saving = ref(false)
const editCoverFile = ref(null)
const editCoverPreview = ref('')

const visibilityOptions = computed(() => [
  { value: 0, label: t('visibility.pub'), icon: 'world' },
  { value: 1, label: t('visibility.pvt'), icon: 'lock' },
  { value: 2, label: t('visibility.restr'), icon: 'key', color: '#d97706' }
])

function openEdit() {
  editForm.value = {
    name: repo.value.name || '',
    description: repo.value.description || '',
    type: repo.value.type ?? 0,
    url: repo.value.url || '',
    tags: repo.value.tags?.join(', ') || '',
    coverImage: repo.value.isDefaultCover ? '' : (repo.value.coverImage || ''),
    visibility: repo.value.visibility ?? 0
  }
  editCoverFile.value = null
  editCoverPreview.value = ''
  editError.value = ''
  showEdit.value = true
}

function handleEditCover(e) {
  const file = e.target.files[0]
  if (!file) return
  editCoverFile.value = file
  editCoverPreview.value = URL.createObjectURL(file)
}

function removeEditCover() {
  editCoverFile.value = null
  editCoverPreview.value = ''
  editForm.value.coverImage = ''
}

async function saveEdit() {
  editError.value = ''
  if (!editForm.value.name.trim()) {
    editError.value = t('auth.required')
    return
  }
  saving.value = true
  try {
    if (editCoverFile.value) {
      const { data } = await fileAPI.upload(editCoverFile.value)
      editForm.value.coverImage = data.data.url
    }
    const tags = editForm.value.tags
        ? editForm.value.tags.split(',').map(s => s.trim()).filter(Boolean)
        : []
    const res = await repoAPI.update(repo.value.id, {
      name: editForm.value.name.trim(),
      description: editForm.value.description.trim(),
      url: editForm.value.url.trim() || null,
      tags: tags.length > 0 ? tags : null,
      coverImage: editForm.value.coverImage,
      visibility: editForm.value.visibility
    })
    repo.value = res.data.data
    if (!repo.value.restricted && repo.value.type !== 0) {
      await fetchItems(1)
    }
    showEdit.value = false
    toast(t('common.updated'), 'success')
  } catch (err) {
    editError.value = getMessage(err, 'common.failed')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="repo-detail">
    <div v-if="loadingDone && repo && !repo.restricted && repo.coverImage" class="repo-cover-banner" :style="{ backgroundImage: `url(${repo.coverImage})` }">
      <div class="repo-cover-banner__overlay"></div>
    </div>
    <div class="container">
      <LoadingSpinner :visible="loading" @done="loadingDone = true" />
      <template v-if="loadingDone && repo">
        <div class="repo-header">
          <span class="type-badge" :class="{ 'type-badge--code': repo.type === 0, 'type-badge--media': repo.type === 1, 'type-badge--file': repo.type === 2 }">{{ typeLabel(repo.type) }}</span>
          <span v-if="repo.visibility === 1" class="visibility-badge">{{ t('visibility.private') }}</span>
          <span v-if="repo.visibility === 2" class="visibility-badge visibility-badge--restricted">{{ repo.restricted ? `${t('visibility.restricted')} · ${t('visibility.unauthorized')}` : `${t('visibility.restricted')} · ${t(auth.isAdmin ? 'visibility.admin' : 'visibility.authorized')}` }}</span>
          <h1 class="repo-title">{{ repo.name }}</h1>

          <div class="repo-meta">
            <router-link :to="`/members/${repo.userId}`" class="repo-author">
              <img v-if="repo.userAvatar" :src="repo.userAvatar" class="author-avatar" alt="" />
              <span v-else class="author-avatar-placeholder">{{ (repo.userNickname || 'U')[0] }}</span>
              <span class="author-nickname">{{ repo.userNickname }}</span>
            </router-link>
            <div class="repo-meta__right">
              <span class="repo-date">{{ formatDate(repo.createdAt) }}<template v-if="relUpdate"> · {{ t('repo.updated') }} {{ relUpdate.value }} {{ agoUnitLabel(relUpdate.unit, relUpdate.value) }}</template></span>
              <span class="repo-views">
                {{ repo.viewCount || 0 }} {{ t('repo.views') }}
              </span>
              <div v-if="canEdit()" class="repo-actions">
                <button class="link-muted" @click="openEdit">
                  <SvgIcon name="edit" />
                  {{ t('common.edit') }}
                </button>
                <button class="link-danger" @click="deleteRepo">
                  <SvgIcon name="trash" />
                  {{ t('common.delete') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="repo.restricted" class="repo-access-bar">
          <p class="repo-access-bar__msg">
            <SvgIcon name="lock" /> {{ t('repo.restrictedHint') }}
          </p>
          <button v-if="auth.isLoggedIn && !isOwner()" class="btn btn--restricted" @click="requestAccess">
            <SvgIcon name="key" /> {{ t('repo.requestAccess') }}
          </button>
        </div>
        <div v-if="!repo.restricted && repo.description" class="repo-desc">{{ repo.description }}</div>

        <div v-if="!repo.restricted && repo.tags?.length" class="repo-tags">
          <span v-for="tag in repo.tags" :key="tag" class="repo-tag">{{ tag }}</span>
        </div>

        <!-- CODE type → external link + GitHub info -->
        <template v-if="!repo.restricted && repo.type === 0">
          <a v-if="repo.url" :href="repo.url" target="_blank" rel="noopener" class="repo-url">
            <div class="repo-url__left">
              <SvgIcon name="fork" :size="16" />
              <span>{{ repo.url }}</span>
            </div>
            <div v-if="repo.github" class="repo-url__stats">
              <span v-if="repo.github.language" class="github-lang">{{ repo.github.language }}</span>
              <span class="github-stat"><SvgIcon name="star" />{{ repo.github.stars || 0 }}</span>
              <span class="github-stat"><SvgIcon name="fork" />{{ repo.github.forks || 0 }}</span>
            </div>
            <div v-if="repo.github?.description" class="github-desc">
              <SvgIcon name="chevron-right" :size="12" />
              <span>{{ repo.github.description }}</span>
            </div>
          </a>
          <div v-if="repo.github?.commits?.length" class="commits-timeline">
            <div v-for="(c, i) in repo.github.commits" :key="c.sha" class="commit-item">
              <div class="commit-dot-line">
                <div class="commit-dot"></div>
                <div v-if="i < repo.github.commits.length - 1" class="commit-line"></div>
              </div>
              <div class="commit-body">
                <span class="commit-msg">{{ c.message }}</span>
                <div class="commit-meta">
                  <img v-if="c.authorAvatar" :src="c.authorAvatar" class="commit-avatar" />
                  <span class="commit-author">{{ c.author }}</span>
                  <span class="commit-date">{{ formatDate(c.date) }}</span>
                  <span class="commit-sha"><SvgIcon name="git-commit" :size="12" /> {{ c.sha }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- MEDIA → grid -->
        <template v-else-if="!repo.restricted && repo.type === 1">
          <p v-if="!repo.items?.length" class="empty-state">{{ t('repo.emptyItems') }}</p>
          <div v-else ref="gridEl" class="items-grid" :style="{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }">
            <div v-for="(column, ci) in itemColumns" :key="ci" class="items-grid__col">
              <template v-for="(item, index) in column" :key="item.__loadMore ? '__load-more' : item.id">
                <button v-if="item.__loadMore" class="load-more-cube" @click="loadMoreItems" :disabled="itemsLoadingMore">
                  <span v-if="itemsLoadingMore" class="load-more-cube__spinner"></span>
                  <template v-else>
                    <SvgIcon name="chevron-down" :size="20" />
                    <span>{{ t('common.loadMore') }}</span>
                    <span class="load-more-cube__remaining">{{ t('repo.itemsRemaining', { count: itemsRemaining }) }}</span>
                  </template>
                </button>
                <div v-else class="item-card"
                     :class="{ 'item-card--pending': mediaType(item.url) === 'image' && !mediaLoaded[item.id] }"
                     :draggable="canEdit()"
                     @dragstart="canEdit() && onDragStart(item.id, $event)"
                     @dragover="canEdit() && onDragOver(item.id, $event)"
                     @drop="canEdit() && onDrop(item.id, $event)">
                  <div class="item-card__handle">
                    <SvgIcon v-if="canEdit()" name="drag" />
                    <SvgIcon v-else name="chevron-right" />
                  </div>
                  <img v-if="mediaType(item.url) === 'image'" :src="item.thumb" class="item-card__thumb" loading="lazy"
                       @load="onMediaLoad(item.id, $event)" @error="onMediaLoad(item.id, $event)" @click="previewItem(item.url)" />
                  <div v-else-if="mediaType(item.url) === 'video'" class="item-card__video" @click="previewItem(item.url)">
                    <video :src="item.url" preload="metadata" @loadedmetadata="onVideoMeta(item.id, $event)"></video>
                    <div class="item-card__play-icon">
                      <SvgIcon name="play" :size="24" />
                    </div>
                  </div>
                  <div v-else-if="mediaType(item.url) === 'audio'" class="item-card__audio" @click="previewItem(item.url)">
                    <SvgIcon name="audio" :size="24" />
                  </div>
                  <span class="item-card__name">{{ item.name }}</span>
                  <button v-if="canEdit()" class="item-card__delete" @click.stop="deleteItem(item.id)">
                    <SvgIcon name="close" :size="10" />
                  </button>
                </div>
              </template>
            </div>
          </div>
        </template>

        <!-- FILE → list -->
        <template v-else-if="!repo.restricted">
          <p v-if="!repo.items?.length" class="empty-state">{{ t('repo.emptyItems') }}</p>
          <div v-else class="items-list">
            <div v-for="(item, index) in repo.items" :key="item.id" class="item-row"
                 :draggable="canEdit()"
                 @dragstart="canEdit() && onDragStart(item.id, $event)"
                 @dragover="canEdit() && onDragOver(item.id, $event)"
                 @drop="canEdit() && onDrop(item.id, $event)">
              <div class="item-row__handle">
                <SvgIcon v-if="canEdit()" name="drag" />
                <SvgIcon v-else name="chevron-right" />
              </div>
              <div class="item-row__icon">
                <SvgIcon name="package" :size="20" />
              </div>
              <div class="item-row__info">
                <span class="item-row__name">{{ item.name }}</span>
                <span class="item-row__size" v-if="item.fileSize">{{ formatSize(item.fileSize) }}</span>
              </div>
              <div class="item-row__actions">
                <a v-if="item.url" :href="item.url" class="item-row__download" :download="item.name" :title="t('common.download')">
                  <SvgIcon name="download" :size="16" />
                </a>
                <button v-if="canEdit()" class="item-row__delete" @click="deleteItem(item.id)">
                  <SvgIcon name="trash" />
                </button>
              </div>
            </div>
            <button v-if="itemsPage < itemsPages" class="item-row item-row--load-more" @click="loadMoreItems" :disabled="itemsLoadingMore">
              <span v-if="itemsLoadingMore" class="load-more-cube__spinner"></span>
              <template v-else>
                <SvgIcon name="chevron-down" :size="16" />
                <span>{{ t('common.loadMore') }}</span>
                <span class="load-more-cube__remaining">{{ t('repo.itemsRemaining', { count: itemsRemaining }) }}</span>
              </template>
            </button>
          </div>
        </template>

        <div class="detail__actions-bar">
          <div class="detail__actions-left">
            <LikeButton
                :targetType="4"
                :targetId="repo.id"
                :liked="likeLiked"
                :count="likeCount"
                @update:liked="likeLiked = $event"
                @update:count="likeCount = $event"
            />
            <div v-if="repo.recentLikers?.length" class="recent-likers">
              <router-link
                  v-for="liker in repo.recentLikers"
                  :key="liker.userId"
                  :to="`/members/${liker.userId}`"
                  class="recent-liker-link"
              >
                <img v-if="liker.avatar" :src="liker.avatar" class="recent-liker-avatar" alt="" />
                <span v-else class="recent-liker-avatar recent-liker-placeholder">{{ (liker.nickname || 'U')[0] }}</span>
              </router-link>
            </div>
          </div>
          <div class="detail__actions-right">
            <ShareButton
                :title="`${t('repo.pageTitleSingle')} | ${repo.name} | ${repo.userNickname}`"
                :text="repo.description || ''"
                :url="shareUrl"
                :image="repo.coverImage || ''"
            />
            <UploadProgress
                v-if="uploadState.total > 0"
                :total="uploadState.total"
                :uploaded="uploadState.uploaded"
                :current-progress="uploadState.currentProgress"
            />
          </div>
        </div>
        <CommentSection
            :comments="comments"
            :target-id="route.params.id"
            target-type="repo"
            :total="commentTotal"
            @submit="handleComment"
            @delete="handleDeleteComment"
        />
        <Pagination :page="commentPage" :pages="commentPages" :total="commentTotal" :size="commentSize" @change="onCommentPageChange" />
      </template>

      <!-- Edit modal -->
      <Teleport to="body">
        <Transition name="modal">
          <div v-if="showEdit" class="modal-overlay" @mousedown.self="overlayDown = true" @click="overlayDown && (overlayDown = false, showEdit = false)">
            <div class="modal">
              <h3 class="modal__title">{{ t('common.edit') }}</h3>
              <div class="fields">
                <div class="field">
                  <label class="field__label">{{ t('repo.name') }} <span class="field__required">*</span></label>
                  <input v-model="editForm.name" class="field__input" maxlength="255" />
                </div>
                <div class="field">
                  <div class="cover-label-row">
                    <label class="field__label">{{ t('article.cover') }}</label>
                    <label class="btn btn--outline btn--sm">
                      <SvgIcon name="upload" />
                      {{ t('article.upload') }}
                      <input type="file" accept="image/*" class="hidden-input" @change="handleEditCover" />
                    </label>
                  </div>
                  <div v-if="editCoverPreview || (editForm.coverImage && !repo.isDefaultCover)" class="cover-preview-wrap">
                    <img :src="editCoverPreview || editForm.coverImage" class="cover-preview" />
                    <button class="cover-preview-remove" @click="removeEditCover">&times;</button>
                  </div>
                </div>
                <div class="field" v-if="repo.type === 0">
                  <label class="field__label">{{ t('repo.url') }}</label>
                  <input v-model="editForm.url" class="field__input" />
                  <span class="field__hint">{{ t('repo.urlHint') }}</span>
                </div>
                <div class="field">
                  <label class="field__label">{{ t('repo.description') }}</label>
                  <textarea v-model="editForm.description" class="field__input field__textarea" rows="2" />
                </div>
                <div class="field">
                  <label class="field__label">{{ t('repo.tags') }}</label>
                  <input v-model="editForm.tags" class="field__input" />
                  <span class="field__hint">{{ t('repo.tagsHint') }}</span>
                </div>
                <div class="field">
                  <div class="cover-label-row">
                    <label class="field__label">{{ t('article.visibility') }}</label>
                    <SliderSelect
                      fill
                      :model-value="editForm.visibility"
                      :options="visibilityOptions"
                      @update:model-value="v => editForm.visibility = v"
                    />
                  </div>
                </div>
              </div>
              <p v-if="editError" class="msg msg--error">{{ editError }}</p>
              <div class="modal__actions">
                <button class="btn btn--outline btn--full" @click="showEdit = false">{{ t('common.cancel') }}</button>
                <button class="btn btn--primary btn--full" :disabled="saving" @click="saveEdit">
                  {{ saving ? t('common.saving') : t('common.save') }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>

      <MediaViewer :src="viewerSrc" :visible="viewerVisible" @close="viewerVisible = false" />

    </div>
  </div>

  <FabContainer>
    <label v-if="repo && !repo.restricted && isOwner() && repo.type !== 0" class="upload-fab" :title="t('article.upload')">
      <SvgIcon name="upload" :size="20" />
      <input :accept="repo.type === 1 ? 'image/*,video/*,audio/*' : '*/*'" type="file" multiple class="hidden-input" @change="handleItemFiles" />
    </label>

    <div class="like-fab">
      <LikeButton
          :targetType="4"
          :targetId="Number(route.params.id)"
          :liked="likeLiked"
          :count="likeCount"
          @update:liked="likeLiked = $event"
          @update:count="likeCount = $event"
      />
    </div>

    <button v-if="repo && isOwner()" class="pin-fab pin-fab--settings" :title="t('user.setting')" @click="openSettings">
      <SvgIcon name="settings" :size="20" />
    </button>

    <button class="back-fab" :title="t('common.goBack')" @click="$router.back()">
      <SvgIcon name="back-arrow" :size="20" />
    </button>
  </FabContainer>

  <Teleport to="body">
    <Transition name="modal">
      <div v-if="settingsOpen" class="modal-overlay" @mousedown.self="transferOverlayDown = true" @click="onTransferOverlayClick">
        <div class="modal">
          <h3 class="modal__title">
            <span>{{ t('user.setting') }}</span>
            <button class="modal__close" @click="settingsOpen = false">
              <SvgIcon name="close" :size="16" />
            </button>
          </h3>
          <div class="setting-block">
            <h4 class="setting-block__title">{{ t('repo.transferTitle') }}</h4>
            <p class="setting-block__desc">{{ t('repo.transferDesc') }}</p>
            <template v-if="transferConfirming">
              <UserSelect
                v-model="transferId"
                class="setting-block__input"
                :placeholder="t('repo.transferIdPlaceholder')"
              />
              <p v-if="transferError" class="setting-block__error">{{ transferError }}</p>
              <p class="setting-block__confirm">{{ t('repo.transferConfirm') }}</p>
              <div class="setting-block__actions">
                <button class="btn btn--outline setting-block__btn" :disabled="transferring" @click="transferConfirming = false">{{ t('common.cancel') }}</button>
                <button class="btn btn--primary setting-block__btn" :disabled="transferring" @click="sendTransfer">
                  <SvgIcon name="fork" :size="16" />
                  {{ t('common.confirm') }}
                </button>
              </div>
            </template>
            <button v-else class="btn btn--primary btn--full setting-block__btn" @click="sendTransfer">
              <SvgIcon name="fork" :size="16" />
              {{ t('repo.transferSend') }}
            </button>
          </div>
          <div class="setting-block setting-block--empty">
            <p class="setting-block__desc setting-block__desc--center">{{ t('user.moreComing') }}</p>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.repo-detail { padding-bottom: var(--spacing-4xl); }

.repo-header { padding-top: var(--spacing-2xl); margin-bottom: var(--spacing-2xl); }
.type-badge { display: inline-block; font-size: var(--text-xs); padding: 2px 10px; border-radius: var(--rounded-full); font-weight: var(--weight-medium); margin-bottom: var(--spacing-sm); margin-right: var(--spacing-sm); }
.type-badge--code { color: #16a34a; background: rgba(22, 163, 74, 0.1); }
.type-badge--media { color: #db2777; background: rgba(219, 39, 119, 0.1); }
.type-badge--file { color: #2563eb; background: rgba(37, 99, 235, 0.1); }
.visibility-badge { display: inline-block; font-size: var(--text-xs); color: var(--color-text-secondary); background: var(--color-bg-alt); padding: 2px 10px; border-radius: var(--rounded-full); font-weight: var(--weight-medium); margin-bottom: var(--spacing-sm); }
.repo-title { font-size: var(--text-4xl); margin-bottom: var(--spacing-lg); line-height: 1.3; }

.repo-meta { display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-lg); font-size: var(--text-sm); color: var(--color-text-secondary); flex-wrap: wrap; }
.repo-meta__right { display: flex; align-items: center; gap: var(--spacing-md); }
.repo-author { display: flex; align-items: center; gap: var(--spacing-sm); text-decoration: none; color: inherit; font-size: var(--text-base); }
.author-avatar { width: 44px; height: 44px; border-radius: var(--rounded-full); object-fit: cover; border: 2px solid var(--color-border); }
.author-avatar-placeholder { width: 44px; height: 44px; border-radius: var(--rounded-full); background: var(--color-primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: var(--weight-medium); }
.author-nickname { font-weight: var(--weight-medium); color: var(--color-text-heading); }
.repo-date { font-family: var(--font-mono); }

.repo-actions { display: flex; gap: var(--spacing-sm); align-items: center; }

.repo-cover-banner { height: 300px; background-size: cover; background-position: center; position: relative; }
.repo-cover-banner__overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(255,255,255,0) 30%, var(--color-bg) 100%); }

.repo-access-bar { margin-bottom: var(--spacing-xl); padding: var(--spacing-lg); background: rgba(217,119,6,0.08); border: 1px solid rgba(217,119,6,0.25); border-radius: var(--rounded-lg); display: flex; align-items: center; justify-content: space-between; gap: var(--spacing-md); }
.repo-access-bar__msg { font-size: var(--text-sm); color: #d97706; display: flex; align-items: center; gap: var(--spacing-sm); }
.repo-access-bar__msg svg { flex-shrink: 0; }
.btn--restricted { display: inline-flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-xs) var(--spacing-lg); font-size: var(--text-sm); font-weight: normal; color: #d97706; background: transparent; border: 1px solid #d97706; border-radius: var(--rounded-md); cursor: pointer; transition: all var(--transition-fast); }
.btn--restricted:hover { color: #fff; background: #d97706; }
.repo-desc { font-size: var(--text-base); color: var(--color-text); margin-bottom: var(--spacing-xl); line-height: var(--leading-relaxed); white-space: pre-line; }


.detail__actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--spacing-md);
  margin-top: var(--spacing-2xl);
  margin-bottom: var(--spacing-2xl);
  flex-wrap: wrap;
}
.detail__actions-left { display: flex; align-items: center; gap: var(--spacing-md); }
.detail__actions-right { display: flex; align-items: center; gap: var(--spacing-md); }
.recent-likers { display: flex; align-items: center; }
.recent-liker-link { display: flex; line-height: 0; }
.recent-liker-link + .recent-liker-link { margin-left: -8px; }
.recent-liker-avatar {
  width: 28px;
  height: 28px;
  border-radius: var(--rounded-full);
  object-fit: cover;
  border: 2px solid var(--color-surface);
  cursor: pointer;
}
.recent-liker-avatar:hover { border-color: var(--color-primary-light); }
.recent-liker-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-primary);
  color: white;
  font-size: 10px;
  font-weight: var(--weight-medium);
  object-fit: unset;
}

.repo-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: var(--spacing-xl); }
.repo-tag { padding: 1px var(--spacing-sm); font-size: var(--text-xs); color: var(--color-text-secondary); background: var(--color-bg-alt); border-radius: var(--rounded-full); }

.repo-url { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; padding: var(--spacing-md) var(--spacing-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-md); font-size: var(--text-sm); }
.repo-url:hover { border-color: var(--color-primary); }
.repo-url__left { display: flex; align-items: center; gap: var(--spacing-sm); color: var(--color-primary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.repo-url__left span { overflow: hidden; text-overflow: ellipsis; }
.repo-url__stats { display: flex; align-items: center; gap: var(--spacing-md); flex-shrink: 0; margin-left: auto; }
.repo-url__left + .repo-url__stats { margin-top: var(--spacing-xs); }
.github-lang { font-size: var(--text-xs); color: var(--color-text-secondary); }
.github-stat { display: flex; align-items: center; gap: 4px; font-size: var(--text-xs); color: var(--color-text-secondary); }
.github-desc { width: 100%; font-size: var(--text-xs); color: var(--color-text-secondary); line-height: var(--leading-normal); margin-top: var(--spacing-sm); padding-top: var(--spacing-sm); border-top: 1px solid var(--color-border-light); display: flex; align-items: center; gap: var(--spacing-md); }
.github-desc svg { flex-shrink: 0; }
.github-desc span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.commits-timeline { margin-top: var(--spacing-md); padding: var(--spacing-md) var(--spacing-lg); background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-md); }
.commit-item { display: flex; gap: var(--spacing-md); }
.commit-item + .commit-item { margin-top: var(--spacing-sm); }
.commit-dot-line { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; width: 12px; }
.commit-dot { width: 10px; height: 10px; border-radius: var(--rounded-full); background: var(--color-primary); flex-shrink: 0; margin-top: 4px; }
.commit-line { width: 2px; flex: 1; background: var(--color-border); min-height: 16px; margin-top: var(--spacing-md); }
.commit-body { flex: 1; min-width: 0; }
.commit-msg { font-size: var(--text-sm); color: var(--color-text); display: block; margin-bottom: var(--spacing-xs); }
.commit-meta { display: flex; align-items: center; gap: var(--spacing-sm); margin-top: 2px; font-size: var(--text-xs); color: var(--color-text-tertiary); }
.commit-avatar { width: 14px; height: 14px; border-radius: var(--rounded-full); }
.commit-author { font-weight: var(--weight-medium); }
.commit-date { color: var(--color-text-tertiary); }
.commit-sha { font-family: var(--font-mono); margin-left: auto; display: inline-flex; align-items: baseline; gap: 8px; }
.commit-sha svg { transform: translateY(2px); }

.items-grid {
  display: grid;
  gap: var(--spacing-md);
}
.items-grid__col {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.upload-fab {
  width: 48px;
  height: 48px;
  border-radius: var(--rounded-full);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.6;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-md);
  cursor: pointer;
}
.upload-fab:hover {
  color: #16a34a;
  border-color: #16a34a;
  transform: translateY(-2px);
  box-shadow: var(--shadow-lg);
  opacity: 1;
}
.hidden-input { display: none; }

.like-fab {
  opacity: 0.85;
  transition: all var(--transition-fast);
}
.like-fab:hover { opacity: 1; }

.item-card {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  overflow: hidden;
  text-align: center;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.item-card:hover { border-color: var(--color-card-hover); transform: scale(1.02); box-shadow: 0 0 0 0.5px var(--color-card-hover); }
.item-card[draggable="true"] { cursor: grab; }
.item-card[draggable="true"]:active { cursor: grabbing; }
.item-card:hover .item-card__handle, .item-card:hover .item-card__delete { opacity: 1; }
.item-card__handle { position: absolute; top: 6px; left: 6px; z-index: 2; color: #fff; display: flex; opacity: 0; transition: opacity var(--transition-fast); text-shadow: 0 1px 3px rgba(0,0,0,0.3); }

.item-card__thumb { width: 100%; height: auto; display: block; }
.item-card--pending { background: var(--color-bg-alt); min-height: 200px; }
.item-card--pending .item-card__thumb { visibility: hidden; }
.item-card--pending::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 28px;
  height: 28px;
  margin: -14px 0 0 -14px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: item-card-spin 0.8s linear infinite;
}
@keyframes item-card-spin { to { transform: rotate(360deg); } }

.load-more-cube {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  width: 100%;
  min-height: 200px;
  padding: var(--spacing-lg);
  background: var(--color-surface);
  border: 1px dashed var(--color-border);
  border-radius: var(--rounded-md);
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  font-family: inherit;
}
.load-more-cube:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  border-style: solid;
  background: var(--color-primary-light);
  transform: scale(1.02);
}
.load-more-cube:disabled { cursor: default; opacity: 0.7; }
.load-more-cube__spinner {
  display: inline-block;
  width: 28px;
  height: 28px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: item-card-spin 0.8s linear infinite;
}
.load-more-cube__remaining { font-size: var(--text-xs); color: inherit; }

.item-row--load-more {
  justify-content: center;
  gap: var(--spacing-sm);
  min-height: 40px;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  font-family: inherit;
  cursor: pointer;
}
.item-row--load-more:hover { padding-left: var(--spacing-lg); color: var(--color-primary); }
.item-row--load-more:disabled { cursor: default; opacity: 0.7; }
.item-row--load-more .load-more-cube__spinner { width: 18px; height: 18px; }
.item-card__video { position: relative; background: #000; overflow: hidden; display: flex; align-items: center; justify-content: center; min-height: 120px; }
.item-card__video video { width: 100%; height: auto; display: block; opacity: 0.7; }
.item-card__play-icon { position: absolute; width: 40px; height: 40px; border-radius: var(--rounded-full); background: rgba(255,255,255,0.25); display: flex; align-items: center; justify-content: center; color: white; }
.item-card__play-icon svg { margin-left: 3px; }
.item-card__audio { min-height: 120px; background: var(--color-bg-alt); display: flex; align-items: center; justify-content: center; color: var(--color-text-secondary); }
.item-card__file-icon { min-height: 120px; display: flex; align-items: center; justify-content: center; color: var(--color-text-tertiary); background: var(--color-bg-alt); }
.item-card__name { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); font-size: 11px; color: #fff; padding: 0 6px; max-width: calc(100% - 60px); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; opacity: 0; transition: opacity var(--transition-fast); z-index: 1; text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
.item-card:hover .item-card__name { opacity: 1; }

.item-card__delete { position: absolute; top: 6px; right: 6px; width: 20px; height: 20px; border-radius: var(--rounded-full); color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity var(--transition-fast), background var(--transition-fast); text-shadow: 0 1px 3px rgba(0,0,0,0.3); }
.item-card__delete:hover { background: rgba(231, 76, 60, 0.7); }

/* ── File list ── */
.items-list { display: flex; flex-direction: column; border-top: 1px solid var(--color-border); }
.item-row { display: flex; align-items: center; gap: var(--spacing-md); padding: var(--spacing-sm) var(--spacing-lg); padding-left: var(--spacing-lg); border-bottom: 1px solid var(--color-border); transition: background var(--transition-fast), padding-left var(--transition-fast); position: relative; }
.item-row:hover { background: var(--color-bg-alt); padding-left: calc(var(--spacing-lg) + 20px); }
.item-row[draggable="true"] { cursor: grab; }
.item-row__icon { flex-shrink: 0; color: var(--color-text-tertiary); display: flex; }
.item-row__handle { position: absolute; left: var(--spacing-md); color: var(--color-text-tertiary); display: flex; opacity: 0; transition: opacity var(--transition-fast); }
.item-row:hover .item-row__handle { opacity: 0.6; }
.item-row__info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.item-row__name { font-size: var(--text-sm); color: var(--color-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item-row__size { font-size: var(--text-xs); color: var(--color-text-tertiary); }
.item-row__actions { display: flex; align-items: center; gap: var(--spacing-md); flex-shrink: 0; }
.item-row__download, .item-row__delete { display: flex; align-items: center; color: var(--color-text-secondary); padding: var(--spacing-xs); border-radius: var(--rounded-md); transition: all var(--transition-fast); }
.item-row__download:hover { color: var(--color-primary); background: var(--color-primary-light); }
.item-row__delete:hover { color: var(--color-danger); background: rgba(229,83,75,0.08); }

/* ── Modal ── */
.modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; padding: var(--spacing-xl); }
.modal { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); max-width: 480px; width: 100%; padding: var(--spacing-2xl); }
.modal__title { display: flex; align-items: center; justify-content: space-between; font-size: var(--text-lg); margin-bottom: var(--spacing-xl); }
.modal__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  border-radius: var(--rounded-full);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast), background var(--transition-fast);
}
.modal__close:hover { color: var(--color-text-heading); background: var(--color-bg-alt); }
.modal .fields { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.modal .field__textarea { min-height: 60px; }
.modal .field__hint { font-size: var(--text-xs); color: var(--color-text-secondary); margin-top: 2px; }
.modal .msg { margin-top: var(--spacing-lg); }
.modal__actions { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-xl); padding-top: var(--spacing-lg); border-top: 1px solid var(--color-border-light); }
.modal .cover-label-row { display: flex; justify-content: space-between; align-items: center; gap: var(--spacing-2xl); }
.modal .cover-label-row .field__label { flex-shrink: 0; }
.modal .cover-preview-wrap { position: relative; display: inline-block; margin-top: var(--spacing-sm); }
.modal .cover-preview { max-width: 200px; max-height: 120px; object-fit: contain; border-radius: var(--rounded-md); border: 1px solid var(--color-border); background: var(--color-bg-alt); display: block; }
.modal .cover-preview-remove { position: absolute; top: 4px; right: 4px; width: 24px; height: 24px; border-radius: var(--rounded-full); background: var(--color-bg); border: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: 14px; line-height: 1; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.modal .cover-preview-remove:hover { background: #e74c3c; color: #fff; border-color: #e74c3c; }
.modal .hidden-input { display: none; }

.modal-enter-active, .modal-leave-active { transition: opacity .2s ease; }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform .2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: scale(0.95); }

/* ── Settings modal ── */
.pin-fab--settings:hover {
  border-color: #ca8a04;
  color: #ca8a04;
}
.setting-block {
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-md);
}
.setting-block:last-child { margin-bottom: 0; }
.setting-block__title { font-size: var(--text-sm); font-weight: var(--weight-medium); color: var(--color-text-heading); margin-bottom: var(--spacing-xs); }
.setting-block__desc { font-size: var(--text-xs); color: var(--color-text-secondary); line-height: 1.6; margin-bottom: var(--spacing-md); }
.setting-block__input { width: 100%; margin-bottom: var(--spacing-sm); }
.setting-block__error { font-size: var(--text-xs); color: var(--color-danger); margin-bottom: var(--spacing-sm); }
.setting-block__confirm { font-size: var(--text-xs); color: var(--color-text-secondary); margin-bottom: var(--spacing-sm); }
.setting-block__actions { display: flex; gap: var(--spacing-sm); justify-content: flex-end; }
.setting-block__btn { font-size: var(--text-xs); padding: var(--spacing-xs) var(--spacing-lg); }
.setting-block--empty {
  border-style: dashed;
  min-height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.setting-block__desc--center { margin-bottom: 0; text-align: center; }
</style>

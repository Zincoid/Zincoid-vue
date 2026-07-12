<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { useAuthStore } from '@/stores/auth'
import { repoAPI, fileAPI } from '@/api'
import { formatDate } from '@/utils/format'
import MediaViewer from '@/components/MediaViewer.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SvgIcon from '@/components/SvgIcon.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { getMessage } = useError()
const auth = useAuthStore()
const repo = ref(null)
const loading = ref(true)
const loadingDone = ref(false)

async function fetchRepo() {
  loading.value = true
  loadingDone.value = false
  try {
    const res = await repoAPI.getDetail(route.params.id)
    repo.value = res.data.data
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

onMounted(fetchRepo)
watch(() => route.params.id, fetchRepo)

function typeLabel(type) {
  const map = { 0: t('repo.code'), 1: t('repo.media'), 2: t('repo.file') }
  return map[type] || ''
}

const isOwner = () => auth.user?.id === repo.value?.userId
const canEdit = () => isOwner() || auth.isAdmin

// ── Media viewer ──
const viewerSrc = ref('')
const viewerVisible = ref(false)
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
  if (!confirm(t('repo.deleteConfirm'))) return
  try {
    await repoAPI.delete(repo.value.id)
    router.push('/repos')
  } catch { /* ignore */ }
}

// ── Access request ──
async function requestAccess() {
  if (!confirm(t('repo.requestAccessConfirm'))) return
  try {
    await repoAPI.requestAccess(repo.value.id)
    alert(t('repo.requestAccessSent'))
  } catch (err) {
    alert(getMessage(err, 'common.failed'))
  }
}

// ── Items upload ──
const uploading = ref(false)

async function handleItemFiles(e) {
  const files = e.target.files
  if (!files.length) return
  uploading.value = true
  try {
    for (const file of files) {
      const { data: fileData } = await fileAPI.upload(file)
      const { data: itemData } = await repoAPI.addItem(repo.value.id, { fileId: fileData.data.id, name: file.name })
      repo.value.items = [...(repo.value.items || []), itemData.data]
    }
  } catch { /* ignore */ } finally {
    uploading.value = false
    e.target.value = ''
  }
}

const itemError = ref('')

async function deleteItem(itemId) {
  itemError.value = ''
  try {
    await repoAPI.deleteItem(repo.value.id, itemId)
    repo.value.items = repo.value.items.filter(i => i.id !== itemId)
  } catch (err) {
    itemError.value = getMessage(err, 'common.failed')
    setTimeout(() => itemError.value = '', 4000)
  }
}

// ── Drag sort ──
let dragIndex = null

function onDragStart(index, e) {
  dragIndex = index
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

function onDragOver(index, e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'move'
}

async function onDrop(index, e) {
  e.preventDefault()
  if (dragIndex === null || dragIndex === index) return
  const items = [...repo.value.items]
  const dragged = items.splice(dragIndex, 1)[0]
  items.splice(index, 0, dragged)
  const oldItems = repo.value.items
  repo.value.items = items
  try {
    await repoAPI.sortItems(repo.value.id, items.map(i => i.id))
  } catch {
    repo.value.items = oldItems
  }
  dragIndex = null
}

// ── Edit modal ──
const showEdit = ref(false)
const editForm = ref({ name: '', description: '', type: 0, url: '', tags: '', coverImage: '' })
const editError = ref('')
const saving = ref(false)
const editCoverFile = ref(null)
const editCoverPreview = ref('')

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
    showEdit.value = false
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
        <span v-if="repo.visibility === 2" class="visibility-badge visibility-badge--restricted">{{ t('visibility.restricted') }}</span>
        <h1 class="repo-title">{{ repo.name }}</h1>

        <div class="repo-meta">
          <router-link :to="`/members/${repo.userId}`" class="repo-author">
            <img v-if="repo.userAvatar" :src="repo.userAvatar" class="author-avatar" alt="" />
            <span v-else class="author-avatar-placeholder">{{ (repo.userNickname || 'U')[0] }}</span>
            <span class="author-nickname">{{ repo.userNickname }}</span>
          </router-link>
          <div class="repo-meta__right">
            <span class="repo-date">{{ formatDate(repo.createdAt) }}</span>
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
        <p v-if="itemError" class="msg msg--error">{{ itemError }}</p>
        <p v-if="!repo.items?.length" class="empty-state">{{ t('repo.emptyItems') }}</p>
        <div v-else class="items-grid">
          <div v-for="(item, index) in repo.items" :key="item.id" class="item-card"
            :draggable="canEdit()"
            @dragstart="canEdit() && onDragStart(index, $event)"
            @dragover="canEdit() && onDragOver(index, $event)"
            @drop="canEdit() && onDrop(index, $event)">
            <div class="item-card__handle">
              <SvgIcon v-if="canEdit()" name="drag" />
              <SvgIcon v-else name="chevron-right" />
            </div>
            <img v-if="mediaType(item.url) === 'image'" :src="item.url" class="item-card__thumb" loading="lazy" @click="previewItem(item.url)" />
            <div v-else-if="mediaType(item.url) === 'video'" class="item-card__video" @click="previewItem(item.url)">
              <video :src="item.url" preload="metadata" @loadedmetadata="(e) => e.target.currentTime = 1"></video>
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
        </div>
      </template>

      <!-- FILE → list -->
      <template v-else-if="!repo.restricted">
        <p v-if="itemError" class="msg msg--error">{{ itemError }}</p>
        <p v-if="!repo.items?.length" class="empty-state">{{ t('repo.emptyItems') }}</p>
        <div v-else class="items-list">
          <div v-for="(item, index) in repo.items" :key="item.id" class="item-row"
            :draggable="canEdit()"
            @dragstart="canEdit() && onDragStart(index, $event)"
            @dragover="canEdit() && onDragOver(index, $event)"
            @drop="canEdit() && onDrop(index, $event)">
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
        </div>
      </template>
    </template>

    <!-- Edit modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showEdit" class="modal-overlay" @click.self="showEdit = false">
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
                  <div class="visibility-slide">
                    <div class="visibility-slide__indicator" :style="{ left: editForm.visibility === 0 ? '3px' : editForm.visibility === 1 ? 'calc(33.33% + 3px)' : 'calc(66.66% + 3px)' }"></div>
                    <button class="visibility-slide-btn" :class="{ 'visibility-slide-btn--active': editForm.visibility === 0 }" @click="editForm.visibility = 0" type="button">
                      <SvgIcon name="world" :size="12" />{{ t('visibility.pub') }}
                    </button>
                    <button class="visibility-slide-btn" :class="{ 'visibility-slide-btn--active': editForm.visibility === 1 }" @click="editForm.visibility = 1" type="button">
                      <SvgIcon name="lock" :size="12" />{{ t('visibility.pvt') }}
                    </button>
                    <button class="visibility-slide-btn visibility-slide-btn--restricted" :class="{ 'visibility-slide-btn--active': editForm.visibility === 2 }" @click="editForm.visibility = 2" type="button">
                      <SvgIcon name="key" :size="12" />{{ t('visibility.restr') }}
                    </button>
                  </div>
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

    <label v-if="repo && !repo.restricted && isOwner() && repo.type !== 0" class="upload-fab" :title="t('article.upload')">
      <SvgIcon name="upload" :size="20" />
      <input :accept="repo.type === 1 ? 'image/*,video/*,audio/*' : '*/*'" type="file" multiple class="hidden-input" @change="handleItemFiles" />
    </label>

    <button class="back-fab" :title="t('common.goBack')" @click="$router.back()">
      <SvgIcon name="back-arrow" :size="20" />
    </button>
    </div>
  </div>
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
.btn--restricted { display: inline-flex; align-items: center; gap: var(--spacing-sm); padding: var(--spacing-xs) var(--spacing-lg); font-size: var(--text-xs); font-weight: var(--weight-medium); color: #d97706; background: transparent; border: 1px solid #d97706; border-radius: var(--rounded-md); cursor: pointer; transition: all var(--transition-fast); }
.btn--restricted:hover { color: #fff; background: #d97706; }
.repo-desc { font-size: var(--text-base); color: var(--color-text); margin-bottom: var(--spacing-xl); line-height: var(--leading-relaxed); }

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
  columns: 4 200px;
  gap: var(--spacing-md);
}
.items-grid > * {
  break-inside: avoid;
  margin-bottom: var(--spacing-md);
}

.upload-fab {
  position: fixed;
  right: var(--spacing-4xl);
  bottom: 140px;
  width: 48px;
  height: 48px;
  border-radius: var(--rounded-full);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
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
@media (max-width: 768px) {
  .upload-fab { bottom: 140px; }
}
.hidden-input { display: none; }

.item-card {
  position: relative;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  overflow: hidden;
  text-align: center;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.item-card:hover { border-color: #f9a8d4; transform: scale(1.02); box-shadow: 0 0 0 0.5px #f9a8d4; }
.item-card[draggable="true"] { cursor: grab; }
.item-card[draggable="true"]:active { cursor: grabbing; }
.item-card:hover .item-card__handle, .item-card:hover .item-card__delete { opacity: 1; }
.item-card__handle { position: absolute; top: 6px; left: 6px; z-index: 2; color: #fff; display: flex; opacity: 0; transition: opacity var(--transition-fast); text-shadow: 0 1px 3px rgba(0,0,0,0.3); }

.item-card__thumb { width: 100%; height: auto; display: block; }
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
.modal__title { font-size: var(--text-lg); margin-bottom: var(--spacing-xl); }
.modal .fields { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.modal .field__textarea { min-height: 60px; }
.modal .field__hint { font-size: var(--text-xs); color: var(--color-text-secondary); margin-top: 2px; }
.modal .msg { margin-top: var(--spacing-lg); }
.modal__actions { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-xl); padding-top: var(--spacing-lg); border-top: 1px solid var(--color-border-light); }
.visibility-slide { display: flex; flex: 1; border: 1px solid var(--color-border); border-radius: var(--rounded-md); overflow: hidden; position: relative; background: var(--color-surface); }
.visibility-slide__indicator { position: absolute; top: 3px; width: calc(33.33% - 6px); height: calc(100% - 6px); background: var(--color-primary-light); border-radius: calc(var(--rounded-md) - 1px); transition: left 0.2s ease; left: 3px; }
.visibility-slide-btn { display: inline-flex; align-items: center; justify-content: center; gap: 3px; padding: var(--spacing-xs) var(--spacing-sm); font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--color-text-secondary); background: transparent; border: none; cursor: pointer; transition: color var(--transition-fast); white-space: nowrap; position: relative; z-index: 1; flex: 1 1 0; }
.visibility-slide-btn--active { color: var(--color-primary); }
.visibility-slide-btn--restricted.visibility-slide-btn--active { color: #d97706; }
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
</style>

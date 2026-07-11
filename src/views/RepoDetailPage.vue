<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useAuthStore } from '@/stores/auth'
import { repoAPI, fileAPI } from '@/api'
import { formatDate } from '@/utils/format'
import LoadingSpinner from '@/components/LoadingSpinner.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const auth = useAuthStore()
const repo = ref(null)
const loading = ref(true)
const loadingDone = ref(false)

onMounted(async () => {
  try {
    const res = await repoAPI.getDetail(route.params.id)
    repo.value = res.data.data
  } catch { /* ignore */ } finally {
    loading.value = false
  }
})

function typeLabel(type) {
  const map = { 0: t('repo.code'), 1: t('repo.media'), 2: t('repo.file') }
  return map[type] || ''
}

const isOwner = () => auth.user?.id === repo.value?.userId

// ── Delete ──
async function deleteRepo() {
  if (!confirm(t('common.delete') + '?')) return
  try {
    await repoAPI.delete(repo.value.id)
    router.push('/repos')
  } catch { /* ignore */ }
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
    coverImage: repo.value.coverImage || '',
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
      coverImage: editForm.value.coverImage || null,
      visibility: editForm.value.visibility
    })
    repo.value = res.data.data
    showEdit.value = false
  } catch { /* ignore */ } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="repo-detail container">
    <LoadingSpinner :visible="loading" @done="loadingDone = true" />
    <template v-if="loadingDone && repo">
      <div class="repo-header">
        <span class="type-badge" :class="{ 'type-badge--code': repo.type === 0, 'type-badge--media': repo.type === 1, 'type-badge--file': repo.type === 2 }">{{ typeLabel(repo.type) }}</span>
        <span v-if="repo.visibility === 1" class="visibility-badge">{{ t('visibility.private') }}</span>
        <h1 class="repo-title">{{ repo.name }}</h1>

        <div class="repo-meta">
          <router-link :to="`/members/${repo.userId}`" class="repo-author">
            <img v-if="repo.userAvatar" :src="repo.userAvatar" class="author-avatar" alt="" />
            <span v-else class="author-avatar-placeholder">{{ (repo.userNickname || 'U')[0] }}</span>
            <span class="author-nickname">{{ repo.userNickname }}</span>
          </router-link>
          <div class="repo-meta__right">
            <span class="repo-date">{{ formatDate(repo.createdAt) }}</span>
            <div v-if="isOwner()" class="repo-actions">
              <button class="link-muted" @click="openEdit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                {{ t('common.edit') }}
              </button>
              <button class="link-danger" @click="deleteRepo">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                {{ t('common.delete') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="repo.coverImage" class="repo-cover">
        <img :src="repo.coverImage" alt="" />
      </div>

      <div v-if="repo.description" class="repo-desc">{{ repo.description }}</div>

      <div v-if="repo.tags?.length" class="repo-tags">
        <span v-for="tag in repo.tags" :key="tag" class="repo-tag">{{ tag }}</span>
      </div>

      <!-- CODE type → external link -->
      <template v-if="repo.type === 0">
        <a v-if="repo.url" :href="repo.url" target="_blank" rel="noopener" class="repo-url">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
          {{ repo.url }}
        </a>
      </template>

      <!-- MEDIA / FILE → items grid -->
      <template v-else>
        <p v-if="!repo.items?.length" class="empty-state">{{ t('repo.emptyItems') }}</p>
        <div v-else class="items-grid">
          <div v-for="item in repo.items" :key="item.id" class="item-card">
            <img v-if="item.url" :src="item.url" :alt="item.name" class="item-card__thumb" />
            <div v-else class="item-card__file-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <span class="item-card__name">{{ item.name }}</span>
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
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    {{ t('article.upload') }}
                    <input type="file" accept="image/*" class="hidden-input" @change="handleEditCover" />
                  </label>
                </div>
                <div v-if="editCoverPreview || editForm.coverImage" class="cover-preview-wrap">
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
                  <div class="visibility-toggle">
                  <button class="visibility-btn" :class="{ 'visibility-btn--active': editForm.visibility === 0 }" @click="editForm.visibility = 0" type="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                    {{ t('visibility.public') }}
                  </button>
                  <button class="visibility-btn" :class="{ 'visibility-btn--active': editForm.visibility === 1 }" @click="editForm.visibility = 1" type="button">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    {{ t('visibility.private') }}
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

    <button class="back-fab" :title="t('common.goBack')" @click="$router.back()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
    </button>
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

.repo-cover { margin-bottom: var(--spacing-2xl); border-radius: var(--rounded-lg); overflow: hidden; }
.repo-cover img { width: 100%; }

.repo-desc { font-size: var(--text-base); color: var(--color-text); margin-bottom: var(--spacing-xl); line-height: var(--leading-relaxed); }

.repo-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: var(--spacing-xl); }
.repo-tag { padding: 1px var(--spacing-sm); font-size: var(--text-xs); color: var(--color-text-secondary); background: var(--color-bg-alt); border-radius: var(--rounded-full); }

.repo-url { display: inline-flex; align-items: center; gap: var(--spacing-sm); font-size: var(--text-base); color: var(--color-primary); word-break: break-all; }
.repo-url:hover { text-decoration: underline; }

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: var(--spacing-md);
}

.item-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  overflow: hidden;
  text-align: center;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.item-card:hover { border-color: #f9a8d4; transform: scale(1.02); box-shadow: 0 0 0 0.5px #f9a8d4; }

.item-card__thumb { width: 100%; height: 120px; object-fit: cover; display: block; }
.item-card__file-icon { height: 120px; display: flex; align-items: center; justify-content: center; color: var(--color-text-tertiary); background: var(--color-bg-alt); }
.item-card__name { display: block; padding: var(--spacing-sm); font-size: var(--text-xs); color: var(--color-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ── Modal ── */
.modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; padding: var(--spacing-xl); }
.modal { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); max-width: 480px; width: 100%; padding: var(--spacing-2xl); }
.modal__title { font-size: var(--text-lg); margin-bottom: var(--spacing-xl); }
.modal .fields { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.modal .field__textarea { min-height: 60px; }
.modal .field__hint { font-size: var(--text-xs); color: var(--color-text-secondary); margin-top: 2px; }
.modal .msg { margin-top: var(--spacing-lg); }
.modal__actions { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-xl); padding-top: var(--spacing-lg); border-top: 1px solid var(--color-border-light); }
.modal .visibility-toggle { display: flex; gap: var(--spacing-sm); }
.modal .visibility-btn { display: inline-flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--rounded-md); background: var(--color-surface); color: var(--color-text-secondary); font-size: var(--text-xs); cursor: pointer; transition: all var(--transition-fast); }
.modal .visibility-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.modal .visibility-btn--active { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-light); }
.modal .cover-label-row { display: flex; justify-content: space-between; align-items: center; }
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

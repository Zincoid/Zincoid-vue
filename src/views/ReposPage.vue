<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { useConfig } from '@/composables/useConfig'
import { repoAPI, fileAPI } from '@/api'
import { formatDate } from '@/utils/format'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import RepoCard from '@/components/RepoCard.vue'
import Pagination from '@/components/Pagination.vue'
import SvgIcon from '@/components/SvgIcon.vue'

const { t } = useI18n()
const { getMessage } = useError()
const { load: loadConfig, get: getConfig } = useConfig()

const typeTabs = [
  { key: 'all', value: null, color: '#6b7280' },
  { key: 'code', value: 0, color: '#16a34a' },
  { key: 'media', value: 1, color: '#db2777' },
  { key: 'file', value: 2, color: '#2563eb' }
]

const activeType = ref(null)
const keyword = ref('')
let searchTimer = null
const repos = ref([])
const page = ref(1)
const pages = ref(1)
const total = ref(0)
const pageSize = ref(10)
const loading = ref(true)
const loadingDone = ref(false)

onMounted(async () => {
  await loadConfig()
  pageSize.value = parseInt(getConfig('page_size', '10'))
  fetchRepos()
})

async function fetchRepos() {
  loading.value = true
  loadingDone.value = false
  try {
    const kw = keyword.value.trim() || null
    const res = await repoAPI.getList(page.value, pageSize.value, activeType.value, kw)
    const data = res.data.data
    repos.value = data.records ?? []
    pages.value = data.pages ?? 1
    total.value = data.total ?? 0
  } catch { /* ignore */ } finally {
    loading.value = false
  }
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchRepos()
  }, 300)
}

function switchType(type) {
  activeType.value = type
  page.value = 1
  fetchRepos()
}

function onPageChange(p) {
  page.value = p
  fetchRepos()
}

function typeLabel(type) {
  const tab = typeTabs.find(t => t.value === type)
  return tab ? t(`repo.${tab.key}`) : ''
}

// ── Create modal ──
const showCreate = ref(false)
const createForm = ref({ name: '', description: '', type: null, url: '', tags: '', coverImage: '', visibility: 0 })
const createError = ref('')
const creating = ref(false)
const coverFile = ref(null)
const coverPreview = ref('')

function handleCoverUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  coverFile.value = file
  coverPreview.value = URL.createObjectURL(file)
}

function removeCover() {
  coverFile.value = null
  coverPreview.value = ''
  createForm.value.coverImage = ''
}

async function createRepo() {
  createError.value = ''
  if (!createForm.value.name.trim()) {
    createError.value = t('auth.required')
    return
  }
  if (createForm.value.type == null) {
    createError.value = 'Type is required'
    return
  }
  creating.value = true
  try {
    if (coverFile.value) {
      const { data } = await fileAPI.upload(coverFile.value)
      createForm.value.coverImage = data.data.url
    }
    const tags = createForm.value.tags
      ? createForm.value.tags.split(',').map(s => s.trim()).filter(Boolean)
      : []
    const res = await repoAPI.create({
      name: createForm.value.name.trim(),
      description: createForm.value.description.trim(),
      type: createForm.value.type,
      url: createForm.value.url.trim() || null,
      tags: tags.length > 0 ? tags : null,
      coverImage: createForm.value.coverImage.trim(),
      visibility: createForm.value.visibility
    })
    showCreate.value = false
    createForm.value = { name: '', description: '', type: null, url: '', tags: '', coverImage: '', visibility: 0 }
    coverFile.value = null
    coverPreview.value = ''
    await fetchRepos()
  } catch (err) {
    createError.value = getMessage(err, 'common.failed')
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <div class="repos container">
    <div class="header">
      <div class="page-header">
        <h1 class="page-header__title"># {{ t('repo.pageTitle') }}<span class="cursor">_</span></h1>
        <p class="page-header__subtitle">{{ t('repo.placeholder') }}</p>
      </div>
      <button class="btn btn--primary" @click="showCreate = true">
        <SvgIcon name="plus" />
        {{ t('repo.new') }}
      </button>
    </div>

    <div class="repo-search">
      <input
        v-model="keyword"
        type="text"
        class="field__input repo-search__input"
        :placeholder="t('repo.searchPlaceholder')"
        @input="onSearchInput"
      />
    </div>

    <div class="type-tabs">
      <button
        v-for="tab in typeTabs"
        :key="tab.label"
        class="type-tabs__item"
        :class="{ 'type-tabs__item--active': activeType === tab.value }"
        :style="activeType === tab.value ? { color: tab.color, borderColor: tab.color, background: tab.color + '18' } : {}"
        @click="switchType(tab.value)"
      >{{ t(`repo.${tab.key}`) }}</button>
    </div>

    <LoadingSpinner :visible="loading" @done="loadingDone = true" />
    <template v-if="loadingDone">
      <p v-if="repos.length === 0" class="empty-state">{{ t('repo.empty') }}</p>
      <div v-else class="repo-grid">
        <router-link v-for="repo in repos" :key="repo.id" :to="`/repos/${repo.id}`">
          <RepoCard :repo="repo" />
        </router-link>
      </div>
      <Pagination :page="page" :pages="pages" :total="total" :size="pageSize" @change="onPageChange" />
    </template>

    <!-- Create modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showCreate" class="modal-overlay" @click.self="showCreate = false">
          <div class="modal">
            <h3 class="modal__title">{{ t('repo.new') }}</h3>
            <div class="fields">
              <div class="field">
                <label class="field__label">{{ t('repo.name') }} <span class="field__required">*</span></label>
                <input v-model="createForm.name" class="field__input" maxlength="255" />
              </div>
              <div class="field">
                <label class="field__label">{{ t('repo.type') }} <span class="field__required">*</span></label>
                <div class="radio-group">
                  <label class="radio"><input type="radio" v-model="createForm.type" :value="0" /><span>{{ t('repo.code') }}</span></label>
                  <label class="radio"><input type="radio" v-model="createForm.type" :value="1" /><span>{{ t('repo.media') }}</span></label>
                  <label class="radio"><input type="radio" v-model="createForm.type" :value="2" /><span>{{ t('repo.file') }}</span></label>
                </div>
              </div>
              <div class="field">
                <div class="cover-label-row">
                  <label class="field__label">{{ t('article.cover') }}</label>
                  <label class="btn btn--outline btn--sm">
                    <SvgIcon name="upload" />
                    {{ t('article.upload') }}
                    <input type="file" accept="image/*" class="hidden-input" @change="handleCoverUpload" />
                  </label>
                </div>
                <div v-if="coverPreview || createForm.coverImage" class="cover-preview-wrap">
                  <img :src="coverPreview || createForm.coverImage" class="cover-preview" />
                  <button class="cover-preview-remove" @click="removeCover">&times;</button>
                </div>
              </div>
              <div class="field" v-if="createForm.type === 0">
                <label class="field__label">{{ t('repo.url') }}</label>
                <input v-model="createForm.url" class="field__input" />
                <span class="field__hint">{{ t('repo.urlHint') }}</span>
              </div>
              <div class="field">
                <label class="field__label">{{ t('repo.description') }}</label>
                <textarea v-model="createForm.description" class="field__input field__textarea" rows="2" />
              </div>
              <div class="field">
                <label class="field__label">{{ t('repo.tags') }}</label>
                <input v-model="createForm.tags" class="field__input" />
                <span class="field__hint">{{ t('repo.tagsHint') }}</span>
              </div>
              <div class="field">
                <div class="cover-label-row">
                  <label class="field__label">{{ t('article.visibility') }}</label>
                  <div class="visibility-slide">
                    <div class="visibility-slide__indicator" :style="{ left: createForm.visibility === 0 ? '3px' : createForm.visibility === 1 ? 'calc(33.33% + 3px)' : 'calc(66.66% + 3px)' }"></div>
                    <button class="visibility-slide-btn" :class="{ 'visibility-slide-btn--active': createForm.visibility === 0 }" @click="createForm.visibility = 0" type="button">
                      <SvgIcon name="world" :size="12" />{{ t('visibility.public') }}
                    </button>
                    <button class="visibility-slide-btn" :class="{ 'visibility-slide-btn--active': createForm.visibility === 1 }" @click="createForm.visibility = 1" type="button">
                      <SvgIcon name="lock" :size="12" />{{ t('visibility.private') }}
                    </button>
                    <button class="visibility-slide-btn visibility-slide-btn--restricted" :class="{ 'visibility-slide-btn--active': createForm.visibility === 2 }" @click="createForm.visibility = 2" type="button">
                      <SvgIcon name="key" :size="12" />{{ t('visibility.restricted') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <p v-if="createError" class="msg msg--error">{{ createError }}</p>
            <div class="modal__actions">
              <button class="btn btn--outline btn--full" @click="showCreate = false">{{ t('common.cancel') }}</button>
              <button class="btn btn--primary btn--full" :disabled="creating" @click="createRepo">
                <SvgIcon name="save" />
                {{ creating ? t('common.creating') : t('common.confirm') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.repos { padding-bottom: var(--spacing-4xl); }

.header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-lg); }
.header .page-header { flex: 1; min-width: 0; }
.header .btn { flex-shrink: 0; }

.repo-search { margin-bottom: var(--spacing-xl); }
.repo-search__input { width: 100%; }

.type-tabs {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-2xl);
}

.type-tabs__item {
  padding: var(--spacing-xs) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-full);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.type-tabs__item:hover { color: var(--color-text-heading); border-color: var(--color-text-secondary); }


.repo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: var(--spacing-xl);
}
.repo-grid > * { display: flex; }
.repo-grid > * > * { flex: 1; }

.repo-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  overflow: hidden;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.repo-card:hover {
  border-color: #f9a8d4;
  transform: scale(1.02);
  box-shadow: 0 0 0 0.5px #f9a8d4;
}

.repo-card__cover {
  position: relative;
  height: 160px;
  background: var(--color-bg-alt);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
}
.repo-card__cover img { width: 100%; height: 100%; object-fit: cover; }
.repo-card__cover-placeholder { display: flex; align-items: center; justify-content: center; }

.repo-card__badges { position: absolute; top: var(--spacing-sm); right: var(--spacing-sm); display: flex; gap: 4px; }
.repo-card__type-badge { padding: 2px var(--spacing-sm); font-size: var(--text-xs); font-weight: var(--weight-medium); background: rgba(255, 255, 255, 0.9); border-radius: var(--rounded-full); }
.repo-card__visibility-badge { padding: 2px var(--spacing-sm); font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--color-text-secondary); background: rgba(255, 255, 255, 0.9); border-radius: var(--rounded-full); }
.repo-card__visibility-badge--restricted { color: #d97706; }

.repo-card__body { padding: var(--spacing-lg); }

.repo-card__user { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--spacing-sm); }
.repo-card__user-left { display: flex; align-items: center; gap: var(--spacing-xs); }
.repo-card__avatar { width: 20px; height: 20px; border-radius: var(--rounded-full); object-fit: cover; }
.repo-card__avatar-placeholder { width: 20px; height: 20px; border-radius: var(--rounded-full); background: var(--color-primary); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 10px; }
.repo-card__nickname { font-size: var(--text-xs); color: var(--color-text-secondary); }
.repo-card__date { font-size: var(--text-xs); color: var(--color-text-tertiary); font-family: var(--font-mono); }

.repo-card__name {
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  margin-bottom: var(--spacing-sm);
}

.repo-card__desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: var(--spacing-sm);
}

.repo-card__tags { display: flex; flex-wrap: wrap; gap: 4px; }

.repo-card__tag {
  padding: 1px var(--spacing-sm);
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg-alt);
  border-radius: var(--rounded-full);
}

/* ── Modal ── */
.modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; padding: var(--spacing-xl); }
.modal { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); max-width: 480px; width: 100%; padding: var(--spacing-2xl); }
.modal__title { font-size: var(--text-lg); margin-bottom: var(--spacing-xl); }
.modal__actions { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-xl); padding-top: var(--spacing-lg); border-top: 1px solid var(--color-border-light); }
.modal .fields { display: flex; flex-direction: column; gap: var(--spacing-lg); }
.modal .field__textarea { min-height: 60px; }
.modal .field__hint { font-size: var(--text-xs); color: var(--color-text-secondary); margin-top: 2px; }
.modal .msg { margin-top: var(--spacing-lg); }
.modal .radio-group { display: flex; gap: var(--spacing-sm) var(--spacing-lg); padding-top: var(--spacing-xs); }
.modal .radio { display: flex; align-items: center; gap: var(--spacing-sm); cursor: pointer; font-size: var(--text-sm); }
.modal .radio input { accent-color: var(--color-primary); }
.visibility-slide { display: flex; border: 1px solid var(--color-border); border-radius: var(--rounded-md); overflow: hidden; position: relative; background: var(--color-surface); }
.visibility-slide__indicator { position: absolute; top: 3px; width: calc(33.33% - 6px); height: calc(100% - 6px); background: var(--color-primary-light); border-radius: calc(var(--rounded-md) - 1px); transition: left 0.2s ease; left: 3px; }
.visibility-slide-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; padding: var(--spacing-xs) var(--spacing-md); font-size: var(--text-xs); font-weight: var(--weight-medium); color: var(--color-text-secondary); background: transparent; border: none; cursor: pointer; transition: color var(--transition-fast); white-space: nowrap; position: relative; z-index: 1; flex: 1 1 0; min-width: 0; }
.visibility-slide-btn--active { color: var(--color-primary); }
.visibility-slide-btn--restricted.visibility-slide-btn--active { color: #d97706; }
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

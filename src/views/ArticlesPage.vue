<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import DotBanner from '@/components/DotBanner.vue'
import { useConfig } from '@/composables/useConfig'
import { usePermission, Perm } from '@/composables/usePermission'
import { articleAPI } from '@/api'
import ArticleCard from '@/components/ArticleCard.vue'
import Pagination from '@/components/Pagination.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SvgIcon from '@/components/SvgIcon.vue'
import FabContainer from '@/components/FabContainer.vue'

const { t } = useI18n()
const auth = useAuthStore()
const { toast } = useToast()
const { load: loadConfig, get: getConfig } = useConfig()
const { perms, load: loadPerms, refresh: refreshPerms, has } = usePermission()
const articles = ref([])
const page = ref(1)
const pages = ref(1)
const total = ref(0)
const pageSize = ref(10)
const pinnedFirst = ref(false)
const loading = ref(true)
const loadingDone = ref(false)

// ARTICLE_OP gates article creation server-side; admins pass unconditionally
const canArticleOp = computed(() => auth.isAdmin || has(Perm.ARTICLE_OP))
const authDialogOpen = ref(false)
const refreshingPerm = ref(false)

async function refreshPerm() {
  refreshingPerm.value = true
  try {
    await refreshPerms()
    if (canArticleOp.value) {
      authDialogOpen.value = false
      toast(t('permission.refreshDone'), 'success')
    } else {
      toast(t('permission.refreshDenied'), 'info')
    }
  } finally {
    refreshingPerm.value = false
  }
}

onMounted(async () => {
  await loadConfig()
  loadPerms()
  fetchArticles()
})

async function fetchArticles() {
  loading.value = true
  try {
    pageSize.value = parseInt(getConfig('page_size', '10'))
    const { data } = await articleAPI.getList(page.value, pageSize.value, pinnedFirst.value)
    articles.value = data.data.records || []
    pages.value = data.data.pages || 1
    total.value = data.data.total || 0
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function onPageChange(p) {
  page.value = p
  fetchArticles()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="article-list container">
    <div class="header">
      <DotBanner />
      <div class="page-header">
        <h1 class="page-header__title"># {{ t('article.title') }}<span class="cursor">_</span></h1>
        <p class="page-header__subtitle">{{ t('article.subtitle') }}</p>
      </div>
      <!-- new article needs ARTICLE_OP; without it the button becomes an
           authorization prompt instead -->
      <router-link v-if="auth.isLoggedIn && perms && canArticleOp" to="/articles/new" class="btn btn--primary btn--white">
          <SvgIcon name="plus" />
          {{ t('article.new') }}
        </router-link>
      <button v-else-if="auth.isLoggedIn && perms" class="btn btn--primary btn--white" @click="authDialogOpen = true">
          <SvgIcon name="key" />
          {{ t('permission.authBtn') }}
        </button>
    </div>

    <LoadingSpinner :visible="loading" @done="loadingDone = true" />
    <template v-if="loadingDone">
      <div v-if="articles.length" class="articles-list">
        <ArticleCard v-for="a in articles" :key="a.id" :article="a" />
      </div>
      <p v-else class="empty-state">{{ t('article.empty') }}</p>
    </template>

    <Pagination v-if="loadingDone" :page="page" :pages="pages" :total="total" :size="pageSize" @change="onPageChange" />
  </div>

  <FabContainer>
    <button
      class="pin-fab"
      :class="{ 'pin-fab--active': pinnedFirst }"
      :title="pinnedFirst ? t('common.unpin') : t('common.pin')"
      @click="pinnedFirst = !pinnedFirst; page = 1; fetchArticles()"
    >
      <SvgIcon :name="pinnedFirst ? 'pin-off' : 'pin'" :size="20" />
    </button>
  </FabContainer>

  <!-- authorization hint (repo-style modal) -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="authDialogOpen" class="modal-overlay" @mousedown.self="authDialogOpen = false">
        <div class="modal">
          <h3 class="modal__title">{{ t('permission.authTitle') }}</h3>
          <p class="modal__text">{{ t('permission.authDesc') }}</p>
          <div class="modal__actions">
            <button class="btn btn--outline btn--full" @click="authDialogOpen = false">{{ t('common.close') }}</button>
            <button class="btn btn--primary btn--full" :disabled="refreshingPerm" @click="refreshPerm">
              <SvgIcon name="refresh" :size="14" />
              {{ t('permission.refresh') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.article-list { padding-bottom: var(--spacing-4xl); }
.header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-lg); }
.header .page-header { flex: 1; min-width: 0; }
.header .btn { flex-shrink: 0; }
.articles-list { display: flex; flex-direction: column; gap: var(--spacing-lg); }

/* authorization dialog — mirrors the repo pages' modal */
.modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; padding: var(--spacing-xl); }
.modal { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--rounded-lg); max-width: 480px; width: 100%; padding: var(--spacing-2xl); }
.modal__title { display: flex; align-items: center; justify-content: space-between; font-size: var(--text-lg); margin-bottom: var(--spacing-xl); }
.modal__text { margin: 0; font-size: var(--text-sm); color: var(--color-text-secondary); line-height: 1.7; }
.modal__actions { display: flex; gap: var(--spacing-sm); margin-top: var(--spacing-xl); padding-top: var(--spacing-lg); border-top: 1px solid var(--color-border-light); }
.modal-enter-active, .modal-leave-active { transition: opacity .2s ease; }
.modal-enter-active .modal, .modal-leave-active .modal { transition: transform .2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-from .modal, .modal-leave-to .modal { transform: scale(0.95); }
</style>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useConfig } from '@/composables/useConfig'
import { articleAPI } from '@/api'
import ArticleCard from '@/components/ArticleCard.vue'
import Pagination from '@/components/Pagination.vue'

const { t } = useI18n()
const auth = useAuthStore()
const { load: loadConfig, get: getConfig } = useConfig()
const articles = ref([])
const page = ref(1)
const pages = ref(1)
const total = ref(0)
const pageSize = ref(10)
const pinnedFirst = ref(false)
const loading = ref(true)

onMounted(async () => {
  await loadConfig()
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
      <div class="page-header">
        <h1 class="page-header__title"># {{ t('article.title') }}<span class="cursor">_</span></h1>
        <p class="page-header__subtitle">{{ t('article.subtitle') }}</p>
      </div>
      <router-link v-if="auth.isLoggedIn" to="/articles/new" class="btn btn--primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          {{ t('article.new') }}
        </router-link>
    </div>

    <div class="articles-list" v-if="articles.length">
      <ArticleCard v-for="a in articles" :key="a.id" :article="a" />
    </div>
    <p v-else-if="!loading" class="empty-state">{{ t('article.empty') }}</p>

    <Pagination :page="page" :pages="pages" :total="total" :size="pageSize" @change="onPageChange" />
  </div>

  <button
    class="pin-fab"
    :class="{ 'pin-fab--active': pinnedFirst }"
    :title="t('article.pinnedFirst')"
    @click="pinnedFirst = !pinnedFirst; page = 1; fetchArticles()"
  >
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M12 17v5"/>
      <path v-if="pinnedFirst" d="M15 9.34V7h1a2 2 0 0 0 0-4H7.89"/><path v-if="pinnedFirst" d="m2 2 20 20"/><path v-if="pinnedFirst" d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h7.32"/>
      <path v-else d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v3.76z"/>
    </svg>
  </button>
</template>

<style scoped>
.article-list { padding-bottom: var(--spacing-4xl); }
.header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-lg); }
.articles-list { display: flex; flex-direction: column; gap: var(--spacing-lg); }
</style>

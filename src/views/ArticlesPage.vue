<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { articleAPI } from '@/api'
import ArticleCard from '@/components/ArticleCard.vue'
import Pagination from '@/components/Pagination.vue'

const { t } = useI18n()
const auth = useAuthStore()
const articles = ref([])
const page = ref(1)
const pages = ref(1)
const loading = ref(true)

onMounted(() => fetchArticles())

async function fetchArticles() {
  loading.value = true
  try {
    const { data } = await articleAPI.getList(page.value, 10)
    articles.value = data.data.records || []
    pages.value = data.data.pages || 1
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

    <Pagination :page="page" :pages="pages" @change="onPageChange" />
  </div>
</template>

<style scoped>
.article-list { padding-bottom: var(--spacing-4xl); }
.header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: var(--spacing-lg); }
.articles-list { display: flex; flex-direction: column; gap: var(--spacing-lg); }
</style>

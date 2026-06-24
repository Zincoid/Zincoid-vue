<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { userAPI } from '@/api'
import UserCard from '@/components/UserCard.vue'
import Pagination from '@/components/Pagination.vue'

const { t } = useI18n()

const users = ref([])
const page = ref(1)
const pages = ref(1)
const loading = ref(true)

onMounted(() => fetchUsers())

async function fetchUsers() {
  loading.value = true
  try {
    const { data } = await userAPI.getList(page.value, 20)
    users.value = data.data.records || []
    pages.value = data.data.pages || 1
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function onPageChange(p) {
  page.value = p
  fetchUsers()
}
</script>

<template>
  <div class="user-list container">
    <div class="page-header">
      <h1 class="page-header__title"># {{ t('user.title') }}<span class="cursor">_</span></h1>
      <p class="page-header__subtitle">{{ t('user.subtitle') }}</p>
    </div>

    <div class="user-grid" v-if="users.length">
      <UserCard v-for="u in users" :key="u.id" :user="u" />
    </div>
    <p v-else-if="!loading" class="empty-state">{{ t('user.empty') }}</p>

    <Pagination :page="page" :pages="pages" @change="onPageChange" />
  </div>
</template>

<style scoped>
.user-list { padding-bottom: var(--spacing-4xl); }
.user-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--spacing-lg); margin-bottom: var(--spacing-2xl); }
</style>

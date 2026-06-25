<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { userAPI } from '@/api'
import UserCard from '@/components/UserCard.vue'
import Pagination from '@/components/Pagination.vue'

const { t } = useI18n()

const users = ref([])
const page = ref(1)
const pages = ref(1)
const loading = ref(true)

const admins = computed(() => users.value.filter(u => u.role === 1))
const regulars = computed(() => users.value.filter(u => u.role !== 1))

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

    <template v-if="users.length">
      <div v-if="admins.length" class="user-section">
        <h2 class="user-section__title user-section__title--admin">{{ t('user.admin') }}</h2>
        <div class="user-grid">
          <UserCard v-for="u in admins" :key="u.id" :user="u" />
        </div>
      </div>
      <div v-if="regulars.length" class="user-section">
        <h2 v-if="admins.length" class="user-section__title user-section__title--member">{{ t('user.members') }}</h2>
        <div class="user-grid">
          <UserCard v-for="u in regulars" :key="u.id" :user="u" />
        </div>
      </div>
    </template>
    <p v-else-if="!loading" class="empty-state">{{ t('user.empty') }}</p>

    <Pagination :page="page" :pages="pages" @change="onPageChange" />
  </div>
</template>

<style scoped>
.user-list { padding-bottom: var(--spacing-4xl); }
.user-section { margin-bottom: var(--spacing-2xl); }
.user-section__title { font-size: var(--text-lg); font-weight: var(--weight-medium); margin-bottom: var(--spacing-lg); color: var(--color-text-heading); padding-left: var(--spacing-md); border-left: 4px solid; }
.user-section__title--admin { border-left-color: #dc2626; }
.user-section__title--member { border-left-color: #2563eb; }
.user-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--spacing-lg); }
</style>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConfig } from '@/composables/useConfig'
import { userAPI } from '@/api'
import UserCard from '@/components/UserCard.vue'
import Pagination from '@/components/Pagination.vue'

const { t } = useI18n()
const { load: loadConfig, get: getConfig } = useConfig()

const admins = ref([])
const users = ref([])
const page = ref(1)
const pages = ref(1)
const total = ref(0)
const pageSize = ref(20)
const loading = ref(true)
const keyword = ref('')
let searchTimer = null

onMounted(async () => {
  await loadConfig()
  fetchData()
})

function onSearch() {
  page.value = 1
  fetchData()
}

function onSearchInput() {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => onSearch(), 300)
}

async function fetchData() {
  loading.value = true
  try {
    pageSize.value = parseInt(getConfig('page_size', '20'))
    const kw = keyword.value.trim() || null
    const [adminRes, userRes] = await Promise.all([
      userAPI.getList(1, 100, 1),
      userAPI.getList(page.value, pageSize.value, 0, kw)
    ])
    admins.value = adminRes.data.data.records || []
    users.value = userRes.data.data.records || []
    pages.value = userRes.data.data.pages || 1
    total.value = userRes.data.data.total || 0
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

function onPageChange(p) {
  page.value = p
  fetchData()
}

function updateUser(updated) {
  const update = (list) => {
    const i = list.findIndex(u => u.id === updated.id)
    if (i !== -1) list[i] = updated
  }
  update(admins.value)
  update(users.value)
}

function removeUser(id) {
  admins.value = admins.value.filter(u => u.id !== id)
  users.value = users.value.filter(u => u.id !== id)
}
</script>

<template>
  <div class="user-list container">
    <div class="page-header">
      <h1 class="page-header__title"># {{ t('user.title') }}<span class="cursor">_</span></h1>
      <p class="page-header__subtitle">{{ t('user.subtitle') }}</p>
    </div>

    <div class="user-search">
      <input
        v-model="keyword"
        type="text"
        class="field__input user-search__input"
        :placeholder="t('user.searchPlaceholder')"
        @input="onSearchInput"
      />
    </div>

    <template v-if="admins.length || users.length">
      <div v-if="admins.length" class="user-section">
        <h2 class="user-section__title user-section__title--admin">{{ t('user.admin') }}</h2>
        <div class="user-grid">
          <UserCard v-for="u in admins" :key="u.id" :user="u" @update:user="updateUser" @delete:user="removeUser" />
        </div>
      </div>
      <div v-if="users.length" class="user-section">
        <h2 v-if="admins.length" class="user-section__title user-section__title--member">{{ t('user.members') }}</h2>
        <div class="user-grid">
          <UserCard v-for="u in users" :key="u.id" :user="u" @update:user="updateUser" @delete:user="removeUser" />
        </div>
      </div>
    </template>
    <p v-else-if="!loading" class="empty-state">{{ t('user.empty') }}</p>

    <Pagination :page="page" :pages="pages" :total="total" :size="pageSize" @change="onPageChange" />
  </div>
</template>

<style scoped>
.user-list { padding-bottom: var(--spacing-4xl); }
.user-search { margin-bottom: var(--spacing-xl); }
.user-search__input { width: 100%; }
.user-section { margin-bottom: var(--spacing-2xl); }
.user-section__title { font-size: var(--text-lg); font-weight: var(--weight-medium); margin-bottom: var(--spacing-lg); color: var(--color-text-heading); padding-left: var(--spacing-md); border-left: 4px solid; }
.user-section__title--admin { border-left-color: #dc2626; }
.user-section__title--member { border-left-color: #2563eb; }
.user-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--spacing-lg); }
</style>

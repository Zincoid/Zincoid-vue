<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { userAPI, momentAPI, articleAPI } from '@/api'
import { useI18n } from '@/composables/useI18n'
import MomentCard from '@/components/MomentCard.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import ContactButtons from '@/components/ContactButtons.vue'

const { t } = useI18n()

const skillColors = [
  { bg: '#dbeafe', fg: '#2563eb' },
  { bg: '#dcfce7', fg: '#16a34a' },
  { bg: '#fce7f3', fg: '#db2777' },
  { bg: '#fef3c7', fg: '#d97706' },
  { bg: '#ede9fe', fg: '#7c3aed' },
  { bg: '#cffafe', fg: '#0891b2' },
  { bg: '#fee2e2', fg: '#dc2626' },
  { bg: '#e0e7ff', fg: '#4f46e5' },
]

const route = useRoute()
const user = ref(null)
const moments = ref([])
const articles = ref([])
const tab = ref('moments')

onMounted(async () => {
  try {
    const [uRes, mRes, aRes] = await Promise.all([
      userAPI.getDetail(route.params.id),
      momentAPI.getByUser(route.params.id, 1, 10),
      articleAPI.getByUser(route.params.id, 1, 10)
    ])
    user.value = uRes.data.data
    moments.value = mRes.data.data.records || []
    articles.value = aRes.data.data.records || []
  } catch (e) {
    console.error(e)
  }
})
</script>

<template>
  <div class="user-detail container" v-if="user">
    <!-- Profile header -->
    <div class="profile-header">
      <img v-if="user.avatar" :src="user.avatar" class="profile-avatar" />
      <span v-else class="profile-avatar-placeholder">{{ (user.nickname || 'U')[0] }}</span>

      <div class="profile-info">
        <div class="profile-name-row">
          <h1 class="profile-name">{{ user.nickname }}</h1>
          <span v-if="user.gender !== null && user.gender !== undefined" class="profile-pronouns">{{ user.gender === 0 ? t('user.heHim') : t('user.sheHer') }}</span>
        </div>
        <p v-if="user.title" class="profile-title">{{ user.title }}</p>
        <p v-if="user.bio" class="profile-bio">{{ user.bio }}</p>

        <div v-if="user.skills?.length" class="profile-skills">
          <span v-for="(skill, i) in user.skills" :key="skill" class="skill-tag" :style="{ background: skillColors[i % skillColors.length].bg, color: skillColors[i % skillColors.length].fg }">{{ skill }}</span>
        </div>
      </div>

      <ContactButtons :contacts="user.contacts" iconOnly />
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ 'tab--active': tab === 'moments' }" @click="tab = 'moments'">
        {{ t('user.moments') }}
      </button>
      <button class="tab" :class="{ 'tab--active': tab === 'articles' }" @click="tab = 'articles'">
        {{ t('user.articles') }}
      </button>
    </div>

    <div class="tab-content" v-if="tab === 'moments'">
      <MomentCard v-for="m in moments" :key="m.id" :moment="m" />
      <p v-if="!moments.length" class="empty-state">{{ t('user.momentsEmpty') }}</p>
    </div>
    <div class="tab-content" v-else>
      <ArticleCard v-for="a in articles" :key="a.id" :article="a" />
      <p v-if="!articles.length" class="empty-state">{{ t('user.articlesEmpty') }}</p>
    </div>
  </div>

  <router-link to="/members" class="back-fab" :title="t('common.backToList')">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
  </router-link>
</template>

<style scoped>
.user-detail { padding-top: var(--spacing-2xl); padding-bottom: var(--spacing-4xl); }

.profile-header {
  display: flex;
  gap: var(--spacing-3xl);
  align-items: flex-start;
  padding: var(--spacing-3xl) 0 var(--spacing-2xl);
}

.profile-avatar {
  width: 120px;
  height: 120px;
  border-radius: var(--rounded-full);
  object-fit: cover;
  border: 4px solid var(--color-border);
  flex-shrink: 0;
}

.profile-avatar-placeholder {
  width: 120px;
  height: 120px;
  border-radius: var(--rounded-full);
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-4xl);
  flex-shrink: 0;
}

.profile-info { flex: 1; min-width: 0; }

.profile-name-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
}

.profile-name { font-size: var(--text-2xl); margin: 0; }

.profile-pronouns {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-weight: var(--weight-normal);
}

.profile-title {
  color: var(--color-primary);
  font-weight: var(--weight-medium);
  font-size: var(--text-sm);
  margin-bottom: var(--spacing-md);
}

.profile-bio {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--spacing-lg);
  white-space: pre-wrap;
}

.profile-skills {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm);
  margin-top: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.skill-tag {
  font-size: var(--text-xs);
  padding: 2px 10px;
  border-radius: var(--rounded-full);
  font-weight: var(--weight-medium);
}

.tabs {
  display: flex;
  gap: var(--spacing-sm);
  border-bottom: 2px solid var(--color-border);
  margin-bottom: var(--spacing-xl);
}

.tab {
  padding: var(--spacing-sm) var(--spacing-lg);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-secondary);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab:hover { color: var(--color-text); }

.tab--active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}

.tab-content { display: flex; flex-direction: column; gap: var(--spacing-lg); }

@media (max-width: 600px) {
  .profile-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: var(--spacing-lg);
  }
  .profile-name-row { justify-content: center; }
  .profile-info { display: flex; flex-direction: column; align-items: center; }
  .profile-skills { justify-content: center; }
}
</style>

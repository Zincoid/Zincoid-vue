<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { momentAPI, commentAPI, likeAPI } from '@/api'
import CommentSection from '@/components/CommentSection.vue'
import MediaViewer from '@/components/MediaViewer.vue'
import LikeButton from '@/components/LikeButton.vue'
import { formatDate } from '@/utils/format'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const moment = ref(null)
const comments = ref([])
const loading = ref(true)
const viewerSrc = ref('')
const viewerVisible = ref(false)
const likeLiked = ref(false)
const likeCount = ref(0)

function previewImage(src) {
  viewerSrc.value = src
  viewerVisible.value = true
}

function mediaType(url) {
  const ext = url.split('.').pop().toLowerCase()
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'aac', 'flac'].includes(ext)) return 'audio'
  return 'image'
}

onMounted(async () => {
  try {
    const [mRes, cRes, lRes] = await Promise.all([
      momentAPI.getDetail(route.params.id),
      commentAPI.getMoment(route.params.id),
      likeAPI.getStatus(0, Number(route.params.id))
    ])
    moment.value = mRes.data.data
    comments.value = cRes.data.data || []
    likeLiked.value = lRes.data.data.liked
    likeCount.value = lRes.data.data.count
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
})

async function handleComment({ content, parentId }) {
  try {
    await commentAPI.addMoment(route.params.id, { content, parentId })
    const { data } = await commentAPI.getMoment(route.params.id)
    comments.value = data.data || []
  } catch (err) {
    alert(err.response?.data?.message || t('comment.postFailed'))
  }
}

async function handleDeleteComment(commentId) {
  if (!confirm(t('comment.deleteConfirm'))) return
  try {
    await commentAPI.delete(commentId)
    const { data } = await commentAPI.getMoment(route.params.id)
    comments.value = data.data || []
  } catch (err) {
    alert(err.response?.data?.message || t('comment.deleteFailed'))
  }
}

async function handleDelete() {
  if (!confirm(t('moment.deleteConfirm'))) return
  try {
    await momentAPI.delete(route.params.id)
    router.push('/moments')
  } catch (err) {
    alert(err.response?.data?.message || t('moment.deleteError'))
  }
}

watch(likeLiked, (liked) => {
  if (!moment.value || !auth.user) return
  if (!moment.value.recentLikers) moment.value.recentLikers = []
  const likers = moment.value.recentLikers
  if (liked) {
    if (!likers.some(l => l.userId === auth.user.id)) {
      likers.unshift({
        userId: auth.user.id,
        avatar: auth.user.avatar,
        nickname: auth.user.nickname
      })
    }
  } else {
    const idx = likers.findIndex(l => l.userId === auth.user.id)
    if (idx !== -1) likers.splice(idx, 1)
  }
})
</script>

<template>
  <div class="detail container" v-if="moment">
    <!-- Header -->
    <div class="detail__header">
      <router-link :to="`/users/${moment.userId}`" class="detail__user">
        <img v-if="moment.userAvatar" :src="moment.userAvatar" class="detail__avatar" />
        <span v-else class="detail__avatar-placeholder">{{ (moment.userNickname || 'U')[0] }}</span>
        <span class="detail__nickname">{{ moment.userNickname }}</span>
      </router-link>
      <div class="detail__meta">
        <span class="detail__time">{{ formatDate(moment.createdAt) }}</span>
        <span class="detail__views">{{ moment.viewCount || 0 }} {{ t('moment.views') }}</span>
        <div v-if="auth.isFounder || auth.user?.id === moment.userId" class="detail__actions">
          <button class="link-danger" @click="handleDelete">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            {{ t('moment.delete') }}
          </button>
        </div>
      </div>
    </div>

    <p v-if="moment.content" class="detail__content">{{ moment.content }}</p>

    <div v-if="moment.images?.length" class="detail__medias">
      <template v-for="(img, i) in moment.images" :key="i">
        <img
          v-if="mediaType(img) === 'image'"
          :src="img"
          alt=""
          @click="previewImage(img)"
        />
        <div
          v-else-if="mediaType(img) === 'video'"
          class="detail__media-thumb"
          @click="previewImage(img)"
        >
          <video :src="img" preload="metadata" @loadedmetadata="(e) => e.target.currentTime = 1"></video>
          <div class="detail__play-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        <div
          v-else
          class="detail__media-thumb detail__audio-thumb"
          @click="previewImage(img)"
        >
          <div class="detail__audio-icon">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
        </div>
      </template>
    </div>

    <div class="detail__actions-bar">
      <LikeButton
        :target-type="0"
        :target-id="Number(route.params.id)"
        :liked="likeLiked"
        :count="likeCount"
        @update:liked="likeLiked = $event"
        @update:count="likeCount = $event"
      />
      <div v-if="moment.recentLikers?.length" class="recent-likers">
        <router-link
          v-for="liker in moment.recentLikers"
          :key="liker.userId"
          :to="`/users/${liker.userId}`"
          class="recent-liker-link"
        >
          <img :src="liker.avatar" :title="liker.nickname" class="recent-liker-avatar" alt="" />
        </router-link>
      </div>
    </div>

    <!-- Comments -->
    <CommentSection
      :comments="comments"
      :target-id="route.params.id"
      target-type="moment"
      @submit="handleComment"
      @delete="handleDeleteComment"
    />
  </div>
  <p v-else-if="!loading" class="empty-state">{{ t('moment.notFound') }}</p>

  <MediaViewer :src="viewerSrc" :visible="viewerVisible" @close="viewerVisible = false" />
</template>

<style scoped>
.detail { padding-top: var(--spacing-2xl); padding-bottom: var(--spacing-4xl); }
.detail__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-xl); }
.detail__user { display: flex; align-items: center; gap: var(--spacing-sm); text-decoration: none; color: inherit; }
.detail__avatar { width: 44px; height: 44px; border-radius: var(--rounded-full); object-fit: cover; border: 2px solid var(--color-border); }
.detail__avatar-placeholder { width: 44px; height: 44px; border-radius: var(--rounded-full); background: var(--color-primary); color: white; display: flex; align-items: center; justify-content: center; font-weight: var(--weight-medium); }
.detail__nickname { font-weight: var(--weight-medium); color: var(--color-text-heading); }
.detail__meta { display: flex; align-items: center; gap: var(--spacing-md); }
.detail__time { font-size: var(--text-sm); color: var(--color-text-secondary); font-family: var(--font-mono); }
.detail__views { font-size: var(--text-sm); color: var(--color-text-secondary); }
.detail__actions { flex-shrink: 0; }
.detail__content { font-size: var(--text-base); line-height: var(--leading-relaxed); white-space: pre-wrap; margin-bottom: var(--spacing-xl); }
.detail__medias { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: var(--spacing-sm); margin-bottom: var(--spacing-xl); }
@media (max-width: 600px) { .detail__medias { grid-template-columns: 1fr; } }
.detail__medias img { width: 100%; border-radius: var(--rounded-md); cursor: pointer; }
.detail__media-thumb { position: relative; aspect-ratio: 16 / 9; background: #000; border-radius: var(--rounded-md); overflow: hidden; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.detail__media-thumb video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.7; }
.detail__play-icon { position: relative; width: 60px; height: 60px; border-radius: var(--rounded-full); background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; color: white; transition: background var(--transition-fast); }
.detail__media-thumb:hover .detail__play-icon { background: rgba(255,255,255,0.4); }
.detail__play-icon svg { margin-left: 4px; }
.detail__audio-thumb { background: var(--color-bg-alt); color: var(--color-text-secondary); transition: background var(--transition-fast); }
.detail__audio-thumb:hover { background: var(--color-border); }
.detail__actions-bar { display: flex; align-items: center; gap: var(--spacing-md); margin-bottom: var(--spacing-xl); }
.recent-likers { display: flex; align-items: center; }
.recent-liker-link { display: flex; line-height: 0; }
.recent-liker-link + .recent-liker-link { margin-left: -8px; }
.recent-liker-avatar { width: 28px; height: 28px; border-radius: var(--rounded-full); object-fit: cover; border: 2px solid var(--color-surface); cursor: pointer; }
.recent-liker-avatar:hover { border-color: var(--color-primary-light); }
</style>

<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { formatDate } from '@/utils/format'
import MediaViewer from '@/components/MediaViewer.vue'
import LikeButton from '@/components/LikeButton.vue'

const { t } = useI18n()
const props = defineProps({
  moment: { type: Object, required: true }
})

const router = useRouter()
const viewerSrc = ref('')
const viewerVisible = ref(false)

function previewImage(src) {
  viewerSrc.value = src
  viewerVisible.value = true
}

const images = computed(() => {
  if (!props.moment.images) return []
  return props.moment.images
})

function mediaType(url) {
  const ext = url.split('.').pop().toLowerCase()
  if (['mp4', 'webm', 'ogg', 'mov', 'avi'].includes(ext)) return 'video'
  if (['mp3', 'wav', 'aac', 'flac'].includes(ext)) return 'audio'
  return 'image'
}

function goDetail() {
  router.push(`/moments/${props.moment.id}`)
}

function goUser(e) {
  e.stopPropagation()
  router.push(`/members/${props.moment.userId}`)
}
</script>

<template>
  <article class="moment-card" @click="goDetail">
    <div class="moment-card__header">
      <div class="moment-card__user" @click="goUser">
        <img
          v-if="moment.userAvatar"
          :src="moment.userAvatar"
          class="moment-card__avatar"
          alt=""
        />
        <span v-else class="moment-card__avatar-placeholder">
          {{ (moment.userNickname || 'U')[0] }}
        </span>
        <div class="moment-card__user-info">
          <span class="moment-card__nickname">{{ moment.userNickname }}</span>
          <span class="moment-card__time">{{ formatDate(moment.createdAt) }}</span>
        </div>
      </div>
      <span v-if="moment.isPinned" class="moment-card__pin">{{ t('moment.pinned') }}</span>
    </div>

    <p v-if="moment.content" class="moment-card__content">{{ moment.content }}</p>

    <div v-if="images.length" class="moment-card__medias">
      <template v-for="(img, i) in images" :key="i">
        <img
          v-if="mediaType(img) === 'image'"
          :src="img"
          class="moment-card__media"
          loading="lazy"
          alt=""
          @click.stop="previewImage(img)"
        />
        <div
          v-else-if="mediaType(img) === 'video'"
          class="moment-card__media moment-card__video-thumb"
          @click.stop="previewImage(img)"
        >
          <video :src="img" preload="metadata" @loadedmetadata="(e) => e.target.currentTime = 1"></video>
          <div class="moment-card__play-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </div>
        </div>
        <div
          v-else
          class="moment-card__media moment-card__audio-thumb"
          @click.stop="previewImage(img)"
        >
          <div class="moment-card__audio-icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
        </div>
      </template>
    </div>

    <div class="moment-card__footer">
      <span class="moment-card__stats">
        <span class="stat stat--views">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          {{ moment.viewCount || 0 }} {{ t('moment.views') }}
        </span>
        <span class="stat">· {{ moment.commentCount || 0 }} {{ t('moment.comments') }}</span>
      </span>
      <LikeButton
        :target-type="0"
        :target-id="moment.id"
        :liked="moment.isLiked"
        :count="moment.likeCount"
      />
    </div>
  </article>

  <MediaViewer :src="viewerSrc" :visible="viewerVisible" @close="viewerVisible = false" />
</template>

<style scoped>
.moment-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  padding: var(--spacing-xl);
  cursor: pointer;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast), transform var(--transition-fast);
}
.moment-card:hover {
  border-color: #f9a8d4;
  box-shadow: var(--shadow-md);
  transform: scale(1.01);
}

.moment-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.moment-card__user {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
}
.moment-card__user:hover {
  opacity: 0.8;
}

.moment-card__avatar {
  width: 40px;
  height: 40px;
  border-radius: var(--rounded-full);
  object-fit: cover;
  border: 2px solid var(--color-border);
}

.moment-card__avatar-placeholder {
  width: 40px;
  height: 40px;
  border-radius: var(--rounded-full);
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--weight-medium);
}

.moment-card__user-info {
  display: flex;
  flex-direction: column;
}

.moment-card__nickname {
  font-weight: var(--weight-medium);
  color: var(--color-text-heading);
  font-size: var(--text-sm);
}

.moment-card__time {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.moment-card__pin {
  font-size: var(--text-xs);
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 2px 8px;
  border-radius: var(--rounded-full);
  font-weight: var(--weight-medium);
}

.moment-card__content {
  font-size: var(--text-sm);
  line-height: var(--leading-relaxed);
  margin-bottom: var(--spacing-md);
  white-space: pre-wrap;
}

.moment-card__medias {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
  border-radius: var(--rounded-md);
  overflow: hidden;
}
@media (max-width: 600px) {
  .moment-card__medias {
    grid-template-columns: 1fr;
  }
}
.moment-card__media {
  width: 100%;
  border-radius: var(--rounded-md);
  cursor: pointer;
}
.moment-card__video-thumb {
  position: relative;
  aspect-ratio: 16 / 9;
  background: #000;
  overflow: hidden;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--rounded-md);
}
.moment-card__video-thumb video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.7;
}
.moment-card__play-icon {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: var(--rounded-full);
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: background var(--transition-fast);
}
.moment-card__video-thumb:hover .moment-card__play-icon {
  background: rgba(255, 255, 255, 0.45);
}
.moment-card__play-icon svg {
  margin-left: 3px;
}
.moment-card__audio-thumb {
  aspect-ratio: 16 / 9;
  background: var(--color-bg-alt);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--color-text-secondary);
  transition: background var(--transition-fast);
  border-radius: var(--rounded-md);
}
.moment-card__audio-thumb:hover {
  background: var(--color-border);
}

.moment-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}
.moment-card__stats {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  font-size: var(--text-sm);
}
.stat {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.stat--views svg {
  opacity: 0.6;
}
</style>

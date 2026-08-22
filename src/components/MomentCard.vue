<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { formatDate } from '@/utils/format'
import { parseMentions } from '@/composables/useMentionLink'
import { momentAPI } from '@/api'
import MediaViewer from '@/components/MediaViewer.vue'
import LikeButton from '@/components/LikeButton.vue'
import SvgIcon from '@/components/SvgIcon.vue'

const { t } = useI18n()
const props = defineProps({
  moment: { type: Object, required: true }
})

const router = useRouter()
const viewerSrc = ref('')
const viewerVisible = ref(false)
const viewCount = ref(props.moment.viewCount || 0)

async function previewMedia(src) {
  viewerSrc.value = src
  viewerVisible.value = true
  viewCount.value++
  momentAPI.addView(props.moment.id).catch(() => {})
}

const urls = computed(() => {
  if (!props.moment.urls) return []
  return props.moment.urls
})

const thumbs = computed(() => {
  if (!props.moment.thumbs) return []
  return props.moment.thumbs
})

const parsedContent = computed(() => parseMentions(props.moment.content))

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
      <div class="moment-card__badges">
        <span v-if="moment.isPinned" class="moment-card__pin">{{ t('moment.pinned') }}</span>
        <span v-if="moment.visibility === 1" class="moment-card__visibility">{{ t('visibility.private') }}</span>
      </div>
    </div>

    <p v-if="moment.content" class="moment-card__content">
      <template v-for="(part, i) in parsedContent" :key="i">
        <router-link v-if="part.link" :to="`/members/@${part.username}`" class="mention-link">{{ part.text }}</router-link>
        <span v-else>{{ part.text }}</span>
      </template>
    </p>

    <div v-if="urls.length" class="moment-card__medias">
      <template v-for="(url, i) in urls" :key="i">
        <img
          v-if="mediaType(url) === 'image'"
          :src="thumbs[i]"
          class="moment-card__media"
          loading="lazy"
          alt=""
          @click.stop="previewMedia(url)"
        />
        <div
          v-else-if="mediaType(url) === 'video'"
          class="moment-card__media moment-card__video-thumb"
          @click.stop="previewMedia(url)"
        >
          <video :src="url" preload="metadata" @loadedmetadata="(e) => e.target.currentTime = 1"></video>
          <div class="moment-card__play-icon">
            <SvgIcon name="play" :size="32" />
          </div>
        </div>
        <div
          v-else
          class="moment-card__media moment-card__audio-thumb"
          @click.stop="previewMedia(url)"
        >
          <div class="moment-card__audio-icon">
            <SvgIcon name="audio" :size="28" />
          </div>
        </div>
      </template>
    </div>

    <div class="moment-card__footer">
      <span class="moment-card__stats">
        <span class="stat stat--views">
          <SvgIcon name="eye" />
          {{ viewCount }} {{ t('moment.views') }}
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
  border-color: var(--color-card-hover);
  transform: scale(1.02);
  box-shadow: 0 0 0 0.5px var(--color-card-hover);
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

.moment-card__badges {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  flex-shrink: 0;
}
.moment-card__pin {
  font-size: var(--text-xs);
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 2px 8px;
  border-radius: var(--rounded-full);
  font-weight: var(--weight-medium);
}
.moment-card__visibility {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  background: var(--color-bg-alt);
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
.mention-link {
  color: var(--color-primary);
  font-weight: var(--weight-medium);
}
.mention-link:hover {
  text-decoration: underline;
}
</style>

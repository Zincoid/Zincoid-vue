<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { useConfig } from '@/composables/useConfig'
import { useMention } from '@/composables/useMention'
import { parseMentions } from '@/composables/useMentionLink'
import { momentAPI, commentAPI, likeAPI, fileAPI } from '@/api'
import CommentSection from '@/components/CommentSection.vue'
import Pagination from '@/components/Pagination.vue'
import MediaViewer from '@/components/MediaViewer.vue'
import LikeButton from '@/components/LikeButton.vue'
import MentionDropdown from '@/components/MentionDropdown.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import SvgIcon from '@/components/SvgIcon.vue'
import { formatDate } from '@/utils/format'

const { t } = useI18n()
const { getMessage } = useError()
const { load: loadConfig, get: getConfig } = useConfig()
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const mention = useMention()
const editTextarea = ref(null)
const moment = ref(null)
const notFoundReason = ref(null)
const parsedContent = computed(() => parseMentions(moment.value?.content))

const comments = ref([])
const commentPage = ref(1)
const commentPages = ref(1)
const commentTotal = ref(0)
const commentSize = ref(10)
const loading = ref(true)
const loadingDone = ref(false)
const viewerSrc = ref('')
const viewerVisible = ref(false)
const likeLiked = ref(false)
const likeCount = ref(0)
const editing = ref(false)
const editContent = ref('')
const editVisibility = ref(0)
const editKeepImages = ref([])
const editNewFiles = ref([])
const editNewPreviews = ref([])
const saving = ref(false)

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

function onEditInput(e) {
  editContent.value = e.target.value
  mention.onInput(e.target)
}

function startEdit() {
  editContent.value = moment.value.content || ''
  editVisibility.value = moment.value.visibility != null ? moment.value.visibility : 0
  editKeepImages.value = moment.value.images ? [...moment.value.images] : []
  editNewFiles.value = []
  editNewPreviews.value = []
  editing.value = true
}

function cancelEdit() {
  for (const p of editNewPreviews.value) URL.revokeObjectURL(p.url)
  editing.value = false
}

function handleEditUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  editNewFiles.value.push(file)
  const type = file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'image'
  editNewPreviews.value.push({ url: URL.createObjectURL(file), type })
  e.target.value = ''
}

function removeKeepImage(i) {
  editKeepImages.value.splice(i, 1)
}

function removeNewImage(i) {
  URL.revokeObjectURL(editNewPreviews.value[i].url)
  editNewFiles.value.splice(i, 1)
  editNewPreviews.value.splice(i, 1)
}

async function saveEdit() {
  if (!editContent.value.trim() && !editKeepImages.value.length && !editNewFiles.value.length) return
  saving.value = true
  try {
    const newUrls = []
    for (const file of editNewFiles.value) {
      const { data } = await fileAPI.upload(file)
      newUrls.push(data.data.url)
    }
    await momentAPI.update(route.params.id, {
      content: editContent.value.trim(),
      images: [...editKeepImages.value, ...newUrls],
      visibility: editVisibility.value
    })
    moment.value.content = editContent.value.trim()
    moment.value.images = [...editKeepImages.value, ...newUrls]
    moment.value.visibility = editVisibility.value
    editing.value = false
  } catch (err) {
    if (err?.response?.status !== 401) alert(getMessage(err, 'moment.updateFailed'))
  } finally {
    saving.value = false
  }
}

async function fetchDetail() {
  loading.value = true
  const id = Number(route.params.id)
  if (isNaN(id)) return
  try {
    const [mRes, cRes, lRes] = await Promise.all([
      momentAPI.getDetail(id),
      commentAPI.getMoment(id, 1, commentSize.value),
      likeAPI.getStatus(0, id)
    ])
    moment.value = mRes.data.data
    comments.value = cRes.data.data.records || []
    commentPages.value = cRes.data.data.pages || 1
    commentTotal.value = cRes.data.data.total || 0
    likeLiked.value = lRes.data.data.liked
    likeCount.value = lRes.data.data.count
  } catch (e) {
    notFoundReason.value = e?.response?.data?.message === 'Moment is private'
      ? 'private'
      : 'notFound'
    console.error(e)
  } finally {
    loading.value = false
  }
}

watch(() => route.params.id, () => {
  if (route.name === 'MomentDetail') fetchDetail()
})

onMounted(async () => {
  await loadConfig()
  commentSize.value = parseInt(getConfig('page_size', '10'))
  fetchDetail()
})

async function handleComment({ content, parentId }) {
  try {
    await commentAPI.addMoment(route.params.id, { content, parentId })
    await fetchComments()
  } catch (err) {
    if (err?.response?.status !== 401) alert(getMessage(err, 'comment.postFailed'))
  }
}

async function handleDeleteComment(commentId) {
  if (!confirm(t('comment.deleteConfirm'))) return
  try {
    await commentAPI.delete(commentId)
    await fetchComments()
  } catch (err) {
    if (err?.response?.status !== 401) alert(getMessage(err, 'comment.deleteFailed'))
  }
}

async function fetchComments() {
  const { data } = await commentAPI.getMoment(route.params.id, commentPage.value, commentSize.value)
  comments.value = data.data.records || []
  commentPages.value = data.data.pages || 1
  commentTotal.value = data.data.total || 0
}

function onCommentPageChange(p) {
  commentPage.value = p
  fetchComments()
}

async function togglePin() {
  try {
    const api = moment.value.isPinned ? momentAPI.unpin : momentAPI.pin
    await api(moment.value.id)
    moment.value.isPinned = !moment.value.isPinned
  } catch (err) {
    if (err?.response?.status !== 401) alert(getMessage(err, 'common.failed'))
  }
}

async function handleDelete() {
  if (!confirm(t('moment.deleteConfirm'))) return
  try {
    await momentAPI.delete(route.params.id)
    router.push('/moments')
  } catch (err) {
    if (err?.response?.status !== 401) alert(getMessage(err, 'moment.deleteError'))
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
  <LoadingSpinner :visible="loading" @done="loadingDone = true" />
  <div class="detail container" v-if="loadingDone && moment">
    <!-- Header -->
    <div class="detail__header">
      <router-link :to="`/members/${moment.userId}`" class="detail__user">
        <img v-if="moment.userAvatar" :src="moment.userAvatar" class="detail__avatar" />
        <span v-else class="detail__avatar-placeholder">{{ (moment.userNickname || 'U')[0] }}</span>
        <span class="detail__nickname">{{ moment.userNickname }}</span>
      </router-link>
      <div class="detail__meta">
        <span v-if="moment.isPinned" class="detail__pin-badge">{{ t('moment.pinned') }}</span>
        <span v-if="moment.visibility === 1" class="detail__visibility-badge">{{ t('visibility.private') }}</span>
        <span class="detail__time">{{ formatDate(moment.createdAt) }}</span>
        <span class="detail__views">{{ moment.viewCount || 0 }} {{ t('moment.views') }}</span>
        <div v-if="auth.isAdmin || auth.user?.id === moment.userId" class="detail__actions">
          <button v-if="auth.isAdmin && !editing" class="link-pin" @click="togglePin">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <template v-if="moment.isPinned">
                <path d="M12 17v5"/><path d="M15 9.34V7h1a2 2 0 0 0 0-4H7.89"/><path d="m2 2 20 20"/><path d="M9 9v1.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h7.32"/>
              </template>
              <template v-else>
                <path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v3.76z"/>
              </template>
            </svg>
            {{ moment.isPinned ? t('common.unpin') : t('common.pin') }}
          </button>
          <button v-if="!editing" class="link-muted" @click="startEdit">
            <SvgIcon name="edit" />
            {{ t('common.edit') }}
          </button>
          <button class="link-danger" @click="handleDelete">
            <SvgIcon name="trash" />
            {{ t('moment.delete') }}
          </button>
        </div>
      </div>
    </div>

    <template v-if="editing">
      <div class="edit-block">
        <textarea
          ref="editTextarea"
          :value="editContent"
          class="edit-textarea"
          :placeholder="t('moment.placeholder')"
          @input="onEditInput"
          @keydown.esc="mention.close()"
        ></textarea>
        <MentionDropdown
          :suggestions="mention.suggestions"
          :pos="mention.mentionPos"
          @select="(username) => mention.insert(editTextarea, username)"
        />

        <div class="visibility-toggle">
          <button
            class="visibility-btn"
            :class="{ 'visibility-btn--active': editVisibility === 0 }"
            @click="editVisibility = 0"
            type="button"
          >
            <SvgIcon name="world" :size="14" />
            {{ t('visibility.public') }}
          </button>
          <button
            class="visibility-btn"
            :class="{ 'visibility-btn--active': editVisibility === 1 }"
            @click="editVisibility = 1"
            type="button"
          >
            <SvgIcon name="lock" :size="14" />
            {{ t('visibility.private') }}
          </button>
        </div>

        <div v-if="editKeepImages.length || editNewPreviews.length" class="edit-media-grid">
          <div v-for="(img, i) in editKeepImages" :key="'keep'+i" class="edit-media-item">
            <img v-if="mediaType(img) === 'image'" :src="img" alt="" />
            <div v-else-if="mediaType(img) === 'video'" class="edit-video-thumb">
              <video :src="img" preload="metadata" @loadedmetadata="(e) => e.target.currentTime = 1"></video>
              <div class="edit-play-icon"><SvgIcon name="play" :size="16" /></div>
            </div>
            <div v-else class="edit-audio-thumb">
              <SvgIcon name="audio" :size="18" />
            </div>
            <button class="edit-media-remove" @click="removeKeepImage(i)" title="Remove">
            <SvgIcon name="close" :size="10" />
          </button>
          </div>
          <div v-for="(p, i) in editNewPreviews" :key="'new'+i" class="edit-media-item">
            <img v-if="p.type === 'image'" :src="p.url" alt="" />
            <div v-else-if="p.type === 'video'" class="edit-video-thumb">
              <video :src="p.url" muted></video>
              <div class="edit-play-icon"><SvgIcon name="play" :size="16" /></div>
            </div>
            <div v-else class="edit-audio-thumb">
              <SvgIcon name="audio" :size="18" />
            </div>
            <button class="edit-media-remove" @click="removeNewImage(i)" title="Remove">
            <SvgIcon name="close" :size="10" />
          </button>
          </div>
        </div>

        <div class="edit-actions">
          <label class="btn btn--outline edit-btn">
            <SvgIcon name="attach" />
            {{ t('moment.attach') }}
            <input type="file" accept="image/*,video/*,audio/*" class="hidden-input" @change="handleEditUpload" />
          </label>
          <div class="edit-actions__right">
            <button class="btn btn--outline edit-btn" @click="cancelEdit">{{ t('common.cancel') }}</button>
            <button class="btn btn--primary edit-btn" :disabled="saving" @click="saveEdit">
              {{ saving ? t('common.saving') : t('common.save') }}
            </button>
          </div>
        </div>
      </div>
    </template>
    <template v-else>
      <p v-if="moment.content" class="detail__content">
        <template v-for="(part, i) in parsedContent" :key="i">
          <router-link v-if="part.link" :to="`/members/@${part.username}`" class="mention-link">{{ part.text }}</router-link>
          <span v-else>{{ part.text }}</span>
        </template>
      </p>

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
              <SvgIcon name="play" :size="40" />
            </div>
          </div>
          <div
            v-else
            class="detail__media-thumb detail__audio-thumb"
            @click="previewImage(img)"
          >
            <div class="detail__audio-icon">
              <SvgIcon name="audio" :size="36" />
            </div>
          </div>
        </template>
      </div>
    </template>

    <div v-if="!editing" class="detail__actions-bar">
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
          :to="`/members/${liker.userId}`"
          class="recent-liker-link"
          :title="liker.nickname"
        >
          <img v-if="liker.avatar" :src="liker.avatar" class="recent-liker-avatar" alt="" />
          <span v-else class="recent-liker-avatar recent-liker-placeholder">{{ (liker.nickname || 'U')[0] }}</span>
        </router-link>
      </div>
    </div>

    <!-- Comments -->
    <CommentSection
      :comments="comments"
      :target-id="route.params.id"
      target-type="moment"
      :total="commentTotal"
      @submit="handleComment"
      @delete="handleDeleteComment"
    />
    <Pagination :page="commentPage" :pages="commentPages" :total="commentTotal" :size="commentSize" @change="onCommentPageChange" />
  </div>
  <p v-if="loadingDone && !moment" class="empty-state">{{ notFoundReason === 'private' ? t('moment.private') : t('moment.notFound') }}</p>

  <MediaViewer :src="viewerSrc" :visible="viewerVisible" @close="viewerVisible = false" />

  <button class="back-fab" :title="t('common.goBack')" @click="$router.back()">
    <SvgIcon name="back-arrow" :size="20" />
  </button>
  <div v-if="!editing" class="like-fab">
    <LikeButton
      :target-type="0"
      :target-id="Number(route.params.id)"
      :liked="likeLiked"
      :count="likeCount"
      @update:liked="likeLiked = $event"
      @update:count="likeCount = $event"
    />
  </div>
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
.detail__pin-badge { font-size: var(--text-xs); color: var(--color-primary); background: var(--color-primary-light); padding: 1px 8px; border-radius: var(--rounded-full); font-weight: var(--weight-medium); }
.detail__visibility-badge { font-size: var(--text-xs); color: var(--color-text-secondary); background: var(--color-bg-alt); padding: 1px 8px; border-radius: var(--rounded-full); font-weight: var(--weight-medium); }
.detail__views { font-size: var(--text-sm); color: var(--color-text-secondary); }
.detail__actions { display: flex; gap: var(--spacing-sm); align-items: center; flex-shrink: 0; }
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
.recent-liker-placeholder { display: flex; align-items: center; justify-content: center; background: var(--color-primary); color: white; font-size: 10px; font-weight: var(--weight-medium); object-fit: unset; }
.edit-block { display: flex; flex-direction: column; gap: var(--spacing-md); position: relative; }
.edit-textarea { width: 100%; min-height: 100px; padding: var(--spacing-sm) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--rounded-md); font-family: inherit; font-size: var(--text-sm); line-height: var(--leading-normal); color: var(--color-text); background: var(--color-bg); resize: vertical; transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.edit-textarea:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 2px var(--color-primary-light); }
.edit-media-grid { display: flex; gap: var(--spacing-sm); flex-wrap: wrap; }
.edit-media-item { position: relative; width: 80px; height: 80px; border-radius: var(--rounded-md); overflow: hidden; }
.edit-media-item img { width: 100%; height: 100%; object-fit: cover; }
.edit-video-thumb { position: relative; width: 100%; height: 100%; background: #000; display: flex; align-items: center; justify-content: center; }
.edit-video-thumb video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.6; }
.edit-play-icon { position: relative; width: 28px; height: 28px; border-radius: var(--rounded-full); background: rgba(255,255,255,0.3); display: flex; align-items: center; justify-content: center; color: white; }
.edit-play-icon svg { margin-left: 2px; }
.edit-audio-thumb { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: var(--color-bg-alt); color: var(--color-text-secondary); }
.edit-media-remove { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; border-radius: var(--rounded-full); background: rgba(0,0,0,0.6); color: white; font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; }
.edit-actions { display: flex; justify-content: space-between; align-items: center; }
.edit-actions__right { display: flex; gap: var(--spacing-sm); }
.edit-btn { padding-top: var(--spacing-xs); padding-bottom: var(--spacing-xs); padding-left: calc(var(--spacing-lg) + 2px); padding-right: calc(var(--spacing-lg) + 2px); font-size: var(--text-xs); }
.hidden-input { display: none; }
.mention-link {
  color: var(--color-primary);
  font-weight: var(--weight-medium);
}
.mention-link:hover {
  text-decoration: underline;
}

.visibility-toggle { display: flex; gap: var(--spacing-sm); }
.visibility-btn { display: inline-flex; align-items: center; gap: var(--spacing-xs); padding: var(--spacing-xs) var(--spacing-md); border: 1px solid var(--color-border); border-radius: var(--rounded-md); background: var(--color-surface); color: var(--color-text-secondary); font-size: var(--text-xs); cursor: pointer; transition: all var(--transition-fast); }
.visibility-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
.visibility-btn--active { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-light); }
</style>

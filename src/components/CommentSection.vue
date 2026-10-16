<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useToast } from '@/composables/useToast'
import { useError } from '@/composables/useError'
import { useMention, insertAtCursor } from '@/composables/useMention'
import { parseMentions } from '@/composables/useMentionLink'
import { formatDate } from '@/utils/format'
import { commentAPI, likeAPI } from '@/api'
import MentionDropdown from '@/components/MentionDropdown.vue'
import SvgIcon from '@/components/SvgIcon.vue'
import SliderSelect from '@/components/SliderSelect.vue'

const { t } = useI18n()
const { toast } = useToast()
const { getMessage } = useError()
const props = defineProps({
  comments: { type: Array, default: () => [] },
  targetId: { type: [Number, String], required: true },
  targetType: { type: String, required: true }, // 'moment' | 'article' | 'repo'
  ownerId: { type: [Number, String], default: null } // target author may delete comments and pin root ones
})

const emit = defineEmits(['submit', 'delete', 'refresh', 'sort'])

const auth = useAuthStore()
const router = useRouter()
const mention = useMention()
const content = ref('')
const replyTo = ref(null)
const commentTextarea = ref(null)
const submitting = ref(false)

// per-comment overflow menu (delete lives in here)
const openMenuId = ref(null)

function canDelete(comment) {
  return auth.user?.id === comment.userId || auth.user?.id === props.ownerId || auth.isAdmin
}

function toggleMenu(id) {
  openMenuId.value = openMenuId.value === id ? null : id
}

function onDeleteClick(id) {
  openMenuId.value = null
  emit('delete', id)
}

// pinning is reserved for the target author and root comments only
function canPin(comment) {
  return auth.user?.id === props.ownerId && !comment.parentId
}

function hasMenu(comment) {
  return canDelete(comment) || canPin(comment)
}

async function onPinClick(comment) {
  openMenuId.value = null
  try {
    await (comment.isPinned ? commentAPI.unpin : commentAPI.pin)(comment.id)
    emit('refresh')
  } catch (err) {
    if (err?.response?.status !== 401) toast(getMessage(err, 'common.failed'), 'error')
  }
}

// sort mode: false = latest, true = hot — parents own the fetch
const hot = ref(true)
const sortOptions = computed(() => [
  { value: true, label: t('comment.sortHot') },
  { value: false, label: t('comment.sortLatest') }
])

function onSortToggle(v) {
  hot.value = v
  emit('sort', v)
}

function onCommentInput(e) {
  content.value = e.target.value
  mention.onInput(e.target)
}

// ── composer tools (emoji picker + @ mention) ──
const emojiOpen = ref(false)
const EMOJIS = [
  '😀', '😄', '😂', '🤣', '😊', '😍', '😘', '😜',
  '🤔', '😅', '😭', '🥺', '😏', '😉', '😎', '🥳',
  '🤗', '😴', '👍', '👏', '🙏', '💪', '❤️', '🔥',
  '✨', '🎉', '💡', '⭐', '🚀', '🌱', '☕', '🎵'
]

function insertEmoji(emoji) {
  emojiOpen.value = false
  insertAtCursor(commentTextarea.value, emoji)
}

function insertMentionChar() {
  insertAtCursor(commentTextarea.value, '@')
  nextTick(() => mention.onInput(commentTextarea.value))
}

function onEsc() {
  mention.close()
  emojiOpen.value = false
}

function onDocPointerDown(e) {
  if (emojiOpen.value && !e.target.closest?.('.comments__emoji-panel, .comments__tool--emoji')) {
    emojiOpen.value = false
  }
  if (openMenuId.value != null && !e.target.closest?.('.comment__menu')) {
    openMenuId.value = null
  }
}
onMounted(() => {
  document.addEventListener('pointerdown', onDocPointerDown)
  fetchTotal()
})
onUnmounted(() => document.removeEventListener('pointerdown', onDocPointerDown))

// total comment count including replies — fetched here so the title
// stays independent from the paged (roots-only) list total
const total = ref(0)

function fetchTotal() {
  commentAPI.getCount(props.targetType, props.targetId)
    .then(({ data }) => { total.value = data.data || 0 })
    .catch(() => { /* ignore */ })
}

function handleSubmit() {
  if (!content.value.trim()) return
  mention.close()
  submitting.value = true
  emit('submit', {
    content: content.value.trim(),
    parentId: replyTo.value?.id || null,
    targetType: props.targetType,
    targetId: props.targetId
  })
  content.value = ''
  replyTo.value = null
  submitting.value = false
}

function startReply(comment) {
  replyTo.value = comment
  content.value = ''
}

function cancelReply() {
  replyTo.value = null
  content.value = ''
}

const loadedReplies = ref(new Map())
const loadingReply = ref(null)

// like overrides keyed by comment id — keeps toggles local until a refresh
const likeState = ref(new Map())

async function toggleLike(comment) {
  if (!auth.isLoggedIn) {
    router.push('/login')
    return
  }
  try {
    const { data } = await likeAPI.toggle(6, comment.id) // 6 = RelatedType.COMMENT
    const m = new Map(likeState.value)
    m.set(comment.id, { liked: data.data.liked, count: data.data.count })
    likeState.value = m
  } catch { /* ignore */ }
}

const allComments = computed(() => {
  return props.comments.map(c => ({
    ...c,
    replies: loadedReplies.value.get(c.id) ?? c.replies ?? []
  }))
})

function flattenComments(comments, depth = 0) {
  const result = []
  for (const c of comments) {
    result.push({ ...c, depth })
    if (c.replies?.length) {
      result.push(...flattenComments(c.replies, depth + 1))
    }
  }
  return result
}

const expandedParents = ref(new Set())

async function toggleExpand(parentId) {
  const s = new Set(expandedParents.value)
  if (s.has(parentId)) {
    s.delete(parentId)
    expandedParents.value = s
    return
  }
  if (!loadedReplies.value.has(parentId)) {
    loadingReply.value = parentId
    try {
      const { data } = await commentAPI.getReplies(parentId)
      const newMap = new Map(loadedReplies.value)
      newMap.set(parentId, data.data || [])
      loadedReplies.value = newMap
    } catch { /* ignore */ }
    loadingReply.value = null
  }
  s.add(parentId)
  expandedParents.value = s
}

watch(() => props.comments, () => {
  loadedReplies.value = new Map()
  expandedParents.value = new Set()
  likeState.value = new Map()
  openMenuId.value = null
  fetchTotal()
})

function countReplies(comments) {
  let count = 0
  for (const c of comments) {
    count++
    if (c.replies?.length) count += countReplies(c.replies)
  }
  return count
}

const flatComments = computed(() => {
  const list = flattenComments(allComments.value)
  const map = new Map()
  for (const c of list) {
    map.set(c.id, c)
  }
  return list.map(c => {
    const like = likeState.value.get(c.id)
    return {
      ...c,
      parentUsername: c.parentId ? map.get(c.parentId)?.username : null,
      parsedContent: parseMentions(c.content),
      likeCount: like ? like.count : (c.likeCount ?? 0),
      isLiked: like ? like.liked : !!c.isLiked
    }
  })
})

const visibleComments = computed(() => {
  const expanded = expandedParents.value
  return flatComments.value.filter(c => {
    if (c.depth === 0) return true
    let p = c.parentId
    while (p) {
      const parent = flatComments.value.find(fc => fc.id === p)
      if (!parent) break
      if (parent.depth === 0 && !expanded.has(parent.id)) return false
      p = parent.parentId
    }
    return true
  })
})
</script>

<template>
  <div class="comments">
    <div class="comments__header">
      <h4 class="comments__title">{{ t('comment.title', { count: total }) }}</h4>
      <button
        class="comments__refresh"
        :title="t('comment.refresh')"
        :aria-label="t('comment.refresh')"
        @click="emit('refresh')"
      >
        <SvgIcon name="refresh" :size="14" />
      </button>
      <SliderSelect
        class="comments__sort"
        :model-value="hot"
        :options="sortOptions"
        @update:model-value="onSortToggle"
      />
    </div>

    <div class="comments__list" v-if="flatComments.length">
      <template v-for="comment in visibleComments" :key="comment.id">
        <div
          class="comment"
          :class="`comment--depth-${Math.min(comment.depth, 2)}`"
        >
          <div class="comment__indent">
            <div class="comment__thread-line"></div>
          </div>
          <div class="comment__content-wrap">
            <div class="comment__avatar">
              <router-link v-if="comment.userAvatar" :to="`/members/${comment.userId}`">
                <img :src="comment.userAvatar" alt="" />
              </router-link>
              <router-link v-else :to="`/members/${comment.userId}`">
                <span>{{ (comment.userNickname || 'U')[0] }}</span>
              </router-link>
            </div>
            <div class="comment__body">
              <div class="comment__header">
                <span class="comment__author">{{ comment.userNickname }}</span>
                <router-link v-if="comment.username" :to="`/members/@${comment.username}`" class="comment__handle">@{{ comment.username }}</router-link>
                <span class="comment__time">{{ formatDate(comment.createdAt) }}</span>
                <div class="comment__header-right">
                  <span v-if="comment.isPinned" class="comment__pin-tag">{{ t('comment.pinned') }}</span>
                  <div v-if="hasMenu(comment)" class="comment__menu">
                    <button
                      class="comment__more-btn"
                      :class="{ 'comment__more-btn--open': openMenuId === comment.id }"
                      :title="t('comment.more')"
                      :aria-label="t('comment.more')"
                      @click="toggleMenu(comment.id)"
                    >
                      <SvgIcon name="more" :size="14" />
                    </button>
                    <div v-if="openMenuId === comment.id" class="comment__menu-panel">
                      <button v-if="canPin(comment)" class="comment__menu-item" @click="onPinClick(comment)">{{ comment.isPinned ? t('common.unpin') : t('common.pin') }}</button>
                      <button v-if="canDelete(comment)" class="comment__menu-item comment__menu-item--danger" @click="onDeleteClick(comment.id)">{{ t('comment.delete') }}</button>
                    </div>
                  </div>
                </div>
              </div>
              <p v-if="comment.parentUsername" class="comment__reply-to">{{ t('comment.replyTo') }} <span class="comment__reply-target">@{{ comment.parentUsername }}</span></p>
              <p class="comment__content">
                <template v-for="(part, i) in comment.parsedContent" :key="i">
                  <router-link v-if="part.link" :to="`/members/@${part.username}`" class="mention-link">{{ part.text }}</router-link>
                  <span v-else>{{ part.text }}</span>
                </template>
              </p>
              <div class="comment__actions">
                <button
                  class="comment__like-btn"
                  :class="{ 'comment__like-btn--active': comment.isLiked }"
                  :title="comment.isLiked ? t('common.unlike') : t('common.like')"
                  @click="toggleLike(comment)"
                >
                  <SvgIcon :name="comment.isLiked ? 'heart-filled' : 'heart'" :size="12" />
                  <span v-if="comment.likeCount > 0">{{ comment.likeCount }}</span>
                </button>
                <button class="comment__reply-btn" @click="startReply(comment)">{{ t('comment.reply') }}</button>
                <button
                  v-if="comment.depth === 0 && comment.replyCount > 0"
                  class="comment__toggle-btn"
                  @click="toggleExpand(comment.id)"
                >
                  <template v-if="loadingReply === comment.id">{{ t('common.loading') }}</template>
                  <template v-else>{{ expandedParents.has(comment.id) ? t('comment.hideReplies') : t('comment.showReplies', { count: comment.replyCount }) }}</template>
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
    <p v-else class="comments__empty">{{ t('comment.empty') }}</p>

    <div v-if="auth.isLoggedIn" class="comments__form">
      <p v-if="replyTo" class="comments__reply-notice">
        {{ t('comment.replyingTo') }} <strong>{{ replyTo.userNickname }}</strong>
        <button class="comments__cancel-reply" @click="cancelReply">{{ t('comment.cancel') }}</button>
      </p>
      <div class="comments__frame">
        <textarea
          ref="commentTextarea"
          :value="content"
          class="comments__input"
          :placeholder="replyTo ? t('comment.replyPlaceholder') : t('comment.placeholder')"
          rows="2"
          @input="onCommentInput"
          @keydown.esc="onEsc"
          @keydown.enter.exact.prevent="handleSubmit"
        ></textarea>
        <MentionDropdown
          :suggestions="mention.suggestions"
          :pos="mention.mentionPos"
          @select="(username) => mention.insert(commentTextarea, username)"
        />

        <!-- small emoji popover above the composer bar -->
        <div v-if="emojiOpen" class="comments__emoji-panel">
          <button
            v-for="emoji in EMOJIS"
            :key="emoji"
            type="button"
            class="comments__emoji-item"
            @click="insertEmoji(emoji)"
          >{{ emoji }}</button>
        </div>

        <!-- tools + send clustered bottom-right -->
        <div class="comments__bar">
          <button
            type="button"
            class="comments__tool comments__tool--emoji"
            :class="{ 'comments__tool--active': emojiOpen }"
            :title="t('comment.emojiTitle')"
            :aria-label="t('comment.emojiTitle')"
            @click="emojiOpen = !emojiOpen"
          >
            <SvgIcon name="smile" :size="18" />
          </button>
          <button
            type="button"
            class="comments__tool"
            :title="t('comment.mentionTitle')"
            :aria-label="t('comment.mentionTitle')"
            @click="insertMentionChar"
          >
            <SvgIcon name="at" :size="18" />
          </button>
          <button
            type="button"
            class="comments__send"
            :disabled="!content.trim() || submitting"
            :title="t('comment.send')"
            :aria-label="t('comment.send')"
            @click="handleSubmit"
          >
            <SvgIcon name="send" :size="19" />
          </button>
        </div>
      </div>
    </div>
    <p v-else class="comments__login-hint">
      {{ t('comment.loginHint') }} <router-link to="/login">{{ t('auth.login') }}</router-link>
    </p>
  </div>
</template>

<style scoped>
.comments {
  margin-top: var(--spacing-3xl);
}

.comments__header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-xl);
}

.comments__title {
  font-size: var(--text-lg);
  color: var(--color-text-heading);
}

/* icon-only refresh — no border, no fill, ink follows the text buttons */
.comments__refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast);
}
.comments__refresh:hover {
  color: var(--color-primary);
}

/* latest/hot switcher pinned to the right end of the title row */
.comments__sort {
  margin-left: auto;
}

.comments__list {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xs);
  margin-bottom: var(--spacing-2xl);
}

.comment {
  display: flex;
  gap: 0;
}

.comment__indent {
  display: none;
  width: 36px;
  flex-shrink: 0;
}

.comment--depth-1 .comment__indent,
.comment--depth-2 .comment__indent {
  display: block;
}

.comment__thread-line {
  width: 2px;
  height: calc(100% - 16px);
  margin: 8px 0 0 23px;
  border-radius: var(--rounded-full);
  background: var(--color-border);
  transition: background var(--transition-fast);
}

.comment:hover .comment__thread-line {
  background: #f9a8d4;
}

.comment__content-wrap {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  border-radius: var(--rounded-md);
}

.comment__avatar {
  width: 32px;
  height: 32px;
  border-radius: var(--rounded-full);
  overflow: hidden;
  flex-shrink: 0;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-xs);
  margin-top: 2px;
}
.comment__avatar:has(img) {
  background: transparent;
}
.comment__avatar a {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  color: inherit;
}
.comment__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment__body {
  flex: 1;
  min-width: 0;
}

.comment__header {
  display: flex;
  gap: var(--spacing-sm);
  align-items: center;
  margin-bottom: var(--spacing-xxs);
}

.comment__author {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  color: var(--color-text-heading);
}

.comment__handle {
  font-size: var(--text-xs);
  font-family: var(--font-mono);
  color: var(--color-text-secondary);
  text-decoration: none;
}
.comment__handle:hover {
  color: var(--color-primary);
}

.comment__time {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.comment__reply-to {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-xxs);
}
.comment__reply-target {
  color: var(--color-primary);
  font-weight: var(--weight-medium);
}

.comment__content {
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  white-space: pre-wrap; /* keep Shift+Enter line breaks */
}

.comment__reply-btn {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  padding: 0;
}
.comment__reply-btn:hover {
  color: var(--color-primary);
}
.comment__like-btn {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  padding: 0;
  margin-right: var(--spacing-sm);
}
.comment__like-btn:hover,
.comment__like-btn--active {
  color: var(--color-danger);
}
.comment__actions {
  display: flex;
  gap: var(--spacing-md);
  margin-top: var(--spacing-xs);
}
.comment__toggle-btn {
  font-size: var(--text-xs);
  color: var(--color-primary);
  padding: 0;
  font-weight: var(--weight-medium);
}
.comment__toggle-btn:hover {
  text-decoration: underline;
}
/* right side of the header — pin tag + overflow menu */
.comment__header-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
}
.comment__pin-tag {
  font-size: var(--text-xs);
  color: var(--color-primary);
  background: var(--color-primary-light);
  padding: 1px 8px;
  border-radius: var(--rounded-full);
  font-weight: var(--weight-medium);
}
/* overflow menu — three dots pinned to the header's right edge */
.comment__menu {
  position: relative;
}
.comment__more-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--transition-fast);
}
.comment__more-btn:hover,
.comment__more-btn--open {
  color: var(--color-primary);
}
.comment__menu-panel {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: var(--spacing-xxs);
  min-width: 96px;
  padding: var(--spacing-xxs);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  z-index: 10;
}
.comment__menu-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: var(--spacing-xs) var(--spacing-sm);
  font-size: var(--text-xs);
  color: var(--color-text);
  border-radius: var(--rounded-sm);
  transition: background var(--transition-fast);
}
.comment__menu-item:hover {
  background: var(--color-bg-alt);
}
.comment__menu-item--danger {
  color: var(--color-danger);
}
.comment__menu-item--danger:hover {
  background: var(--color-danger-bg);
}

.comments__reply-notice {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-sm);
}

.comments__cancel-reply {
  color: var(--color-text-secondary);
  font-size: var(--text-xs);
  margin-left: var(--spacing-sm);
  text-decoration: underline;
}

/* ── composer: framed textarea with tools + send clustered bottom-right ── */
.comments__frame {
  position: relative;
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  background: var(--color-surface);
  padding: var(--spacing-sm) var(--spacing-sm) var(--spacing-sm) var(--spacing-md);
  transition: border-color var(--transition-fast);
}
.comments__frame:focus-within {
  border-color: var(--color-primary);
}

.comments__input {
  display: block;
  width: 100%;
  min-height: 84px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  resize: none;
  scrollbar-width: none; /* firefox */
  -ms-overflow-style: none;
}
.comments__input::-webkit-scrollbar {
  display: none;
}
.comments__input:focus {
  outline: none;
}
.comments__input::placeholder {
  color: var(--color-text-tertiary);
}

.comments__bar {
  position: absolute;
  right: var(--spacing-sm);
  bottom: var(--spacing-sm);
  display: flex;
  align-items: center;
  gap: var(--spacing-xxs);
  padding: 2px;
  /* translucent chip so text scrolled under the cluster fades out softly */
  background: color-mix(in srgb, var(--color-surface) 70%, transparent);
  border-radius: var(--rounded-lg);
}
.comments__tool {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--rounded-lg);
  color: var(--color-text-secondary);
  transition: background var(--transition-fast), color var(--transition-fast);
}
.comments__tool:hover,
.comments__tool--active {
  background: var(--color-primary-light);
  color: var(--color-primary);
}
.comments__tool--emoji:hover,
.comments__tool--emoji.comments__tool--active {
  background: var(--color-pink-bg);
  color: var(--color-pink);
}

.comments__send {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--rounded-lg);
  background: var(--color-primary);
  color: var(--color-white);
  margin-left: var(--spacing-xs);
  transition: background var(--transition-fast), opacity var(--transition-fast);
}
.comments__send:hover:not(:disabled) {
  background: var(--color-primary-hover);
}
.comments__send:disabled {
  background: var(--color-border);
  color: var(--color-text-tertiary);
  cursor: default;
}

.comments__emoji-panel {
  position: absolute;
  right: var(--spacing-sm);
  bottom: 48px;
  display: grid;
  grid-template-columns: repeat(8, 30px);
  gap: 2px;
  padding: var(--spacing-xs);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  z-index: 10;
}
.comments__emoji-item {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--rounded-sm);
  font-size: 17px;
  line-height: 1;
  transition: background var(--transition-fast);
}
.comments__emoji-item:hover {
  background: var(--color-primary-light);
}

.comments__login-hint {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.comments__empty {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-2xl);
}
.mention-link {
  color: var(--color-primary);
  font-weight: var(--weight-medium);
}
.mention-link:hover {
  text-decoration: underline;
}

</style>

<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useMention } from '@/composables/useMention'
import { parseMentions } from '@/composables/useMentionLink'
import { formatDate } from '@/utils/format'
import { commentAPI } from '@/api'
import MentionDropdown from '@/components/MentionDropdown.vue'

const { t } = useI18n()
const props = defineProps({
  comments: { type: Array, default: () => [] },
  targetId: { type: [Number, String], required: true },
  targetType: { type: String, required: true }, // 'moment' | 'article'
  total: { type: Number, default: 0 }
})

const emit = defineEmits(['submit', 'delete'])

const auth = useAuthStore()
const mention = useMention()
const content = ref('')
const replyTo = ref(null)
const commentTextarea = ref(null)
const submitting = ref(false)

function onCommentInput(e) {
  content.value = e.target.value
  mention.onInput(e.target)
}

function handleSubmit() {
  if (!content.value.trim()) return
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
  return list.map(c => ({
    ...c,
    parentNickname: c.parentId ? map.get(c.parentId)?.userNickname : null,
    parsedContent: parseMentions(c.content)
  }))
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
    <h4 class="comments__title">{{ t('comment.title', { count: total }) }}</h4>

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
                <span class="comment__time">{{ formatDate(comment.createdAt) }}</span>
              </div>
              <p v-if="comment.parentNickname" class="comment__reply-to">{{ t('comment.replyTo') }} <span class="comment__reply-target">@{{ comment.parentNickname }}</span></p>
              <p class="comment__content">
                <template v-for="(part, i) in comment.parsedContent" :key="i">
                  <router-link v-if="part.link" :to="`/members/@${part.username}`" class="mention-link">{{ part.text }}</router-link>
                  <span v-else>{{ part.text }}</span>
                </template>
              </p>
              <div class="comment__actions">
                <button class="comment__reply-btn" @click="startReply(comment)">{{ t('comment.reply') }}</button>
                <button
                  v-if="auth.user?.id === comment.userId || auth.isAdmin"
                  class="comment__delete-btn"
                  @click="emit('delete', comment.id)"
                >
                  {{ t('comment.delete') }}
                </button>
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

    <div v-if="auth.isLoggedIn" class="comments__form">
      <p v-if="replyTo" class="comments__reply-notice">
        {{ t('comment.replyingTo') }} <strong>{{ replyTo.userNickname }}</strong>
        <button class="comments__cancel-reply" @click="cancelReply">{{ t('comment.cancel') }}</button>
      </p>
      <div class="comments__row">
        <textarea
          ref="commentTextarea"
          :value="content"
          class="comments__input"
          :placeholder="replyTo ? t('comment.replyPlaceholder') : t('comment.placeholder')"
          rows="3"
          @input="onCommentInput"
          @keydown.esc="mention.close()"
        ></textarea>
        <MentionDropdown
          :suggestions="mention.suggestions"
          :pos="mention.mentionPos"
          @select="(username) => mention.insert(commentTextarea, username)"
        />
        <button
          class="btn btn--primary"
          :disabled="!content.trim() || submitting"
          @click="handleSubmit"
        >
          {{ t('comment.send') }}
        </button>
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

.comments__title {
  font-size: var(--text-lg);
  margin-bottom: var(--spacing-xl);
  color: var(--color-text-heading);
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
}

.comment__reply-btn {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  padding: 0;
}
.comment__reply-btn:hover {
  color: var(--color-primary);
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
.comment__delete-btn {
  font-size: var(--text-xs);
  color: var(--color-danger);
  padding: 0;
}
.comment__delete-btn:hover {
  opacity: 0.7;
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

.comments__row {
  display: flex;
  position: relative;
  gap: var(--spacing-sm);
  align-items: stretch;
}
.comments__input {
  flex: 1;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-md);
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  background: var(--color-surface);
  color: var(--color-text);
  resize: none;
  height: 72px;
  transition: border-color var(--transition-fast);
}
.comments__input:focus {
  outline: none;
  border-color: var(--color-primary);
}
.comments__row .btn {
  flex-shrink: 0;
  align-self: stretch;
}

.comments__login-hint {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}
.mention-link {
  color: var(--color-primary);
  font-weight: var(--weight-medium);
}
.mention-link:hover {
  text-decoration: underline;
}

</style>

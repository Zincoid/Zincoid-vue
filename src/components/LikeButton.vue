<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { likeAPI } from '@/api'

const props = defineProps({
  targetType: { type: Number, required: true },
  targetId: { type: Number, required: true },
  liked: { type: Boolean, default: false },
  count: { type: Number, default: 0 }
})

const emit = defineEmits(['update:liked', 'update:count'])

const auth = useAuthStore()
const router = useRouter()
const liked = ref(props.liked)
const count = ref(props.count)
const loading = ref(false)

watch(() => props.liked, (v) => { liked.value = v })
watch(() => props.count, (v) => { count.value = v })

async function toggle() {
  if (!auth.isLoggedIn) {
    router.push('/login')
    return
  }
  if (loading.value) return
  loading.value = true
  try {
    const { data } = await likeAPI.toggle(props.targetType, props.targetId)
    liked.value = data.data.liked
    count.value = data.data.count
    emit('update:liked', liked.value)
    emit('update:count', count.value)
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <button class="like-btn" :class="{ 'like-btn--active': liked }" @click.stop="toggle" :disabled="loading">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path v-if="!liked" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
      <path v-else d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="currentColor"/>
    </svg>
    <span>{{ count }}</span>
  </button>
</template>

<style scoped>
.like-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-full);
  background: transparent;
  color: var(--color-text-secondary);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-fast);
  line-height: 1;
}
.like-btn:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
  background: var(--color-danger-bg);
}
.like-btn--active {
  border-color: var(--color-danger);
  color: var(--color-danger);
}
.like-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'
import DigitalFlow from '@/components/DigitalFlow.vue'

const auth = useAuthStore()
const route = useRoute()

const showFlow = computed(() => {
  const pages = ['Home', 'Moments', 'Articles', 'Repos', 'Chats', 'Members']
  return pages.includes(route.name)
})
</script>

<template>
  <DigitalFlow v-if="showFlow" />
  <Navbar />
  <main class="page-content">
    <router-view />
  </main>
  <Footer />
</template>

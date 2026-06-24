<script setup>
import { useAuthStore } from '@/stores/auth'
import Navbar from '@/components/Navbar.vue'
import Footer from '@/components/Footer.vue'

const auth = useAuthStore()
</script>

<template>
  <Navbar />
  <main class="page-content">
    <router-view />
  </main>
  <Footer />
</template>

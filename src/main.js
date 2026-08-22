import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './styles/design-tokens.css'
import './styles/global.css'
import { startUpdateCheck } from './utils/checkUpdate'

if (localStorage.getItem('theme') === 'dark') {
  document.documentElement.setAttribute('data-theme', 'dark')
}

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
startUpdateCheck()

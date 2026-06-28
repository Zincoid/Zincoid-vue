<script setup>
import { useI18n } from '@/composables/useI18n'
const { t } = useI18n()
</script>

<template>
  <footer class="footer">
    <div class="footer__inner">
      <span class="footer__logo">Zincoid<span class="footer__logo--light">'s</span></span>
      <router-link to="/moments">{{ t('footer.moments') }}</router-link>
      <router-link to="/articles">{{ t('footer.articles') }}</router-link>
      <router-link to="/chats">{{ t('footer.chats') }}</router-link>
      <router-link to="/members">{{ t('footer.members') }}</router-link>
      <span class="footer__copy">&copy; {{ new Date().getFullYear() }} Zincoid</span>
      <span class="footer__filing">
        <img src="../assets/filing_icon.png" alt="" class="filing-icon" />
        <a href="https://beian.miit.gov.cn/" target="_blank">辽ICP备2026000475号-1</a>
        <a href="https://beian.mps.gov.cn/#/query/webSearch?code=21021702000850" rel="noreferrer" target="_blank">辽公网安备21021702000850号</a>
      </span>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--color-border);
  padding: var(--spacing-md) var(--spacing-xl);
  margin-top: auto;
}

.footer__inner {
  display: flex;
  align-items: center;
  gap: var(--spacing-lg);
  flex-wrap: wrap;
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

.footer__logo {
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
  color: var(--color-text-heading);
}
.footer__logo--light {
  font-weight: var(--weight-light);
  color: var(--color-text-secondary);
}

.footer__inner > a {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  transition: color var(--transition-fast);
}
.footer__inner > a:hover {
  color: var(--color-primary);
}

.footer__copy {
  white-space: nowrap;
}

.footer__filing {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  margin-left: auto;
}
.footer__filing a {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  white-space: nowrap;
}
.footer__filing a:hover {
  color: var(--color-primary);
}

.filing-icon {
  width: 14px;
  height: 14px;
}

@media (max-width: 960px) {
  .footer__inner {
    justify-content: center;
    text-align: center;
  }
  .footer__filing {
    margin-left: 0;
  }
}
</style>

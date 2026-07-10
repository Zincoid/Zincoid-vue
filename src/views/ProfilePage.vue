<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useI18n } from '@/composables/useI18n'
import { useError } from '@/composables/useError'
import { fileAPI, userAPI, authAPI } from '@/api'
import AvatarCropper from '@/components/AvatarCropper.vue'

const { t } = useI18n()
const { getMessage } = useError()
const auth = useAuthStore()

const profile = ref({
  username: '',
  nickname: '',
  gender: null,
  title: '',
  bio: '',
  avatar: '',
  skills: [],
  contacts: ''
})

const skillsInput = ref('')
const message = ref('')
const error = ref('')

// Avatar crop
const cropSrc = ref('')
const cropVisible = ref(false)

// Password
const pwdForm = ref({ oldPassword: '', newPassword: '', confirmPassword: '' })
const pwdMessage = ref('')
const pwdError = ref('')
const showPwdForm = ref(false)

// Email
const emailForm = ref({ newEmail: '', oldCode: '', newCode: '' })
const emailMessage = ref('')
const emailError = ref('')
const sendingOldCode = ref(false)
const sendingNewCode = ref(false)
const oldCodeCountdown = ref(0)
const newCodeCountdown = ref(0)
let oldCodeTimer = null
let newCodeTimer = null
const showEmailForm = ref(false)

onMounted(async () => {
  try {
    await auth.fetchMe()
    const u = auth.user
    profile.value = {
      username: u.username || '',
      nickname: u.nickname || '',
      gender: u.gender ?? null,
      title: u.title || '',
      bio: u.bio || '',
      avatar: u.avatar || '',
      skills: u.skills || [],
      contacts: u.contacts || ''
    }
    skillsInput.value = (u.skills || []).join(', ')
  } catch (e) {
    error.value = t('profile.loadFailed')
  }
})

function handleUpload(e) {
  const file = e.target.files[0]
  if (!file) return
  cropSrc.value = URL.createObjectURL(file)
  cropVisible.value = true
  e.target.value = ''
}

async function handleCrop(blob) {
  try {
    const file = new File([blob], 'avatar.png', { type: 'image/png' })
    const { data } = await fileAPI.upload(file, 2, auth.user.id)
    profile.value.avatar = data.data.url
    message.value = ''
    error.value = ''
    await userAPI.updateAvatar(data.data.url)
    await auth.fetchMe()
    message.value = t('profile.avatarUpdated')
    cropVisible.value = false
  } catch (err) {
    error.value = t('profile.uploadFailed')
  }
}

async function saveProfile() {
  message.value = ''
  error.value = ''
  if (profile.value.username.length < 3 || profile.value.username.length > 50) {
    error.value = t('auth.usernameLength')
    return
  }
  if (profile.value.contacts) {
    try {
      const obj = JSON.parse(profile.value.contacts)
      if (typeof obj !== 'object' || Array.isArray(obj)) {
        error.value = t('profile.contactsJsonHint')
        return
      }
    } catch {
      error.value = t('profile.contactsJsonHint')
      return
    }
  }
  try {
    const { avatar, ...rest } = profile.value
    const payload = {
      ...rest,
      skills: skillsInput.value.split(',').map(s => s.trim()).filter(Boolean)
    }
    const updated = await auth.updateProfile(payload)
    profile.value = {
      username: updated.username || '',
      nickname: updated.nickname || '',
      gender: updated.gender ?? null,
      title: updated.title || '',
      bio: updated.bio || '',
      avatar: updated.avatar || '',
      skills: updated.skills || [],
      contacts: updated.contacts || ''
    }
    skillsInput.value = (updated.skills || []).join(', ')
    message.value = t('profile.saved')
  } catch (err) {
    error.value = getMessage(err, 'profile.saveFailed')
  }
}

async function changePassword() {
  pwdMessage.value = ''
  pwdError.value = ''
  if (!pwdForm.value.oldPassword) {
    pwdError.value = t('auth.required')
    return
  }
  if (pwdForm.value.newPassword.length < 6 || pwdForm.value.newPassword.length > 100) {
    pwdError.value = t('auth.passwordLength')
    return
  }
  if (pwdForm.value.newPassword !== pwdForm.value.confirmPassword) {
    pwdError.value = t('auth.passwordMismatch')
    return
  }
  try {
    await auth.changePassword(pwdForm.value)
    pwdMessage.value = t('profile.passwordChanged')
    pwdForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
  } catch (err) {
    pwdError.value = getMessage(err, 'profile.pwdUpdateFailed')
  }
}

async function deleteAccount() {
  if (!confirm(t('profile.deleteAccountConfirm'))) return
  try {
    await userAPI.deleteMe()
    auth.logout()
  } catch (err) {
    error.value = getMessage(err, 'profile.deleteFailed')
  }
}

async function sendOldCode() {
  emailError.value = ''
  sendingOldCode.value = true
  try {
    await authAPI.sendOldCode()
    oldCodeCountdown.value = 60
    oldCodeTimer = setInterval(() => {
      oldCodeCountdown.value--
      if (oldCodeCountdown.value <= 0) clearInterval(oldCodeTimer)
    }, 1000)
  } catch (err) {
    emailError.value = getMessage(err, 'Failed to send code')
  } finally {
    sendingOldCode.value = false
  }
}

async function sendNewCode() {
  if (!emailForm.value.newEmail) {
    emailError.value = t('auth.emailRequired')
    return
  }
  if (!/\S+@\S+\.\S+/.test(emailForm.value.newEmail)) {
    emailError.value = t('auth.invalidEmailFormat')
    return
  }
  emailError.value = ''
  sendingNewCode.value = true
  try {
    await authAPI.sendNewCode(emailForm.value.newEmail)
    newCodeCountdown.value = 60
    newCodeTimer = setInterval(() => {
      newCodeCountdown.value--
      if (newCodeCountdown.value <= 0) clearInterval(newCodeTimer)
    }, 1000)
  } catch (err) {
    emailError.value = getMessage(err, 'Failed to send code')
  } finally {
    sendingNewCode.value = false
  }
}

async function changeEmail() {
  emailMessage.value = ''
  emailError.value = ''
  if (auth.user?.email && !emailForm.value.oldCode.trim()) {
    emailError.value = t('profile.oldCodeRequired')
    return
  }
  if (!emailForm.value.newEmail) {
    emailError.value = t('auth.emailRequired')
    return
  }
  if (!/\S+@\S+\.\S+/.test(emailForm.value.newEmail)) {
    emailError.value = t('auth.invalidEmailFormat')
    return
  }
  if (!emailForm.value.newCode.trim()) {
    emailError.value = t('auth.codeRequired')
    return
  }
  try {
    await authAPI.change({
      email: emailForm.value.newEmail,
      newCode: emailForm.value.newCode,
      oldCode: emailForm.value.oldCode
    })
    emailMessage.value = t('profile.emailChanged')
    emailForm.value = { newEmail: '', oldCode: '', newCode: '' }
    await auth.fetchMe()
  } catch (err) {
    emailError.value = getMessage(err, 'profile.emailUpdateFailed')
  }
}
</script>

<template>
  <div class="profile container">
    <div class="page-header">
      <h1 class="page-header__title"># {{ t('profile.pageTitle') }}<span class="cursor">_</span></h1>
      <p class="page-header__subtitle">{{ t('profile.subtitle') }}</p>
    </div>

    <div class="profile-layout">
      <!-- Left: Avatar -->
      <div class="profile-sidebar">
        <label class="avatar-upload">
          <img v-if="profile.avatar" :src="profile.avatar" class="avatar-preview" alt="" />
          <span v-else class="avatar-placeholder">+</span>
          <input type="file" accept="image/*" class="avatar-input" @change="handleUpload" />
        </label>
        <p class="avatar-hint">{{ t('profile.avatarHint') }}</p>
      </div>

      <!-- Right: Form -->
      <div class="profile-main">
        <div class="card">
          <h2 class="card__title">{{ t('profile.information') }}</h2>
          <div class="fields">
            <div class="field">
              <label class="field__label">{{ t('profile.username') }} <span class="field__required">*</span></label>
              <input v-model="profile.username" class="field__input" />
            </div>
            <div class="field">
              <label class="field__label">{{ t('profile.nickname') }}</label>
              <input v-model="profile.nickname" class="field__input" />
            </div>
            <div class="field-row">
              <div class="field">
                <label class="field__label">{{ t('profile.gender') }}</label>
                <div class="radio-group">
                  <label class="radio">
                    <input type="radio" v-model="profile.gender" :value="0" />
                    <span>{{ t('profile.male') }}</span>
                  </label>
                  <label class="radio">
                    <input type="radio" v-model="profile.gender" :value="1" />
                    <span>{{ t('profile.female') }}</span>
                  </label>
                  <label class="radio">
                    <input type="radio" v-model="profile.gender" :value="null" />
                    <span>{{ t('profile.hidden') }}</span>
                  </label>
                </div>
              </div>
              <div class="field">
                <label class="field__label">{{ t('profile.title') }}</label>
                <input v-model="profile.title" class="field__input" :placeholder="t('profile.titlePlaceholder')" />
              </div>
            </div>
            <div class="field">
              <label class="field__label">{{ t('profile.bio') }}</label>
              <textarea v-model="profile.bio" class="field__input field__textarea" rows="3" :placeholder="t('profile.bioPlaceholder')"></textarea>
            </div>
            <div class="field">
              <label class="field__label">{{ t('profile.skills') }}</label>
              <input v-model="skillsInput" class="field__input" :placeholder="t('profile.skillsPlaceholder')" />
              <span class="field__hint">{{ t('profile.skillsHint') }}</span>
            </div>
            <div class="field">
              <label class="field__label">{{ t('profile.contacts') }}</label>
              <textarea v-model="profile.contacts" class="field__input field__textarea" rows="2" placeholder='{"website":"...","email":"...","github":"...","bilibili":"...","x":"..."}'></textarea>
              <span class="field__hint">{{ t('profile.contactsHint') }}</span>
            </div>
          </div>

          <p v-if="message" class="msg msg--success">{{ message }}</p>
          <p v-if="error" class="msg msg--error">{{ error }}</p>

          <div class="card__actions">
            <button class="btn btn--primary btn--full" @click="saveProfile">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              {{ t('profile.save') }}
            </button>
          </div>
        </div>

        <div class="card">
          <h2 class="card__title">{{ t('profile.changePassword') }}</h2>

          <template v-if="showPwdForm">
            <div class="fields">
              <div class="field">
                <label class="field__label">{{ t('profile.oldPassword') }} <span class="field__required">*</span></label>
                <input v-model="pwdForm.oldPassword" class="field__input" type="password" autocomplete="off" :placeholder="t('profile.oldPasswordPlaceholder')" />
              </div>
              <div class="field">
                <label class="field__label">{{ t('profile.newPassword') }} <span class="field__required">*</span></label>
                <input v-model="pwdForm.newPassword" class="field__input" type="password" autocomplete="new-password" :placeholder="t('profile.newPasswordPlaceholder')" />
              </div>
              <div class="field">
                <label class="field__label">{{ t('auth.confirmPassword') }} <span class="field__required">*</span></label>
                <input v-model="pwdForm.confirmPassword" class="field__input" type="password" autocomplete="new-password" :placeholder="t('auth.confirmPasswordPlaceholder')" />
              </div>
            </div>

            <p v-if="pwdMessage" class="msg msg--success">{{ pwdMessage }}</p>
            <p v-if="pwdError" class="msg msg--error">{{ pwdError }}</p>

            <div class="card__actions" style="display:flex;gap:var(--spacing-sm)">
              <button class="btn btn--outline btn--full" @click="showPwdForm = false">{{ t('common.cancel') }}</button>
              <button class="btn btn--primary btn--full" @click="changePassword">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                {{ t('common.confirm') }}
              </button>
            </div>
          </template>

          <button v-else class="btn btn--outline btn--full" @click="showPwdForm = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            {{ t('profile.changePassword') }}
          </button>
        </div>

        <div class="card">
          <h2 class="card__title">{{ t('profile.changeEmail') }}</h2>

          <template v-if="showEmailForm">
            <div class="fields">
              <!-- Current email -->
              <div class="field">
                <label class="field__label">{{ t('profile.currentEmail') }}: {{ auth.user?.email || t('common.notSet') }}</label>
                <template v-if="auth.user?.email">
                  <p class="field__hint" style="margin-bottom:var(--spacing-sm)">{{ t('profile.oldEmailHint') }} <span class="field__required">*</span></p>
                  <div style="display:flex;gap:var(--spacing-sm)">
                    <input v-model="emailForm.oldCode" class="field__input" style="flex:1" type="text" maxlength="6" :placeholder="t('profile.oldCodePlaceholder')" />
                    <button class="btn btn--outline" :disabled="sendingOldCode || oldCodeCountdown > 0" @click="sendOldCode" type="button">
                      {{ oldCodeCountdown > 0 ? oldCodeCountdown + 's' : (sendingOldCode ? '...' : t('auth.sendCode')) }}
                    </button>
                  </div>
                </template>
              </div>

              <hr class="email-divider" />

              <!-- Enter new email -->
              <div class="field">
                <label class="field__label">{{ t('profile.newEmail') }} <span class="field__required">*</span></label>
                <input v-model="emailForm.newEmail" class="field__input" type="email" :placeholder="t('profile.newEmailPlaceholder')" />
              </div>

              <!-- Verify new email -->
              <div class="field">
                <label class="field__label">{{ t('profile.newEmailCode') }} <span class="field__required">*</span></label>
                <div style="display:flex;gap:var(--spacing-sm)">
                  <input v-model="emailForm.newCode" class="field__input" style="flex:1" type="text" maxlength="6" :placeholder="t('profile.newCodePlaceholder')" />
                  <button class="btn btn--outline" :disabled="sendingNewCode || newCodeCountdown > 0" @click="sendNewCode" type="button">
                    {{ newCodeCountdown > 0 ? newCodeCountdown + 's' : (sendingNewCode ? '...' : t('auth.sendCode')) }}
                  </button>
                </div>
              </div>
            </div>

            <p v-if="emailMessage" class="msg msg--success">{{ emailMessage }}</p>
            <p v-if="emailError" class="msg msg--error">{{ emailError }}</p>

            <div class="card__actions" style="display:flex;gap:var(--spacing-sm)">
              <button class="btn btn--outline btn--full" @click="showEmailForm = false; emailForm = { newEmail: '', oldCode: '', newCode: '' }; emailError = ''; emailMessage = ''; clearInterval(oldCodeTimer); clearInterval(newCodeTimer); oldCodeCountdown = 0; newCodeCountdown = 0">{{ t('common.cancel') }}</button>
              <button class="btn btn--primary btn--full" @click="changeEmail">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                {{ t('common.confirm') }}
              </button>
            </div>
          </template>

          <template v-else>
            <p class="card__desc">{{ t('profile.currentEmail') }}: {{ auth.user?.email || t('common.notSet') }}</p>
            <div class="card__actions">
              <button class="btn btn--outline btn--full" @click="showEmailForm = true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                {{ t('profile.changeEmail') }}
              </button>
            </div>
          </template>
        </div>

        <div class="card">
          <h2 class="card__title card__title--danger">{{ t('profile.deleteAccount') }}</h2>
          <p class="card__desc">{{ t('profile.deleteAccountDesc') }}</p>
          <div class="card__actions">
            <button class="btn btn--danger btn--full" @click="deleteAccount">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              {{ t('profile.deleteAccount') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <AvatarCropper
      :src="cropSrc"
      :visible="cropVisible"
      @crop="handleCrop"
      @close="cropVisible = false"
    />
  </div>
</template>

<style scoped>
.profile {
  padding-bottom: var(--spacing-4xl);
}

.profile-layout {
  display: flex;
  gap: var(--spacing-2xl);
  align-items: flex-start;
}

/* ── Sidebar ── */
.profile-sidebar {
  flex-shrink: 0;
  text-align: center;
  padding-top: var(--spacing-sm);
}

.avatar-upload {
  display: block;
  cursor: pointer;
  width: 120px;
  height: 120px;
  margin: 0 auto;
}

.avatar-preview {
  width: 120px;
  height: 120px;
  border-radius: var(--rounded-full);
  object-fit: cover;
  border: 3px solid var(--color-border);
  transition: border-color var(--transition-fast);
}

.avatar-preview:hover {
  border-color: var(--color-primary);
}

.avatar-placeholder {
  width: 120px;
  height: 120px;
  border-radius: var(--rounded-full);
  border: 2px dashed var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-3xl);
  color: var(--color-text-secondary);
  transition: all var(--transition-fast);
}

.avatar-placeholder:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
}

.avatar-input {
  display: none;
}

.avatar-hint {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-top: var(--spacing-sm);
}

/* ── Main ── */
.profile-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-xl);
}

/* ── Card ── */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--rounded-lg);
  padding: var(--spacing-2xl);
}

.card__title {
  font-size: var(--text-lg);
  margin-bottom: var(--spacing-xl);
  padding-bottom: var(--spacing-md);
  border-bottom: 1px solid var(--color-border-light);
}

.card__actions {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--color-border-light);
}

/* ── Fields ── */
.fields {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--spacing-lg);
  min-width: 0;
}
.field-row .field {
  min-width: 0;
}
.field-row .field__input {
  min-width: 0;
}

.field__hint {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
  margin-top: 2px;
}

/* ── Radio Group ── */
.radio-group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-sm) var(--spacing-lg);
  padding-top: var(--spacing-xs);
}

.radio {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  cursor: pointer;
  font-size: var(--text-base);
  color: var(--color-text);
}

.radio input[type="radio"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
  cursor: pointer;
}

.radio span {
  line-height: 1;
}

.card .msg {
  margin-top: var(--spacing-lg);
}

.email-divider { border: none; border-top: 1px solid var(--color-border-light); margin: var(--spacing-xs) 0; }

.card__desc {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-bottom: var(--spacing-md);
}

.card__title--danger {
  color: var(--color-danger);
}

.btn--danger {
  background: var(--color-danger);
  color: white;
  border: none;
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--rounded-md);
  cursor: pointer;
  font-size: var(--text-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  transition: opacity var(--transition-fast);
}
.btn--danger:hover {
  opacity: 0.85;
}

@media (max-width: 700px) {
  .profile-layout {
    flex-direction: column;
    align-items: center;
  }

  .profile-sidebar {
    padding-top: 0;
  }

  .profile-main {
    width: 100%;
  }

  .field-row {
    grid-template-columns: 1fr;
  }

  .card {
    padding: var(--spacing-lg);
  }
}
</style>

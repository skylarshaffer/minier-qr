<script setup lang="ts">
import LanguageSelector from '@/components/LanguageSelector.vue'
import MobileMenu from '@/components/MobileMenu.vue'
import QRCodeCreate from '@/components/QRCodeCreate.vue'
import AppFooter from '@/components/AppFooter.vue'
import useDarkModePreference from '@/utils/useDarkModePreference'
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const { isDarkMode, isDarkModePreferenceSetBySystem, toggleDarkModePreference } =
  useDarkModePreference()

const capturedData = ref<string>('')

// #region Scroll-aware header
const lastScrollTop = ref(0)
const isHeaderCollapsed = ref(false)
const scrollThreshold = 50 // Scroll threshold to trigger header collapse

const handleScroll = () => {
  const currentScrollTop = document.querySelector('#app')?.scrollTop
  if (!currentScrollTop) return

  // Determine scroll direction and distance
  if (currentScrollTop > lastScrollTop.value && currentScrollTop > scrollThreshold) {
    // Scrolling down past threshold
    isHeaderCollapsed.value = true
  } else if (currentScrollTop < lastScrollTop.value || currentScrollTop < scrollThreshold) {
    // Scrolling up or at top
    isHeaderCollapsed.value = false
  }

  lastScrollTop.value = currentScrollTop
}

onMounted(() => {
  document.querySelector('#app')?.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  document.querySelector('#app')?.removeEventListener('scroll', handleScroll)
})
// #endregion

</script>

<template>
  <main>
    <!-- Desktop header - only visible on desktop -->
    <div
      class="hidden md:mx-auto md:mb-4 md:mt-8 md:flex md:w-5/6 md:flex-row md:justify-between md:ps-4"
    >
      <div class="flex items-center">
        <h1 class="text-3xl text-gray-700 dark:text-gray-100">MinierQR</h1>
      </div>

      <div class="flex items-center justify-end gap-2">
        <a
          class="icon-button"
          href="https://github.com/lyqht/mini-qr"
          target="_blank"
          :aria-label="t('GitHub repository for this project')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
            <path
              fill="#abcbca"
              d="M12.001 2c-5.525 0-10 4.475-10 10a9.994 9.994 0 0 0 6.837 9.488c.5.087.688-.213.688-.476c0-.237-.013-1.024-.013-1.862c-2.512.463-3.162-.612-3.362-1.175c-.113-.288-.6-1.175-1.025-1.413c-.35-.187-.85-.65-.013-.662c.788-.013 1.35.725 1.538 1.025c.9 1.512 2.337 1.087 2.912.825c.088-.65.35-1.087.638-1.337c-2.225-.25-4.55-1.113-4.55-4.938c0-1.088.387-1.987 1.025-2.688c-.1-.25-.45-1.275.1-2.65c0 0 .837-.262 2.75 1.026a9.28 9.28 0 0 1 2.5-.338c.85 0 1.7.112 2.5.337c1.913-1.3 2.75-1.024 2.75-1.024c.55 1.375.2 2.4.1 2.65c.637.7 1.025 1.587 1.025 2.687c0 3.838-2.337 4.688-4.563 4.938c.363.312.676.912.676 1.85c0 1.337-.013 2.412-.013 2.75c0 .262.188.574.688.474A10.016 10.016 0 0 0 22 12c0-5.525-4.475-10-10-10Z"
            />
          </svg>
        </a>
        <button
          class="icon-button"
          @click="toggleDarkModePreference"
          :aria-label="t('Toggle dark mode')"
        >
          <span v-if="isDarkModePreferenceSetBySystem">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
              <g fill="#abcabc">
                <path d="M12 16a4 4 0 0 0 0-8z" />
                <path
                  fill-rule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10s10-4.477 10-10S17.523 2 12 2m0 2v4a4 4 0 1 0 0 8v4a8 8 0 1 0 0-16"
                  clip-rule="evenodd"
                />
              </g>
            </svg>
          </span>
          <span v-else-if="isDarkMode">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke="#abcbca"
              stroke-width="2"
              width="28"
              height="28"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </span>
          <span v-else>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="icon"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="2"
              width="28"
              height="28"
            >
              <path
                fill="#abcbca"
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          </span>
        </button>
        <LanguageSelector />
      </div>
    </div>

    <!-- Mobile sticky header - only visible on mobile -->
    <div
      class="scroll-header-container fixed inset-x-0 top-0 z-50 md:hidden"
      :class="{ 'header-collapsed': isHeaderCollapsed }"
    >
      <div class="flex justify-center">
        <div
          class="relative flex items-center gap-1 rounded-lg border border-zinc-300 bg-zinc-100 p-1 shadow-lg transition-all duration-300 dark:border-zinc-700 dark:bg-zinc-800 dark:shadow-slate-800"
        >
          <!-- Hamburger menu -->
          <MobileMenu
            :isDarkMode="isDarkMode"
            :isDarkModePreferenceSetBySystem="isDarkModePreferenceSetBySystem"
            @toggle-dark-mode="toggleDarkModePreference"
          />
        </div>
      </div>
    </div>

    <div
      class="relative grid min-h-screen place-items-center items-start bg-white p-8 pt-16 dark:bg-zinc-900 md:px-6 md:pt-8"
    >
      <!-- Main content area with conditional rendering based on app mode -->
      <div class="w-full lg:w-5/6">
        <div>
          <QRCodeCreate :initial-data="capturedData" />
        </div>
      </div>
    </div>
    <AppFooter />
  </main>
</template>

<style lang="postcss" scoped>
.vertical-border {
  @apply h-8 bg-slate-300 dark:bg-slate-700 w-1;
}

.icon-button {
  @apply p-1;
  @apply outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 dark:focus-visible:ring-zinc-200 hover:shadow rounded-sm;
  @apply text-zinc-900 dark:text-zinc-100 dark:bg-zinc-800;
}

.button {
  @apply bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-200;
  @apply shadow-sm hover:shadow p-2 focus-visible:shadow-md rounded-lg;
  @apply outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 dark:focus-visible:ring-zinc-200;
  @apply disabled:opacity-50 disabled:cursor-not-allowed;
}

/* Scroll-aware header styles */
.scroll-header-container {
  transition: transform 0.3s ease;
}

.header-collapsed {
  transform: translateY(-40%);
}

.header-collapsed button {
  transition: all 0.3s ease;
}
</style>

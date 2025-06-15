<script setup lang="ts">
import CopyImageModal from '@/components/CopyImageModal.vue'
import StyledQRCode from '@/components/StyledQRCode.vue'
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer'
import {
  copyImageToClipboard,
  downloadJpgElement,
  downloadPngElement,
  downloadSvgElement,
  getPngElement,
  IS_COPY_IMAGE_TO_CLIPBOARD_SUPPORTED
} from '@/utils/convertToImage'
import { getNumericCSSValue } from '@/utils/formatting'
import { allQrCodePresets, defaultPreset, type Preset } from '@/utils/qrCodePresets'
import { useMediaQuery } from '@vueuse/core'
import {
  type ErrorCorrectionLevel,
  type Options as StyledQRCodeProps
} from 'qr-code-styling'
import { computed, ref, watch, nextTick } from 'vue'
import 'vue-i18n'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  initialData?: string
}>()

const mainContentContainer = ref<HTMLElement | null>(null)
const isLarge = useMediaQuery('(min-width: 768px)')
const isLikelyMobileDevice = computed(() => {
  return typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
})

//#region /** locale */
const { t } = useI18n()
//#endregion

//#region /* QR code style settings */
const data = ref(props.initialData || import.meta.env.VITE_DEFAULT_DATA_TO_ENCODE || '')
const debouncedData = ref(data.value)
let dataDebounceTimer: ReturnType<typeof setTimeout>

watch(
  data,
  (newVal) => {
    clearTimeout(dataDebounceTimer)
    dataDebounceTimer = setTimeout(() => {
      debouncedData.value = newVal
    }, 500)
  },
  { immediate: true }
)
const image = ref()
const width = ref()
const margin = ref()
const imageMargin = ref()

watch(
  () => props.initialData,
  (newValue) => {
    if (newValue) {
      data.value = newValue
    }
  }
)

const dotsOptionsColor = ref()
const dotsOptionsType = ref()
const cornersSquareOptionsColor = ref()
const cornersSquareOptionsType = ref()
const cornersDotOptionsColor = ref()
const cornersDotOptionsType = ref()
const styleBorderRadius = ref()
const styledBorderRadiusFormatted = computed(() => `${styleBorderRadius.value}px`)
const styleBackground = ref(defaultPreset.style.background)
const lastBackground = ref(defaultPreset.style.background)
const includeBackground = ref(true)
watch(
  includeBackground,
  (newIncludeBackground) => {
    if (!newIncludeBackground) {
      lastBackground.value = styleBackground.value
      styleBackground.value = 'transparent'
    } else {
      styleBackground.value = lastBackground.value
    }
  },
  {
    immediate: true
  }
)

const dotsOptions = computed(() => ({
  color: dotsOptionsColor.value,
  type: dotsOptionsType.value
}))
const cornersSquareOptions = computed(() => ({
  color: cornersSquareOptionsColor.value,
  type: cornersSquareOptionsType.value
}))
const cornersDotOptions = computed(() => ({
  color: cornersDotOptionsColor.value,
  type: cornersDotOptionsType.value
}))
const style = computed(() => ({
  borderRadius: styledBorderRadiusFormatted.value,
  background: styleBackground.value
}))
const imageOptions = computed(() => ({
  margin: imageMargin.value
}))
const qrOptions = computed(() => ({
  errorCorrectionLevel: errorCorrectionLevel.value
}))

const qrCodeProps = computed<StyledQRCodeProps>(() => ({
  data: debouncedData.value || 'Have a beautiful day!',
  image: image.value,
  width: width.value,
  margin: margin.value,
  dotsOptions: dotsOptions.value,
  cornersSquareOptions: cornersSquareOptions.value,
  cornersDotOptions: cornersDotOptions.value,
  imageOptions: imageOptions.value,
  qrOptions: qrOptions.value
}))

function uploadImage() {
  console.debug('Uploading image')
  const imageInput = document.createElement('input')
  imageInput.type = 'file'
  imageInput.accept = 'image/*'
  imageInput.onchange = (event: Event) => {
    const target = event.target as HTMLInputElement
    if (target.files) {
      const file = target.files[0]
      const reader = new FileReader()
      reader.onload = (event: ProgressEvent<FileReader>) => {
        const target = event.target as FileReader
        const result = target.result as string
        image.value = result
      }
      reader.readAsDataURL(file)
    }
  }
  imageInput.click()
}
// #endregion

// #region /* Preset settings */
const selectedPreset = ref<
  Preset & { key?: string; qrOptions?: { errorCorrectionLevel: ErrorCorrectionLevel } }
>(defaultPreset)
watch(selectedPreset, () => {
  // Only update data from preset if there's no initialData or if data is empty
  if (!props.initialData || data.value === '') {
    data.value = selectedPreset.value.data
  }

  image.value = selectedPreset.value.image
  width.value = selectedPreset.value.width
  margin.value = selectedPreset.value.margin
  imageMargin.value = selectedPreset.value.imageOptions.margin
  dotsOptionsColor.value = selectedPreset.value.dotsOptions.color
  dotsOptionsType.value = selectedPreset.value.dotsOptions.type
  cornersSquareOptionsColor.value = selectedPreset.value.cornersSquareOptions.color
  cornersSquareOptionsType.value = selectedPreset.value.cornersSquareOptions.type
  cornersDotOptionsColor.value = selectedPreset.value.cornersDotOptions.color
  cornersDotOptionsType.value = selectedPreset.value.cornersDotOptions.type
  styleBorderRadius.value = getNumericCSSValue(selectedPreset.value.style.borderRadius as string)
  styleBackground.value = selectedPreset.value.style.background
  includeBackground.value = selectedPreset.value.style.background !== 'transparent'
  errorCorrectionLevel.value =
    selectedPreset.value.qrOptions && selectedPreset.value.qrOptions.errorCorrectionLevel
      ? selectedPreset.value.qrOptions.errorCorrectionLevel
      : 'M'
})

const LAST_LOADED_LOCALLY_PRESET_KEY = 'Last saved locally'
const LOADED_FROM_FILE_PRESET_KEY = 'Loaded from file'
const CUSTOM_LOADED_PRESET_KEYS = [LAST_LOADED_LOCALLY_PRESET_KEY, LOADED_FROM_FILE_PRESET_KEY]
const selectedPresetKey = ref<string>(
  defaultPreset.name
)
const lastCustomLoadedPreset = ref<Preset>()
watch(
  selectedPresetKey,
  (newKey, prevKey) => {
    if (newKey === prevKey || !newKey) return

    if (
      import.meta.env.VITE_DISABLE_LOCAL_STORAGE !== 'true' &&
      CUSTOM_LOADED_PRESET_KEYS.includes(newKey) &&
      lastCustomLoadedPreset.value
    ) {
      selectedPreset.value = lastCustomLoadedPreset.value
      return
    }

    const updatedPreset = allQrCodePresets.find((preset) => preset.name === newKey)
    if (updatedPreset) {
      selectedPreset.value = updatedPreset
    }
  },
  { immediate: true }
)
//#endregion

//#region /* Error correction level */
const errorCorrectionLevels: ErrorCorrectionLevel[] = ['L', 'M', 'Q', 'H']
const errorCorrectionLevel = ref<ErrorCorrectionLevel>('M')
const ERROR_CORRECTION_LEVEL_LABELS: Record<ErrorCorrectionLevel, string> = {
  L: `Low (7%)`,
  M: `Medium (15%)`,
  Q: `High (25%)`,
  H: `Highest (30%)`
}
const recommendedErrorCorrectionLevel = computed<ErrorCorrectionLevel | null>(() => {
  if (!data.value) return null
  if (data.value.length <= 50) {
    return 'H'
  } else if (data.value.length <= 150) {
    return 'Q'
  } else if (data.value.length <= 500) {
    return 'M'
  } else {
    return 'L'
  }
})
//#endregion

//#region /* General Export - download qr code and copy to clipboard */
const isExportButtonDisabled = computed(() => {
  return !data.value
})

const PREVIEW_QRCODE_DIM_UNIT = 200

/**
 * Calculates the dimensions for QR code export
 * Uses the configured width value.
 */
function getExportDimensions() {
  const el = document.getElementById('element-to-export')
  if (!el) {
    return {
      width: width.value,
      height: width.value
    }
  }

  // Calculate the scale factor based on the preview size
  const scaleFactor = width.value / PREVIEW_QRCODE_DIM_UNIT

  const elWidth = el.offsetWidth
  const elHeight = el.offsetHeight

  // Get the actual dimensions and apply the scale factor
  return {
    width: elWidth * scaleFactor,
    height: elHeight * scaleFactor
  }
}

// #region Copy image modal (Safari fallback)
const showSafariCopyImageModal = ref(false)
const copyModalIsLoading = ref(false)
const copyModalImageSrc = ref<string | null>(null)

async function openCopyModal() {
  const el = document.getElementById('element-to-export')
  if (!el) return
  copyModalIsLoading.value = true
  try {
    copyModalImageSrc.value = await getPngElement(
      el,
      getExportDimensions(),
      styledBorderRadiusFormatted.value
    )
    showSafariCopyImageModal.value = true
  } catch (error) {
    console.error('Error preparing image for copy modal:', error)
  } finally {
    copyModalIsLoading.value = false
  }
}

function closeCopyModal() {
  showSafariCopyImageModal.value = false
  copyModalImageSrc.value = null
}
// #endregion

function copyQRToClipboard() {
  const el = document.getElementById('element-to-export')
  if (!el) {
    return
  }
  if (IS_COPY_IMAGE_TO_CLIPBOARD_SUPPORTED) {
    copyImageToClipboard(el, getExportDimensions(), styledBorderRadiusFormatted.value)
  } else if (!isLikelyMobileDevice.value) {
    // for now we only open the copy image modal on safari desktop because
    // this modal will be hidden behind the export image modal on mobile viewport.
    openCopyModal()
  }
}

/**
 * Downloads QR code in specified format
 * @param format The format to download: 'png', 'svg', or 'jpg'
 */
function downloadQRImage(format: 'png' | 'svg' | 'jpg') {
  const formatConfig = {
    png: { fn: downloadPngElement, filename: 'qr-code.png' },
    svg: { fn: downloadSvgElement, filename: 'qr-code.svg' },
    jpg: { fn: downloadJpgElement, filename: 'qr-code.jpg', extraOptions: { bgcolor: 'white' } }
  }[format]

  const el = document.getElementById('element-to-export')
  if (!el) {
    return
  }

  formatConfig.fn(
    el,
    formatConfig.filename,
    { ...getExportDimensions(), ...formatConfig.extraOptions },
    styledBorderRadiusFormatted.value
  )
}
//#endregion



//#region /* Dynamic padding for mobile drawer */
const drawerTriggerHeight = ref(0)
const BUFFER_PADDING = 20 // Extra space below the drawer trigger

function updateDrawerTriggerHeight() {
  nextTick(() => {
    const el = document.getElementById('drawer-preview-container')
    if (el) {
      drawerTriggerHeight.value = el.offsetHeight
    } else {
      drawerTriggerHeight.value = 0 // Fallback if element not found
    }
  })
}

watch(
  isLarge,
  (newIsLarge) => {
    if (!newIsLarge) {
      updateDrawerTriggerHeight() // Drawer is now visible
    } else {
      drawerTriggerHeight.value = 0 // Drawer is hidden, reset padding effect
    }
  },
  { immediate: true } // Run on initial load
)



const mainDivPaddingStyle = computed(() => {
  if (!isLarge.value && drawerTriggerHeight.value > 0) {
    return { paddingBottom: `${drawerTriggerHeight.value + BUFFER_PADDING}px` }
  }
  return { paddingBottom: '0px' } // Default for large screens or if height is 0
})
//#endregion
</script>

<template>
  <div
    class="flex items-start justify-center gap-4 md:flex-row md:gap-6 lg:gap-12 lg:pb-0"
    :style="mainDivPaddingStyle"
  >
    <!-- Sticky sidebar on large screens -->
    <div
      v-if="isLarge"
      ref="mainContentContainer"
      id="main-content-container"
      class="sticky top-0 flex w-full shrink-0 flex-col items-center justify-center p-4 md:w-fit"
    ></div>
    <!-- Bottom sheet on small screens -->
    <Drawer v-else>
      <DrawerTrigger
        id="drawer-preview-container"
        class="fixed inset-x-0 bottom-0 z-10 rounded-t-lg border-t border-solid border-slate-300 bg-white shadow-2xl outline-none focus-visible:ring-1 focus-visible:ring-zinc-700 dark:bg-black dark:focus-visible:ring-zinc-200"
      >
        <div class="flex flex-col items-center">
          <!-- Handle indicator for bottom sheet -->
          <div class="mt-2 h-1 w-16 rounded-full bg-gray-300 dark:bg-gray-700"></div>
          <div :class="['w-full', '-my-8']">
            <div class="flex origin-center scale-[0.7] items-center justify-center md:scale-100">
              <div id="qr-code-container" class="grid place-items-center">
                <div
                  class="grid place-items-center overflow-hidden"
                  :style="[
                    style,
                    {
                      width: `${PREVIEW_QRCODE_DIM_UNIT}px`,
                      height: `${PREVIEW_QRCODE_DIM_UNIT}px`
                    }
                  ]"
                >
                  <StyledQRCode
                    v-bind="{
                      ...qrCodeProps,
                      data: data?.length > 0 ? data : t('Have nice day!'),
                      width: PREVIEW_QRCODE_DIM_UNIT,
                      height: PREVIEW_QRCODE_DIM_UNIT
                    }"
                    role="img"
                    aria-label="QR code"
                  />
                </div>
              </div>
            </div>
          </div>
          <div
            class="flex items-center gap-1 py-2 text-center text-sm text-gray-600 dark:text-gray-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              class="inline"
            >
              <path fill="currentColor" d="M12 8l-6 6l1.41 1.41L12 10.83l4.59 4.58L18 14z" />
            </svg>
            {{ t('Export') }}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              class="inline"
            >
              <path fill="currentColor" d="M12 8l-6 6l1.41 1.41L12 10.83l4.59 4.58L18 14z" />
            </svg>
          </div>
        </div>
      </DrawerTrigger>
      <DrawerContent class="flex h-screen flex-col items-center justify-between">
        <div class="flex grow flex-col items-center justify-center gap-4">
          <DrawerTitle>{{ t('Export') }}</DrawerTitle>
          <div ref="mainContentContainer" id="main-content-container" class="w-full"></div>
        </div>
      </DrawerContent>
    </Drawer>

    <!-- Main content -->
    <Teleport to="#main-content-container" v-if="mainContentContainer != null">
      <div id="main-content">
        <div
          id="qr-code-container"
          :class="[
            'grid origin-center place-items-center',
            'scale-[0.7] md:scale-100'
          ]"
        >
          <div
            id="element-to-export"
            class="grid place-items-center overflow-hidden"
            :style="[
              style,
              {
                width: `${PREVIEW_QRCODE_DIM_UNIT}px`,
                height: `${PREVIEW_QRCODE_DIM_UNIT}px`
              }
            ]"
          >
            <StyledQRCode
              v-bind="{
                ...qrCodeProps,
                data: data?.length > 0 ? data : t('Have nice day!'),
                width: PREVIEW_QRCODE_DIM_UNIT,
                height: PREVIEW_QRCODE_DIM_UNIT
              }"
              role="img"
              aria-label="QR code"
            />
          </div>
        </div>
        <div class="mt-4 flex flex-col items-center gap-8">
          <div class="flex flex-col items-center justify-center gap-3">
            <button
              id="copy-qr-image-button"
              class="button flex w-fit max-w-full flex-row items-center gap-1"
              @click="copyQRToClipboard"
              :disabled="isExportButtonDisabled"
              :title="
                isExportButtonDisabled
                  ? t('Please enter data to encode first')
                  : t('Copy QR Code to clipboard')
              "
              :aria-label="t('Copy QR Code to clipboard')"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                <g
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                >
                  <path d="M8 10a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2z" />
                  <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
                </g>
              </svg>
              <p>{{ t('Copy QR Code to clipboard') }}</p>
            </button>
          </div>
          <div id="export-options" class="grid place-items-center gap-4">
            <p class="text-zinc-900 dark:text-zinc-100">{{ t('Export as') }}</p>
            <div class="flex flex-row items-center justify-center gap-2">
              <button
                id="download-qr-image-button-png"
                class="button"
                @click="() => downloadQRImage('png')"
                :disabled="isExportButtonDisabled"
                :title="
                  isExportButtonDisabled
                    ? t('Please enter data to encode first')
                    : t('Download QR Code as PNG')
                "
                :aria-label="t('Download QR Code as PNG')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <g fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M5 12V5a2 2 0 0 1 2-2h7l5 5v4" />
                    <text
                      x="1"
                      y="22"
                      fill="currentColor"
                      stroke="none"
                      font-size="11px"
                      font-family="monospace"
                      font-weight="600"
                    >
                      PNG
                    </text>
                  </g>
                </svg>
              </button>
              <button
                id="download-qr-image-button-jpg"
                class="button"
                @click="() => downloadQRImage('jpg')"
                :disabled="isExportButtonDisabled"
                :title="
                  isExportButtonDisabled
                    ? t('Please enter data to encode first')
                    : t('Download QR Code as JPG')
                "
                :aria-label="t('Download QR Code as JPG')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <g fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M5 12V5a2 2 0 0 1 2-2h7l5 5v4" />
                    <text
                      x="1"
                      y="22"
                      fill="currentColor"
                      stroke="none"
                      font-size="11px"
                      font-family="monospace"
                      font-weight="600"
                    >
                      JPG
                    </text>
                  </g>
                </svg>
              </button>
              <button
                id="download-qr-image-button-svg"
                class="button"
                @click="() => downloadQRImage('svg')"
                :disabled="isExportButtonDisabled"
                :title="
                  isExportButtonDisabled
                    ? t('Please enter data to encode first')
                    : t('Download QR Code as SVG')
                "
                :aria-label="t('Download QR Code as SVG')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
                  <g fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                    <path d="M5 12V5a2 2 0 0 1 2-2h7l5 5v4" />
                    <text
                      x="1"
                      y="22"
                      fill="currentColor"
                      stroke="none"
                      font-size="11px"
                      font-family="monospace"
                      font-weight="600"
                    >
                      SVG
                    </text>
                  </g>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <div id="settings" class="flex w-full grow flex-col items-start gap-8 text-start">
      <div class="flex w-full flex-col gap-4">
        <div class="px-2 pb-8 pt-4">
          <section class="space-y-8" aria-labelledby="qr-code-settings-title">
            <div class="w-full">
              <div class="flex w-full flex-col flex-wrap gap-4 sm:flex-row sm:gap-x-8">
                <!-- Data to encode area -->
                <div class="flex grow flex-col gap-4">
                <div class="grow">
                  <!-- Header row: Label -->
                  <div class="mb-2 flex items-center gap-4">
                    <label for="data">{{ t('Data to encode') }}</label>
                  </div>
                  <!-- Single Mode Input -->
                  <div class="flex flex-col items-start">
                    <textarea
                      id="data"
                      v-model="data"
                      class="mr-2 grow text-input"
                      :placeholder="t('data to encode e.g. a URL or a string')"
                    ></textarea>
                  </div>
                <!-- Image area -->
                </div>
                <div class="grow">
                <div class="mb-2 flex flex-row items-center gap-2">
                <label for="image-url">
                  {{ t('Logo image URL') }}
                </label>
                <button class="icon-button flex flex-row items-center" @click="uploadImage">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                  >
                    <g
                      fill="none"
                      stroke="currentColor"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                    >
                      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
                      <path
                        d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2zm-5-10v6"
                      />
                      <path d="M9.5 13.5L12 11l2.5 2.5" />
                    </g>
                  </svg>
                  <span>{{ t('Upload image') }}</span>
                </button>
              </div>
              <textarea
                name="image-url"
                class="text-input"
                id="image-url"
                rows="1"
                :placeholder="t('Logo image URL')"
                v-model="image"
              />
                </div>
                </div>
                <!-- Error correction level -->
                <div class="shrink-0">
                  <fieldset class="h-full" role="radio" tabindex="0">
                    <div class="flex flex-row items-center gap-2">
                      <legend>{{ t('Error correction level') }}</legend>
                      <a
                        href="https://docs.uniqode.com/en/articles/7219782-what-is-the-recommended-error-correction-level-for-printing-a-qr-code"
                        target="_blank"
                        class="icon-button flex flex-row items-center"
                        :aria-label="t('What is error correction level?')"
                      >
                        <svg
                          class="me-1"
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                        >
                          <path
                            fill="#888888"
                            d="M11.95 18q.525 0 .888-.363t.362-.887t-.362-.888t-.888-.362t-.887.363t-.363.887t.363.888t.887.362m.05 4q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22m0-2q3.35 0 5.675-2.325T20 12t-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20m.1-12.3q.625 0 1.088.4t.462 1q0 .55-.337.975t-.763.8q-.575.5-1.012 1.1t-.438 1.35q0 .35.263.588t.612.237q.375 0 .638-.25t.337-.625q.1-.525.45-.937t.75-.788q.575-.55.988-1.2t.412-1.45q0-1.275-1.037-2.087T12.1 6q-.95 0-1.812.4T8.975 7.625q-.175.3-.112.638t.337.512q.35.2.725.125t.625-.425q.275-.375.688-.575t.862-.2"
                          />
                        </svg>
                      </a>
                    </div>
                    <div v-for="level in errorCorrectionLevels" class="radio" :key="level">
                      <input
                        :id="'errorCorrectionLevel-' + level"
                        type="radio"
                        v-model="errorCorrectionLevel"
                        :value="level"
                        :aria-describedby="
                          level === recommendedErrorCorrectionLevel
                            ? 'recommended-text'
                            : undefined
                        "
                      />
                      <div class="flex items-center gap-2">
                        <label :for="'errorCorrectionLevel-' + level">{{
                          t(ERROR_CORRECTION_LEVEL_LABELS[level])
                        }}</label>
                        <span
                          v-if="level === recommendedErrorCorrectionLevel"
                          class="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200"
                        >
                          {{ t('Suggested') }}
                        </span>
                      </div>
                    </div>
                  </fieldset>
                </div>
              </div>
            </div>
            <div class="flex flex-row items-center gap-2">
              <label for="with-background">
                {{ t('With background') }}
              </label>
              <input id="with-background" type="checkbox" v-model="includeBackground" />
            </div>
            <div id="color-settings" :class="'flex w-full flex-row flex-wrap gap-4'">
              <div
                :inert="!includeBackground"
                :class="[!includeBackground && 'opacity-30', 'flex flex-row items-center gap-2']"
              >
                <label for="background-color">{{ t('Background color') }}</label>
                <input
                  id="background-color"
                  type="color"
                  class="color-input"
                  v-model="styleBackground"
                />
              </div>
              <div class="flex flex-row items-center gap-2">
                <label for="dots-color">{{ t('Dots color') }}</label>
                <input
                  id="dots-color"
                  type="color"
                  class="color-input"
                  v-model="dotsOptionsColor"
                />
              </div>
              <div class="flex flex-row items-center gap-2">
                <label for="corners-square-color">{{ t('Corners Square color') }}</label>
                <input
                  id="corners-square-color"
                  type="color"
                  class="color-input"
                  v-model="cornersSquareOptionsColor"
                />
              </div>
              <div class="flex flex-row items-center gap-2">
                <label for="corners-dot-color">{{ t('Corners Dot color') }}</label>
                <input
                  id="corners-dot-color"
                  type="color"
                  class="color-input"
                  v-model="cornersDotOptionsColor"
                />
              </div>
            </div>
            <div class="flex w-full flex-col gap-4 sm:flex-row sm:gap-8">
              <div class="w-full sm:w-1/2">
                <label for="width-height">
                  {{ t('Width/Height (px)') }}
                </label>
                <input
                  class="text-input"
                  id="width-height"
                  type="number"
                  placeholder="width/height in pixels"
                  v-model="width"
                />
              </div>
              <div class="w-full sm:w-1/2">
                <label for="border-radius">
                  {{ t('Border radius (px)') }}
                </label>
                <input
                  class="text-input"
                  id="border-radius"
                  type="number"
                  placeholder="24"
                  v-model="styleBorderRadius"
                />
              </div>
            </div>
            <div class="flex w-full flex-col gap-4 sm:flex-row sm:gap-8">
              <div class="w-full sm:w-1/2">
                <label for="margin">
                  {{ t('Margin (px)') }}
                </label>
                <input
                  class="text-input"
                  id="margin"
                  type="number"
                  placeholder="0"
                  v-model="margin"
                />
              </div>
              <div class="w-full sm:w-1/2">
                <label for="image-margin">
                  {{ t('Image margin (px)') }}
                </label>
                <input
                  class="text-input"
                  id="image-margin"
                  type="number"
                  placeholder="0"
                  v-model="imageMargin"
                />
              </div>
            </div>
            <div
              id="dots-squares-settings"
              class="mb-4 flex w-full flex-col flex-wrap gap-6 md:flex-row"
            >
              <fieldset class="flex-1" role="radio" tabindex="0">
                <legend>{{ t('Dots type') }}</legend>
                <div
                  class="radio"
                  v-for="type in [
                    'dots',
                    'rounded',
                    'classy',
                    'classy-rounded',
                    'square',
                    'extra-rounded'
                  ]"
                  :key="type"
                >
                  <input
                    :id="'dotsOptionsType-' + type"
                    type="radio"
                    v-model="dotsOptionsType"
                    :value="type"
                  />
                  <label :for="'dotsOptionsType-' + type">{{ t(type) }}</label>
                </div>
              </fieldset>
              <fieldset class="flex-1" role="radio" tabindex="0">
                <legend>{{ t('Corners Square type') }}</legend>
                <div class="radio" v-for="type in ['dot', 'square', 'extra-rounded']" :key="type">
                  <input
                    :id="'cornersSquareOptionsType-' + type"
                    type="radio"
                    v-model="cornersSquareOptionsType"
                    :value="type"
                  />
                  <label :for="'cornersSquareOptionsType-' + type">{{ t(type) }}</label>
                </div>
              </fieldset>
              <fieldset class="flex-1" role="radio" tabindex="0">
                <legend>{{ t('Corners Dot type') }}</legend>
                <div class="radio" v-for="type in ['dot', 'square']" :key="type">
                  <input
                    :id="'cornersDotOptionsType-' + type"
                    type="radio"
                    v-model="cornersDotOptionsType"
                    :value="type"
                  />
                  <label :for="'cornersDotOptionsType-' + type">{{ t(type) }}</label>
                </div>
              </fieldset>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>


  <!-- Fallback modal for manual copy in Safari -->
  <CopyImageModal
    v-if="showSafariCopyImageModal"
    :is-loading="copyModalIsLoading"
    :image-src="copyModalImageSrc"
    @close="closeCopyModal"
  />
</template>

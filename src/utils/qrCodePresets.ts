import PlainConfig from '@/assets/presets/plain.json'
import type { DrawType, Options as StyledQRCodeProps } from 'qr-code-styling'

export interface CustomStyleProps {
  borderRadius?: string
  background?: string
}

export type PresetAttributes = {
  style: CustomStyleProps
  name: string
}

export type Preset = Omit<
  Required<StyledQRCodeProps>,
  'shape' | 'qrOptions' | 'nodeCanvas' | 'jsdom'
> &
  PresetAttributes

const defaultPresetOptions = {
  backgroundOptions: {
    color: 'transparent'
  },
  imageOptions: {
    margin: 0
  },
  width: 600,
  height: 600,
  borderRadius: '0px',
  margin: 0,
  type: 'svg' as DrawType
}

export const plainPreset = {
  ...defaultPresetOptions,
  name: 'Plain',
  ...PlainConfig.props,
  style: PlainConfig.style
} as Preset



export const builtInPresets: Preset[] = [
  plainPreset
]

function parsePresetsFromEnv(envVal?: string): Preset[] | undefined {
  if (!envVal) return undefined
  try {
    return JSON.parse(envVal) as Preset[]
  } catch (err) {
    console.error('Failed to parse VITE_QR_CODE_PRESETS', err)
    return undefined
  }
}

const envPresets = parsePresetsFromEnv(import.meta.env.VITE_QR_CODE_PRESETS)
export const allQrCodePresets: Preset[] = envPresets ?? builtInPresets

export const defaultPreset: Preset =
  import.meta.env.VITE_DEFAULT_PRESET
    ? allQrCodePresets.find((p) => p.name === import.meta.env.VITE_DEFAULT_PRESET) ??
      allQrCodePresets[0]
    : allQrCodePresets[0]

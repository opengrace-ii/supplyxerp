import { create } from 'zustand'

export type Section = 'ops' | 'mfg' | 'com' | 'sys' | 'cfg'
export type Theme = 'dark' | 'light'

interface SectionConfig {
  accent:     string
  accentDim:  string
  accentText: string
  sidebarBg:  string
  label:      string
}

// Frozen from UI spec — do not change these values
export const SECTIONS: Record<Section, SectionConfig> = {
  ops: { accent: '#22c55e', accentDim: 'rgba(34,197,94,0.10)',   accentText: '#000', sidebarBg: '#0d3320', label: 'Operations'    },
  mfg: { accent: '#f59e0b', accentDim: 'rgba(245,158,11,0.10)',  accentText: '#000', sidebarBg: '#2d1a00', label: 'Manufacturing'  },
  com: { accent: '#60a5fa', accentDim: 'rgba(96,165,250,0.10)',  accentText: '#fff', sidebarBg: '#0a1a40', label: 'Commerce'       },
  sys: { accent: '#a78bfa', accentDim: 'rgba(167,139,250,0.10)', accentText: '#fff', sidebarBg: '#1a1640', label: 'System'         },
  cfg: { accent: '#f472b6', accentDim: 'rgba(244,114,182,0.10)', accentText: '#fff', sidebarBg: '#2a0f20', label: 'Config'         },
}

interface SectionStore {
  section: Section
  theme: Theme
  setSection: (s: Section) => void
  toggleTheme: () => void
}

function applySection(s: Section, theme: Theme) {
  const cfg = SECTIONS[s]
  const root = document.documentElement
  root.style.setProperty('--accent',      cfg.accent)
  root.style.setProperty('--accent-dim',  cfg.accentDim)
  root.style.setProperty('--accent-text', cfg.accentText)
  // In light mode, sidebar gets a lighter tint but keeps section identity
  root.style.setProperty('--sidebar-bg',
    theme === 'light' ? lightenSidebarBg(s) : cfg.sidebarBg
  )
  root.setAttribute('data-theme', theme)
}

function lightenSidebarBg(s: Section): string {
  const map: Record<Section, string> = {
    ops: '#e2f9e9', mfg: '#fdf2e2', com: '#e0eefe',
    sys: '#e9e4fd', cfg: '#fde4f2',
  }
  return map[s]
}

export const useSectionStore = create<SectionStore>((set, get) => ({
  section: (localStorage.getItem('supplyxerp_last_tab') as Section) || 'ops',
  theme: (localStorage.getItem('sx-theme') as Theme) || 'dark',

  setSection(s) {
    set({ section: s })
    applySection(s, get().theme)
  },

  toggleTheme() {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem('sx-theme', next)
    set({ theme: next })
    applySection(get().section, next)
  },
}))

// Apply on app load
const savedTheme = (localStorage.getItem('sx-theme') as Theme) || 'dark'
const savedSection = (localStorage.getItem('supplyxerp_last_tab') as Section) || 'ops'
applySection(savedSection, savedTheme)

// ============================================================================
// Family / Personal Profile store (spec §7, §8.3, P1).
//
// A lightweight localStorage-backed store with a React subscription hook.
// The profile personalises the whole app: personal allergen alerts, the
// default demographic for the allowance card, the default fasting profile
// (including custom family rules), and diet-aware alternatives.
//
// No account, no backend — everything stays on the device.
// ============================================================================

import { useSyncExternalStore } from 'react'

const KEY = 'nutriscan_profile_v1'

export const DEFAULT_PROFILE = {
  configured: false,      // becomes true once the user saves the profile
  language: 'en',         // 'en' | 'hi' (spec §13 MVP languages)
  demographic: 'adultMen', // key into DEMOGRAPHIC_REFERENCE
  diet: 'none',           // 'none' | 'veg' | 'jain' | 'vegan'
  allergens: [],          // e.g. ['milk', 'gluten']
  fastingProfile: 'none', // 'none' | a FASTING_PROFILES key | 'custom'
  customFasting: { allow: [], restrict: [] }, // personal fasting rules
}

// Common allergens for the picker (matches OFF allergen tags).
export const COMMON_ALLERGENS = [
  { key: 'gluten', label: 'Gluten', icon: '🌾' },
  { key: 'milk', label: 'Milk / Dairy', icon: '🥛' },
  { key: 'eggs', label: 'Eggs', icon: '🥚' },
  { key: 'nuts', label: 'Tree nuts', icon: '🥜' },
  { key: 'peanuts', label: 'Peanuts', icon: '🥜' },
  { key: 'soybeans', label: 'Soy', icon: '🫘' },
  { key: 'fish', label: 'Fish', icon: '🐟' },
  { key: 'crustaceans', label: 'Shellfish', icon: '🦐' },
  { key: 'sesame', label: 'Sesame', icon: '🫘' },
  { key: 'mustard', label: 'Mustard', icon: '🟡' },
]

export const DIET_OPTIONS = [
  { key: 'none', label: 'No preference' },
  { key: 'veg', label: 'Vegetarian' },
  { key: 'jain', label: 'Jain' },
  { key: 'vegan', label: 'Vegan' },
]

let cache = load()
const listeners = new Set()

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    return {
      ...DEFAULT_PROFILE,
      ...raw,
      customFasting: { ...DEFAULT_PROFILE.customFasting, ...(raw.customFasting || {}) },
    }
  } catch {
    return { ...DEFAULT_PROFILE }
  }
}

export function getProfile() {
  return cache
}

export function setProfile(patch) {
  cache = {
    ...cache,
    ...patch,
    configured: true,
    customFasting: patch.customFasting
      ? { ...cache.customFasting, ...patch.customFasting }
      : cache.customFasting,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(cache))
  } catch {
    // storage full / disabled — keep in-memory only
  }
  listeners.forEach(l => l())
}

export function resetProfile() {
  cache = { ...DEFAULT_PROFILE }
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
  listeners.forEach(l => l())
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useProfile() {
  return useSyncExternalStore(subscribe, getProfile, getProfile)
}

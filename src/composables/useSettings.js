import { ref } from 'vue'
import { supabase } from '@/supabase'

const _cache = ref({})
const _loaded = ref(false)
const _loading = ref(false)

export const DEFAULTS = {
  kpay_img_url:    'https://ik.imagekit.io/0xfxtkccz/Uab/f9ee263c-024a-4e2e-9d5b-6f5918aeb8a6.jpg?tr=f-auto',
  wave_img_url:    'https://ik.imagekit.io/0xfxtkccz/Uab/7ff494f1-3a7c-4583-82a7-3bfca145e852.jpg?tr=f-auto',
  usdt_img_url:    'https://ik.imagekit.io/tdpebgueq/Payment%20Method%20/61e20ad43bafe0ca2b7ada87f1792a4c.jpg?tr=f-auto',
  uabpay_img_url:  'https://ik.imagekit.io/0xfxtkccz/Uab/1781076796857.png?tr=f-auto',
  brand_logo_url:  'https://ik.imagekit.io/rbok01qam/Brand%20Logo%20/IMG_20260605_215459.png?tr=f-auto',
  provider_logo_1: 'https://vuywhhmwrqykukcemifd.supabase.co/storage/v1/object/public/images/providers/logo1.jpg',
  provider_logo_2: 'https://vuywhhmwrqykukcemifd.supabase.co/storage/v1/object/public/images/providers/logo2.jpg',
  provider_logo_3: 'https://vuywhhmwrqykukcemifd.supabase.co/storage/v1/object/public/images/providers/logo3.jpg',
  provider_logo_4: 'https://vuywhhmwrqykukcemifd.supabase.co/storage/v1/object/public/images/providers/logo4.jpg',
  provider_logo_5: 'https://vuywhhmwrqykukcemifd.supabase.co/storage/v1/object/public/images/providers/logo5.jpg',
  provider_logo_6: 'https://vuywhhmwrqykukcemifd.supabase.co/storage/v1/object/public/images/providers/logo6.jpg',
  banner_1_url: '/images/banners/banner1.jpg',
  banner_2_url: '/images/banners/banner2.jpg',
  banner_3_url: '/images/banners/banner3.jpg',
  banner_4_url: '/images/banners/banner4.jpg',
  banner_5_url: '/images/banners/banner5.jpg',
}

export async function loadSettings() {
  if (_loaded.value || _loading.value) return
  _loading.value = true
  try {
    const { data } = await supabase.from('system_settings').select('key,value')
    if (data) data.forEach(r => { _cache.value[r.key] = r.value })
    _loaded.value = true
  } catch (e) {
    _loaded.value = true
  } finally {
    _loading.value = false
  }
}

export function getSetting(key, fallback) {
  return _cache.value[key] ?? DEFAULTS[key] ?? fallback ?? ''
}

export function getSettingsCache() { return _cache }

export function invalidateSettings() { _loaded.value = false; _cache.value = {} }

export function useSettings() {
  return { getSetting, loadSettings, getSettingsCache, DEFAULTS, invalidateSettings }
}
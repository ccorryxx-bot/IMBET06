import { ref } from 'vue'
import { supabase } from '@/supabase'

const RECENT_KEY = 'iw99_recently_played'
const MAX_RECENT = 10

const recentIds = ref(JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'))

async function syncRecentToCloud(ids) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.auth.updateUser({ data: { recently_played: ids } })
  } catch {}
}

export async function loadRecentFromCloud() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const cloud = session.user.user_metadata?.recently_played
    if (Array.isArray(cloud) && cloud.length > 0) {
      const merged = [...new Set([...cloud, ...recentIds.value])].slice(0, MAX_RECENT)
      recentIds.value = merged
      localStorage.setItem(RECENT_KEY, JSON.stringify(merged))
    }
  } catch {}
}

export function useRecentlyPlayed() {
  const addRecent = async (gameCode) => {
    const updated = [gameCode, ...recentIds.value.filter(id => id !== gameCode)].slice(0, MAX_RECENT)
    recentIds.value = updated
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated))
    syncRecentToCloud(updated)
  }

  const filterRecentGames = (games) => {
    const order = recentIds.value
    return games
      .filter(g => order.includes(g.game_code))
      .sort((a, b) => order.indexOf(a.game_code) - order.indexOf(b.game_code))
  }

  return { recentIds, addRecent, filterRecentGames }
}
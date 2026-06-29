import { ref, computed } from 'vue'
import { supabase } from '@/supabase'

const FAV_KEY = 'iw99_fav_games'
const favIds = ref(JSON.parse(localStorage.getItem(FAV_KEY) || '[]'))

async function syncToCloud(ids) {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    await supabase.auth.updateUser({ data: { fav_games: ids } })
  } catch {}
}

export async function loadFavoritesFromCloud() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    const cloud = session.user.user_metadata?.fav_games
    if (Array.isArray(cloud) && cloud.length > 0) {
      favIds.value = cloud
      localStorage.setItem(FAV_KEY, JSON.stringify(cloud))
    }
  } catch {}
}

export function useFavorites() {
  const isFav = (gameCode) => favIds.value.includes(gameCode)

  const toggleFav = (gameCode) => {
    const idx = favIds.value.indexOf(gameCode)
    const updated = idx === -1
      ? [...favIds.value, gameCode]
      : favIds.value.filter(id => id !== gameCode)
    favIds.value = updated
    localStorage.setItem(FAV_KEY, JSON.stringify(updated))
    syncToCloud(updated)
  }

  const favCount = computed(() => favIds.value.length)
  const filterFavGames = (games) => games.filter(g => favIds.value.includes(g.game_code))

  return { favIds, isFav, toggleFav, favCount, filterFavGames }
}
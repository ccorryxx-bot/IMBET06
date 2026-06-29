import { ref } from 'vue'
import { supabase } from '@/supabase'

export const mainBalance = ref(0)
export const bonusBalance = ref(0)

let channel = null
let currentUserId = null

export async function loadWallet() {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { mainBalance.value = 0; bonusBalance.value = 0; return }
    const userId = session.user.id
    const { data } = await supabase.from('wallets').select('main_balance, bonus_balance').eq('user_id', userId).single()
    if (data) {
      mainBalance.value = Number(data.main_balance) || 0
      bonusBalance.value = Number(data.bonus_balance) || 0
    }
    subscribeWalletRealtime(userId)
  } catch {}
}

function subscribeWalletRealtime(userId) {
  if (channel && currentUserId === userId) return
  if (channel) { supabase.removeChannel(channel); channel = null }
  currentUserId = userId
  channel = supabase
    .channel('wallet-' + userId)
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'wallets', filter: `user_id=eq.${userId}` },
      (payload) => {
        if (payload.new) {
          mainBalance.value = Number(payload.new.main_balance) || 0
          bonusBalance.value = Number(payload.new.bonus_balance) || 0
        }
      }
    )
    .subscribe()
}

export function teardownWalletRealtime() {
  if (channel) { supabase.removeChannel(channel); channel = null; currentUserId = null }
}
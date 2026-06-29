import { createClient } from '@supabase/supabase-js'

export const config = { maxDuration: 10 }

const SUPA_URL = 'https://vuywhhmwrqykukcemifd.supabase.co'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const SR_KEY   = process.env.SUPABASE_SERVICE_ROLE
  const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY
  if (!SR_KEY)   return res.status(500).json({ error: 'Server misconfigured: SUPABASE_SERVICE_ROLE not set' })
  if (!ANON_KEY) return res.status(500).json({ error: 'Server misconfigured: VITE_SUPABASE_ANON_KEY not set' })

  const { adminKey, txId, action, overrideAmount } = req.body || {}
  if (!adminKey || !txId || !action)        return res.status(400).json({ error: 'Missing required fields' })
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'Invalid action' })

  try {
    const anon = createClient(SUPA_URL, ANON_KEY, { auth: { persistSession: false } })
    const { data: isValid, error: authErr } = await anon.rpc('validate_admin', { p_key: adminKey })
    if (authErr) return res.status(500).json({ error: 'Auth check failed: ' + authErr.message })
    if (!isValid) return res.status(401).json({ error: 'Invalid admin credentials' })

    const admin = createClient(SUPA_URL, SR_KEY, { auth: { persistSession: false } })

    const { data: tx, error: txErr } = await admin
      .from('transactions')
      .select('id, type, amount, user_id, status')
      .eq('id', txId)
      .single()
    if (txErr || !tx) return res.status(404).json({ error: 'Transaction not found' })
    if (tx.status !== 'pending') return res.status(409).json({ error: `Already ${tx.status}` })

    const requestedAmt = Number(tx.amount) || 0
    const parsedOverride = overrideAmount !== undefined && overrideAmount !== null
      ? Number(overrideAmount)
      : null
    const finalAmt = (action === 'approve' && parsedOverride !== null && parsedOverride > 0)
      ? parsedOverride
      : requestedAmt

    if (action === 'approve' && parsedOverride !== null && parsedOverride !== requestedAmt) {
      const { error: amtErr } = await admin
        .from('transactions')
        .update({ amount: finalAmt, override_note: `Admin adjusted: ${requestedAmt} \u2192 ${finalAmt}` })
        .eq('id', txId)
      if (amtErr) {
        const { error: amtErr2 } = await admin
          .from('transactions')
          .update({ amount: finalAmt })
          .eq('id', txId)
        if (amtErr2) return res.status(500).json({ error: 'Amount update failed: ' + amtErr2.message })
      }
    }

    const newStatus = action === 'approve' ? 'confirmed' : 'rejected'
    const { error: statusErr } = await admin
      .from('transactions')
      .update({ status: newStatus, processed_at: new Date().toISOString() })
      .eq('id', txId)
    if (statusErr) return res.status(500).json({ error: 'Status update failed: ' + statusErr.message })

    if (action === 'approve') {
      const { data: wallet, error: wErr } = await admin
        .from('wallets')
        .select('main_balance')
        .eq('user_id', tx.user_id)
        .single()
      if (wErr || !wallet) return res.status(500).json({ error: 'Wallet not found' })

      const curr   = Number(wallet.main_balance) || 0
      const newBal = tx.type === 'deposit' ? curr + finalAmt : Math.max(0, curr - finalAmt)

      const { error: balErr } = await admin
        .from('wallets')
        .update({ main_balance: newBal })
        .eq('user_id', tx.user_id)
      if (balErr) return res.status(500).json({ error: 'Balance update failed: ' + balErr.message })

      await admin
        .from('users')
        .update({ balance: newBal })
        .eq('id', tx.user_id)
    }

    return res.status(200).json({
      ok: true,
      status: newStatus,
      finalAmount: finalAmt,
      wasOverridden: parsedOverride !== null && parsedOverride !== requestedAmt
    })
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unexpected error' })
  }
}
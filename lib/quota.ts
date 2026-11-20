export type PlanTier = 'guest' | 'normal' | 'premium'

export type QuotaState = {
  date: string
  used: number
  bonus: number
  shares: number
  bonusClaimed: boolean
  lastUrl?: string
}

const STORAGE_KEY = 'heshan_ofc_quota_v2'

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getQuotaState(): QuotaState {
  const today = todayKey()
  if (typeof window === 'undefined') {
    return { date: today, used: 0, bonus: 0, shares: 0, bonusClaimed: false }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as QuotaState
      if (parsed.date === today) {
        return {
          date: today,
          used: Number(parsed.used || 0),
          bonus: Number(parsed.bonus || 0),
          shares: Number(parsed.shares || 0),
          bonusClaimed: Boolean(parsed.bonusClaimed),
          lastUrl: parsed.lastUrl || '',
        }
      }
    }
  } catch {}
  const fresh: QuotaState = { date: today, used: 0, bonus: 0, shares: 0, bonusClaimed: false }
  saveQuotaState(fresh)
  return fresh
}

export function saveQuotaState(state: QuotaState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
}

export function getBaseLimit(tier: PlanTier): number {
  if (tier === 'premium') return Infinity
  if (tier === 'normal') return 8
  return 4
}

export function getTotalLimit(tier: PlanTier, state: QuotaState): number {
  if (tier === 'premium') return Infinity
  return getBaseLimit(tier) + (state.bonus || 0)
}

export function getRemainingDownloads(tier: PlanTier, state: QuotaState): number {
  if (tier === 'premium') return Infinity
  return Math.max(0, getTotalLimit(tier, state) - state.used)
}

export function recordDownloadUsage(
  tier: PlanTier,
  url: string
): {
  nextState: QuotaState
  shouldShowAd: boolean
} {
  const current = getQuotaState()
  if (tier === 'premium') {
    return { nextState: current, shouldShowAd: false }
  }
  // Prevent counting the exact same finished URL twice
  if (url && current.lastUrl === url) {
    return { nextState: current, shouldShowAd: false }
  }
  const nextUsed = current.used + 1
  // Trigger ad strictly after every 2nd completed download (2, 4, 6, 8...)
  const shouldShowAd = nextUsed >= 2 && nextUsed % 2 === 0
  const nextState: QuotaState = {
    ...current,
    used: nextUsed,
    lastUrl: url,
  }
  saveQuotaState(nextState)
  return { nextState, shouldShowAd }
}

export function recordWhatsAppShare(): QuotaState {
  const current = getQuotaState()
  const nextShares = Math.min(5, current.shares + 1)
  const unlockNow = nextShares >= 5 && !current.bonusClaimed
  const nextState: QuotaState = {
    ...current,
    shares: nextShares,
    bonus: unlockNow ? current.bonus + 5 : current.bonus,
    bonusClaimed: unlockNow ? true : current.bonusClaimed,
  }
  saveQuotaState(nextState)
  return nextState
}

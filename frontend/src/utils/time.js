/** Parse a human-readable duration string into minutes.
 *  Accepts: "1h 30m", "1.5h", "90m", "90", "2h", "45m", "1h30"
 */
export function parseDurationToMinutes(str) {
  if (!str?.trim()) return 0
  const s = str.trim().toLowerCase()
  const hMatch = s.match(/(\d+(?:\.\d+)?)\s*h/)
  const mMatch = s.match(/(\d+)\s*m(?:in)?/)
  const numOnly = s.match(/^(\d+(?:\.\d+)?)$/)

  let minutes = 0
  if (hMatch) minutes += Math.round(parseFloat(hMatch[1]) * 60)
  if (mMatch) minutes += parseInt(mMatch[1], 10)
  if (!hMatch && !mMatch && numOnly) minutes = Math.round(parseFloat(numOnly[1]))

  return Math.max(0, minutes)
}

/** Format minutes → "2h 30m", "45m", "3h" */
export function formatMinutes(min) {
  if (!min || min <= 0) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

/**
 * Snap elapsed minutes to the nearest logging increment.
 * < 10 min  → 0 (discard)
 * 10–15 min → 15m
 * 16–30 min → 30m
 * 31–60 min → 1h
 * 61–90 min → 1h 30m  … (ceil to next 30m)
 */
export function snapDuration(minutes) {
  if (minutes < 10) return 0
  if (minutes <= 15) return 15
  return Math.ceil(minutes / 30) * 30
}

/** Convert a Date to YYYY-MM-DD in local time (avoids UTC midnight shift) */
export function localDateISO(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Today as YYYY-MM-DD in local time */
export function todayISO() {
  return localDateISO(new Date())
}

/** Start of current week (Monday) as YYYY-MM-DD in local time */
export function weekStartISO() {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1)
  return localDateISO(d)
}

/** Start of current month as YYYY-MM-DD */
export function monthStartISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

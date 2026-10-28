import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { toHHMM } from "@/lib/time"
import type { BookedSlot, Court } from "@/types"

export function useCourts() {
  const [courts, setCourts] = useState<Court[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from("courts")
      .select("id, name, hourly_rate, is_active")
      .eq("is_active", true)
      .order("name")
      .then(({ data, error }) => {
        if (error) setError(error.message)
        // numeric columns can arrive as strings
        else setCourts((data ?? []).map((c) => ({ ...c, hourly_rate: Number(c.hourly_rate) })))
        setLoading(false)
      })
  }, [])

  return { courts, loading, error }
}

interface SlotsResult {
  key: string
  slots: BookedSlot[]
  error: string | null
}

/** Taken time ranges on every court for one date (via the get_booked_slots RPC). */
export function useBookedSlots(dateKey: string) {
  const [version, setVersion] = useState(0)
  const [result, setResult] = useState<SlotsResult | null>(null)
  const requestKey = `${dateKey}#${version}`

  useEffect(() => {
    let cancelled = false
    supabase.rpc("get_booked_slots", { p_date: dateKey }).then(({ data, error }) => {
      if (cancelled) return
      setResult({
        key: requestKey,
        error: error?.message ?? null,
        slots: ((data ?? []) as BookedSlot[]).map((s) => ({
          court_id: s.court_id,
          start_time: toHHMM(s.start_time),
          end_time: toHHMM(s.end_time),
        })),
      })
    })
    return () => {
      cancelled = true
    }
  }, [dateKey, requestKey])

  const refresh = useCallback(() => setVersion((v) => v + 1), [])

  return {
    booked: result?.slots ?? [],
    loading: result?.key !== requestKey,
    error: result?.error ?? null,
    refresh,
  }
}

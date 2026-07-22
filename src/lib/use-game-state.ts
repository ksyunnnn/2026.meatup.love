'use client'
// One subscription hub for Meat & Greet: edges, roster (shares), control,
// results and the bonus table, plus the derived live score/ranking. Shared by
// /live and /game so both see the exact same live data.
//
// `scores` includes SR/SSR bonuses, so the projector ranking is the real
// standing rather than a proxy. The cost is that every viewer's browser holds
// the bonus table (there is no server to compute on) — see the `specials`
// block in firestore.rules for why that trade was taken.
import { useEffect, useState } from 'react'
import {
  subscribeConnections,
  subscribeControl,
  subscribeShares,
  subscribeResults,
  subscribeSpecials,
  subscribeStaff,
  type ShareRow,
  type ResultEntry,
} from './connections'
import { finalScoreFrom, rankFrom, type Edge } from './game'
import type { Connection, GameControl, Special } from './types'

export function useGameState() {
  const [edges, setEdges] = useState<Connection[]>([])
  const [shares, setShares] = useState<ShareRow[]>([])
  const [control, setControl] = useState<GameControl | null>(null)
  const [results, setResults] = useState<ResultEntry[] | null>(null)
  const [staff, setStaff] = useState<Set<string>>(new Set())
  const [specials, setSpecials] = useState<Map<string, Special>>(new Map())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const unsubs = [
      subscribeConnections((e) => {
        setEdges(e)
        setReady(true)
      }),
      subscribeShares(setShares),
      subscribeControl(setControl),
      subscribeResults(setResults),
      subscribeStaff(setStaff),
      subscribeSpecials(setSpecials),
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const bonus = new Map([...specials].map(([uid, s]) => [uid, s.bonusPoints]))
  const scores = finalScoreFrom(edges as Edge[], bonus)
  const ranking = rankFrom(scores)
  return { edges, shares, control, results, staff, specials, ready, scores, ranking }
}

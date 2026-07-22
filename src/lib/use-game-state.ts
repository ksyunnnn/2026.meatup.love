'use client'
// One subscription hub for the 繋がりレース: edges, roster (shares), control and
// results, plus the derived count-based score/ranking. Shared by /live and
// /game so both see the exact same live data.
import { useEffect, useState } from 'react'
import {
  subscribeConnections,
  subscribeControl,
  subscribeShares,
  subscribeResults,
  subscribeStaff,
  type ShareRow,
  type ResultEntry,
} from './connections'
import { scoreFrom, rankFrom, type Edge } from './game'
import type { Connection, GameControl } from './types'

export function useGameState() {
  const [edges, setEdges] = useState<Connection[]>([])
  const [shares, setShares] = useState<ShareRow[]>([])
  const [control, setControl] = useState<GameControl | null>(null)
  const [results, setResults] = useState<ResultEntry[] | null>(null)
  const [staff, setStaff] = useState<Set<string>>(new Set())
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
    ]
    return () => unsubs.forEach((u) => u())
  }, [])

  const scores = scoreFrom(edges as Edge[])
  const ranking = rankFrom(scores)
  return { edges, shares, control, results, staff, ready, scores, ranking }
}

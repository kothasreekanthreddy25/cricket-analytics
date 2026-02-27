'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import type {
  LiveScoreUpdate,
  ServerToClientEvents,
  ClientToServerEvents,
} from './socket-types'

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>

export function useLiveScores() {
  const [scores, setScores] = useState<Map<string, LiveScoreUpdate>>(new Map())
  const [connected, setConnected] = useState(false)
  const [pollingStatus, setPollingStatus] = useState<{
    active: boolean
    liveMatchCount: number
    connectedClients: number
  } | null>(null)
  const socketRef = useRef<TypedSocket | null>(null)
  const subscribedRef = useRef(false)

  useEffect(() => {
    // Bootstrap the Socket.IO server by hitting the Pages API route
    fetch('/api/socket').then(() => {
      const socket: TypedSocket = io({
        path: '/api/socket',
        transports: ['polling', 'websocket'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
        timeout: 20000,
      })

      socketRef.current = socket

      socket.on('connect', () => {
        console.log('[Socket] Connected:', socket.id)
        setConnected(true)
        socket.emit('subscribe:live')
        subscribedRef.current = true
      })

      socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason)
        setConnected(false)
        subscribedRef.current = false
      })

      socket.on('score:update', (updates) => {
        setScores((prev) => {
          const next = new Map(prev)
          for (const update of updates) {
            next.set(update.matchKey, update)
          }
          return next
        })
      })

      socket.on('polling:status', (status) => {
        setPollingStatus(status)
      })

      socket.on('connect_error', (err) => {
        console.error('[Socket] Connection error:', err.message)
      })
    })

    return () => {
      if (socketRef.current) {
        if (subscribedRef.current) {
          socketRef.current.emit('unsubscribe:live')
        }
        socketRef.current.disconnect()
        socketRef.current = null
        subscribedRef.current = false
      }
    }
  }, [])

  const getScore = useCallback(
    (matchKey: string): LiveScoreUpdate | undefined => {
      return scores.get(matchKey)
    },
    [scores]
  )

  return {
    scores,
    getScore,
    connected,
    pollingStatus,
  }
}

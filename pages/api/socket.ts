import { Server as SocketIOServer } from 'socket.io'
import type { NextApiRequest, NextApiResponse } from 'next'
import type {
  ServerToClientEvents,
  ClientToServerEvents,
} from '@/lib/socket-types'
import {
  setIO,
  incrementSubscribers,
  decrementSubscribers,
  getCachedScores,
} from '@/lib/live-score-poller'

type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: any & {
      io?: SocketIOServer<ClientToServerEvents, ServerToClientEvents>
    }
  }
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket
) {
  if (res.socket.server.io) {
    console.log('[Socket] Already initialized')
    res.end()
    return
  }

  console.log('[Socket] Initializing Socket.IO server...')

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
    res.socket.server,
    {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin:
          process.env.NODE_ENV === 'development'
            ? ['http://localhost:3000']
            : [process.env.BETTER_AUTH_URL || 'http://localhost:3000'],
        methods: ['GET', 'POST'],
      },
      transports: ['polling', 'websocket'],
    }
  )

  res.socket.server.io = io
  setIO(io)

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`)

    socket.on('subscribe:live', () => {
      console.log(`[Socket] ${socket.id} subscribed to live scores`)
      incrementSubscribers()

      const cached = getCachedScores()
      if (cached.length > 0) {
        socket.emit('score:update', cached)
      }
    })

    socket.on('unsubscribe:live', () => {
      decrementSubscribers()
    })

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Client disconnected: ${socket.id} (${reason})`)
      decrementSubscribers()
    })
  })

  console.log('[Socket] Socket.IO initialized successfully')
  res.end()
}

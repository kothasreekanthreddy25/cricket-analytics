export interface LiveScoreUpdate {
  matchKey: string
  teamA: string
  teamB: string
  scoreA: string
  scoreB: string
  status: string
  statusNote: string
  lastUpdated: number
}

export interface ServerToClientEvents {
  'score:update': (updates: LiveScoreUpdate[]) => void
  'polling:status': (payload: {
    active: boolean
    liveMatchCount: number
    connectedClients: number
  }) => void
}

export interface ClientToServerEvents {
  'subscribe:live': () => void
  'unsubscribe:live': () => void
}

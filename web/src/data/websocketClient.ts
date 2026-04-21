interface WebSocketClientOptions<T> {
  url: string
  parseMessage: (payload: unknown) => T | null
  onMessage: (message: T) => void
  onStatus?: (status: 'connecting' | 'connected' | 'disconnected') => void
  maxPayloadBytes?: number
}

const DEFAULT_MAX_PAYLOAD_BYTES = 32_768
const MAX_BACKOFF_MS = 30_000

export class SafeWebSocketClient<T> {
  private socket: WebSocket | null = null
  private reconnectTimer: number | null = null
  private shouldReconnect = true
  private reconnectAttempt = 0

  constructor(private readonly options: WebSocketClientOptions<T>) {}

  connect() {
    this.options.onStatus?.('connecting')
    this.socket = new WebSocket(this.options.url)

    this.socket.onopen = () => {
      this.reconnectAttempt = 0
      this.options.onStatus?.('connected')
    }

    this.socket.onclose = () => {
      this.options.onStatus?.('disconnected')
      if (this.shouldReconnect) {
        this.scheduleReconnect()
      }
    }

    this.socket.onerror = () => {
      this.socket?.close()
    }

    this.socket.onmessage = (event) => {
      const payloadText = String(event.data ?? '')
      const maxBytes = this.options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES
      if (payloadText.length > maxBytes) {
        return
      }

      try {
        const parsedRaw = JSON.parse(payloadText) as unknown
        const parsed = this.options.parseMessage(parsedRaw)
        if (parsed) {
          this.options.onMessage(parsed)
        }
      } catch {
        // Ignore malformed payloads.
      }
    }
  }

  disconnect() {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer)
    }
    this.socket?.close()
    this.socket = null
  }

  private scheduleReconnect() {
    const backoffBase = Math.min(2 ** this.reconnectAttempt * 1000, MAX_BACKOFF_MS)
    const jitter = Math.floor(Math.random() * 300)
    const wait = backoffBase + jitter
    this.reconnectAttempt += 1
    this.reconnectTimer = window.setTimeout(() => this.connect(), wait)
  }
}

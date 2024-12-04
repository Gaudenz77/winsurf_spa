import { ref } from 'vue'

export function useWebSocket() {
  const ws = ref(null)
  const lastMessage = ref(null)
  const isConnected = ref(false)

  const connect = () => {
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected')
      return
    }

    const wsUrl = `ws://localhost:3000`
    ws.value = new WebSocket(wsUrl)

    ws.value.onopen = () => {
      console.log('WebSocket connected')
      isConnected.value = true
    }

    ws.value.onclose = () => {
      console.log('WebSocket disconnected')
      isConnected.value = false
      // Try to reconnect after 5 seconds
      setTimeout(connect, 5000)
    }

    ws.value.onerror = (error) => {
      console.error('WebSocket error:', error)
      isConnected.value = false
    }

    ws.value.onmessage = (event) => {
      console.log('WebSocket message received:', event.data)
      try {
        lastMessage.value = JSON.parse(event.data)
      } catch (error) {
        console.error('Error parsing WebSocket message:', error)
      }
    }
  }

  const disconnect = () => {
    if (ws.value) {
      ws.value.close()
      ws.value = null
      isConnected.value = false
    }
  }

  const sendMessage = (message) => {
    if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected')
      return Promise.reject(new Error('WebSocket not connected'))
    }

    return new Promise((resolve, reject) => {
      try {
        ws.value.send(JSON.stringify(message))
        resolve()
      } catch (error) {
        console.error('Error sending WebSocket message:', error)
        reject(error)
      }
    })
  }

  return {
    connect,
    disconnect,
    sendMessage,
    lastMessage,
    isConnected
  }
}

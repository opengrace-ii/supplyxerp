import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

export const useWebSocket = () => {
  const ws = useRef<WebSocket | null>(null);
  const { setWsStatus, appendTraceStep } = useAppStore();

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let retryCount = 0;
    let backoff = 1000;
    const maxRetries = 10; // Total attempts before giving up

    const connect = () => {
      let baseUrl = import.meta.env.VITE_WS_BASE || 'ws://localhost:8080';
      if (!baseUrl.endsWith('/ws')) {
        baseUrl = baseUrl.replace(/\/$/, '') + '/ws';
      }
      
      if (retryCount > 0) {
        setWsStatus('reconnecting');
      } else {
        setWsStatus('connecting');
      }

      ws.current = new WebSocket(baseUrl);

      ws.current.onopen = () => {
        setWsStatus('connected');
        backoff = 1000;
        retryCount = 0;
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'agent_trace') {
            appendTraceStep(data.payload);
          } else if (data.type === 'inventory_update') {
            window.dispatchEvent(new CustomEvent('inventory_update', { detail: data.payload }));
          }
        } catch (err) {
          console.error("WS Parse Error", err);
        }
      };

      ws.current.onclose = () => {
        if (retryCount >= maxRetries) {
          setWsStatus('disconnected');
          console.warn("WS max retries reached. Giving up.");
          return;
        }

        retryCount++;
        setWsStatus('reconnecting');
        reconnectTimeout = setTimeout(connect, backoff);
        backoff = Math.min(backoff * 2, 8000);
      };

      ws.current.onerror = (err) => {
        console.error("WS Error", err);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      if (ws.current) {
        ws.current.onclose = null;
        ws.current.close();
      }
    };
  }, [setWsStatus, appendTraceStep]);

  return ws.current;
};

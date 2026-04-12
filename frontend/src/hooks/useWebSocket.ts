import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';

export const useWebSocket = () => {
  const ws = useRef<WebSocket | null>(null);
  const { setWsStatus, appendTraceStep } = useAppStore();

  useEffect(() => {
    let reconnectTimeout: ReturnType<typeof setTimeout>;
    let backoff = 1000;

    const connect = () => {
      const wsUrl = import.meta.env.VITE_WS_BASE || 'ws://localhost:8080/ws';
      setWsStatus('connecting');
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setWsStatus('connected');
        backoff = 1000;
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'agent_trace') {
            appendTraceStep(data.payload);
          } else if (data.type === 'inventory_update') {
            // Can trigger a query invalidation externally or update currentHU if it matches
            // We dispatch a custom event to notify TanStack Query
            window.dispatchEvent(new CustomEvent('inventory_update', { detail: data.payload }));
          }
        } catch (err) {
          console.error("WS Parse Error", err);
        }
      };

      ws.current.onclose = () => {
        setWsStatus('disconnected');
        reconnectTimeout = setTimeout(connect, Math.min(backoff * 2, 5000));
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

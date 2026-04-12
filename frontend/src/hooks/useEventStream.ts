import { useEffect } from 'react';

// Legacy SSE helper kept for backward compatibility.
// Current runtime uses WebSocket `/ws` for agent trace streaming.
export function useEventStream(onEvent: (event: Record<string, unknown>) => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    void onEvent;
    return;
  }, [enabled, onEvent]);
}

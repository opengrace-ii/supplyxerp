import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { useAppStore } from '../store/useAppStore';

export const useScan = () => {
  const queryClient = useQueryClient();
  const { setCurrentHU, currentMode } = useAppStore();

  return useMutation({
    mutationFn: async (barcode: string) => {
      const result = await api.scan(barcode);
      return result;
    },
    onSuccess: (data) => {
      if (data.success) {
        setCurrentHU(data.data.hu);
        // Force refresh inventory query
        queryClient.invalidateQueries({ queryKey: ['inventory'] });
        queryClient.invalidateQueries({ queryKey: ['lineage', data.data.hu.id] });
      }
    },
    onError: (error: any) => {
      console.error("Scan Error", error);
      // Let the trace panel handle to show errors from websocket
    }
  });
};

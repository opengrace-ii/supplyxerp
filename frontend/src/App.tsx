import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppPage from './pages/AppPage';
import { useWebSocket } from './hooks/useWebSocket';

const queryClient = new QueryClient();

const AppWrapper = () => {
  useWebSocket();
  return <AppPage />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppWrapper />
    </QueryClientProvider>
  );
}

export default App;

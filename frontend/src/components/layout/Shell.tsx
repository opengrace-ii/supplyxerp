import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAppStore } from '../../store/useAppStore';

const Shell: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const { currentTab } = useAppStore();

  return (
    <div className={`shell-container theme-${currentTab}`}>
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <main className="working-area">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Shell;

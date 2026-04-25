import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useAppStore } from '../../store/useAppStore';

const Shell: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <div className="erp">
      <TopBar />
      <Sidebar />
      <div className="main">
        {children}
      </div>
    </div>
  );
};

export default Shell;

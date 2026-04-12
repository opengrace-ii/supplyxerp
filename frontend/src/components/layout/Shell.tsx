import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const Shell: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <div className="shell-container">
      <Sidebar />
      <div className="main-content">
        <TopBar />
        <main style={{flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-base)'}}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Shell;

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <Sidebar />
      <Header />
      <main className="lg:ml-64 pt-20">
        <div className="p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

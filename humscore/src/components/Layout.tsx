import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const tabs = [
  {
    to: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    to: '/record',
    label: 'Record',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
  {
    to: '/saved',
    label: 'Saved',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M20 2H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2zm-6 2.5c1.93 0 3.5 1.57 3.5 3.5S15.93 11.5 14 11.5 10.5 9.93 10.5 8 12.07 4.5 14 4.5zM20 16H8v-.57c0-2.1 2.8-3.93 6-3.93s6 1.83 6 3.93V16zM4 6H2v14a2 2 0 0 0 2 2h14v-2H4V6z" />
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
      </svg>
    ),
  },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isResultsPage = location.pathname.startsWith('/results/');

  return (
    <div
      className="flex flex-col min-h-screen bg-slate-900"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Status bar spacer on iOS */}
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>

      {/* Bottom Tab Bar – hidden on results page to give full screen */}
      {!isResultsPage && (
        <nav
          className="shrink-0 bg-slate-800/95 backdrop-blur border-t border-slate-700 flex items-stretch"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] transition-colors ${
                  isActive
                    ? 'text-brand-400'
                    : 'text-slate-500 active:text-slate-300'
                }`
              }
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

/**
 * Navbar component with logo, navigation, and theme toggle.
 */

import { Moon, Sun, Bot, History } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

interface NavbarProps {
  currentPage: 'home' | 'history';
  onNavigate: (page: 'home' | 'history') => void;
}

export function Navbar({ currentPage, onNavigate }: NavbarProps) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <button
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 transition-opacity hover:opacity-80"
          id="nav-logo"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-500 shadow-lg shadow-blue-500/20">
            <Bot size={20} className="text-white" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
              MGTAB
            </span>
            <span className="ml-1 text-lg font-light text-[var(--text-secondary)]">
              Detector
            </span>
          </div>
        </button>

        {/* Navigation + Theme Toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => onNavigate('home')}
            id="nav-home"
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              currentPage === 'home'
                ? 'bg-[var(--surface-3)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
            }`}
          >
            Analyze
          </button>
          <button
            onClick={() => onNavigate('history')}
            id="nav-history"
            className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              currentPage === 'history'
                ? 'bg-[var(--surface-3)] text-[var(--text-primary)]'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]'
            }`}
          >
            <History size={14} />
            History
          </button>

          <div className="mx-2 h-5 w-px bg-[var(--glass-border)]" />

          <button
            onClick={toggleTheme}
            id="theme-toggle"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-2)] hover:text-[var(--text-primary)]"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </nav>
  );
}

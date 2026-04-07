/**
 * History page — shows past predictions in a clean layout.
 */

import { motion } from 'framer-motion';
import { Bot, User, Clock, ExternalLink, Inbox } from 'lucide-react';
import { useHistory } from '../hooks/useApi';
import { formatRelativeTime, formatLatency } from '../lib/utils';

interface HistoryPageProps {
  onViewResult: (entry: { response: { label: string; confidence: number } }) => void;
}

export function HistoryPage({ onViewResult }: HistoryPageProps) {
  const { data, isLoading, error } = useHistory(1, 50);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-8">
          Analysis History
        </h2>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="shimmer h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 text-center">
        <p className="text-[var(--text-secondary)]">
          Failed to load history. Make sure the backend is running.
        </p>
      </div>
    );
  }

  const entries = data?.entries ?? [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
            Analysis History
          </h2>
          <p className="text-base text-[var(--text-muted)] mt-2">
            {data?.total ?? 0} total predictions recorded
          </p>
        </div>
      </div>

      {entries.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card flex flex-col items-center justify-center py-24 px-6 text-center border-dashed border-2"
        >
          <Inbox size={48} className="text-[var(--surface-4)] mb-4" />
          <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            No predictions yet
          </h3>
          <p className="text-sm text-[var(--text-muted)]">
            Start by analyzing an account on the home page.
          </p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {entries.map((entry, idx) => {
            const isBot = entry.response.label === 'bot';
            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="glass-card px-5 py-4 transition-all hover:bg-[var(--surface-2)] cursor-pointer group rounded-2xl flex items-center justify-between"
                onClick={() => onViewResult(entry)}
                id={`history-entry-${entry.id}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl font-bold ${
                      isBot
                        ? 'bg-rose-500/10 text-rose-500'
                        : 'bg-emerald-500/10 text-emerald-500'
                    }`}
                  >
                    {isBot ? <Bot size={24} /> : <User size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-0.5">
                      <span
                        className={`text-base font-bold uppercase tracking-wider ${
                          isBot ? 'text-rose-500' : 'text-emerald-500'
                        }`}
                      >
                        {isBot ? 'Bot' : 'Human'}
                      </span>
                      <span className="rounded-full bg-[var(--surface-0)] px-2 py-0.5 border border-[var(--glass-border)] text-xs font-mono font-medium text-[var(--text-primary)]">
                        {Math.round(entry.response.confidence * 100)}% Match
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-[var(--text-muted)] font-medium">
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} />
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                      <span>
                        • {formatLatency(entry.response.latencyMs)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {entry.response.usedTweetEmbedding && (
                       <span className="rounded-full bg-[var(--surface-0)] border border-[var(--glass-border)] px-3 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                         Includes Tweets
                       </span>
                  )}
                  <ExternalLink
                    size={18}
                    className="text-[var(--text-muted)] opacity-0 transition-all group-hover:opacity-100 group-hover:text-[var(--text-primary)] transform group-hover:translate-x-1"
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

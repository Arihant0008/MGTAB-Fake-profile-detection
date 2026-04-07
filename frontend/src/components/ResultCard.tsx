import { motion } from 'framer-motion';
import { Bot, User, Clock, Download, TrendingUp, TrendingDown } from 'lucide-react';
import { ConfidenceGauge } from './ConfidenceGauge';
import { formatLatency } from '../lib/utils';
import type { PredictionResponse } from '../lib/api';

interface ResultCardProps {
  result: PredictionResponse;
}

export function ResultCard({ result }: ResultCardProps) {
  const isBot = result.label === 'bot';

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mgtab-prediction-${result.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, type: 'spring', damping: 25 }}
      className="glass-card overflow-hidden bg-[var(--surface-0)] border-[var(--glass-border)] shadow-xl"
      id="result-card"
    >
      <div
        className="h-2 w-full absolute top-0 left-0"
        style={{
          background: isBot
            ? 'var(--accent-bot)'
            : 'var(--accent-human)',
        }}
      />

      <div className="p-8 sm:p-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between mb-8 pb-8 border-b border-[var(--glass-border)]">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', damping: 15 }}
            className={`inline-flex items-center gap-3 rounded-2xl px-5 py-2.5 text-base font-extrabold tracking-wide uppercase ${
              isBot
                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
            }`}
          >
            {isBot ? <Bot size={22} /> : <User size={22} />}
            {isBot ? 'Bot Account Detected' : 'Human Account Identified'}
          </motion.div>

          <div className="flex items-center gap-4 mt-6 sm:mt-0 text-sm font-medium text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--surface-1)]">
              <Clock size={14} />
              {formatLatency(result.latencyMs)}
            </span>
            <button
              onClick={handleExportJSON}
              id="export-json"
              className="flex items-center gap-1.5 rounded-lg bg-[var(--surface-1)] px-3 py-1.5 transition-colors hover:bg-[var(--surface-2)] hover:text-white"
            >
              <Download size={14} />
              JSON
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center gap-10 lg:flex-row lg:justify-center lg:gap-16 my-8">
          <ConfidenceGauge
            confidence={result.confidence}
            label={result.label}
          />

          <div className="space-y-6 w-full max-w-[280px]">
             <div className="flex items-center gap-3 mb-2">
                 <h3 className="text-lg font-bold text-[var(--text-primary)]">Probability Scores</h3>
             </div>
             
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold uppercase tracking-wider">
                <span className="text-emerald-500">Human</span>
                <span className="text-[var(--text-primary)]">
                  {(result.humanProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--surface-2)] border border-[var(--glass-border)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.humanProbability * 100}%` }}
                  transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold uppercase tracking-wider">
                <span className="text-rose-500">Bot</span>
                <span className="text-[var(--text-primary)]">
                  {(result.botProbability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--surface-2)] border border-[var(--glass-border)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.botProbability * 100}%` }}
                  transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
                  className="h-full rounded-full bg-rose-500"
                />
              </div>
            </div>
          </div>
        </div>

        {result.topFeatures.length > 0 && (
          <div className="mt-12 pt-8 border-t border-[var(--glass-border)]">
            <h4 className="mb-6 text-sm font-bold uppercase tracking-wider text-[var(--text-muted)]">
              Key Contributing Features
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              {result.topFeatures.map((feature, idx) => (
                <motion.div
                  key={feature.featureName}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + idx * 0.1 }}
                  className="flex flex-col justify-center rounded-xl bg-[var(--surface-1)] border border-[var(--glass-border)] p-4 hover:border-[var(--glass-hover)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-[var(--text-primary)]">
                      {feature.displayName}
                    </span>
                    {feature.direction === 'bot' ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">
                           <TrendingUp size={12} /> BOT
                        </div>
                    ) : (
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                            <TrendingDown size={12} /> HUMAN
                        </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${feature.importance * 100}%` }}
                        transition={{ delay: 0.8 + idx * 0.1, duration: 0.6, ease: "easeOut" }}
                        className={`h-full rounded-full ${
                          feature.direction === 'bot' ? 'bg-rose-500' : 'bg-emerald-500'
                        }`}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

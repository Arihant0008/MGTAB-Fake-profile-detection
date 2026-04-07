import { motion } from 'framer-motion';
import { Shield, Target, Zap } from 'lucide-react';

interface HeroProps {
  onGetStarted: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
  return (
    <section style={{ width: '100%' }}>
      {/* Centered inner wrapper — matches form section width */}
      <div style={{ maxWidth: '896px', margin: '0 auto', padding: '80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--surface-1)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <Zap size={14} className="text-[var(--text-primary)]" />
            Enterprise AI Detection
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mt-8 text-5xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-7xl leading-tight"
        >
          Identify Bots with
          <br />
          <span className="text-[var(--text-muted)]">Absolute Clarity</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 max-w-xl text-lg text-[var(--text-secondary)] leading-relaxed"
        >
          MGTAB combines network analysis with deep learning to classify social media accounts with unparalleled accuracy. Enter the 20 account features to begin inference.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10"
        >
          <button
            onClick={onGetStarted}
            id="hero-cta"
            className="btn-primary text-base px-8 py-4 shadow-lg shadow-[var(--surface-2)]"
          >
            <Shield size={18} />
            Start Analysis
          </button>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 grid w-full grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {[
            { label: 'Test Accuracy', value: '88.2%', icon: Target },
            { label: 'Bot Recall', value: '90.3%', icon: Shield },
            { label: 'Neural Embeddings', value: '788-dim', icon: Zap },
          ].map((stat) => (
            <div key={stat.label} className="glass-card flex flex-col items-center p-6">
              <stat.icon size={20} className="text-[var(--text-muted)] mb-3" />
              <span className="text-2xl font-bold text-[var(--text-primary)] mb-1">{stat.value}</span>
              <span className="text-xs uppercase tracking-wide font-medium text-[var(--text-muted)]">{stat.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

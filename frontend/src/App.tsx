/**
 * MGTAB Detector — Main Application.
 *
 * Single-page app with two views:
 * 1. Home: Hero → Feature Form → Result Card
 * 2. History: Past predictions list
 */

import { useState, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { FeatureForm } from './components/FeatureForm';
import { ResultCard } from './components/ResultCard';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { HistoryPage } from './components/HistoryPage';
import { Footer } from './components/Footer';
import { usePredict, type PredictionResponse } from './hooks/useApi';
import { AlertCircle } from 'lucide-react';

type Page = 'home' | 'history';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [result, setResult] = useState<PredictionResponse | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const predictMutation = usePredict();

  const scrollToForm = useCallback(() => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handlePredict = useCallback(
    (data: { features: Record<string, number | boolean>; tweets?: string[] }) => {
      setResult(null);
      predictMutation.mutate(data, {
        onSuccess: (response) => {
          setResult(response);
          setTimeout(() => {
            resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }, 100);
        },
      });
    },
    [predictMutation]
  );

  return (
    <div className="flex min-h-screen flex-col w-full">
      <Navbar currentPage={currentPage} onNavigate={setCurrentPage} />

      <main className="flex-1 w-full">
        <AnimatePresence mode="wait">
          {currentPage === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'block', width: '100%' }}
            >
              {/* Hero — full width, centers internally */}
              <Hero onGetStarted={scrollToForm} />

              {/* Form section — explicitly centered with inline styles */}
              <div ref={formRef} style={{ width: '100%' }}>
                <div style={{ maxWidth: '896px', margin: '0 auto', padding: '0 24px 64px' }}>
                  {/* Section heading */}
                  <div className="mb-10 text-center">
                    <h2 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)]">
                      Profile Analysis
                    </h2>
                    <p className="mt-3 text-base text-[var(--text-muted)] max-w-2xl mx-auto leading-relaxed">
                      Enter the 20 account features below. The model will classify the account as Bot or Human with a confidence score.
                    </p>
                  </div>

                  <FeatureForm
                    onSubmit={handlePredict}
                    isLoading={predictMutation.isPending}
                  />

                  {/* Error */}
                  {predictMutation.isError && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-8 glass-card border-rose-500/20 px-6 py-5"
                    >
                      <div className="flex items-start gap-4">
                        <AlertCircle size={20} className="text-rose-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-semibold text-rose-400">
                            Prediction Failed
                          </h4>
                          <p className="text-sm text-[var(--text-secondary)] mt-1.5">
                            {predictMutation.error?.message ||
                              'Could not reach the inference server. Make sure the backend is running.'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Loading State */}
                  {predictMutation.isPending && (
                    <div className="mt-12">
                      <LoadingSkeleton />
                    </div>
                  )}

                  {/* Result */}
                  {result && !predictMutation.isPending && (
                    <div ref={resultRef} className="mt-12">
                      <ResultCard result={result} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="history"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'block', width: '100%' }}
            >
              <HistoryPage onViewResult={() => {}} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

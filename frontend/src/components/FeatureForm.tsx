/**
 * Feature input form with grouped fields, toggle switches for booleans,
 * number inputs for metrics, and optional tweet textarea.
 *
 * Uses React Hook Form + Zod for validation.
 */

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Send, Loader2, Info } from 'lucide-react';
import {
  featureFormSchema,
  type FeatureFormData,
  FORM_GROUPS,
  FIELD_CONFIG,
} from '../schemas/featureForm';

interface FeatureFormProps {
  onSubmit: (data: { features: Record<string, number | boolean>; tweets?: string[] }) => void;
  isLoading: boolean;
}

export function FeatureForm({ onSubmit, isLoading }: FeatureFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FeatureFormData>({
    resolver: zodResolver(featureFormSchema),
    defaultValues: {
      profile_use_background_image: false,
      default_profile: true,
      default_profile_image: false,
      default_profile_background_color: true,
      default_profile_sidebar_fill_color: true,
      default_profile_sidebar_border_color: true,
      profile_background_image_url: false,
      verified: false,
      has_url: false,
      screen_name_length: 8,
      name_length: 10,
      description_length: 50,
      statuses_count: 1000,
      favourites_count: 500,
      listed_count: 5,
      followers_count: 200,
      friends_count: 150,
      followers_friends_ratio: 1.33,
      created_at: 1000,
      geo_enabled: false,
      tweets: '',
    },
  });

  const processSubmit = (data: FeatureFormData) => {
    const { tweets: tweetsRaw, ...features } = data;
    const tweets = tweetsRaw
      ? tweetsRaw.split('\n').filter((t: string) => t.trim().length > 0)
      : undefined;

    onSubmit({
      features: features as Record<string, number | boolean>,
      tweets: tweets && tweets.length > 0 ? tweets : undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      id="feature-form"
    >
      <form onSubmit={handleSubmit(processSubmit)} className="space-y-14">

        {/* Feature Groups */}
        {FORM_GROUPS.map((group, groupIdx) => (
          <motion.section
            key={group.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: groupIdx * 0.06 }}
          >
            {/* Group Header */}
            <div className="mb-6 flex items-center gap-4 pb-4 border-b border-[var(--glass-border)]">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--surface-1)] border border-[var(--glass-border)] text-xl shadow-sm">
                {group.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">{group.title}</h3>
                <p className="text-sm text-[var(--text-muted)] mt-0.5">{group.subtitle}</p>
              </div>
            </div>

            {/* Group Fields — 2-col grid */}
            <div className="grid gap-5 sm:grid-cols-2">
              {group.fields.map((fieldName) => {
                const config = FIELD_CONFIG[fieldName];
                if (!config) return null;

                const fieldError = errors[fieldName as keyof FeatureFormData];

                /* Boolean Toggle */
                if (config.type === 'boolean') {
                  return (
                    <Controller
                      key={fieldName}
                      name={fieldName as keyof FeatureFormData}
                      control={control}
                      render={({ field }) => (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--glass-border)] bg-[var(--surface-0)] px-5 py-4 shadow-sm transition-colors hover:border-[var(--glass-hover)]">
                          <div className="flex items-center gap-2 min-w-0">
                            <label
                              htmlFor={fieldName}
                              className="text-sm font-medium text-[var(--text-primary)] truncate cursor-pointer"
                            >
                              {config.label}
                            </label>
                            <div className="group relative flex-shrink-0">
                              <Info size={13} className="text-[var(--text-muted)] cursor-help" />
                              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-56 rounded-xl bg-[var(--surface-3)] px-4 py-3 text-xs text-[var(--text-secondary)] shadow-xl border border-[var(--glass-border)] leading-relaxed">
                                {config.help}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            id={fieldName}
                            role="switch"
                            aria-checked={!!field.value}
                            onClick={() => field.onChange(!field.value)}
                            className={`toggle-switch ${field.value ? 'active' : ''}`}
                          />
                        </div>
                      )}
                    />
                  );
                }

                /* Number Input */
                return (
                  <div key={fieldName} className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={fieldName}
                        className="text-sm font-semibold text-[var(--text-primary)]"
                      >
                        {config.label}
                      </label>
                      <div className="group relative">
                        <Info size={13} className="text-[var(--text-muted)] cursor-help" />
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 w-56 rounded-xl bg-[var(--surface-3)] px-4 py-3 text-xs text-[var(--text-secondary)] shadow-xl border border-[var(--glass-border)] leading-relaxed">
                          {config.help}
                        </div>
                      </div>
                    </div>
                    <input
                      {...register(fieldName as keyof FeatureFormData, {
                        valueAsNumber: config.type === 'number',
                      })}
                      type="number"
                      step={fieldName === 'followers_friends_ratio' ? '0.01' : '1'}
                      id={fieldName}
                      placeholder={config.placeholder}
                      className={`input-field ${fieldError ? 'border-rose-500/50 focus:border-rose-500' : ''}`}
                    />
                    {fieldError && (
                      <p className="text-xs text-rose-400 font-medium">
                        {fieldError.message as string}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.section>
        ))}

        {/* Tweet Input */}
        <motion.section
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.28 }}
        >
          <div className="mb-6 flex items-center gap-4 pb-4 border-b border-[var(--glass-border)]">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[var(--surface-1)] border border-[var(--glass-border)] text-xl shadow-sm">
              💬
            </div>
            <div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">
                Recent Tweets
                <span className="ml-2.5 text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] bg-[var(--surface-2)] px-2 py-0.5 rounded-md align-middle">
                  Optional
                </span>
              </h3>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                Paste recent tweets (one per line) for advanced semantic analysis
              </p>
            </div>
          </div>
          <textarea
            {...register('tweets')}
            id="tweets-input"
            rows={5}
            placeholder={"Paste tweets here, one per line...\nTweet 1\nTweet 2\nTweet 3"}
            className="input-field resize-y min-h-[120px] text-sm leading-relaxed"
          />
        </motion.section>

        {/* Submit */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.34 }}
          className="flex justify-center pt-4 border-t border-[var(--glass-border)]"
        >
          <button
            type="submit"
            disabled={isLoading}
            id="submit-prediction"
            className="btn-primary w-full max-w-lg text-base py-4 font-bold shadow-xl"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Processing Analysis...
              </>
            ) : (
              <>
                <Send size={18} />
                Run Bot Detection
              </>
            )}
          </button>
        </motion.div>
      </form>
    </motion.div>
  );
}

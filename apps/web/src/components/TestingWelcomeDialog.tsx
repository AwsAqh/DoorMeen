import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'doormeen-testing-notice-seen-v1';

export default function TestingWelcomeDialog() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(localStorage.getItem(STORAGE_KEY) !== 'yes'), []);
  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'yes');
    setOpen(false);
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <section role="dialog" aria-modal="true" aria-labelledby="testing-notice-title" className="w-full max-w-lg rounded-3xl border p-6 shadow-2xl sm:p-8" style={{ background: 'var(--dm-surface)', color: 'var(--dm-text-primary)', borderColor: 'var(--dm-surface-border)' }}>
        <div className="mb-4 inline-flex rounded-full px-3 py-1 text-xs font-bold tracking-wide" style={{ background: 'var(--dm-accent-glow)', color: 'var(--dm-accent-dark)' }}>{t('testingNotice.badge')}</div>
        <h2 id="testing-notice-title" className="text-2xl font-extrabold">{t('testingNotice.title')}</h2>
        <p className="mt-2 leading-relaxed" style={{ color: 'var(--dm-text-secondary)' }}>{t('testingNotice.intro')}</p>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed" style={{ color: 'var(--dm-text-secondary)' }}>
          {(['passwordReset', 'sms', 'earlyAccess', 'ownerEmail'] as const).map(key => <li key={key}>• {t(`testingNotice.${key}`)}</li>)}
        </ul>
        <button type="button" onClick={dismiss} className="btn-primary mt-7 w-full rounded-xl px-5 py-3 font-bold">{t('testingNotice.continue')}</button>
      </section>
    </div>
  );
}

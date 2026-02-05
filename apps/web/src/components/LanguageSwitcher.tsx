import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import LanguageIcon from '@mui/icons-material/Language';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <motion.button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-full transition-colors"
      style={{
        background: 'var(--dm-surface)',
        color: 'var(--dm-text-primary)',
        border: '1px solid var(--dm-surface-border)',
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      aria-label={t('language.switch')}
      title={t('language.switch')}
    >
      <LanguageIcon fontSize="small" />
      <span className="text-sm font-medium">
        {i18n.language === 'en' ? t('language.arabic') : t('language.english')}
      </span>
    </motion.button>
  );
}

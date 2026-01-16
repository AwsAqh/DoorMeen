import React from 'react';
import { useTranslation } from 'react-i18next';
import LanguageIcon from '@mui/icons-material/Language';

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'ar' : 'en';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
      aria-label={t('language.switch')}
      title={t('language.switch')}
    >
      <LanguageIcon />
      <span className="text-sm font-medium">
        {i18n.language === 'en' ? t('language.arabic') : t('language.english')}
      </span>
    </button>
  );
}


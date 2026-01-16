import React from "react";
import { useTranslation } from 'react-i18next';

export default function Footer() {
    const { t } = useTranslation();
    return (
      <footer className="bg-slate-800 text-slate-300 py-8 mt-16">
        <div className="container mx-auto px-4 max-w-6xl">
          
          {/* Logo and tagline */}
          <div className="mb-6">
            <h3 className="text-white font-semibold text-lg mb-1">{t('header.title')}</h3>
            <p className="text-sm text-slate-400">{t('footer.tagline')}</p>
          </div>
          
          {/* Links */}
          <div className="flex flex-wrap gap-6 mb-6 text-sm">
            <a 
               
              className="hover:text-white transition-colors duration-200"
            >
              {t('footer.contact')}
            </a>
            <a 
              
              className="hover:text-white transition-colors duration-200"
            >
              {t('footer.privacy')}
            </a>
            <a 
              
              className="hover:text-white transition-colors duration-200"
            >
              {t('footer.terms')}
            </a>
          </div>
          
          {/* Divider */}
          <div className="border-t border-slate-700 pt-6">
            <p className="text-sm text-slate-400">
              {t('footer.copyright', { year: new Date().getFullYear() })}
            </p>
          </div>
          
        </div>
      </footer>
    );
  }
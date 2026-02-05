import { useTranslation } from 'react-i18next';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer
      className="py-8 mt-auto"
      style={{
        background: 'var(--dm-bg-secondary)',
        borderTop: '1px solid var(--dm-surface-border)',
      }}
    >
      <div className="container mx-auto px-4 max-w-6xl">

        {/* Top section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
          {/* Logo and tagline */}
          <div>
            <h3
              className="font-bold text-lg mb-1"
              style={{ color: 'var(--dm-accent)' }}
            >
              {t('header.title')}
            </h3>
            <p
              className="text-sm"
              style={{ color: 'var(--dm-text-muted)' }}
            >
              {t('footer.tagline')}
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-6 text-sm">
            <a
              href="#contact"
              className="transition-colors duration-200"
              style={{ color: 'var(--dm-text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--dm-accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--dm-text-secondary)'}
            >
              {t('footer.contact')}
            </a>
            <a
              href="#privacy"
              className="transition-colors duration-200"
              style={{ color: 'var(--dm-text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--dm-accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--dm-text-secondary)'}
            >
              {t('footer.privacy')}
            </a>
            <a
              href="#terms"
              className="transition-colors duration-200"
              style={{ color: 'var(--dm-text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--dm-accent)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--dm-text-secondary)'}
            >
              {t('footer.terms')}
            </a>
          </div>
        </div>

        {/* Divider */}
        <div
          className="pt-6"
          style={{ borderTop: '1px solid var(--dm-surface-border)' }}
        >
          <p
            className="text-sm"
            style={{ color: 'var(--dm-text-muted)' }}
          >
            {t('footer.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>

      </div>
    </footer>
  );
}
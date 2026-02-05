import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import "../customstyle.css"
import HomeFilledIcon from '@mui/icons-material/HomeFilled';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import LanguageSwitcher from './LanguageSwitcher';
import ThemeToggle from './ThemeToggle';

const Header = () => {
  const navigate = useNavigate()
  const { t } = useTranslation();

  return (
    <header
      className="
          w-full py-4 px-4 sm:px-6 lg:px-8
          border-b
        "
      style={{
        background: 'var(--dm-bg-secondary)',
        borderColor: 'var(--dm-surface-border)',
      }}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between">
        {/* Logo */}
        <h1
          className="text-xl sm:text-2xl font-bold cursor-pointer transition-colors hover:opacity-80"
          style={{ color: 'var(--dm-accent)' }}
          onClick={() => navigate("/")}
        >
          {t('header.title')}
        </h1>

        {/* Navigation */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
            style={{
              background: 'var(--dm-surface)',
              color: 'var(--dm-text-primary)',
            }}
            aria-label={t('nav.home')}
          >
            <HomeFilledIcon fontSize="small" />
          </button>

          <button
            onClick={() => navigate("/scan")}
            className="flex items-center justify-center w-10 h-10 rounded-full transition-colors"
            style={{
              background: 'var(--dm-surface)',
              color: 'var(--dm-text-primary)',
            }}
            aria-label={t('nav.scan')}
          >
            <QrCode2Icon fontSize="small" />
          </button>

          <ThemeToggle />

          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  )
}

export default Header

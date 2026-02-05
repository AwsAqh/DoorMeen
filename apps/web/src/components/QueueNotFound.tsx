import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HomeIcon from '@mui/icons-material/Home';

const QueueNotFound = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      className="flex-1 w-full flex flex-col items-center justify-center gap-6 p-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="inline-flex h-20 w-20 items-center justify-center rounded-full"
        style={{ background: 'var(--dm-surface)' }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, type: "spring" }}
      >
        <ErrorOutlineIcon
          style={{ fontSize: 40, color: 'var(--dm-accent)' }}
        />
      </motion.div>

      <div className="text-center">
        <h2
          className="text-3xl font-bold mb-2"
          style={{ color: 'var(--dm-text-primary)' }}
        >
          {t('queue.notFound')}
        </h2>
        <p
          className="text-lg"
          style={{ color: 'var(--dm-text-muted)' }}
        >
          {t('queue.notFoundDesc') || 'This queue does not exist or has been deleted.'}
        </p>
      </div>

      <motion.button
        onClick={() => navigate('/')}
        className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl font-medium"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <HomeIcon fontSize="small" />
        {t('nav.home') || 'Go Home'}
      </motion.button>
    </motion.div>
  );
};

export default QueueNotFound;

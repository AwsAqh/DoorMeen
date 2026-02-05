// src/components/NoCustomersFound.tsx
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

export default function NoCustomersFound({
  owner = false,
  onAction,
}: {
  owner?: boolean;
  onAction?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <motion.div
      className="w-full rounded-2xl p-8 text-center glass-card"
      style={{
        border: '1px dashed var(--dm-surface-border)',
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Icon */}
      <motion.div
        className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: 'var(--dm-surface)' }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <PersonAddIcon
          fontSize="large"
          style={{ color: 'var(--dm-accent)' }}
        />
      </motion.div>

      <h3
        className="text-xl font-semibold"
        style={{ color: 'var(--dm-text-primary)' }}
      >
        {t('queue.noCustomers')}
      </h3>
      <p
        className="mt-2 text-sm"
        style={{ color: 'var(--dm-text-muted)' }}
      >
        {owner
          ? t('queue.noCustomersOwner')
          : t('queue.noCustomersPublic')}
      </p>

      {onAction && (
        <motion.button
          onClick={onAction}
          className="btn-primary mt-6 px-6 py-3 rounded-xl font-medium"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {owner ? t('queue.addCustomer') : t('queue.joinQueue')}
        </motion.button>
      )}
    </motion.div>
  );
}

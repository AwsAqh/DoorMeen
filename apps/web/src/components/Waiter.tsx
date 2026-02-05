// components/Waiter.tsx
import { motion } from "framer-motion";
import "../customstyle.css";
import LogoutIcon from '@mui/icons-material/Logout';
import { getStatusLabel, Status } from "./Helpers/status";

export default function Waiter({
  id,
  name,
  phone,
  status,
  onCancel
}: {
  id: number;
  name: string;
  phone: string;
  status: Status;
  onChange?: (next: Status) => void;
  onCancel: (id: number) => void;
}) {
  const checkUserRow = () => {
    const token = localStorage.getItem(`queueCancelToken${id}`);
    return token ? true : false;
  };

  return (
    <motion.div
      className="waiter-row"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.2 }}
    >
      <div className="waiter-meta">
        <span className="waiter-name">{name}</span>
        {phone && <span className="waiter-phone">{phone}</span>}
      </div>

      <span className="flex items-center gap-2">
        <span
          className={`status-chip ${status === "in_progress" ? "status-serving" :
              status === "served" ? "status-done" :
                "status-waiting"
            }`}
        >
          {getStatusLabel(status)}
        </span>

        {status === "waiting" && checkUserRow() && (
          <motion.button
            onClick={() => onCancel(id)}
            className="p-2 rounded-full transition-colors"
            style={{
              background: 'var(--dm-surface)',
              color: 'var(--dm-text-secondary)',
            }}
            whileHover={{
              scale: 1.1,
              color: '#ef4444',
            }}
            whileTap={{ scale: 0.95 }}
            aria-label="Cancel"
          >
            <LogoutIcon fontSize="small" />
          </motion.button>
        )}
      </span>
    </motion.div>
  );
}

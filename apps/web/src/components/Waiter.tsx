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
  estimatedWait,
  onCancel,
  onChange,
  onSnooze,
}: {
  id: number;
  name: string;
  phone: string;
  status: Status;
  estimatedWait?: number | null;
  onChange?: (next: Status) => void;
  onCancel: (id: number) => void;
  onSnooze?: (id: number) => void;
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

        {status === "waiting" && estimatedWait != null && estimatedWait > 0 && (
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.3)',
            }}
          >
            ⏱ ~{estimatedWait} min
          </span>
        )}

        {status === "waiting" && checkUserRow() && (
          <>
            {onSnooze && (
              <motion.button
                onClick={() => onSnooze(id)}
                className="p-2 rounded-full transition-colors flex items-center justify-center"
                style={{
                  background: 'var(--dm-surface)',
                  color: 'var(--dm-text-secondary)',
                  marginLeft: '4px'
                }}
                whileHover={{
                  scale: 1.1,
                  color: 'var(--dm-accent)',
                }}
                whileTap={{ scale: 0.95 }}
                aria-label="Snooze / Push Back 1 Spot"
                title="Running late? Push yourself back 1 spot."
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </motion.button>
            )}
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
          </>
        )}
      </span>
    </motion.div>
  );
}

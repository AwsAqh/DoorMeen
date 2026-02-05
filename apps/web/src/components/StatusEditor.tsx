// StatusEditor.tsx
import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import type { Status } from "../components/Helpers/status";
import { getStatusLabel } from "../components/Helpers/status";

export function StatusEditor({
  value,
  onSave,
  inline = true,
}: {
  value: Status;
  onSave: (nextStatus: Status) => void | Promise<void>;
  inline?: boolean;
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Status>(value);
  const dirty = draft !== value;
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = React.useState({ top: 0, left: 0, width: 0 });

  const choose = (s: Status) => {
    setDraft(s);
    setIsOpen(false);
  };

  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // If we clicked on the button, don't close immediately (toggle handles it)
      if (buttonRef.current && buttonRef.current.contains(event.target as Node)) {
        return;
      }
      // If we clicked inside the portal menu, handled by menu items or background
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Recalculate position on scroll/resize
      const updatePosition = () => {
        if (buttonRef.current) {
          const rect = buttonRef.current.getBoundingClientRect();
          // Check if right alignment is better (if button is on right half of screen)
          const isRightSide = rect.left > window.innerWidth / 2;

          setCoords({
            top: rect.bottom + 8, // Fixed position, relative to viewport
            left: isRightSide
              ? rect.right - 160 // Align right edge (assuming min-w-160)
              : rect.left,       // Align left edge
            width: rect.width,
          });
        }
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);

      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen]);

  const getStatusColor = (status: Status) => {
    switch (status) {
      case 'in_progress':
        return { bg: 'var(--dm-status-progress-bg)', text: 'var(--dm-status-progress)', border: 'var(--dm-status-progress)' };
      case 'served':
        return { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: '#22c55e' };
      case 'pending_verification':
        return { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: '#eab308' };
      default:
        return { bg: 'var(--dm-status-waiting-bg)', text: 'var(--dm-text-secondary)', border: 'var(--dm-surface-border)' };
    }
  };

  const colors = getStatusColor(draft);

  return (
    <div
      className={`relative ${inline ? 'flex flex-row items-center gap-2' : 'flex flex-col items-center gap-2'}`}
    >
      <motion.button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold cursor-pointer transition-all whitespace-nowrap max-w-[200px]"
        style={{
          background: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
        }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <span className="truncate">{getStatusLabel(draft)}</span>
        <ArrowDropDownIcon fontSize="small" />
      </motion.button>

      {/* Portal for Dropdown Menu */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={menuRef}
              className="fixed z-[9999] glass-card rounded-xl overflow-hidden shadow-xl min-w-[160px]"
              style={{
                top: coords.top,
                left: coords.left,
              }}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              {(["waiting", "in_progress", "served", "pending_verification"] as Status[]).map((s) => {
                const itemColors = getStatusColor(s);
                return (
                  <motion.button
                    key={s}
                    onClick={() => choose(s)}
                    className="w-full px-4 py-3 text-left text-sm transition-colors flex items-center gap-2"
                    style={{
                      background: draft === s ? 'var(--dm-surface-hover)' : 'transparent',
                      color: 'var(--dm-text-primary)',
                      borderBottom: '1px solid var(--dm-surface-border)',
                    }}
                    whileHover={{ background: 'var(--dm-surface-hover)' }}
                  >
                    <span
                      className="flex-shrink-0 w-2 h-2 rounded-full"
                      style={{ background: itemColors.text }}
                    />
                    <span className="truncate">{getStatusLabel(s)}</span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <AnimatePresence>
        {dirty && (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
          >
            <motion.button
              onClick={() => onSave(draft)}
              className="btn-primary px-3 py-1 text-xs rounded-lg whitespace-nowrap"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t('common.save')}
            </motion.button>
            <motion.button
              onClick={() => setDraft(value)}
              className="btn-outline px-3 py-1 text-xs rounded-lg whitespace-nowrap"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {t('common.cancel')}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

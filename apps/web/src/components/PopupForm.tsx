import React from "react"
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import type { Mode } from "../components/Helpers/popupFormTypes";
import { COPIES } from "../components/Helpers/popupFormTypes";

type PopupFormProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  type: Mode;
  firstInputRef: React.Ref<HTMLInputElement>
  secondInputRef: React.Ref<HTMLInputElement>
  thirdInputRef?: React.Ref<HTMLInputElement>
  onResend?: () => void;
};
const PopupForm: React.FC<PopupFormProps> = ({ open, onClose, onSubmit, type, firstInputRef, secondInputRef, thirdInputRef, onResend }) => {
  const { t } = useTranslation();

  const copy = {
    title: t(`popupForm.${type}.title`),
    subTitle: t(`popupForm.${type}.subTitle`),
    label1: t(`popupForm.${type}.label1`),
    placeholder1: t(`popupForm.${type}.placeholder1`),
    input1type: COPIES[type].input1type,
    label2: t(`popupForm.${type}.label2`),
    placeholder2: t(`popupForm.${type}.placeholder2`),
    input2type: COPIES[type].input2type,
    input2MinLength: COPIES[type].input2MinLength,
    input2MaxLength: COPIES[type].input2MaxLength,
    pattern: COPIES[type].pattern,
    note: t(`popupForm.${type}.note`),
    action: t(`popupForm.${type}.action`),
    // Optional 3rd input (Email)
    label3: type === 'join' ? t(`popupForm.${type}.label3`) : undefined,
    placeholder3: type === 'join' ? t(`popupForm.${type}.placeholder3`) : undefined,
    input3type: type === 'join' ? COPIES[type].input3type : undefined,
    note3: type === 'join' ? t(`popupForm.${type}.note3`) : undefined,
    // Verify specific
    resend: type === 'verify' ? t(`popupForm.verify.resend`) : undefined,
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          aria-modal="true"
          role="dialog"
        >
          <motion.div
            className="w-full max-w-md rounded-2xl shadow-xl glass-card"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-6">
              <div className="mb-4">
                <h2
                  className="text-xl font-semibold"
                  style={{ color: 'var(--dm-text-primary)' }}
                >
                  {copy.title}
                </h2>
                <p
                  className="mt-1 text-sm"
                  style={{ color: 'var(--dm-text-muted)' }}
                >
                  {copy.subTitle}
                </p>
              </div>

              <form
                className="space-y-4"
                onSubmit={(e) => onSubmit(e)}
              >
                <div>
                  <label
                    htmlFor="Name"
                    className="mb-1 block text-sm font-medium"
                    style={{ color: 'var(--dm-text-secondary)' }}
                  >
                    {copy.label1}
                  </label>
                  <input
                    ref={firstInputRef}
                    id="Name"
                    name="Name"
                    type={copy.input1type}
                    placeholder={copy.placeholder1}
                    required
                    className="block w-full rounded-xl px-4 py-3 shadow-sm outline-none transition-all"
                    style={{
                      background: 'var(--dm-bg-primary)',
                      color: 'var(--dm-text-primary)',
                      border: '1px solid var(--dm-surface-border)',
                    }}
                  />
                </div>

                {type !== "manage" && type !== "verify" && (
                  <div>
                    <label
                      htmlFor="Password"
                      className="mb-1 block text-sm font-medium"
                      style={{ color: 'var(--dm-text-secondary)' }}
                    >
                      {copy.label2}
                    </label>
                    <input
                      ref={secondInputRef}
                      id="Password"
                      name="Password"
                      type={copy.input2type}
                      inputMode="numeric"
                      pattern={copy.pattern}
                      placeholder={copy.placeholder2}
                      required
                      min={copy.input2MinLength}
                      max={copy.input2MaxLength}
                      className="block w-full rounded-xl px-4 py-3 shadow-sm outline-none transition-all"
                      style={{
                        background: 'var(--dm-bg-primary)',
                        color: 'var(--dm-text-primary)',
                        border: '1px solid var(--dm-surface-border)',
                      }}
                    />
                    <p
                      className="mt-1 text-xs"
                      style={{ color: 'var(--dm-text-muted)' }}
                    >
                      {copy.note}
                    </p>
                  </div>
                )}

                {/* 3rd Input (Email for Join) */}
                {type === "join" && thirdInputRef && (
                  <div>
                    <label
                      htmlFor="Email"
                      className="mb-1 block text-sm font-medium"
                      style={{ color: 'var(--dm-text-secondary)' }}
                    >
                      {copy.label3}
                    </label>
                    <input
                      ref={thirdInputRef}
                      id="Email"
                      name="Email"
                      type={copy.input3type}
                      placeholder={copy.placeholder3}
                      required
                      className="block w-full rounded-xl px-4 py-3 shadow-sm outline-none transition-all"
                      style={{
                        background: 'var(--dm-bg-primary)',
                        color: 'var(--dm-text-primary)',
                        border: '1px solid var(--dm-surface-border)',
                      }}
                    />
                    {copy.note3 && (
                      <p
                        className="mt-1 text-xs"
                        style={{ color: 'var(--dm-text-muted)' }}
                      >
                        {copy.note3}
                      </p>
                    )}
                  </div>
                )}




                {copy.resend && onResend && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={onResend}
                      className="text-xs underline hover:text-white transition-colors"
                      style={{ color: 'var(--dm-text-muted)' }}
                    >
                      {copy.resend}
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <motion.button
                    type="button"
                    onClick={onClose}
                    className="btn-outline rounded-xl px-4 py-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {t('common.cancel')}
                  </motion.button>
                  <motion.button
                    type="submit"
                    className="btn-primary rounded-xl px-4 py-2 font-medium"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {copy.action}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>

          {/* Click outside to close */}
          <button
            aria-label={t('common.close')}
            onClick={onClose}
            className="absolute inset-0 -z-10 cursor-default"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default PopupForm

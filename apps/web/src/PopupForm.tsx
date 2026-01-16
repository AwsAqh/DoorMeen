import React from "react"
import { useTranslation } from 'react-i18next';
import type { Mode } from "../src/components/Helpers/popupFormTypes";
import { COPIES } from "../src/components/Helpers/popupFormTypes";

type PopupFormProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  type: Mode;     
  firstInputRef:React.Ref<HTMLInputElement>
  secondInputRef:React.Ref<HTMLInputElement>                
};


const PopupForm: React.FC<PopupFormProps> = ({ open, onClose ,onSubmit,type ,firstInputRef,secondInputRef}) => {
  const { t } = useTranslation();
  if (!open) return null
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
  };
  
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="p-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">{copy.title}</h2>
            <p className="mt-1 text-sm text-gray-500">
             {copy.subTitle}
            </p>
          </div>

          <form
            className="space-y-4"
            onSubmit={(e)=>onSubmit(e)}
          >
            <div>
              <label htmlFor="Name" className="mb-1 block text-sm font-medium text-gray-700">
                {copy.label1}
              </label>
              <input
               ref= {firstInputRef}
                id="Name"
                name="Name"
                type={copy.input1type}
                placeholder={copy.placeholder1}
                required
                
                className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            { type!=="manage" && <div>
              <label htmlFor="Password" className="mb-1 block text-sm font-medium text-gray-700">
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
                className="block w-full rounded-xl border border-gray-300 bg-white px-4 py-2 text-gray-900 shadow-sm outline-none transition focus:border-gray-900 focus:ring-2 focus:ring-gray-900/20"
              />
              <p className="mt-1 text-xs text-gray-500">{copy.note}</p>
            </div>
            }
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50 active:scale-[.99]"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="rounded-xl bg-gray-900 px-4 py-2 font-medium text-white shadow-sm transition hover:bg-black active:scale-[.99]"
              >
                {copy.action}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* click outside to close */}
      <button
        aria-label={t('common.close')}
        onClick={onClose}
        className="absolute inset-0 -z-10 cursor-default"
      />
    </div>
  )
}

export default PopupForm

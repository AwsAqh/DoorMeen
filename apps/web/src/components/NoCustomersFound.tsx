// src/components/NoCustomersFound.tsx
import React from "react";
import { useTranslation } from 'react-i18next';

export default function NoCustomersFound({
  owner = false,
  onAction,
}: {
  owner?: boolean;
  onAction?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="w-full rounded-2xl border border-dashed border-gray-300 bg-white/60 p-8 text-center">
      {/* icon */}
      <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-6 w-6 text-gray-500"
        >
          <path
            d="M16 11a4 4 0 10-8 0 4 4 0 008 0Zm-5 6a6 6 0 00-6 6h2a4 4 0 014-4h2a4 4 0 014 4h2a6 6 0 00-6-6h-2Z"
            fill="currentColor"
          />
        </svg>
      </div>

      <h3 className="text-lg font-semibold">{t('queue.noCustomers')}</h3>
      <p className="mt-1 text-sm text-gray-600">
        {owner
          ? t('queue.noCustomersOwner')
          : t('queue.noCustomersPublic')}
      </p>

      {onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-black active:scale-[.99]"
        >
          {owner ? t('queue.addCustomer') : t('queue.joinQueue')}
        </button>
      )}
    </div>
  );
}

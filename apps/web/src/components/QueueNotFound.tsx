import React from 'react'
import { useTranslation } from 'react-i18next';

const QueueNotFound = () => {
  const { t } = useTranslation();
  return (
    <div className='h-full w-full flex items-center justify-center'>
        <span className='text-5xl ' > {t('queue.notFound')}</span>
    </div>
  )
}

export default QueueNotFound

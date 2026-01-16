# Arabic RTL Implementation Guide

## ✅ Completed

1. ✅ Installed i18n dependencies (react-i18next, i18next, i18next-browser-languagedetector)
2. ✅ Created translation files (en.json, ar.json) with all text content
3. ✅ Set up i18n configuration with RTL support
4. ✅ Created LanguageSwitcher component
5. ✅ Updated App.tsx to handle RTL direction changes
6. ✅ Updated Tailwind config for RTL support
7. ✅ Added RTL CSS utilities and styles
8. ✅ Updated Header component with language switcher

## 📝 Remaining Component Updates

The following components need to be updated to use `useTranslation()` hook:

### High Priority:
1. **Home.tsx** - Update all text strings to use `t('home.*')`
2. **PopupForm.tsx** - Update to use `t('popupForm.*')` instead of COPIES
3. **status.tsx** - Update STATUS_LABEL to use translations
4. **QueuePage.tsx** - Update all strings to use `t('queue.*')`
5. **ScanPage.tsx** - Update all strings to use `t('scan.*')`
6. **Footer.tsx** - Update to use `t('footer.*')`
7. **NoCustomersFound.tsx** - Update to use `t('queue.noCustomers*')`
8. **QueueNotFound.tsx** - Update to use `t('queue.notFound')`
9. **Waiter.tsx** - Update status labels

### Example Updates:

#### Home.tsx:
```tsx
import { useTranslation } from 'react-i18next';

const Home = () => {
  const { t } = useTranslation();
  
  const texts = [
    { h: t('home.subtitle1'), p: t('home.subtitle1Desc') },
    { h: t('home.subtitle2'), p: t('home.subtitle2Desc') },
    { h: t('home.subtitle3'), p: t('home.subtitle3Desc') }
  ];
  
  // Update toast messages:
  toast.loading(t('queue.creating'), ...)
  toast.success(t('common.success'), ...)
  
  // Update button text:
  <button>{t('home.createQueue')}</button>
  <a>{t('home.scanQR')}</a>
}
```

#### PopupForm.tsx:
```tsx
import { useTranslation } from 'react-i18next';

const PopupForm = ({ type, ... }) => {
  const { t } = useTranslation();
  const copy = {
    title: t(`popupForm.${type}.title`),
    subTitle: t(`popupForm.${type}.subTitle`),
    // ... etc
  };
}
```

#### status.tsx:
```tsx
import i18n from '../i18n/config';

export const getStatusLabel = (status: Status): string => {
  const { t } = i18n;
  return t(`queue.status.${status === 'in_progress' ? 'inProgress' : status}`);
};
```

## 🚀 Next Steps

1. Run `npm install` to install new dependencies
2. Update remaining components one by one
3. Test RTL layout in Arabic mode
4. Verify all text is properly translated
5. Test language switching functionality

## 📦 Installation

```bash
cd apps/web
npm install
```

## 🧪 Testing

1. Start the dev server: `npm run dev`
2. Click the language switcher in the header
3. Verify:
   - Text changes to Arabic
   - Layout flips to RTL
   - All components display correctly
   - Language persists in localStorage


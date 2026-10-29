import React from 'react';
import { Text as NativeText, TextInput as NativeTextInput, TextInputProps, TextProps } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Typography } from '../constants/theme';

type AppTextProps = TextProps & { writingDirection?: 'auto' | 'ltr' | 'rtl' };

export function AppText({ style, writingDirection, ...props }: AppTextProps) {
  const { i18n } = useTranslation();
  const arabic = (i18n.resolvedLanguage ?? i18n.language) === 'ar';
  return (
    <NativeText
      {...props}
      style={[
        { fontFamily: arabic ? Typography.fontArabic : Typography.fontLatin, writingDirection: writingDirection ?? (arabic ? 'rtl' : 'ltr') },
        style,
      ]}
    />
  );
}

export function AppTextInput({ style, ...props }: TextInputProps) {
  const { i18n } = useTranslation();
  const arabic = (i18n.resolvedLanguage ?? i18n.language) === 'ar';
  return (
    <NativeTextInput
      {...props}
      style={[
        { fontFamily: arabic ? Typography.fontArabic : Typography.fontLatin, writingDirection: arabic ? 'rtl' : 'ltr' },
        style,
      ]}
    />
  );
}

export default AppText;

import React, { useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity,
  StatusBar, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useTranslation } from 'react-i18next';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Colors, Spacing, Radius, Typography } from '../constants/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

/**
 * Extracts a queueId from a DoorMeen QR code URL.
 * Supports: https://doormeen.app/queue/{id}  or just bare {id}
 */
function extractQueueId(raw: string): string | null {
  try {
    const url = new URL(raw);
    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.indexOf('queue');
    if (idx !== -1 && parts[idx + 1]) return parts[idx + 1];
  } catch {
    // not a URL — treat as raw queueId
    if (raw.trim().length > 0) return raw.trim();
  }
  return null;
}

export default function ScanScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    const queueId = extractQueueId(data);
    if (!queueId) {
      Alert.alert(t('scan.error', 'Invalid QR'), t('scan.errorMsg', 'This QR code is not a valid DoorMeen queue.'), [
        { text: 'OK', onPress: () => setScanned(false) },
      ]);
      return;
    }
    navigation.replace('Queue', { queueId });
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <AppText style={styles.msg}>{t('scan.loading', 'Requesting camera…')}</AppText>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <AppText style={styles.icon}>📷</AppText>
        <AppText style={styles.msg}>{t('scan.permissionMsg', 'Camera permission is needed to scan QR codes.')}</AppText>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <AppText style={styles.btnText}>{t('scan.grantPermission', 'Grant Permission')}</AppText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bgPrimary} />
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />

        {/* Viewfinder overlay */}
        <View style={styles.overlay}>
          <View style={styles.finder} />
        </View>

        <View style={styles.hint}>
          <AppText style={styles.hintText}>{t('scan.hint', 'Point camera at a DoorMeen QR code')}</AppText>
        </View>

        {scanned && (
          <TouchableOpacity style={styles.rescan} onPress={() => setScanned(false)}>
            <AppText style={styles.rescanText}>{t('scan.rescan', 'Tap to scan again')}</AppText>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const FINDER = 240;

const styles = StyleSheet.create({
  safe:       { flex: 1, backgroundColor: Colors.bgPrimary },
  cameraWrap: { flex: 1, position: 'relative' },

  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  finder: {
    width: FINDER,
    height: FINDER,
    borderRadius: Radius.lg,
    borderWidth: 3,
    borderColor: Colors.accent,
    backgroundColor: 'transparent',
    shadowColor: Colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },

  hint:      { position: 'absolute', bottom: 100, left: 0, right: 0, alignItems: 'center' },
  hintText:  { color: Colors.textPrimary, fontSize: Typography.sm, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.full },

  rescan:    { position: 'absolute', bottom: 48, left: Spacing.xxl, right: Spacing.xxl, alignItems: 'center' },
  rescanText:{ color: Colors.accent, fontSize: Typography.md, fontWeight: '600' },

  // Permission state
  center:  { flex: 1, backgroundColor: Colors.bgPrimary, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  icon:    { fontSize: 56, marginBottom: Spacing.base },
  msg:     { color: Colors.textSecondary, fontSize: Typography.base, textAlign: 'center', marginBottom: Spacing.xl, lineHeight: 24 },
  btn:     { backgroundColor: Colors.accent, paddingHorizontal: Spacing.xxl, paddingVertical: Spacing.md, borderRadius: Radius.full },
  btnText: { color: Colors.accentContrast, fontWeight: '700', fontSize: Typography.base },
});


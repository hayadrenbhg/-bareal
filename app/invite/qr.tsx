import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { EmptyState } from '@/components/layout/EmptyState';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Form';
import Colors, { Brand } from '@/constants/Colors';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import {
  buildInviteQrValue,
  extractInviteTokenFromPayload,
  getOrCreateInviteLink,
} from '@/services/invite.service';

type Mode = 'show' | 'scan';

export default function InviteQrScreen() {
  const colors = Colors.dark;
  const { user, profile } = useAuth();
  const [mode, setMode] = useState<Mode>('show');
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [loadingQr, setLoadingQr] = useState(true);
  const [qrError, setQrError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const loadQr = useCallback(async () => {
    if (!user) return;
    setLoadingQr(true);
    setQrError(null);
    try {
      const urls = await getOrCreateInviteLink(user.id);
      setQrValue(buildInviteQrValue(urls));
    } catch (error) {
      setQrError(
        error instanceof Error ? error.message : 'QRコードの作成に失敗しました',
      );
    } finally {
      setLoadingQr(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setLoadingQr(false);
      setQrError('ログインが必要です');
      return;
    }
    loadQr();
  }, [user, loadQr]);

  useEffect(() => {
    if (mode === 'scan') {
      setScanned(false);
      setScanError(null);
    }
  }, [mode]);

  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;

    const token = extractInviteTokenFromPayload(data);
    if (!token) {
      setScanned(true);
      setScanError('Be Reachの招待QRではありません');
      return;
    }

    setScanned(true);
    setScanError(null);
    router.replace(`/invite/${token}`);
  };

  const displayName =
    profile?.display_name?.trim() ||
    (profile?.username ? `@${profile.username}` : 'あなた');

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.modeRow, { borderBottomColor: colors.border }]}>
        <Pressable
          style={styles.modeButton}
          onPress={() => setMode('show')}
        >
          <Text
            style={[
              styles.modeLabel,
              { color: mode === 'show' ? Brand.accent : colors.textSecondary },
            ]}
          >
            見せる
          </Text>
          {mode === 'show' ? (
            <View style={[styles.modeUnderline, { backgroundColor: Brand.accent }]} />
          ) : (
            <View style={styles.modeUnderlineSpacer} />
          )}
        </Pressable>
        <Pressable
          style={styles.modeButton}
          onPress={() => setMode('scan')}
        >
          <Text
            style={[
              styles.modeLabel,
              { color: mode === 'scan' ? Brand.accent : colors.textSecondary },
            ]}
          >
            読み取る
          </Text>
          {mode === 'scan' ? (
            <View style={[styles.modeUnderline, { backgroundColor: Brand.accent }]} />
          ) : (
            <View style={styles.modeUnderlineSpacer} />
          )}
        </Pressable>
      </View>

      {mode === 'show' ? (
        <ScreenWrapper>
          <View style={styles.showContent}>
            <Avatar
              uri={profile?.avatar_url}
              name={profile?.username ?? undefined}
              size={64}
            />
            <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
            {profile?.username ? (
              <Text style={[styles.username, { color: colors.textSecondary }]}>
                @{profile.username}
              </Text>
            ) : null}

            <View style={styles.qrFrame}>
              {loadingQr ? (
                <ActivityIndicator color={Brand.accent} />
              ) : qrError ? (
                <EmptyState title={qrError} />
              ) : qrValue ? (
                <QRCode
                  value={qrValue}
                  size={220}
                  backgroundColor="#FFFFFF"
                  color="#0D0D0D"
                />
              ) : null}
            </View>

            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              相手にこのQRを読み取ってもらうと友達追加できます
            </Text>

            {qrError ? (
              <View style={styles.retry}>
                <Button title="再試行" onPress={loadQr} variant="secondary" />
              </View>
            ) : null}
          </View>
        </ScreenWrapper>
      ) : (
        <View style={styles.scanRoot}>
          {!permission?.granted ? (
            <View style={styles.permissionBox}>
              <Text style={[styles.hint, { color: colors.textSecondary }]}>
                QRコード読み取りにはカメラ権限が必要です
              </Text>
              <Button title="カメラを許可" onPress={requestPermission} />
            </View>
          ) : (
            <>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
              />
              <View style={styles.scanOverlay} pointerEvents="box-none">
                <View style={styles.scanFrame} />
                <Text style={styles.scanHint}>相手のQRコードを枠内に合わせてください</Text>
                {scanError ? (
                  <View style={styles.scanErrorBox}>
                    <Text style={styles.scanErrorText}>{scanError}</Text>
                    <Button
                      title="もう一度スキャン"
                      onPress={() => {
                        setScanned(false);
                        setScanError(null);
                      }}
                    />
                  </View>
                ) : null}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  modeRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modeButton: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.md,
  },
  modeLabel: {
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  modeUnderline: {
    marginTop: Spacing.sm,
    height: 2,
    width: 36,
  },
  modeUnderlineSpacer: {
    marginTop: Spacing.sm,
    height: 2,
  },
  showContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  name: {
    marginTop: Spacing.md,
    fontSize: FontSize.title,
    fontWeight: '700',
  },
  username: {
    fontSize: FontSize.body,
  },
  qrFrame: {
    marginTop: Spacing.xl,
    width: 252,
    height: 252,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
  },
  hint: {
    marginTop: Spacing.lg,
    fontSize: FontSize.caption,
    textAlign: 'center',
    lineHeight: 20,
  },
  retry: {
    width: '100%',
    marginTop: Spacing.lg,
  },
  scanRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.lg,
  },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 240,
    height: 240,
    borderWidth: 2,
    borderColor: Brand.accent,
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  scanHint: {
    marginTop: Spacing.lg,
    color: '#FFF',
    fontSize: FontSize.caption,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  scanErrorBox: {
    position: 'absolute',
    bottom: Spacing.xxxl,
    left: Spacing.xl,
    right: Spacing.xl,
    gap: Spacing.md,
    backgroundColor: 'rgba(13,13,13,0.85)',
    borderRadius: 12,
    padding: Spacing.lg,
  },
  scanErrorText: {
    color: '#FFF',
    textAlign: 'center',
    fontSize: FontSize.body,
    fontWeight: '600',
  },
});

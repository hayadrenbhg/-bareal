import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';

import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Form';
import { useColorScheme } from '@/components/useColorScheme';
import Colors, { Brand } from '@/constants/Colors';
import {
  BODY_PARTS,
  EXERCISE_SUGGESTIONS,
  type BodyPartKey,
} from '@/constants/training';
import { AppConfig } from '@/constants/config';
import { Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useAuth } from '@/hooks/useAuth';
import {
  fetchFriends,
  type FriendListItem,
} from '@/services/friends.service';
import {
  createPost,
  getRemainingPostsToday,
} from '@/services/posts.service';

type Step = 'camera' | 'preview';

export default function PostScreen() {
  const colors = Colors[useColorScheme()];
  const { user } = useAuth();
  const cameraRef = useRef<CameraView>(null);

  const [permission, requestPermission] = useCameraPermissions();
  const [step, setStep] = useState<Step>('camera');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [bodyParts, setBodyParts] = useState<BodyPartKey[]>([]);
  const [exercises, setExercises] = useState<
    { name: string; sets: string; reps: string; weightKg: string }[]
  >([]);
  const [customExercise, setCustomExercise] = useState('');
  const [loading, setLoading] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [friends, setFriends] = useState<FriendListItem[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<FriendListItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const refreshRemaining = useCallback(async () => {
    if (!user) return;
    try {
      const left = await getRemainingPostsToday(user.id);
      setRemaining(left);
    } catch {
      setRemaining(null);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      refreshRemaining();
    }, [refreshRemaining]),
  );

  useEffect(() => {
    if (!user || !pickerOpen) return;
    setFriendsLoading(true);
    fetchFriends(user.id)
      .then(setFriends)
      .catch(() => setFriends([]))
      .finally(() => setFriendsLoading(false));
  }, [user, pickerOpen]);

  const assertCanPost = () => {
    if (remaining === 0) {
      setFormError('今日の投稿は2回までです');
      return false;
    }
    return true;
  };

  const pickFromGallery = async () => {
    if (!assertCanPost()) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        '権限が必要です',
        '写真を選ぶには、フォトライブラリへのアクセスを許可してください。',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setPhotoUri(result.assets[0].uri);
      setFormError(null);
      setStep('preview');
    }
  };

  const takePhoto = async () => {
    if (!assertCanPost()) return;
    const photo = await cameraRef.current?.takePictureAsync({
      quality: 0.85,
      skipProcessing: false,
    });
    if (photo?.uri) {
      setPhotoUri(photo.uri);
      setFormError(null);
      setStep('preview');
    }
  };

  if (!permission) {
    return <View style={[styles.centered, { backgroundColor: colors.background }]} />;
  }

  const retake = () => {
    setPhotoUri(null);
    setCaption('');
    setBodyParts([]);
    setExercises([]);
    setCustomExercise('');
    setSelectedFriends([]);
    setFormError(null);
    setStep('camera');
  };

  const toggleBodyPart = (key: BodyPartKey) => {
    setBodyParts((prev) => {
      if (prev.includes(key)) {
        return prev.filter((p) => p !== key);
      }
      if (prev.length >= AppConfig.post.maxBodyParts) {
        setFormError(`部位は${AppConfig.post.maxBodyParts}つまでです`);
        return prev;
      }
      setFormError(null);
      return [...prev, key];
    });
  };

  const toggleExercise = (name: string) => {
    setExercises((prev) => {
      if (prev.some((e) => e.name === name)) {
        return prev.filter((e) => e.name !== name);
      }
      if (prev.length >= AppConfig.post.maxExercises) {
        setFormError(`種目は${AppConfig.post.maxExercises}つまでです`);
        return prev;
      }
      setFormError(null);
      return [...prev, { name, sets: '', reps: '', weightKg: '' }];
    });
  };

  const updateExerciseField = (
    name: string,
    field: 'sets' | 'reps' | 'weightKg',
    value: string,
  ) => {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setExercises((prev) =>
      prev.map((e) => (e.name === name ? { ...e, [field]: cleaned } : e)),
    );
  };

  const addCustomExercise = () => {
    const name = customExercise.trim();
    if (!name) return;
    toggleExercise(name);
    setCustomExercise('');
  };

  const suggestedExercises = Array.from(
    new Set(bodyParts.flatMap((part) => EXERCISE_SUGGESTIONS[part] ?? [])),
  );

  const toggleFriend = (item: FriendListItem) => {
    setSelectedFriends((prev) => {
      const exists = prev.some((f) => f.friend.id === item.friend.id);
      if (exists) {
        return prev.filter((f) => f.friend.id !== item.friend.id);
      }
      if (prev.length >= AppConfig.post.maxMentions) {
        setFormError(
          `一緒にトレーニングした人は${AppConfig.post.maxMentions}人までです`,
        );
        return prev;
      }
      setFormError(null);
      return [...prev, item];
    });
  };

  const removeFriend = (friendId: string) => {
    setSelectedFriends((prev) => prev.filter((f) => f.friend.id !== friendId));
  };

  const submit = async () => {
    if (!user || !photoUri || loading) return;

    if (remaining === 0) {
      setFormError('今日の投稿は2回までです');
      return;
    }

    if (bodyParts.length === 0) {
      setFormError('トレーニング部位を選んでください');
      return;
    }

    const trimmed = caption.trim();
    if (trimmed.length > AppConfig.post.captionMaxLength) {
      setFormError(
        `ひとことは${AppConfig.post.captionMaxLength}文字以内にしてください`,
      );
      return;
    }

    setLoading(true);
    setFormError(null);
    try {
      const post = await createPost({
        userId: user.id,
        localImageUri: photoUri,
        caption: trimmed,
        bodyParts,
        exercises: exercises.map((e) => ({
          name: e.name,
          sets: e.sets ? Number(e.sets) : null,
          reps: e.reps ? Number(e.reps) : null,
          weightKg: e.weightKg ? Number(e.weightKg) : null,
        })),
        mentionedUserIds: selectedFriends.map((f) => f.friend.id),
      });

      await refreshRemaining();
      Alert.alert(
        '投稿完了',
        post.timing_status === 'late'
          ? '投稿しました（LATE）'
          : post.timing_status === 'on_time'
            ? '投稿しました（ON TIME）'
            : '投稿しました',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)') }],
      );
      retake();
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : '投稿に失敗しました',
      );
    } finally {
      setLoading(false);
    }
  };

  const remainingLabel =
    remaining == null
      ? null
      : remaining <= 0
        ? '今日の投稿は2回までです'
        : `今日あと${remaining}回投稿できます`;

  if (step === 'preview' && photoUri) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.previewScroll}
        >
          <Image source={{ uri: photoUri }} style={styles.preview} />

          <TextInput
            value={caption}
            onChangeText={(text) => {
              setCaption(text.slice(0, AppConfig.post.captionMaxLength));
              setFormError(null);
            }}
            placeholder="ひとこと追加..."
            placeholderTextColor={colors.textSecondary}
            style={[
              styles.captionInput,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            multiline
            maxLength={AppConfig.post.captionMaxLength}
          />
          {caption.length >= AppConfig.post.captionMaxLength - 20 ? (
            <Text style={[styles.counter, { color: colors.textSecondary }]}>
              {caption.length} / {AppConfig.post.captionMaxLength}
            </Text>
          ) : null}

          <View style={styles.mentionSection}>
            <Text style={[styles.mentionLabel, { color: colors.textSecondary }]}>
              Training
            </Text>
            <View style={styles.selectedRow}>
              {BODY_PARTS.map((part) => {
                const selected = bodyParts.includes(part.key);
                return (
                  <Pressable
                    key={part.key}
                    onPress={() => toggleBodyPart(part.key)}
                    style={[
                      styles.partChip,
                      {
                        borderColor: selected ? Brand.accent : colors.border,
                        backgroundColor: selected ? Brand.accent : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: selected ? '#FFF' : colors.text,
                        fontSize: FontSize.caption,
                        fontWeight: '600',
                      }}
                    >
                      {part.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {bodyParts.length > 0 ? (
            <View style={styles.mentionSection}>
              <Text style={[styles.mentionLabel, { color: colors.textSecondary }]}>
                Exercise（任意）
              </Text>
              {suggestedExercises.length > 0 ? (
                <View style={styles.selectedRow}>
                  {suggestedExercises.map((name) => {
                    const selected = exercises.some((e) => e.name === name);
                    return (
                      <Pressable
                        key={name}
                        onPress={() => toggleExercise(name)}
                        style={[
                          styles.partChip,
                          {
                            borderColor: selected ? Brand.accent : colors.border,
                            backgroundColor: selected ? colors.surface : 'transparent',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selected ? Brand.accent : colors.text,
                            fontSize: FontSize.caption,
                            fontWeight: '600',
                          }}
                        >
                          {name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}

              {exercises.length > 0 ? (
                <View style={styles.exerciseDetailList}>
                  {exercises.map((item) => (
                    <View
                      key={item.name}
                      style={[styles.exerciseDetailRow, { borderColor: colors.border }]}
                    >
                      <View style={styles.exerciseDetailHeader}>
                        <Text
                          style={[styles.exerciseDetailName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          {item.name}
                        </Text>
                        <Pressable onPress={() => toggleExercise(item.name)} hitSlop={8}>
                          <Text style={{ color: colors.textSecondary }}>×</Text>
                        </Pressable>
                      </View>
                      <View style={styles.exerciseMetrics}>
                        <TextInput
                          value={item.weightKg}
                          onChangeText={(v) => updateExerciseField(item.name, 'weightKg', v)}
                          placeholder="kg"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="decimal-pad"
                          style={[
                            styles.metricInput,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              color: colors.text,
                            },
                          ]}
                        />
                        <TextInput
                          value={item.reps}
                          onChangeText={(v) => updateExerciseField(item.name, 'reps', v)}
                          placeholder="回"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="number-pad"
                          style={[
                            styles.metricInput,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              color: colors.text,
                            },
                          ]}
                        />
                        <TextInput
                          value={item.sets}
                          onChangeText={(v) => updateExerciseField(item.name, 'sets', v)}
                          placeholder="セット"
                          placeholderTextColor={colors.textSecondary}
                          keyboardType="number-pad"
                          style={[
                            styles.metricInput,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              color: colors.text,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.exerciseInputRow}>
                <TextInput
                  value={customExercise}
                  onChangeText={setCustomExercise}
                  placeholder="種目を追加..."
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.exerciseInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  onSubmitEditing={addCustomExercise}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={addCustomExercise}
                  style={[styles.addExerciseBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>追加</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <View style={styles.mentionSection}>
            <Text style={[styles.mentionLabel, { color: colors.textSecondary }]}>
              一緒にトレーニングした人
            </Text>
            {selectedFriends.length > 0 ? (
              <View style={styles.selectedRow}>
                {selectedFriends.map((item) => (
                  <View
                    key={item.friend.id}
                    style={[styles.chip, { borderColor: colors.border }]}
                  >
                    <Avatar
                      uri={item.friend.avatar_url}
                      name={item.friend.username}
                      size={22}
                    />
                    <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
                      {item.friend.display_name?.trim() || item.friend.username}
                    </Text>
                    <Pressable onPress={() => removeFriend(item.friend.id)} hitSlop={8}>
                      <Text style={{ color: colors.textSecondary }}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}
            <Pressable
              onPress={() => setPickerOpen(true)}
              style={[styles.addFriendsButton, { borderColor: colors.border }]}
            >
              <Text style={[styles.addFriendsText, { color: colors.text }]}>
                友達を追加
              </Text>
            </Pressable>
          </View>

          {remainingLabel ? (
            <Text
              style={[
                styles.remaining,
                {
                  color:
                    remaining != null && remaining <= 0
                      ? Brand.accent
                      : colors.textSecondary,
                },
              ]}
            >
              {remainingLabel}
            </Text>
          ) : null}

          {formError ? (
            <Text style={[styles.formError, { color: Brand.accent }]}>{formError}</Text>
          ) : null}

          <View style={styles.actions}>
            <Button title="やり直す" variant="secondary" onPress={retake} disabled={loading} />
            <Button
              title="投稿する"
              onPress={submit}
              loading={loading}
              disabled={loading || remaining === 0 || bodyParts.length === 0}
            />
          </View>
        </ScrollView>

        <Modal
          visible={pickerOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setPickerOpen(false)}
        >
          <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                友達を選択
              </Text>
              <Pressable onPress={() => setPickerOpen(false)} hitSlop={8}>
                <Text style={{ color: Brand.accent, fontWeight: '700' }}>完了</Text>
              </Pressable>
            </View>
            {friendsLoading ? (
              <View style={styles.centered}>
                <ActivityIndicator color={Brand.accent} />
              </View>
            ) : (
              <FlatList
                data={friends}
                keyExtractor={(item) => item.friend.id}
                ListEmptyComponent={
                  <Text style={[styles.emptyFriends, { color: colors.textSecondary }]}>
                    追加できる友達がいません
                  </Text>
                }
                renderItem={({ item }) => {
                  const selected = selectedFriends.some(
                    (f) => f.friend.id === item.friend.id,
                  );
                  return (
                    <Pressable
                      style={[styles.friendRow, { borderBottomColor: colors.border }]}
                      onPress={() => toggleFriend(item)}
                    >
                      <Avatar
                        uri={item.friend.avatar_url}
                        name={item.friend.username}
                        size={44}
                      />
                      <View style={styles.friendBody}>
                        <Text style={[styles.friendName, { color: colors.text }]}>
                          {item.friend.display_name?.trim() || item.friend.username}
                        </Text>
                        <Text style={{ color: colors.textSecondary }}>
                          @{item.friend.username}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: selected ? Brand.accent : colors.textSecondary,
                          fontWeight: '700',
                        }}
                      >
                        {selected ? '選択中' : '追加'}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            )}
          </View>
        </Modal>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: Spacing.xl }]}>
        <Text style={[styles.message, { color: colors.text }]}>
          撮影するにはカメラへのアクセスが必要です
        </Text>
        <View style={styles.permissionActions}>
          <Button title="カメラを許可" onPress={requestPermission} />
          <Button
            title="ギャラリーから選ぶ"
            variant="secondary"
            onPress={pickFromGallery}
            disabled={remaining === 0}
          />
        </View>
        {remainingLabel ? (
          <Text style={[styles.remainingCentered, { color: colors.textSecondary }]}>
            {remainingLabel}
          </Text>
        ) : null}
        {formError ? (
          <Text style={[styles.formError, { color: Brand.accent, textAlign: 'center' }]}>
            {formError}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} />
      <View style={styles.controls}>
        <Pressable
          style={styles.sideButton}
          onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
          hitSlop={8}
        >
          <Text style={styles.sideButtonText}>反転</Text>
        </Pressable>
        <Pressable
          style={[styles.shutter, remaining === 0 && styles.shutterDisabled]}
          onPress={takePhoto}
          disabled={remaining === 0}
        >
          <View style={styles.shutterInner} />
        </Pressable>
        <Pressable
          style={[styles.sideButton, remaining === 0 && styles.shutterDisabled]}
          onPress={pickFromGallery}
          disabled={remaining === 0}
          hitSlop={8}
        >
          <Text style={styles.sideButtonText}>ギャラリー</Text>
        </Pressable>
      </View>
      {remainingLabel ? (
        <Text style={styles.cameraRemaining}>{remainingLabel}</Text>
      ) : null}
      {formError ? <Text style={styles.cameraError}>{formError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  message: {
    fontSize: FontSize.bodyLarge,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  camera: { flex: 1 },
  controls: {
    position: 'absolute',
    bottom: Spacing.xxxl,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterDisabled: {
    opacity: 0.4,
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Brand.accent,
  },
  sideButton: { width: 80, alignItems: 'center' },
  sideButtonText: { color: '#FFF', fontWeight: '600', fontSize: FontSize.body },
  permissionActions: {
    width: '100%',
    gap: Spacing.sm,
  },
  remainingCentered: {
    marginTop: Spacing.lg,
    fontSize: FontSize.caption,
    textAlign: 'center',
  },
  cameraRemaining: {
    position: 'absolute',
    top: Spacing.xxl,
    alignSelf: 'center',
    color: '#FFF',
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  cameraError: {
    position: 'absolute',
    top: Spacing.xxl + 24,
    alignSelf: 'center',
    color: Brand.accent,
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  previewScroll: {
    paddingBottom: Spacing.xxxl,
  },
  preview: { width: '100%', aspectRatio: 1, backgroundColor: '#111' },
  captionInput: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    minHeight: 44,
    maxHeight: 88,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.body,
    textAlignVertical: 'top',
  },
  counter: {
    textAlign: 'right',
    marginHorizontal: Spacing.lg,
    marginTop: 4,
    fontSize: FontSize.caption,
  },
  mentionSection: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  mentionLabel: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  selectedRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 8,
    maxWidth: '100%',
  },
  chipText: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    maxWidth: 100,
  },
  partChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  exerciseInputRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    alignItems: 'center',
  },
  exerciseDetailList: {
    gap: Spacing.sm,
  },
  exerciseDetailRow: {
    borderWidth: 1,
    borderRadius: 10,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  exerciseDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  exerciseDetailName: {
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  exerciseMetrics: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  metricInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSize.caption,
    textAlign: 'center',
  },
  exerciseInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.body,
  },
  addExerciseBtn: {
    height: 40,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFriendsButton: {
    borderWidth: 1,
    borderRadius: 10,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFriendsText: {
    fontSize: FontSize.body,
    fontWeight: '600',
  },
  remaining: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    fontSize: FontSize.caption,
  },
  formError: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  actions: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  modalRoot: {
    flex: 1,
    paddingTop: Spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: FontSize.section,
    fontWeight: '700',
  },
  emptyFriends: {
    textAlign: 'center',
    marginTop: Spacing.xxxl,
    fontSize: FontSize.body,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  friendBody: {
    flex: 1,
  },
  friendName: {
    fontSize: FontSize.bodyLarge,
    fontWeight: '600',
  },
});

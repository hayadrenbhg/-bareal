# Be Reach

BeReal × 筋トレ × 習慣化 — 若者向けジムSNSアプリ

## 必要環境

- Node.js 20+
- npm または yarn
- [Expo Go](https://expo.dev/go)（**SDK 57** 対応版。App Store / Google Play のものが使えます）
- [Supabase](https://supabase.com) アカウント（無料枠で可）
- （任意）[Supabase CLI](https://supabase.com/docs/guides/cli)

## インストール

```bash
git clone <repository-url>
cd -bareal
npm install
```

## 環境変数

```bash
cp .env.example .env
```

`.env` を編集して Supabase の値を設定:

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

> **重要:** Service Role Key は `.env` にもアプリコードにも含めないでください。

## Supabase セットアップ

### 1. プロジェクト作成

1. [Supabase Dashboard](https://supabase.com/dashboard) で **New Project** を作成
2. Project Settings → API から **URL** と **anon public key** をコピー
3. `.env` に貼り付け

### 2. DB Migration 適用

**方法 A: Dashboard（手軽）**

1. Supabase Dashboard → SQL Editor
2. 以下を **順番に** 実行:
   - `supabase/migrations/20240822000000_create_profiles.sql`
   - `supabase/migrations/20240822100000_create_avatars_storage.sql`
   - `supabase/migrations/20240822200000_create_friendships.sql`
   - `supabase/migrations/20240822300000_create_posts_and_reactions.sql`
   - `supabase/migrations/20240822400000_create_daily_events_and_push.sql`
   - `supabase/migrations/20240822500000_create_notifications_blocks_reports.sql`
   - `supabase/migrations/20240908000000_extend_profiles_onboarding.sql`
   - `supabase/migrations/20240908010000_profile_pins_and_public_fields.sql`
   - `supabase/migrations/20240909000000_invite_links.sql`
   - `supabase/migrations/20240909010000_invite_rate_limits.sql`
   - `supabase/migrations/20240910000000_posts_daily_limit_and_mentions.sql`
   - `supabase/migrations/20240910010000_post_comments.sql`
   - `supabase/migrations/20240911000000_workouts.sql`
   - `supabase/migrations/20240911010000_workout_details_and_participants.sql`
   - `supabase/migrations/20240913000000_delete_own_account.sql`
3. （任意）開発用に今日のイベントを作る: `supabase/seed/create_today_daily_event.sql`

**方法 B: Supabase CLI（推奨）**

```bash
# CLI インストール（未インストールの場合）
npm install -g supabase

# ログイン & プロジェクトリンク
supabase login
supabase link --project-ref <your-project-ref>

# Migration 適用
supabase db push
```

### 3. Auth 設定

Dashboard → Authentication → Providers → Email を有効化

メール確認をスキップする場合（開発用）:
- Authentication → Settings → **Enable email confirmations** を OFF

## アプリ起動

```bash
# 開発サーバー起動（QRコードが表示されます）
npm start
```

1. スマホに **Expo Go** をインストール（App Store / Google Play）
2. PC とスマホを **同じ Wi-Fi** に接続
3. ターミナルに表示された QR コードを Expo Go でスキャン

### うまく開けないとき

| 症状 | 対処 |
|------|------|
| "Project is incompatible with this version of Expo Go" | このプロジェクトは **SDK 57**。Expo Go の Settings で Supported SDK が 57 か確認 |
| QR を読んでも接続できない | PC とスマホが同じ Wi-Fi か確認。だめなら `npx expo start --tunnel` |
| 真っ白 / エラーで落ちる | ターミナルの赤いエラーを確認。`npx expo start --clear` でキャッシュ削除 |

## PC なしで Expo Go から開く（EAS Update）

開発中の `npm start` は PC 上の Metro が JS を配るため、**PC を止めると Expo Go から開けません**。
コードを Expo のクラウドに公開すれば、PC を起動したままにしなくても使えます。

### 初回セットアップ（1回だけ）

```bash
# EAS CLI（未インストールなら）
npm install -g eas-cli

# Expo アカウントでログイン
eas login

# プロジェクトを EAS に紐付け（app.json に projectId が追加される）
npm run update:configure
```

`.env` に Supabase の値が入っていることを確認してから公開:

```bash
eas update --channel preview --message "初回公開"
```

### スマホで開く

1. [expo.dev](https://expo.dev) にログイン
2. プロジェクト **be-reach** → **Updates**
3. 最新の Update → **Preview** → QR を Expo Go で読み取る

コードを変更したときは、PC で `eas update --channel preview --message "変更内容"` を再実行するだけ（常時 PC 起動は不要）。

### より安定して使う（任意）

Expo Go の代わりに Preview APK を1回インストールすると、日常利用に向きます:

```bash
eas build --profile preview --platform android
```

ビルド完了後、表示 URL から APK をインストール。以降は `eas update --channel preview` で OTA 更新（アプリを2回再起動で反映）。

```bash
# Android
npm run android

# iOS（macOS のみ）
npm run ios

# Web
npm run web
```

## テスト

```bash
npm test
```

## プロジェクト構成

```
app/                    # Expo Router（画面・ナビゲーション）
  (auth)/               # ログイン・登録（未ログイン専用）
  (tabs)/               # メインタブ（ログイン後）
components/
  ui/                   # Button, Input など
  layout/               # ScreenWrapper, LoadingScreen
features/               # 機能単位（今後追加）
hooks/                  # useAuth など
lib/                    # Supabase クライアント
services/               # ビジネスロジック
types/                  # TypeScript 型
constants/              # テーマ・設定値
utils/                  # バリデーション等
supabase/
  migrations/           # DB マイグレーション
```

## 開発フェーズ

| Phase | 内容 | 状態 |
|-------|------|------|
| 1-A | Expo 基盤 + Supabase 接続 | ✅ |
| 1-B | 認証（登録・ログイン・セッション） | ✅ |
| 1-C | プロフィール編集・アバター | ✅ |
| 1-D | 友達機能 | ✅ |
| 1-E | 投稿・カメラ | ✅ |
| 1-F | フィード・リアクション | ✅ |
| 1-G | マイページ | ✅ |
| 2 | 通知・daily_events・ON TIME/LATE・ブロック/通報 | ✅（調整フェーズへ） |
| 3 | 筋トレ独自機能・DM | 未着手（仕様確認後） |

### Edge Functions（本番通知）

```bash
supabase functions deploy create-daily-event
supabase functions deploy send-daily-push
```

Cron 例:
- 毎日 00:05 JST → `create-daily-event`
- 1分ごと → `send-daily-push`（通知時刻ウィンドウ判定）


## 仕様メモ

- **タイムゾーン:** JST (`Asia/Tokyo`) 固定
- **daily_events:** 全ユーザー共通の通知時刻
- **ON TIME 猶予:** 通知から 60 分以内
- **username:** 英数字のみ、最大 20 文字

## App Store 提出

法務ページ・Privacy Labels・審査メモの下書きは [docs/APP_STORE.md](docs/APP_STORE.md) を参照。

## ライセンス

Private

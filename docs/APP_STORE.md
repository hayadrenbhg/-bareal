# App Store 提出メモ（Be Reach）

App Store Connect にそのまま転記できる下書きです。公開前にメールアドレスと URL を実在のものへ差し替えてください。

## B. 法務・審査

### 1. プライバシーポリシー URL

アプリ内: `/legal/privacy`

Web 公開用ファイル: `docs/legal/privacy.html`

App Store Connect の Privacy Policy URL には **公開 HTTPS** が必須です。`bereach.app` が未公開なら、先に HTML をホストしてください。

公開手順の例（GitHub Pages）:

1. このリポジトリを GitHub に置く
2. Settings → Pages → Deploy from a branch
3. `/docs` を公開フォルダにする
4. 公開後の URL を App Store Connect と `constants/config.ts` の `legal.privacyUrl` / `legal.termsUrl` に入れる

例:

- 本番: `https://bereach.app/legal/privacy`
- 暫定: `https://<user>.github.io/<repo>/legal/privacy.html`

### 2. 利用規約 URL

アプリ内: `/legal/terms`

Web 公開用ファイル: `docs/legal/terms.html`

- 本番: `https://bereach.app/legal/terms`

### 3. アプリ内導線

- ログイン / 新規登録画面
- プロフィール編集画面

### 4. App Privacy（Nutrition Labels）申告案

収集するデータ（いずれも第三者への広告販売はしない）:

| カテゴリ | データ | 用途 | リンク済みか |
|---|---|---|---|
| 連絡先情報 | メールアドレス | アプリ機能（ログイン） | はい（アカウント） |
| 連絡先情報 | 氏名（表示名） | アプリ機能 | はい |
| 健康とフィットネス | フィットネス（トレーニング記録・部位・種目） | アプリ機能 | はい |
| 健康とフィットネス | その他の健康データ（任意の身長・体重） | アプリ機能 | はい |
| 写真またはビデオ | 写真 | アプリ機能（投稿・アバター） | はい |
| 閲覧履歴 | ユーザーコンテンツ（投稿・コメント） | アプリ機能 | はい |
| 識別子 | ユーザー ID | アプリ機能 | はい |
| 使用状況データ | 製品操作（投稿日時など） | アプリ機能 | はい |
| 診断 | クラッシュデータ（導入時） | アプリの機能性 | いいえ |

トラッキング（ATT）は現時点で行いません。`NSUserTrackingUsageDescription` は不要です。

年齢: 13+（子供向けではない）

### 5. アカウント削除

プロフィール編集 → 「アカウントを削除」  
確認ダイアログ 2 回 → `delete_own_account` RPC で auth ユーザーと関連データを削除

### 6. 審査用デモアカウント

App Store Connect の「App Review Information」に記入する:

```text
Email: review@bereach.app
Password: （審査専用の強いパスワード）

手順:
1. 上記でログインする
2. ホームで友達の投稿を確認できる
3. 投稿タブから写真投稿できる
4. プロフィール編集からログアウト / アカウント削除導線を確認できる
```

作成手順（あなたがやること）:

1. アプリで審査専用アカウントを新規登録する
2. オンボーディングを完了する
3. 投稿を 1 件以上作成する
4. 別アカウントと友達になっておく（フィードが空にならないように）
5. そのメール / パスワードを Review Information に書く
6. 審査中は削除しない

### 7. 審査メモ（Review Notes）下書き

```text
Be Reach is a fitness SNS for friends.

Moderation:
- Users can long-press a post to report it or block the author.
- Reports are stored in the reports table for review.
- Users can delete their own posts and comments.
- Post owners can delete comments on their posts.

Account deletion:
- Profile > Edit profile > 「アカウントを削除」
- This permanently deletes the account and associated data.

Legal:
- Privacy Policy: https://bereach.app/legal/privacy
- Terms of Service: https://bereach.app/legal/terms

Demo account is provided in App Review Information.
Push notifications may request permission; denying permission still allows app use.
```

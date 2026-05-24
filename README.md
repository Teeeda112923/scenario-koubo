# 🎬 シナリオ工房

映画・ドラマ脚本制作のための PWA ツール。

## 機能

- **天地人** — テーマ・世界観・主人公の核心を整理
- **登場人物** — キャラクター管理（弧・動機・秘密）
- **起承転結 / 三幕構成** — 構造プランニング
- **箱書き** — 幕 → [エピソード] → シーン の3階層管理
- **感情曲線** — シーンごとの主人公感情を可視化（オプション）
- **設定メモ** — 世界観・用語集など自由メモ
- **ローカル保存** — localStorage、JSONエクスポート/インポート対応

## GitHub Pages へのデプロイ手順

### 1. リポジトリ作成 & プッシュ

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/<ユーザー名>/scenario-koubo.git
git push -u origin main
```

### 2. GitHub Pages を有効化

1. リポジトリの **Settings** → **Pages** を開く
2. Source を **GitHub Actions** に設定
3. `main` ブランチにプッシュすると自動でビルド＆デプロイ

### 3. アクセス URL

```
https://<ユーザー名>.github.io/scenario-koubo/
```

---

## ローカル開発

```bash
npm install
npm run dev
```

## ビルド

```bash
npm run build
npm run preview   # ローカルで確認
```

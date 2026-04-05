# こころの柔軟体操

ACT（Acceptance and Commitment Therapy）に基づく、毎日の心のセルフケアWebアプリ。

## 概要

認知的脱フュージョンを中心とした3つのワークと瞑想ガイドを提供する、シングルファイルのWebアプリ。

## ワーク

| ワーク | 技法 | 内容 |
|--------|------|------|
| 🗄️ 棚に置く | 認知的脱フュージョン（反復読み） | 思考を10回繰り返し読むことで言葉と意味を分離する |
| 🏷️ ラベルを貼る | 認知的脱フュージョン（ラベリング） | 思考カテゴリの選択・Affect Labeling・信憑性スライダー・セルフコンパッション |
| 🍃 川に流す | 認知的脱フュージョン（視覚化） | 岸辺の観察者ガイド・思考分類・アニメーション・体験確認 |

## 機能

- 1日1ワーク（日付ベース3日ローテーション）
- 瞑想ガイド（5秒吸う・7秒吐く、15サイクル）
- AIダイアログ（Claude Haiku API）
- 感情別フィードバック（臨床心理士の視点から）
- 感情・思考グラフ（統計可視化）
- プレミアムプラン ¥1,050/月（Stripe審査中）
- ワーク完了アニメーション（テーマ別演出）

## 技術スタック

- シングルHTML（外部依存なし）
- Vanilla JS（ライブラリ不使用）
- Web Audio API（瞑想チャイム音）
- CSS Keyframe Animation

## 理論的根拠

- Hayes, S. C., et al. (1999). Acceptance and Commitment Therapy. Guilford Press.
- Lieberman, M. D., et al. (2007). Putting feelings into words. Psychological Science.
- Neff, K. D., & Germer, C. K. (2018). The Mindful Self-Compassion Workbook.
- Luoma, J. B., & Hayes, S. C. (2003). Cognitive defusion. Behavior Therapy.

## 開発

早稲田大学 人間科学研究科 人間情報科学専攻  
自律走行中のストレス低減研究の知見を応用したウェルネスアプリ

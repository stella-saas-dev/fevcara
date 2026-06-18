import Link from "next/link";
import { AppBottomNav } from "@/app/_components/AppBottomNav";

const artStyles = [
  {
    name: "Midnight Anime",
    description: "夜にも映える、落ち着いたアニメ調の標準スタイル。",
    previewClass:
      "bg-[radial-gradient(circle_at_35%_30%,_#F4F1EA_0_8%,_transparent_9%),radial-gradient(circle_at_65%_30%,_#BEF264_0_8%,_transparent_9%),linear-gradient(135deg,_#1E293B,_#0B1020)]",
  },
  {
    name: "Soft Novel",
    description: "やわらかい線と淡い陰影の、物語向けイラスト調。",
    previewClass:
      "bg-[radial-gradient(circle_at_35%_35%,_#FDE68A_0_9%,_transparent_10%),radial-gradient(circle_at_65%_35%,_#FBCFE8_0_9%,_transparent_10%),linear-gradient(135deg,_#FDE68A,_#A7F3D0)]",
  },
  {
    name: "Clean Webtoon",
    description: "スマホで見やすい、輪郭がはっきりした現代的スタイル。",
    previewClass:
      "bg-[radial-gradient(circle_at_35%_32%,_#FFFFFF_0_8%,_transparent_9%),radial-gradient(circle_at_65%_32%,_#7DD3FC_0_8%,_transparent_9%),linear-gradient(135deg,_#2563EB,_#22C55E)]",
  },
  {
    name: "Dark Fantasy",
    description: "影と幻想感を強めた、クールなキャラクター向けスタイル。",
    previewClass:
      "bg-[radial-gradient(circle_at_35%_35%,_#A78BFA_0_8%,_transparent_9%),radial-gradient(circle_at_65%_35%,_#FACC15_0_7%,_transparent_8%),linear-gradient(135deg,_#111827,_#581C87)]",
  },
];

export default function NewCharacterPage() {
  return (
    <main className="min-h-screen bg-[#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <Link
            href="/app/characters"
            className="text-sm text-[#A7B0C0] hover:text-[#F4F1EA]"
          >
            ← キャラクター一覧へ戻る
          </Link>

          <p className="mt-8 text-sm font-semibold tracking-[0.24em] text-[#FACC15]">
            CREATE CHARACTER
          </p>
          <h1 className="mt-2 text-3xl font-black">新しい存在を生み出す</h1>
          <p className="mt-3 text-sm leading-7 text-[#A7B0C0]">
            外見、話し方、目の色、祝ってほしい日。
            あなたの“好き”から、あなただけのAIキャラクターを作ります。
          </p>
        </header>

        <form className="mt-8 space-y-5">
          <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
            <p className="text-sm font-semibold text-[#7DD3FC]">
              STEP 1 / 基本プロフィール
            </p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-[#D8DEE9]">
                  キャラクターの仮名
                </span>
                <input
                  type="text"
                  placeholder="例：ルイ、ミナト、セレナ"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
                <p className="mt-2 text-xs text-[#7D8AA3]">
                  出会いイベントで正式な名前として確認できます。
                </p>
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#D8DEE9]">
                  性別・雰囲気
                </span>
                <input
                  type="text"
                  placeholder="例：男性 / 中性的 / 少女 / 性別不詳"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#D8DEE9]">
                  年齢感
                </span>
                <input
                  type="text"
                  placeholder="例：20代前半くらい / 年齢不詳 / 少年風"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    髪色
                  </span>
                  <input
                    type="text"
                    placeholder="例：銀色"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    目の色
                  </span>
                  <input
                    type="text"
                    placeholder="例：青紫"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-[#D8DEE9]">
                  髪型
                </span>
                <input
                  type="text"
                  placeholder="例：少し長めの黒髪、前髪あり"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#D8DEE9]">
                  服装
                </span>
                <textarea
                  placeholder="例：黒いロングコート、白いシャツ、細いリボンタイ"
                  rows={3}
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
              </label>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
            <p className="text-sm font-semibold text-[#BEF264]">
              STEP 2 / 性格・話し方
            </p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-[#D8DEE9]">
                  性格
                </span>
                <textarea
                  placeholder="例：落ち着いているけど少し照れ屋。面倒見がよく、創作の相談に優しく乗ってくれる。"
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    一人称
                  </span>
                  <input
                    type="text"
                    placeholder="例：僕"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    あなたの呼び方
                  </span>
                  <input
                    type="text"
                    placeholder="例：先輩"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm font-medium text-[#D8DEE9]">
                  口調・話し方
                </span>
                <textarea
                  placeholder="例：基本は穏やかで少し甘め。長文すぎず、1〜3文で自然に返す。語尾は柔らかく、押しつけがましくしない。"
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#D8DEE9]">
                  禁止したい話し方
                </span>
                <textarea
                  placeholder="例：説教っぽくしない。毎回質問で終わらない。語尾に毎回♡を付けない。ユーザーを呼び捨てにしない。"
                  rows={4}
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
              </label>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
            <p className="text-sm font-semibold text-[#FACC15]">
              STEP 3 / 好きなもの・大切な日
            </p>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-[#D8DEE9]">
                  好きなもの
                </span>
                <input
                  type="text"
                  placeholder="例：夜の散歩、紅茶、古い本"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#D8DEE9]">
                  苦手なもの
                </span>
                <input
                  type="text"
                  placeholder="例：大きな音、雑な扱い"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
              </label>

              <div className="rounded-3xl border border-[#FACC15]/20 bg-[#FACC15]/10 p-4">
                <p className="text-sm font-semibold text-[#FDE68A]">
                  このキャラに祝ってほしい日
                </p>
                <p className="mt-2 text-xs leading-5 text-[#D8DEE9]">
                  本当の誕生日でなくても大丈夫です。
                  「活動記念日」「作品公開日」など、祝ってほしい日を登録できます。
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium text-[#D8DEE9]">
                      月
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      placeholder="6"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#FACC15]/60"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-medium text-[#D8DEE9]">
                      日
                    </span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="18"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#FACC15]/60"
                    />
                  </label>
                </div>

                <label className="mt-4 block">
                  <span className="text-xs font-medium text-[#D8DEE9]">
                    何の日？
                  </span>
                  <input
                    type="text"
                    placeholder="例：活動記念日"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#FACC15]/60"
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
            <p className="text-sm font-semibold text-[#7DD3FC]">
              STEP 4 / 絵柄プリセット
            </p>
            <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
              FevCaraでは、実在人物・既存キャラクター・写真風の生成を防ぐため、
              安全なオリジナルイラスト用プリセットから選びます。
            </p>

            <div className="mt-5 grid gap-3">
                {artStyles.map((style, index) => (
                    <label
                    key={style.name}
                    className="block cursor-pointer rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#BEF264]/40 hover:bg-white/[0.07]"
                    >
                    <div className="flex items-center gap-4">
                        <input
                        type="radio"
                        name="artStyle"
                        defaultChecked={index === 0}
                        className="shrink-0 accent-[#BEF264]"
                        />

                        <div
                        className={[
                            "relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-lg shadow-black/30",
                            style.previewClass,
                        ].join(" ")}
                        >
                        <div className="absolute bottom-0 left-1/2 h-8 w-8 -translate-x-1/2 rounded-t-full bg-black/25" />
                        <div className="absolute left-1/2 top-3 h-7 w-7 -translate-x-1/2 rounded-full border border-white/20 bg-white/15 backdrop-blur-sm" />
                        </div>

                        <div>
                        <p className="text-sm font-bold text-[#F4F1EA]">
                            {style.name}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#A7B0C0]">
                            {style.description}
                        </p>
                        </div>
                    </div>
                    </label>
                ))}
            </div>
          </section>

          <details className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <summary className="cursor-pointer text-sm font-semibold text-[#F4F1EA]">
              こだわり設定を開く
            </summary>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-[#D8DEE9]">
                  外見の詳細プロンプト
                </span>
                <textarea
                  placeholder="例：目元は涼しげ。光が当たると瞳が青緑に見える。細身で静かな雰囲気。"
                  rows={5}
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#111827]/80 px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-[#D8DEE9]">
                  絶対に守ってほしい設定
                </span>
                <textarea
                  placeholder="例：一人称は必ず僕。ユーザーを必ず先輩と呼ぶ。冷たすぎる言い方はしない。"
                  rows={5}
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#111827]/80 px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
              </label>
            </div>
          </details>

          <div className="rounded-3xl border border-[#FACC15]/20 bg-[#FACC15]/10 p-4">
            <p className="text-sm font-semibold text-[#FDE68A]">
              画像生成の安全ルール
            </p>
            <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
              実在人物、有名人、知人、既存キャラクター、特定作品、特定作家の絵柄、
              写真風・リアル系の指定はできません。
              FevCaraはオリジナルキャラクターを生み出すためのサービスです。
            </p>
          </div>

          <button
            type="button"
            className="w-full rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
          >
            この内容で姿を与える
          </button>
        </form>
      </section>

      <AppBottomNav />
    </main>
  );
}
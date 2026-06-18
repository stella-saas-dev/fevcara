import Link from "next/link";
import { AppBottomNav } from "../_components/AppBottomNav";

export default function AppHomePage() {
  return (
    <main className="min-h-screen bg-[#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-[0.24em] text-[#FACC15]">
              FevCara
            </p>
            <h1 className="mt-2 text-3xl font-black">おかえりなさい</h1>
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              あなたが生み出したキャラクターに、今日も会いに行きましょう。
            </p>
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#BEF264]/30 bg-[#BEF264]/10 text-lg">
            ✦
          </div>
        </header>

        <div className="mt-8 rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
          <p className="text-sm font-semibold text-[#7DD3FC]">
            最初のキャラクターを作成
          </p>

          <h2 className="mt-3 text-2xl font-black leading-tight">
            名前のない存在に、
            <br />
            姿と言葉を。
          </h2>

          <p className="mt-4 text-sm leading-7 text-[#B8C2D6]">
            性格、話し方、目の色、服装、祝ってほしい日。
            あなたの“好き”から、あなただけのAIキャラクターを生み出します。
          </p>

          <Link
            href="/app/characters/new"
            className="mt-6 block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
          >
            キャラクターを作成する
          </Link>
        </div>

        <div className="mt-5 grid gap-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold text-[#F4F1EA]">
              画像生成はオリジナルキャラ専用
            </p>
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              実在人物・既存キャラクター・写真風の生成はできません。
              FevCaraでは安全なイラスト絵柄プリセットを使います。
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold text-[#F4F1EA]">
              スマホで会いに行く場所
            </p>
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              チャット画面では、キャラクターの立ち絵を背景に薄く表示し、
              LINEのような自然な会話体験を目指します。
            </p>
          </div>
        </div>
      </section>

      <AppBottomNav />
    </main>
  );
}
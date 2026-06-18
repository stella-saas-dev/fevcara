import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0B1020] text-[#F4F1EA]">
      <section className="relative flex min-h-screen items-center justify-center px-5 py-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(190,242,100,0.22),_transparent_30%),radial-gradient(circle_at_top_right,_rgba(125,211,252,0.2),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(250,204,21,0.16),_transparent_34%),linear-gradient(180deg,_#142033_0%,_#0B1020_55%,_#070B16_100%)]" />

        <div className="absolute left-8 top-16 h-20 w-20 rounded-full bg-[#BEF264]/20 blur-3xl" />
        <div className="absolute bottom-20 right-10 h-28 w-28 rounded-full bg-[#FACC15]/20 blur-3xl" />
        <div className="absolute right-12 top-28 h-16 w-16 rounded-full bg-[#7DD3FC]/20 blur-2xl" />

        <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-[#111827]/75 p-6 shadow-2xl shadow-black/40 backdrop-blur">
          <div className="mb-8 inline-flex rounded-full border border-[#BEF264]/30 bg-[#BEF264]/10 px-3 py-1 text-xs font-medium text-[#D9F99D]">
            AI Character Creation Platform
          </div>

          <div className="space-y-5">
            <div>
              <h1 className="bg-gradient-to-r from-[#F4F1EA] via-[#BEF264] to-[#7DD3FC] bg-clip-text text-6xl font-black tracking-tight text-transparent drop-shadow-[0_0_24px_rgba(190,242,100,0.22)]">
                FevCara
              </h1>
              <p className="mt-2 text-sm font-semibold tracking-[0.28em] text-[#FACC15]">
                フェブキャラ
              </p>
            </div>

            <p className="text-xl font-semibold leading-8 text-[#F4F1EA]">
              あなたの“好き”から生まれる、
              <br />
              あなただけのAIキャラクター。
            </p>

            <p className="leading-7 text-[#B8C2D6]">
              姿を与え、名前を贈り、会いに行く。
              FevCaraは、AIと話すだけではなく、
              あなたが生み出したキャラクターと過ごすための場所です。
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            <Link
              href="/signup"
              className="rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
            >
              キャラクターを作成する
            </Link>

            <Link
              href="/login"
              className="rounded-2xl border border-white/10 bg-white/[0.05] px-5 py-4 text-center text-sm font-semibold text-[#F4F1EA] transition hover:bg-white/[0.09]"
            >
              ログイン
            </Link>
          </div>

          <p className="mt-6 text-center text-xs leading-5 text-[#7D8AA3]">
            実在人物や既存キャラクターではなく、
            <br />
            あなただけのオリジナルキャラクターを。
          </p>
        </div>
      </section>
    </main>
  );
}
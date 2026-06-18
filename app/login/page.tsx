import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#0B1020] px-5 py-10 text-[#F4F1EA]">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full rounded-[2rem] border border-white/10 bg-[#111827]/80 p-6 shadow-2xl shadow-black/40">
          <Link href="/" className="text-sm text-[#A7B0C0] hover:text-[#F4F1EA]">
            ← FevCaraへ戻る
          </Link>

          <div className="mt-8">
            <p className="text-sm font-semibold tracking-[0.24em] text-[#7DD3FC]">
              WELCOME BACK
            </p>
            <h1 className="mt-3 text-3xl font-black">ログイン</h1>
            <p className="mt-3 leading-7 text-[#A7B0C0]">
              あなたが生み出したキャラクターに、また会いに行きましょう。
            </p>
          </div>

          <form className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-[#D8DEE9]">
                メールアドレス
              </span>
              <input
                type="email"
                placeholder="you@example.com"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#7DD3FC]/60"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#D8DEE9]">
                パスワード
              </span>
              <input
                type="password"
                placeholder="パスワード"
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#7DD3FC]/60"
              />
            </label>

            <button
              type="button"
              className="w-full rounded-2xl bg-gradient-to-r from-[#7DD3FC] to-[#BEF264] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
            >
              ログインする
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#A7B0C0]">
            はじめてですか？{" "}
            <Link href="/signup" className="font-semibold text-[#BEF264]">
              アカウント作成
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
import Link from "next/link";
import { signup } from "./actions";

type SignupPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-[#0B1020] px-5 py-10 text-[#F4F1EA]">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
        <div className="w-full rounded-[2rem] border border-white/10 bg-[#111827]/80 p-6 shadow-2xl shadow-black/40">
          <Link href="/" className="text-sm text-[#A7B0C0] hover:text-[#F4F1EA]">
            ← FevCaraへ戻る
          </Link>

          <div className="mt-8">
            <p className="text-sm font-semibold tracking-[0.24em] text-[#FACC15]">
              START
            </p>
            <h1 className="mt-3 text-3xl font-black">アカウント作成</h1>
            <p className="mt-3 leading-7 text-[#A7B0C0]">
              あなたの“好き”から生まれるキャラクターに、姿と名前を贈りましょう。
            </p>
          </div>

          {params.error ? (
            <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
              {params.error}
            </div>
          ) : null}

          {params.message ? (
            <div className="mt-6 rounded-2xl border border-[#BEF264]/30 bg-[#BEF264]/10 p-4 text-sm leading-6 text-[#D9F99D]">
              {params.message}
            </div>
          ) : null}

          <form action={signup} className="mt-8 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-[#D8DEE9]">
                メールアドレス
              </span>
              <input
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#D8DEE9]">
                パスワード
              </span>
              <input
                name="password"
                type="password"
                placeholder="8文字以上"
                autoComplete="new-password"
                minLength={8}
                required
                className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
              />
            </label>

            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
            >
              FevCaraをはじめる
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-[#A7B0C0]">
            すでにアカウントをお持ちですか？{" "}
            <Link href="/login" className="font-semibold text-[#BEF264]">
              ログイン
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
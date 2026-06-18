import Link from "next/link";
import { AppBottomNav } from "../../_components/AppBottomNav";

export default function SettingsPage() {
  return (
    <main className="min-h-screen bg-[#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <p className="text-sm font-semibold tracking-[0.24em] text-[#FACC15]">
            SETTINGS
          </p>
          <h1 className="mt-2 text-3xl font-black">設定</h1>
          <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
            アカウント、通知、プラン管理などはここから調整できるようにします。
          </p>
        </header>

        <div className="mt-8 grid gap-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold">アカウント</p>
            <p className="mt-2 text-sm text-[#A7B0C0]">
              ログイン情報やプロフィール設定を管理します。
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold">通知</p>
            <p className="mt-2 text-sm text-[#A7B0C0]">
              キャラクターからの不定期コメント通知を設定します。
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold">プラン</p>
            <p className="mt-2 text-sm text-[#A7B0C0]">
              Free / Premium Lite / Premium の管理画面を後で追加します。
            </p>
          </div>

          <Link
            href="/"
            className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-semibold text-[#F4F1EA]"
          >
            トップページへ戻る
          </Link>
        </div>
      </section>

      <AppBottomNav />
    </main>
  );
}
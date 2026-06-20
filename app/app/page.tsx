import Link from "next/link";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

type ProfileRow = {
  user_setup_completed: boolean | null;
};

export default async function AppHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: ProfileRow | null = null;

  if (user) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_setup_completed")
      .eq("id", user.id)
      .maybeSingle();

    profile = profileData as ProfileRow | null;
  }

  const isUserSetupCompleted = Boolean(profile?.user_setup_completed);

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

            {user?.email ? (
              <p className="mt-3 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-[#A7B0C0]">
                ログイン中：{user.email}
              </p>
            ) : null}
          </div>

          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#BEF264]/30 bg-[#BEF264]/10 text-lg">
            ✦
          </div>
        </header>

        {!isUserSetupCompleted ? (
          <div className="mt-8 rounded-[2rem] border border-[#FACC15]/25 bg-[#FACC15]/10 p-5 shadow-2xl shadow-black/30">
            <p className="text-sm font-black tracking-[0.16em] text-[#FDE68A]">
              FIRST SETUP
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight">
              まずはあなたのことを
              <br />
              教えてください
            </h2>

            <p className="mt-4 text-sm leading-7 text-[#F4F1EA]">
              キャラクターたちが、あなたに自然に話しかけられるようにするための設定です。
              本名でなくても大丈夫です。
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4">
              <p className="text-xs font-bold leading-6 text-[#D8DEE9]">
                ここで設定する名前は、FevCara内で表示するユーザー名です。
                キャラクターに呼ばれたい名前は、キャラクターごとの設定や出会いイベントで決められます。
              </p>
            </div>

            <Link
              href="/app/settings#user-profile"
              className="mt-5 block rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#BEF264] px-5 py-4 text-center text-sm font-black text-[#07111F] shadow-lg shadow-[#FACC15]/20 transition hover:scale-[1.01] hover:opacity-95"
            >
              ユーザー設定をする
            </Link>
          </div>
        ) : null}

        <div
          className={[
            "rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30",
            isUserSetupCompleted ? "mt-8" : "mt-8",
          ].join(" ")}
        >
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
          <Link
            href="/app/chats"
            className="block rounded-3xl border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 p-4 transition hover:scale-[1.01] hover:bg-[#7DD3FC]/15"
          >
            <p className="text-sm font-black text-[#BAE6FD]">
              チャット一覧を開く
            </p>
            <p className="mt-2 text-sm leading-6 text-[#D8DEE9]">
              最近話したキャラクターとの会話に戻れます。
              前の相談や物語の続きを開きましょう。
            </p>
          </Link>

          <Link
            href="/app/characters"
            className="block rounded-3xl border border-[#BEF264]/20 bg-[#BEF264]/10 p-4 transition hover:scale-[1.01] hover:bg-[#BEF264]/15"
          >
            <p className="text-sm font-black text-[#D9F99D]">
              キャラクター一覧を見る
            </p>
            <p className="mt-2 text-sm leading-6 text-[#D8DEE9]">
              作成済みキャラクターの確認、チャット開始、設定編集ができます。
            </p>
          </Link>

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
              キャラクターを作成したら、最初は特別な出会いイベントへ。
              名前を与え、呼び方を決めてから、通常チャットへ進む体験を目指します。
            </p>
          </div>
        </div>

        <form action={logout} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-semibold text-[#F4F1EA] transition hover:bg-white/[0.08]"
          >
            ログアウト
          </button>
        </form>
      </section>

      <AppBottomNav />
    </main>
  );
}
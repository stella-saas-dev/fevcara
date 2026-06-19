import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import { updateDevPlan } from "./actions";

type SettingsPageProps = {
  searchParams: Promise<{
    plan_updated?: string;
    error?: string;
  }>;
};

type ProfileRow = {
  plan: string | null;
  active_character_id: string | null;
  character_limit_choice_locked: boolean | null;
};

function normalizePlan(plan: string | null) {
  return (plan || "free").trim().toLowerCase().replace(/\s+/g, "_");
}

function getPlanLabel(plan: string | null) {
  const normalizedPlan = normalizePlan(plan);

  if (normalizedPlan.includes("lite")) {
    return "Premium Lite";
  }

  if (
    normalizedPlan.includes("premium") ||
    normalizedPlan.includes("pro") ||
    normalizedPlan.includes("paid")
  ) {
    return "Premium";
  }

  return "Free";
}

function getPlanDescription(plan: string | null) {
  const normalizedPlan = normalizePlan(plan);

  if (normalizedPlan.includes("lite")) {
    return "キャラクター3人、グループチャット、記憶強化を想定したプランです。";
  }

  if (
    normalizedPlan.includes("premium") ||
    normalizedPlan.includes("pro") ||
    normalizedPlan.includes("paid")
  ) {
    return "キャラクター10人、複数チーム、高度な相談モードを想定したプランです。";
  }

  return "キャラクター1人、1日10メッセージを基本とする無料プランです。";
}

function getUpdatedPlanLabel(plan: string | undefined) {
  if (plan === "premium_lite") {
    return "Premium Lite";
  }

  if (plan === "premium") {
    return "Premium";
  }

  if (plan === "free") {
    return "Free";
  }

  return null;
}

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("plan, active_character_id, character_limit_choice_locked")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileData ?? {
    plan: "free",
    active_character_id: null,
    character_limit_choice_locked: false,
  }) as ProfileRow;

  const { count: characterCount } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const currentPlanLabel = getPlanLabel(profile.plan);
  const updatedPlanLabel = getUpdatedPlanLabel(params.plan_updated);
  const hasCharacterLock =
    Boolean(profile.character_limit_choice_locked) &&
    Boolean(profile.active_character_id);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.12),transparent_34%),#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <p className="text-sm font-semibold tracking-[0.24em] text-[#FACC15]">
            SETTINGS
          </p>
          <h1 className="mt-2 text-3xl font-black">設定</h1>
          <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
            アカウント、通知、プラン管理などをここから調整します。
          </p>
        </header>

        {params.error ? (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            {params.error}
          </div>
        ) : null}

        {updatedPlanLabel ? (
          <div className="mt-6 rounded-2xl border border-[#BEF264]/30 bg-[#BEF264]/10 p-4 text-sm leading-6 text-[#D9F99D]">
            プランを{updatedPlanLabel}に変更しました。キャラクター選択ロックも解除されました。
          </div>
        ) : null}

        <div className="mt-8 grid gap-4">
          <section className="rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30">
            <p className="text-xs font-black tracking-[0.2em] text-[#7DD3FC]">
              CURRENT PLAN
            </p>

            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">{currentPlanLabel}</h2>
                <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                  {getPlanDescription(profile.plan)}
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-[#BEF264]/20 bg-[#BEF264]/10 px-4 py-3 text-center">
                <p className="text-2xl font-black text-[#F4F1EA]">
                  {characterCount ?? 0}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-[#D9F99D]">
                  characters
                </p>
              </div>
            </div>

            {hasCharacterLock ? (
              <div className="mt-5 rounded-2xl border border-[#FACC15]/25 bg-[#FACC15]/10 p-4">
                <p className="text-sm font-black text-[#FDE68A]">
                  Free用キャラクター選択がロックされています
                </p>
                <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
                  Premium Lite以上に変更すると、このロックは解除されます。
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-black text-[#F4F1EA]">
                  キャラクター選択ロックなし
                </p>
                <p className="mt-2 text-xs leading-6 text-[#A7B0C0]">
                  現在はFree用の固定キャラクター選択は有効ではありません。
                </p>
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30">
            <p className="text-xs font-black tracking-[0.2em] text-[#FACC15]">
              DEV PLAN SWITCH
            </p>
            <h2 className="mt-2 text-xl font-black">開発用プラン切り替え</h2>
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              Stripe連携前の開発確認用です。プラン変更時に
              active_character_id と character_limit_choice_locked を解除します。
            </p>

            <form action={updateDevPlan} className="mt-5 grid gap-3">
              <button
                type="submit"
                name="plan"
                value="free"
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-left transition hover:border-[#FACC15]/35 hover:bg-white/[0.07]"
              >
                <span className="block text-sm font-black text-[#F4F1EA]">
                  Freeにする
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#A7B0C0]">
                  キャラ1人まで。2人以上いる場合は、キャラ一覧で使うキャラ選択が必要になります。
                </span>
              </button>

              <button
                type="submit"
                name="plan"
                value="premium_lite"
                className="rounded-2xl border border-[#BEF264]/20 bg-[#BEF264]/10 px-5 py-4 text-left transition hover:bg-[#BEF264]/15"
              >
                <span className="block text-sm font-black text-[#D9F99D]">
                  Premium Liteにする
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#D8DEE9]">
                  キャラ3人まで。Freeのキャラ固定ロックを解除します。
                </span>
              </button>

              <button
                type="submit"
                name="plan"
                value="premium"
                className="rounded-2xl border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 px-5 py-4 text-left transition hover:bg-[#7DD3FC]/15"
              >
                <span className="block text-sm font-black text-[#BAE6FD]">
                  Premiumにする
                </span>
                <span className="mt-1 block text-xs leading-5 text-[#D8DEE9]">
                  キャラ10人まで。複数キャラ利用を想定した上位プランです。
                </span>
              </button>
            </form>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold">アカウント</p>
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              ログイン情報やプロフィール設定を管理します。後で追加します。
            </p>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold">通知</p>
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              キャラクターからの不定期コメント通知を設定します。後で追加します。
            </p>
          </section>

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
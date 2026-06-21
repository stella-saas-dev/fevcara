import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import { CharacterCreateForm } from "./CharacterCreateForm";

type PlanTier = "free" | "premium_lite" | "premium";

type CharacterLimitConfig = {
  planTier: PlanTier;
  limit: number;
  label: string;
  description: string;
  isTrialBoostActive: boolean;
  trialBoostRemainingText: string | null;
};

const TRIAL_BOOST_DURATION_MS = 72 * 60 * 60 * 1000;

function normalizePlan(plan: string | null) {
  return (plan || "free").trim().toLowerCase().replace(/\s+/g, "_");
}

function getPlanTier(plan: string | null): PlanTier {
  const normalizedPlan = normalizePlan(plan);

  if (normalizedPlan.includes("lite")) {
    return "premium_lite";
  }

  if (
    normalizedPlan.includes("premium") ||
    normalizedPlan.includes("pro") ||
    normalizedPlan.includes("paid")
  ) {
    return "premium";
  }

  return "free";
}

function getTrialBoostInfo({
  plan,
  userCreatedAt,
}: {
  plan: string | null;
  userCreatedAt: string | null | undefined;
}) {
  if (getPlanTier(plan) !== "free") {
    return {
      isActive: false,
      remainingText: null,
    };
  }

  const createdAtTime = new Date(userCreatedAt ?? "").getTime();

  if (!Number.isFinite(createdAtTime)) {
    return {
      isActive: false,
      remainingText: null,
    };
  }

  const endsAtTime = createdAtTime + TRIAL_BOOST_DURATION_MS;
  const remainingMs = endsAtTime - Date.now();

  if (remainingMs <= 0) {
    return {
      isActive: false,
      remainingText: null,
    };
  }

  const remainingHours = Math.max(1, Math.ceil(remainingMs / (60 * 60 * 1000)));

  return {
    isActive: true,
    remainingText:
      remainingHours >= 24
        ? `あと約${Math.ceil(remainingHours / 24)}日`
        : `あと約${remainingHours}時間`,
  };
}

function getCharacterLimitConfig(
  plan: string | null,
  userCreatedAt?: string | null,
): CharacterLimitConfig {
  const planTier = getPlanTier(plan);

  if (planTier === "premium") {
    return {
      planTier,
      limit: 10,
      label: "Premium",
      description: "Premiumでは、最大10人までキャラクターを作成できます。",
      isTrialBoostActive: false,
      trialBoostRemainingText: null,
    };
  }

  if (planTier === "premium_lite") {
    return {
      planTier,
      limit: 3,
      label: "Lite",
      description: "Liteでは、最大3人までキャラクターを作成できます。",
      isTrialBoostActive: false,
      trialBoostRemainingText: null,
    };
  }

  const trialBoostInfo = getTrialBoostInfo({
    plan,
    userCreatedAt,
  });

  if (trialBoostInfo.isActive) {
    return {
      planTier,
      limit: 3,
      label: "Free Trial",
      description:
        "初回72時間トライアル中です。今だけ最大3人までキャラクターを作成できます。",
      isTrialBoostActive: true,
      trialBoostRemainingText: trialBoostInfo.remainingText,
    };
  }

  return {
    planTier,
    limit: 1,
    label: "Free",
    description: "Freeでは、まず1人のキャラクターとじっくり出会えます。",
    isTrialBoostActive: false,
    trialBoostRemainingText: null,
  };
}

export default async function NewCharacterPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const currentPlan = String(profileData?.plan ?? "free");
  const limitConfig = getCharacterLimitConfig(currentPlan, user.created_at);

  const { count } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const characterCount = count ?? 0;
  const isLimitReached = characterCount >= limitConfig.limit;
  const isOverLimit = characterCount > limitConfig.limit;

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
            外見、話し方、表情、祝ってほしい日。
            あなたの“好き”から、あなただけのAIキャラクターを作ります。
            保存後に、絵柄プリセットを選んでビジュアルを決めます。
          </p>
        </header>

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-[#7DD3FC]">
                CURRENT PLAN
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black">{limitConfig.label}</h2>

                {limitConfig.isTrialBoostActive ? (
                  <span className="rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-3 py-1 text-[10px] font-black text-[#FDE68A]">
                    初回72時間
                  </span>
                ) : null}
              </div>

              <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                {limitConfig.description}
              </p>

              {limitConfig.isTrialBoostActive ? (
                <p className="mt-2 text-xs font-bold leading-5 text-[#FDE68A]">
                  {limitConfig.trialBoostRemainingText}、3人作成とグループチャット体験が使えます。
                </p>
              ) : null}
            </div>

            <div className="shrink-0 rounded-2xl border border-[#BEF264]/20 bg-[#BEF264]/10 px-4 py-3 text-center">
              <p className="text-2xl font-black text-[#F4F1EA]">
                {characterCount}
                <span className="text-sm text-[#A7B0C0]">
                  {" "}
                  / {limitConfig.limit}
                </span>
              </p>
              <p className="mt-1 text-[10px] font-semibold text-[#D9F99D]">
                characters
              </p>
            </div>
          </div>

          {limitConfig.isTrialBoostActive ? (
            <div className="mt-4 rounded-2xl border border-[#FACC15]/25 bg-[#FACC15]/10 p-4">
              <p className="text-sm font-black text-[#FDE68A]">
                Trial Boost中です
              </p>
              <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
                Freeのまま、初回72時間だけキャラクター3人とグループチャットを体験できます。
                期間終了後、Freeで話せるキャラクターは1人になりますが、作成したキャラクターは削除されません。
              </p>
            </div>
          ) : null}

          {isOverLimit ? (
            <div className="mt-4 rounded-2xl border border-[#FACC15]/25 bg-[#FACC15]/10 p-4">
              <p className="text-sm font-black text-[#FDE68A]">
                現在のプラン上限を超えています。
              </p>
              <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
                キャラクターは自動削除されません。
                Freeで使うキャラクターを1人選ぶと、選ばなかった子は待機中になります。
              </p>
            </div>
          ) : null}
        </div>

        {isLimitReached ? (
          <div className="mt-8 rounded-[2rem] border border-[#FACC15]/25 bg-[#111827]/85 p-6 text-center shadow-2xl shadow-black/30">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[#FACC15]/25 bg-[#FACC15]/10 text-2xl">
              ✦
            </div>

            <h2 className="mt-5 text-2xl font-black">
              キャラクター作成上限に達しています
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#A7B0C0]">
              {limitConfig.label}では、キャラクターを
              <span className="font-black text-[#F4F1EA]">
                {limitConfig.limit}人
              </span>
              まで作成できます。
              現在は
              <span className="font-black text-[#F4F1EA]">
                {characterCount}人
              </span>
              います。
            </p>

            {limitConfig.isTrialBoostActive ? (
              <p className="mt-3 rounded-2xl border border-[#FACC15]/20 bg-[#FACC15]/10 p-4 text-xs font-bold leading-6 text-[#FDE68A]">
                Trial Boost中の上限に達しています。
                まずは3人でグループチャットを体験してみましょう。
              </p>
            ) : limitConfig.planTier === "free" ? (
              <p className="mt-3 rounded-2xl border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 p-4 text-xs font-bold leading-6 text-[#BAE6FD]">
                Liteにすると、最大3人のキャラクターとグループチャットを使えるようになります。
              </p>
            ) : null}

            <div className="mt-6 grid gap-3">
              <Link
                href="/app/characters"
                className="block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20"
              >
                キャラクター一覧へ
              </Link>

              <Link
                href="/app/settings"
                className="block rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-bold text-[#F4F1EA] transition hover:border-[#BEF264]/30"
              >
                プラン設定を見る
              </Link>
            </div>

            <p className="mt-5 text-xs leading-6 text-[#7D8AA3]">
              Lite以上にすると、複数のキャラクターやグループチャットを使えるようになります。
            </p>
          </div>
        ) : (
          <CharacterCreateForm />
        )}
      </section>

      <AppBottomNav />
    </main>
  );
}

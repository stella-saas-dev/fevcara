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
};

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

function getCharacterLimitConfig(plan: string | null): CharacterLimitConfig {
  const planTier = getPlanTier(plan);

  if (planTier === "premium") {
    return {
      planTier,
      limit: 10,
      label: "Premium",
      description: "Premiumでは、最大10人までキャラクターを作成できます。",
    };
  }

  if (planTier === "premium_lite") {
    return {
      planTier,
      limit: 3,
      label: "Lite",
      description: "Liteでは、最大3人までキャラクターを作成できます。",
    };
  }

  return {
    planTier,
    limit: 1,
    label: "Free",
    description: "Freeでは、まず1人のキャラクターとじっくり出会えます。",
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
  const limitConfig = getCharacterLimitConfig(currentPlan);

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
              <h2 className="mt-2 text-xl font-black">{limitConfig.label}</h2>
              <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                {limitConfig.description}
              </p>
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
              {limitConfig.label}プランでは、キャラクターを
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
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";

type CharactersPageProps = {
  searchParams: Promise<{
    created?: string;
    active_selected?: string;
    deleted?: string;
  }>;
};

type CharacterRow = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;
  role_name: string | null;
  status: string | null;
  icon_image_url: string | null;
  created_at: string;
};

type ProfileForCharacterAccess = {
  plan: string | null;
  active_character_id: string | null;
  character_limit_choice_locked: boolean | null;
};

type PlanTier = "free" | "premium_lite" | "premium";

type CharacterLimitConfig = {
  planTier: PlanTier;
  limit: number;
  label: string;
  description: string;
};

type TrialBoostStatus = {
  isActive: boolean;
  hasEnded: boolean;
  remainingHours: number;
  endsAt: Date | null;
};

const FREE_TRIAL_BOOST_HOURS = 72;

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

function getFreeTrialBoostStatus({
  plan,
  userCreatedAt,
}: {
  plan: string | null;
  userCreatedAt: string | undefined;
}): TrialBoostStatus {
  const planTier = getPlanTier(plan);

  if (planTier !== "free" || !userCreatedAt) {
    return {
      isActive: false,
      hasEnded: false,
      remainingHours: 0,
      endsAt: null,
    };
  }

  const createdAtTime = new Date(userCreatedAt).getTime();

  if (Number.isNaN(createdAtTime)) {
    return {
      isActive: false,
      hasEnded: false,
      remainingHours: 0,
      endsAt: null,
    };
  }

  const endsAtTime =
    createdAtTime + FREE_TRIAL_BOOST_HOURS * 60 * 60 * 1000;
  const nowTime = Date.now();
  const isActive = nowTime < endsAtTime;
  const remainingHours = isActive
    ? Math.max(1, Math.ceil((endsAtTime - nowTime) / (60 * 60 * 1000)))
    : 0;

  return {
    isActive,
    hasEnded: !isActive,
    remainingHours,
    endsAt: new Date(endsAtTime),
  };
}

function getCharacterLimitConfig({
  plan,
  isTrialBoostActive,
}: {
  plan: string | null;
  isTrialBoostActive: boolean;
}): CharacterLimitConfig {
  const planTier = getPlanTier(plan);

  if (planTier === "premium") {
    return {
      planTier,
      limit: 10,
      label: "Premium",
      description: "Premiumでは、最大10人までキャラクターを利用できます。",
    };
  }

  if (planTier === "premium_lite") {
    return {
      planTier,
      limit: 3,
      label: "Lite",
      description: "Liteでは、最大3人までキャラクターを利用できます。",
    };
  }

  if (isTrialBoostActive) {
    return {
      planTier,
      limit: 3,
      label: "Free Trial",
      description:
        "初回72時間トライアル中です。今だけキャラクター3人とグループチャットを体験できます。",
    };
  }

  return {
    planTier,
    limit: 1,
    label: "Free",
    description: "Freeでは、話せるキャラクターは1人です。",
  };
}

function getCharacterName(character: CharacterRow) {
  return (
    character.final_name ||
    character.temporary_name ||
    "名前のないキャラクター"
  );
}

function getAvatarText(name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return "◇";
  }

  return trimmedName.slice(0, 1);
}

function CharacterAvatar({
  name,
  imageUrl,
  isWaitingCharacter,
}: {
  name: string;
  imageUrl: string | null;
  isWaitingCharacter: boolean;
}) {
  const baseClass =
    "flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl border text-2xl font-black";

  if (imageUrl) {
    return (
      <div
        className={[
          baseClass,
          isWaitingCharacter
            ? "border-white/10 bg-white/[0.04] opacity-70"
            : "border-[#BEF264]/20 bg-white shadow-lg shadow-[#7DD3FC]/10",
        ].join(" ")}
      >
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={[
        baseClass,
        isWaitingCharacter
          ? "border-white/10 bg-white/[0.04] text-[#7D8AA3]"
          : "border-[#BEF264]/20 bg-gradient-to-br from-[#BEF264]/20 to-[#7DD3FC]/20 text-[#F4F1EA]",
      ].join(" ")}
    >
      {getAvatarText(name)}
    </div>
  );
}

export default async function CharactersPage({
  searchParams,
}: CharactersPageProps) {
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
  }) as ProfileForCharacterAccess;

  const trialBoost = getFreeTrialBoostStatus({
    plan: profile.plan,
    userCreatedAt: user.created_at,
  });

  const limitConfig = getCharacterLimitConfig({
    plan: profile.plan,
    isTrialBoostActive: trialBoost.isActive,
  });

  const isFreePlan = limitConfig.planTier === "free";
  const isTrialBoostActive = isFreePlan && trialBoost.isActive;
  const isTrialBoostEnded = isFreePlan && trialBoost.hasEnded;

  const { data } = await supabase
    .from("characters")
    .select(
      `
      id,
      temporary_name,
      final_name,
      role_name,
      status,
      icon_image_url,
      created_at
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const characters = (data ?? []) as CharacterRow[];
  const characterCount = characters.length;

  const isLimitReached = characterCount >= limitConfig.limit;
  const isOverLimit = characterCount > limitConfig.limit;

  const needsActiveCharacterSelection =
    isFreePlan &&
    !isTrialBoostActive &&
    isOverLimit &&
    !profile.character_limit_choice_locked;

  const isFreeCharacterLocked =
    isFreePlan &&
    !isTrialBoostActive &&
    Boolean(profile.character_limit_choice_locked) &&
    Boolean(profile.active_character_id);

  const canUseRelationshipFeatures =
    !isFreePlan || isTrialBoostActive;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.22),transparent_34%),linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_54%,#F1F5F9_100%)] px-5 pb-28 pt-8 text-[#1E293B]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <p className="text-sm font-semibold tracking-[0.24em] text-[#7DD3FC]">
            CHARACTERS
          </p>
          <h1 className="mt-2 text-3xl font-black">キャラクター</h1>
          <p className="mt-2 text-sm leading-6 text-[#64748B]">
            あなたが生み出したキャラクターたちが、ここに並びます。
          </p>
        </header>

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-[#7DD3FC]">
                CURRENT PLAN
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-black",
                    isTrialBoostActive
                      ? "border-[#FACC15]/30 bg-[#FACC15]/10 text-[#FDE68A]"
                      : "border-[#BEF264]/25 bg-[#BEF264]/10 text-[#D9F99D]",
                  ].join(" ")}
                >
                  {limitConfig.label}
                </span>

                {isTrialBoostActive ? (
                  <span className="rounded-full border border-[#7DD3FC]/45 bg-[#E0F2FE]/80 px-3 py-1 text-xs font-black text-[#BAE6FD]">
                    残り約{trialBoost.remainingHours}時間
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
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

          {isTrialBoostActive ? (
            <div className="mt-4 rounded-2xl border border-[#FACC15]/25 bg-[#FACC15]/10 p-4">
              <p className="text-sm font-black text-[#FDE68A]">
                初回72時間トライアル中
              </p>
              <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
                今だけキャラクター3人とグループチャットを体験できます。
                トライアル終了後、Freeプランで話せるキャラクターは1人になります。
                作成したキャラクターは削除されません。
              </p>
            </div>
          ) : null}

          {isTrialBoostEnded && characterCount >= 2 ? (
            <div className="mt-4 rounded-2xl border border-[#FACC15]/25 bg-[#FACC15]/10 p-4">
              <p className="text-sm font-black text-[#FDE68A]">
                初回トライアルは終了しました
              </p>
              <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
                Freeプランでは話せるキャラクターは1人です。
                作成したキャラクターは削除されません。
                Liteにすると、待機中のキャラクターやグループチャットを再開できます。
              </p>
            </div>
          ) : null}

          {needsActiveCharacterSelection ? (
            <div className="mt-4 rounded-2xl border border-[#FACC15]/25 bg-[#FACC15]/10 p-4">
              <p className="text-sm font-black text-[#FDE68A]">
                Freeで使うキャラクターを選んでください
              </p>
              <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
                Free中に話せるキャラクターを1人だけ選択します。
                選ばなかったキャラクターは待機中になりますが、削除はされません。
              </p>

              <Link
                href="/app/characters/select-active"
                className="mt-4 block rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#BEF264] px-5 py-3 text-center text-sm font-black text-[#07111F]"
              >
                使うキャラを選ぶ
              </Link>
            </div>
          ) : null}

          {isFreeCharacterLocked ? (
            <div className="mt-4 rounded-2xl border border-[#BEF264]/20 bg-[#BEF264]/10 p-4">
              <p className="text-sm font-black text-[#D9F99D]">
                Freeで使うキャラクターは選択済みです
              </p>
              <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
                選ばなかったキャラクターは待機中です。
                Lite以上で再び利用できるようにします。
              </p>
            </div>
          ) : null}
        </div>

        {params.created ? (
          <div className="mt-6 rounded-2xl border border-[#BEF264]/30 bg-[#BEF264]/10 p-4 text-sm leading-6 text-[#D9F99D]">
            キャラクターを保存しました。次は、この子に姿を与えていきましょう。
          </div>
        ) : null}

        {params.active_selected ? (
          <div className="mt-6 rounded-2xl border border-[#BEF264]/30 bg-[#BEF264]/10 p-4 text-sm leading-6 text-[#D9F99D]">
            Freeで使うキャラクターを選択しました。選ばなかったキャラクターは待機中になります。
          </div>
        ) : null}

        {params.deleted ? (
          <div className="mt-6 rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            キャラクターを削除しました。関連する1対1チャット履歴と長期メモも整理されました。
          </div>
        ) : null}

        {characters.length >= 2 && canUseRelationshipFeatures ? (
          <Link
            href="/app/relationships"
            className="mt-4 block rounded-2xl border border-[#7DD3FC]/55 bg-[#E0F2FE]/90 px-5 py-4 text-center text-sm font-black text-[#0369A1] shadow-lg shadow-[#7DD3FC]/10 transition hover:scale-[1.01] hover:bg-[#BAE6FD]/80"
          >
            キャラ同士の関係性を決める
          </Link>
        ) : null}

        <div className="mt-8">
          {characters.length > 0 ? (
            <div className="grid gap-4">
              {characters.map((character) => {
                const name = getCharacterName(character);

                const isActiveCharacter =
                  !isFreeCharacterLocked ||
                  character.id === profile.active_character_id;

                const isWaitingCharacter =
                  isFreeCharacterLocked && !isActiveCharacter;

                return (
                  <div
                    key={character.id}
                    className={[
                      "rounded-[2rem] border p-5 shadow-2xl shadow-black/30 transition",
                      isWaitingCharacter
                        ? "border-white/5 bg-[#111827]/45 opacity-70"
                        : "border-white/10 bg-[#111827]/80",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-4">
                      <CharacterAvatar
                        name={name}
                        imageUrl={character.icon_image_url}
                        isWaitingCharacter={isWaitingCharacter}
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words text-xl font-black text-white">
                            {name}
                          </p>

                          {isTrialBoostActive ? (
                            <span className="rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-3 py-1 text-[10px] font-black text-[#FDE68A]">
                              Trial中
                            </span>
                          ) : null}

                          {isActiveCharacter && isFreeCharacterLocked ? (
                            <span className="rounded-full border border-[#BEF264]/25 bg-[#BEF264]/10 px-3 py-1 text-[10px] font-black text-[#D9F99D]">
                              Freeで利用中
                            </span>
                          ) : null}

                          {isWaitingCharacter ? (
                            <span className="rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-3 py-1 text-[10px] font-black text-[#FDE68A]">
                              待機中
                            </span>
                          ) : null}
                        </div>

                        {isWaitingCharacter ? (
                          <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs leading-6 text-[#A7B0C0]">
                            このキャラクターは現在のFreeプランでは待機中です。
                            Lite以上で再び利用できるようにします。
                          </p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          {character.role_name ? (
                            <span className="rounded-full border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 px-3 py-1 text-xs text-[#BAE6FD]">
                              {character.role_name}
                            </span>
                          ) : null}

                          <span className="rounded-full border border-[#FACC15]/20 bg-[#FACC15]/10 px-3 py-1 text-xs text-[#FDE68A]">
                            {character.status || "draft"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/app/characters/${character.id}`}
                      className={[
                        "mt-5 block rounded-2xl border px-5 py-3 text-center text-sm font-semibold transition",
                        isWaitingCharacter
                          ? "border-white/10 bg-white/[0.03] text-[#A7B0C0] hover:bg-white/[0.06]"
                          : "border-white/10 bg-white/[0.04] text-[#F4F1EA] hover:bg-white/[0.08]",
                      ].join(" ")}
                    >
                      {isWaitingCharacter ? "詳細を見る（待機中）" : "詳細を見る"}
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/[0.04] p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#BEF264]/10 text-2xl">
                ◇
              </div>

              <h2 className="mt-5 text-xl font-black">
                まだキャラクターがいません
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
                最初のひとりに、姿と名前を贈りましょう。
              </p>

              <Link
                href="/app/characters/new"
                className="mt-6 block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F]"
              >
                キャラクターを作成する
              </Link>
            </div>
          )}
        </div>

        {characters.length > 0 && !isLimitReached ? (
          <Link
            href="/app/characters/new"
            className="mt-6 block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F]"
          >
            新しいキャラクターを作成する
          </Link>
        ) : null}

        {characters.length > 0 && isLimitReached ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-center">
            <p className="text-sm font-bold text-[#F4F1EA]">
              現在のプランでは新しいキャラクターを追加できません。
            </p>
            <p className="mt-2 text-xs leading-6 text-[#A7B0C0]">
              {isTrialBoostActive
                ? "初回トライアルではキャラクターを3人まで作成できます。Liteにすると、トライアル後も3人とグループチャットを続けられます。"
                : "Lite以上で、複数キャラクターやグループチャットを使えるようにする予定です。"}
            </p>
          </div>
        ) : null}
      </section>

      <AppBottomNav />
    </main>
  );
}
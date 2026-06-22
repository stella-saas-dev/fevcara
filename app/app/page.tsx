import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import { getMessageUsageStatus } from "@/lib/fevcara/messageUsage";
import { logout } from "./actions";

type ProfileRow = {
  user_setup_completed: boolean | null;
  plan: string | null;
  active_character_id: string | null;
  character_limit_choice_locked: boolean | null;
};

type CharacterRow = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;
  role_name: string | null;
  status: string | null;
  icon_image_url: string | null;
  image_url: string | null;
  background_image_id: string | null;
  icon_image_id: string | null;
  created_at: string;
};

type ChatThreadRow = {
  id: string;
  character_id: string | null;
  updated_at: string;
};

type PlanTier = "free" | "premium_lite" | "premium";

type CharacterLimitConfig = {
  planTier: PlanTier;
  limit: number;
  label: string;
  isTrialBoostActive: boolean;
};

const FREE_TRIAL_BOOST_DURATION_HOURS = 72;
const FREE_TRIAL_BOOST_CHARACTER_LIMIT = 3;
const FREE_NORMAL_CHARACTER_LIMIT = 1;

function getTrialBoostEndsAt(userCreatedAt: string | null | undefined) {
  if (!userCreatedAt) {
    return null;
  }

  const createdAt = new Date(userCreatedAt);

  if (Number.isNaN(createdAt.getTime())) {
    return null;
  }

  return new Date(
    createdAt.getTime() + FREE_TRIAL_BOOST_DURATION_HOURS * 60 * 60 * 1000,
  );
}

function getTrialBoostStatus({
  plan,
  userCreatedAt,
  now,
}: {
  plan: string | null;
  userCreatedAt: string | null | undefined;
  now: Date;
}) {
  const planTier = getPlanTier(plan);
  const endsAt = getTrialBoostEndsAt(userCreatedAt);
  const isActive = planTier === "free" && Boolean(endsAt) && now < endsAt!;

  return {
    endsAt,
    isActive,
    hasEnded: planTier === "free" && Boolean(endsAt) && now >= endsAt!,
  };
}

function formatTrialBoostRemaining(endsAt: Date | null, now: Date) {
  if (!endsAt) {
    return "";
  }

  const remainingMs = endsAt.getTime() - now.getTime();

  if (remainingMs <= 0) {
    return "終了しました";
  }

  const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));

  if (remainingHours >= 48) {
    return `残り約${Math.ceil(remainingHours / 24)}日`;
  }

  return `残り約${remainingHours}時間`;
}

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
      isTrialBoostActive: false,
    };
  }

  if (planTier === "premium_lite") {
    return {
      planTier,
      limit: 3,
      label: "Lite",
      isTrialBoostActive: false,
    };
  }

  return {
    planTier,
    limit: isTrialBoostActive
      ? FREE_TRIAL_BOOST_CHARACTER_LIMIT
      : FREE_NORMAL_CHARACTER_LIMIT,
    label: isTrialBoostActive ? "Free Trial" : "Free",
    isTrialBoostActive,
  };
}

function getCharacterName(character: CharacterRow | null) {
  if (!character) {
    return "キャラクター";
  }

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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CharacterAvatar({
  name,
  imageUrl,
  sizeClass,
  roundedClass,
  textClass,
}: {
  name: string;
  imageUrl: string | null;
  sizeClass: string;
  roundedClass: string;
  textClass: string;
}) {
  const baseClass = [
    "relative shrink-0 overflow-hidden border border-[#BEF264]/25 bg-gradient-to-br from-[#BEF264]/20 via-white/[0.06] to-[#7DD3FC]/20 shadow-lg shadow-[#7DD3FC]/10",
    sizeClass,
    roundedClass,
    textClass,
  ].join(" ");

  if (imageUrl) {
    return (
      <div className={baseClass}>
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={[
        baseClass,
        "flex items-center justify-center font-black text-[#F4F1EA]",
      ].join(" ")}
    >
      {getAvatarText(name)}
    </div>
  );
}

function getPrimaryAction({
  character,
  thread,
  needsActiveCharacterSelection,
}: {
  character: CharacterRow | null;
  thread: ChatThreadRow | null;
  needsActiveCharacterSelection: boolean;
}) {
  if (needsActiveCharacterSelection) {
    return {
      href: "/app/characters/select-active",
      label: "使うキャラを選ぶ",
      subLabel: "Freeで話す1人を決める",
    };
  }

  if (!character) {
    return {
      href: "/app/characters/new",
      label: "最初のキャラクターを作る",
      subLabel: "出会いを始める",
    };
  }

  if (character.status === "active") {
    return {
      href: thread ? `/app/chat/${thread.id}` : `/app/characters/${character.id}`,
      label: "話しかける",
      subLabel: "チャットへ戻る",
    };
  }

  if (character.background_image_id && character.icon_image_id) {
    return {
      href: `/app/characters/${character.id}/encounter`,
      label: "キャラクターに会いに行く",
      subLabel: "出会いイベントへ",
    };
  }

  return {
    href: `/app/characters/${character.id}/visual`,
    label: "姿を決める",
    subLabel: "ビジュアル設定へ",
  };
}

function getHomeReasonText({
  character,
  thread,
  isFreePlan,
  isTrialBoostActive,
  needsActiveCharacterSelection,
  activeCharacterCount,
}: {
  character: CharacterRow | null;
  thread: ChatThreadRow | null;
  isFreePlan: boolean;
  isTrialBoostActive: boolean;
  needsActiveCharacterSelection: boolean;
  activeCharacterCount: number;
}) {
  if (needsActiveCharacterSelection) {
    return "Freeプランでは、まず話せるキャラクターを1人選ぶ必要があります。選んだ子がホームに表示されます。";
  }

  if (!character) {
    return "まだキャラクターはいません。最初のひとりを作って、出会いを始めましょう。";
  }

  if (character.status !== "active") {
    return "この子はまだ出会いの途中です。姿を決めて、名前を与えて、最初の会話へ進みましょう。";
  }

  if (isTrialBoostActive && activeCharacterCount >= 2) {
    return "初回72時間トライアル中です。今だけ複数キャラとグループチャットを体験できます。今日はキャラクター同士の関係も楽しんでみましょう。";
  }

  if (isTrialBoostActive) {
    return "初回72時間トライアル中です。今だけキャラクター3人まで作成できます。まずはこの子との会話を始めましょう。";
  }

  if (isFreePlan) {
    return "Freeプランで今話せるキャラクターです。今日もこの子があなたを待っています。";
  }

  if (!thread) {
    return "まだ会話がないキャラクターです。最初のひと言を送って、この子との時間を始めましょう。";
  }

  if (activeCharacterCount >= 2) {
    return "最近あまり話していないキャラクターを優先して表示しています。今日はこの子に会いに行きませんか。";
  }

  return "この子は、あなたが戻ってくるのを待っています。前の会話の続きから、また話し始めましょう。";
}

export default async function AppHomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select(
      "user_setup_completed, plan, active_character_id, character_limit_choice_locked",
    )
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileData ?? {
    user_setup_completed: false,
    plan: "free",
    active_character_id: null,
    character_limit_choice_locked: false,
  }) as ProfileRow;

  const now = new Date();
  const trialBoostStatus = getTrialBoostStatus({
    plan: profile.plan,
    userCreatedAt: user.created_at,
    now,
  });
  const trialBoostRemainingText = formatTrialBoostRemaining(
    trialBoostStatus.endsAt,
    now,
  );

  let trialBoostMessageRemaining: number | null = null;
  let trialBoostMessageLimit = 300;
  let monthlyMessageRemaining: number | null = null;

  if (trialBoostStatus.isActive) {
    try {
      const messageUsageStatus = await getMessageUsageStatus({
        supabase,
        userId: user.id,
        profile: {
          id: user.id,
          plan: profile.plan,
          created_at: user.created_at ?? null,
        },
      });

      trialBoostMessageRemaining = messageUsageStatus.trialBoost.remaining;
      trialBoostMessageLimit = messageUsageStatus.trialBoost.limit || 300;
      monthlyMessageRemaining = messageUsageStatus.monthlyRemaining;
    } catch (error) {
      console.error("Home message usage status error:", error);
    }
  }

  const trialBoostMessageText =
    trialBoostMessageRemaining === null
      ? `最大${trialBoostMessageLimit}回`
      : `あと${trialBoostMessageRemaining}回`;

  const monthlyMessageText =
    monthlyMessageRemaining === null ? "月250回" : `今月あと${monthlyMessageRemaining}回`;

  const limitConfig = getCharacterLimitConfig({
    plan: profile.plan,
    isTrialBoostActive: trialBoostStatus.isActive,
  });
  const isCurrentFreePlan = limitConfig.planTier === "free";
  const isFreeSingleCharacterMode =
    isCurrentFreePlan && !trialBoostStatus.isActive;
  const isUserSetupCompleted = Boolean(profile.user_setup_completed);

  const { data: charactersData } = await supabase
    .from("characters")
    .select(
      `
      id,
      temporary_name,
      final_name,
      role_name,
      status,
      icon_image_url,
      image_url,
      background_image_id,
      icon_image_id,
      created_at
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const characters = (charactersData ?? []) as CharacterRow[];
  const characterCount = characters.length;

  const { data: threadsData } = await supabase
    .from("chat_threads")
    .select("id, character_id, updated_at")
    .eq("user_id", user.id)
    .eq("chat_type", "single")
    .order("updated_at", { ascending: false });

  const threads = (threadsData ?? []) as ChatThreadRow[];

  const latestThreadByCharacterId = new Map<string, ChatThreadRow>();

  threads.forEach((thread) => {
    if (!thread.character_id) {
      return;
    }

    if (!latestThreadByCharacterId.has(thread.character_id)) {
      latestThreadByCharacterId.set(thread.character_id, thread);
    }
  });

  const activeCharacters = characters.filter(
    (character) => character.status === "active",
  );

  const activeCharacter = profile.active_character_id
    ? characters.find((character) => character.id === profile.active_character_id) ??
      null
    : null;

  const paidRecommendedActiveCharacter =
    activeCharacters
      .slice()
      .sort((a, b) => {
        const aThread = latestThreadByCharacterId.get(a.id) ?? null;
        const bThread = latestThreadByCharacterId.get(b.id) ?? null;

        if (!aThread && bThread) {
          return -1;
        }

        if (aThread && !bThread) {
          return 1;
        }

        if (!aThread && !bThread) {
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        }

        const aUpdatedTime = aThread
          ? new Date(aThread.updated_at).getTime()
          : Number.POSITIVE_INFINITY;

        const bUpdatedTime = bThread
          ? new Date(bThread.updated_at).getTime()
          : Number.POSITIVE_INFINITY;

        return aUpdatedTime - bUpdatedTime;
      })[0] ?? null;

  const newestDraftOrAnyCharacter = characters[0] ?? null;

  const primaryCharacter = isFreeSingleCharacterMode
    ? activeCharacter ?? activeCharacters[0] ?? newestDraftOrAnyCharacter
    : paidRecommendedActiveCharacter ?? newestDraftOrAnyCharacter;

  const primaryThread = primaryCharacter
    ? latestThreadByCharacterId.get(primaryCharacter.id) ?? null
    : null;

  const primaryCharacterName = getCharacterName(primaryCharacter);

  const isOverFreeLimit =
    isFreeSingleCharacterMode && characterCount > limitConfig.limit;

  const needsActiveCharacterSelection =
    isOverFreeLimit && !profile.character_limit_choice_locked;

  const isCreateLimitReached = characterCount >= limitConfig.limit;

  const primaryAction = getPrimaryAction({
    character: primaryCharacter,
    thread: primaryThread,
    needsActiveCharacterSelection,
  });

  const homeReasonText = getHomeReasonText({
    character: primaryCharacter,
    thread: primaryThread,
    isFreePlan: isCurrentFreePlan,
    isTrialBoostActive: trialBoostStatus.isActive,
    needsActiveCharacterSelection,
    activeCharacterCount: activeCharacters.length,
  });

  const activeSelectionTitle = trialBoostStatus.hasEnded
    ? "初回トライアルは終了しました"
    : "Freeで使うキャラクターを選んでください";

  const activeSelectionBody = trialBoostStatus.hasEnded
    ? `Freeプランでは話せるキャラクターは1人です。作成したキャラクターは削除されません。現在${characterCount}人いるので、今話す1人を選んでください。`
    : `現在キャラクターが${characterCount}人います。Freeプランでは、先にチャットできるキャラクターを1人だけ選ぶ必要があります。`;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.12),transparent_34%),#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-[0.24em] text-[#FACC15]">
              FevCara
            </p>
            <h1 className="mt-2 text-3xl font-black">おかえりなさい</h1>
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              あなたが生み出したキャラクターに、今日も会いに行きましょう。
            </p>

            {user.email ? (
              <p className="mt-3 truncate rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-[#A7B0C0]">
                ログイン中：{user.email}
              </p>
            ) : null}
          </div>

          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#BEF264]/30 bg-[#BEF264]/10 text-lg">
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

        {trialBoostStatus.isActive ? (
          <div className="mt-5 rounded-[2rem] border border-[#BEF264]/25 bg-[#BEF264]/10 p-5 shadow-xl shadow-[#BEF264]/5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black tracking-[0.16em] text-[#D9F99D]">
                  TRIAL BOOST
                </p>
                <h2 className="mt-2 text-xl font-black leading-tight">
                  初回72時間トライアル中
                </h2>
              </div>

              <span className="shrink-0 rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-3 py-1 text-xs font-black text-[#FDE68A]">
                {trialBoostRemainingText}
              </span>
            </div>

            <p className="mt-3 text-sm leading-7 text-[#E2E8F0]">
              今だけキャラクター3人とグループチャットを体験できます。
              通常Freeの月250メッセージ送信とは別に、72時間限定ボーナスも使えます。
              トライアル終了後、Freeプランで話せるキャラクターは1人になります。
              作成したキャラクターは削除されません。
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-bold">
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3 text-[#D9F99D]">
                キャラ上限 3人
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3 text-[#BAE6FD]">
                グループチャット体験
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3 text-[#FDE68A]">
                ボーナス送信 {trialBoostMessageText}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3 text-[#F4F1EA]">
                画像ボーナス +6クレジット
              </div>
            </div>

            <p className="mt-3 text-xs leading-6 text-[#CBD5E1]">
              Free通常枠：{monthlyMessageText}。AI返信は消費に含まれません。
            </p>
          </div>
        ) : null}

        <section className="mt-8 overflow-hidden rounded-[2rem] border border-white/10 bg-[#111827]/80 shadow-2xl shadow-black/30">
          {primaryCharacter ? (
            <div className="relative aspect-square w-full bg-[#EEF1F4]">
              {primaryCharacter.image_url ? (
                <img
                  src={primaryCharacter.image_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain object-center"
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(190,242,100,0.22),transparent_32%),radial-gradient(circle_at_50%_60%,rgba(125,211,252,0.18),transparent_38%),#111827]" />
              )}

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.10)_28%,rgba(15,23,42,0.58)_64%,rgba(15,23,42,0.92))]" />

              <div className="relative z-10 flex h-full flex-col justify-end p-5">
                <div className="mb-4 flex items-center gap-3">
                  <CharacterAvatar
                    name={primaryCharacterName}
                    imageUrl={primaryCharacter.icon_image_url}
                    sizeClass="h-16 w-16"
                    roundedClass="rounded-3xl"
                    textClass="text-2xl"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black tracking-[0.2em] text-[#BEF264]">
                      TODAY&apos;S CHARACTER
                    </p>
                    <h2 className="mt-1 break-words text-3xl font-black text-white">
                      {primaryCharacterName}
                    </h2>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {primaryCharacter.role_name ? (
                        <span className="rounded-full border border-[#7DD3FC]/25 bg-[#7DD3FC]/15 px-3 py-1 text-xs font-bold text-[#BAE6FD] backdrop-blur">
                          {primaryCharacter.role_name}
                        </span>
                      ) : null}

                      <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-bold text-[#F4F1EA] backdrop-blur">
                        {primaryCharacter.status || "draft"}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="rounded-3xl border border-white/10 bg-[#0F172A]/52 p-4 text-sm leading-7 text-[#E2E8F0] shadow-xl shadow-black/20 backdrop-blur-md">
                  {homeReasonText}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Link
                    href={primaryAction.href}
                    className="block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-4 py-4 text-center text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
                  >
                    {primaryAction.label}
                    <span className="mt-1 block text-xs font-bold text-[#17212F]/75">
                      {primaryAction.subLabel}
                    </span>
                  </Link>

                  <Link
                    href={`/app/characters/${primaryCharacter.id}`}
                    className="block rounded-2xl border border-white/12 bg-white/[0.10] px-4 py-4 text-center text-sm font-black text-[#F8FAFC] shadow-lg shadow-black/10 backdrop-blur transition hover:bg-white/[0.16]"
                  >
                    詳細を見る
                    <span className="mt-1 block text-xs font-medium text-[#D8DEE9]">
                      設定・画像
                    </span>
                  </Link>
                </div>

                {primaryThread ? (
                  <p className="mt-3 text-center text-[11px] font-medium text-[#CBD5E1]">
                    最終更新：{formatDateTime(primaryThread.updated_at)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="p-5">
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
          )}
        </section>

        {needsActiveCharacterSelection ? (
          <div className="mt-5 rounded-[2rem] border border-[#FACC15]/25 bg-[#FACC15]/10 p-5 shadow-xl shadow-[#FACC15]/5">
            <p className="text-sm font-black text-[#FDE68A]">
              {activeSelectionTitle}
            </p>
            <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
              {activeSelectionBody}
            </p>

            <Link
              href="/app/characters/select-active"
              className="mt-4 block rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#BEF264] px-5 py-3 text-center text-sm font-black text-[#07111F]"
            >
              使うキャラを選ぶ
            </Link>
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-3xl border border-[#BEF264]/20 bg-[#BEF264]/10 p-4">
            <p className="text-2xl font-black text-[#F4F1EA]">
              {characterCount}
              <span className="text-sm text-[#A7B0C0]">
                {" "}
                / {limitConfig.limit}
              </span>
            </p>
            <p className="mt-1 text-xs font-bold text-[#D9F99D]">
              キャラクター
            </p>
          </div>

          <div className="rounded-3xl border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 p-4">
            <p className="text-2xl font-black text-[#F4F1EA]">
              {threads.length}
            </p>
            <p className="mt-1 text-xs font-bold text-[#BAE6FD]">チャット</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <Link
            href="/app/chats"
            className="flex items-center justify-between rounded-3xl border border-[#7DD3FC]/25 bg-[#7DD3FC]/12 px-5 py-5 shadow-lg shadow-black/10 transition hover:scale-[1.01] hover:bg-[#7DD3FC]/18"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#7DD3FC]/18 text-xl">
                💬
              </span>
              <span className="text-base font-black text-[#BAE6FD]">
                チャット一覧
              </span>
            </div>
            <span className="text-xl font-black text-[#7DD3FC]">→</span>
          </Link>

          <Link
            href="/app/characters"
            className="flex items-center justify-between rounded-3xl border border-[#BEF264]/25 bg-[#BEF264]/12 px-5 py-5 shadow-lg shadow-black/10 transition hover:scale-[1.01] hover:bg-[#BEF264]/18"
          >
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#BEF264]/18 text-xl">
                ☻
              </span>
              <span className="text-base font-black text-[#D9F99D]">
                キャラクター一覧
              </span>
            </div>
            <span className="text-xl font-black text-[#BEF264]">→</span>
          </Link>

          {!isCreateLimitReached ? (
            <Link
              href="/app/characters/new"
              className="flex items-center justify-between rounded-3xl border border-[#FACC15]/25 bg-[#FACC15]/12 px-5 py-5 shadow-lg shadow-black/10 transition hover:scale-[1.01] hover:bg-[#FACC15]/18"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FACC15]/18 text-xl">
                  ✦
                </span>
                <span className="text-base font-black text-[#FDE68A]">
                  新しいキャラクターを作る
                </span>
              </div>
              <span className="text-xl font-black text-[#FACC15]">→</span>
            </Link>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-semibold text-[#F4F1EA]">
                現在のプランでは作成上限に達しています
              </p>
              <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                {limitConfig.label}プランではキャラクターを
                {limitConfig.limit}人まで利用できます。
              </p>
            </div>
          )}

          <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold text-[#F4F1EA]">
              画像生成はオリジナルキャラ専用
            </p>
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              実在人物・既存キャラクター・写真風の生成はできません。
              FevCaraでは安全なイラスト絵柄プリセットを使います。
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
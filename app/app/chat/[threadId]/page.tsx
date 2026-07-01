import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import {
  getGroupIconClasses,
  getGroupInitial,
} from "@/lib/fevcara/groupIcon";
import { MESSAGE_LIMIT_REACHED_CODE, getMessageUsageStatus } from "@/lib/fevcara/messageUsage";
import { getPendingCelebrationEventForThread } from "@/lib/fevcara/celebrationEvents";
import { completeCelebrationEvent, sendUserMessage } from "./actions";
import { ScrollToLatestMessage } from "./ScrollToLatestMessage";
import { ChatSubmitButton } from "./ChatSubmitButton";

type ChatPageProps = {
  params: Promise<{
    threadId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    limit?: string;
    celebration?: string;
  }>;
};

type CharacterSummary = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;
  role_name: string | null;
  default_expression: string | null;
  icon_image_url: string | null;
  image_url: string | null;
};

type CharacterRelation = CharacterSummary | CharacterSummary[] | null;

type ThreadRow = {
  id: string;
  title: string | null;
  chat_type: string;
  character_id: string | null;
  group_icon_color: string | null;
  characters: CharacterRelation;
};

type MessageRow = {
  id: string;
  sender_type: string;
  content: string;
  character_id: string | null;
  created_at: string;
};

type GroupMemberRow = {
  character_id: string;
  display_order: number | null;
};

type GroupCharacterRow = CharacterSummary;

type ProfileForUsage = {
  plan: string | null;
  created_at: string | null;
};

type ProfileForCharacterAccess = {
  plan: string | null;
  active_character_id: string | null;
  character_limit_choice_locked: boolean | null;
};

type ProfileQueryRow = {
  plan: string | null;
  created_at?: string | null;
  active_character_id?: string | null;
  character_limit_choice_locked?: boolean | null;
};

type ChatThreadSummary = {
  summary_text: string | null;
  important_facts: unknown;
  open_questions: unknown;
  user_preferences: unknown;
  summarized_message_count: number | null;
  summarized_until_created_at: string | null;
  updated_at: string | null;
};

export const dynamic = "force-dynamic";

const FREE_TRIAL_BOOST_HOURS = 72;

function normalizePlan(plan: string | null) {
  return (plan || "free").trim().toLowerCase().replace(/\s+/g, "_");
}

function isPaidPlan(plan: string | null) {
  const normalizedPlan = normalizePlan(plan);

  return (
    normalizedPlan.includes("premium") ||
    normalizedPlan.includes("lite") ||
    normalizedPlan.includes("pro") ||
    normalizedPlan.includes("paid")
  );
}

function isFreePlan(plan: string | null) {
  return !isPaidPlan(plan);
}

function isFreeTrialBoostActive({
  plan,
  createdAt,
}: {
  plan: string | null;
  createdAt: string | null | undefined;
}) {
  if (!isFreePlan(plan) || !createdAt) {
    return false;
  }

  const createdAtTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdAtTime)) {
    return false;
  }

  const endsAtTime =
    createdAtTime + FREE_TRIAL_BOOST_HOURS * 60 * 60 * 1000;

  return Date.now() < endsAtTime;
}

function getCharacterFromRelation(characterRelation: CharacterRelation) {
  if (Array.isArray(characterRelation)) {
    return characterRelation[0] ?? null;
  }

  return characterRelation;
}

function getCharacterName(character: CharacterSummary | null | undefined) {
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

function toStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 0);
}

function formatMessageTime(createdAt: string) {
  return new Date(createdAt).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatMemoryDateTime(value: string | null) {
  if (!value) {
    return "未作成";
  }

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
  borderClass,
}: {
  name: string;
  imageUrl: string | null;
  sizeClass: string;
  roundedClass: string;
  textClass: string;
  borderClass: string;
}) {
  const baseClass = [
    "relative shrink-0 overflow-hidden border bg-gradient-to-br from-[#BEF264]/20 via-white/[0.06] to-[#7DD3FC]/20 shadow-lg shadow-[#7DD3FC]/10",
    sizeClass,
    roundedClass,
    textClass,
    borderClass,
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

export default async function ChatPage({
  params,
  searchParams,
}: ChatPageProps) {
  const { threadId } = await params;
  const query = await searchParams;
  const isMessageLimitReached =
    query.limit === MESSAGE_LIMIT_REACHED_CODE ||
    query.limit === "free_daily_message";
  const showMemoryDebug = process.env.FEVCARA_SHOW_MEMORY_DEBUG === "true";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: threadData, error: threadError } = await supabase
    .from("chat_threads")
    .select(
      `
      id,
      title,
      chat_type,
      character_id,
      group_icon_color,
      characters (
        id,
        temporary_name,
        final_name,
        role_name,
        default_expression,
        icon_image_url,
        image_url
      )
    `,
    )
    .eq("id", threadId)
    .eq("user_id", user.id)
    .single();

  if (threadError || !threadData) {
    redirect("/app/characters");
  }

  const thread = threadData as ThreadRow;
  const isGroupChat = thread.chat_type === "group";

  if (isGroupChat) {
    await supabase
      .from("notifications")
      .update({
        read_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("type", "autonomous_chat")
      .eq("related_thread_id", thread.id)
      .is("read_at", null);
  }

  const character = getCharacterFromRelation(thread.characters);
  const singleCharacterName = getCharacterName(character);

  let groupCharacters: GroupCharacterRow[] = [];

  if (isGroupChat) {
    const { data: groupMembersData } = await supabase
      .from("group_chat_members")
      .select("character_id, display_order")
      .eq("thread_id", thread.id)
      .eq("user_id", user.id)
      .order("display_order", { ascending: true });

    const groupMembers = (groupMembersData ?? []) as GroupMemberRow[];
    const groupCharacterIds = groupMembers.map((member) => member.character_id);

    if (groupCharacterIds.length > 0) {
      const { data: groupCharactersData } = await supabase
        .from("characters")
        .select(
          `
          id,
          temporary_name,
          final_name,
          role_name,
          default_expression,
          icon_image_url,
          image_url
        `,
        )
        .eq("user_id", user.id)
        .in("id", groupCharacterIds);

      const fetchedCharacters =
        (groupCharactersData ?? []) as GroupCharacterRow[];

      const groupCharacterMap = new Map(
        fetchedCharacters.map((groupCharacter) => [
          groupCharacter.id,
          groupCharacter,
        ]),
      );

      groupCharacters = groupCharacterIds
        .map((characterId) => groupCharacterMap.get(characterId) ?? null)
        .filter((groupCharacter): groupCharacter is GroupCharacterRow =>
          Boolean(groupCharacter),
        );
    }
  }

  const groupCharacterNames = groupCharacters.map((groupCharacter) =>
    getCharacterName(groupCharacter),
  );

  const groupDisplayName =
    thread.title ||
    (groupCharacterNames.length >= 2
      ? `${groupCharacterNames.join("・")}のグループ`
      : "グループチャット");

  const characterName = isGroupChat ? groupDisplayName : singleCharacterName;
  const chatModeLabel = isGroupChat ? "GROUP CHAT" : "SINGLE CHAT";
  const groupHeaderInitial = getGroupInitial(characterName);
  const groupHeaderIconClasses = getGroupIconClasses(thread.group_icon_color);
  const characterIconUrl = isGroupChat ? null : character?.icon_image_url ?? null;
  const characterBackgroundUrl = isGroupChat ? null : character?.image_url ?? null;

  const groupMessageCharacterMap = new Map(
    groupCharacters.map((groupCharacter) => [groupCharacter.id, groupCharacter]),
  );

  const pendingCelebrationEvent =
    !isGroupChat && query.celebration
      ? await getPendingCelebrationEventForThread({
          supabase,
          userId: user.id,
          threadId: thread.id,
          eventLogId: query.celebration,
        })
      : null;

  const pageBackgroundClass = isGroupChat
    ? "bg-[#F8FAFC]"
    : characterBackgroundUrl
      ? "bg-[#EEF1F4]"
      : "bg-[#F8FAFC]";

  const { data: messagesData } = await supabase
    .from("chat_messages")
    .select("id, sender_type, content, character_id, created_at")
    .eq("thread_id", thread.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const messages = (messagesData ?? []) as MessageRow[];

  let chatSummary: ChatThreadSummary | null = null;

  if (showMemoryDebug) {
    const { data: summaryData } = await supabase
      .from("chat_thread_summaries")
      .select(
        `
        summary_text,
        important_facts,
        open_questions,
        user_preferences,
        summarized_message_count,
        summarized_until_created_at,
        updated_at
      `,
      )
      .eq("thread_id", thread.id)
      .eq("user_id", user.id)
      .maybeSingle();

    chatSummary = (summaryData ?? null) as ChatThreadSummary | null;
  }

  const importantFacts = toStringList(chatSummary?.important_facts);
  const openQuestions = toStringList(chatSummary?.open_questions);
  const userPreferences = toStringList(chatSummary?.user_preferences);

  let profileForUsage: ProfileForUsage = {
    plan: "free",
    created_at: user.created_at ?? new Date().toISOString(),
  };

  let profileForCharacterAccess: ProfileForCharacterAccess = {
    plan: "free",
    active_character_id: null,
    character_limit_choice_locked: false,
  };

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("plan, created_at, active_character_id, character_limit_choice_locked")
    .eq("id", user.id)
    .maybeSingle();

  if (profileData) {
    const profile = profileData as ProfileQueryRow;

    profileForUsage = {
      plan: profile.plan ?? "free",
      created_at: profile.created_at ?? user.created_at ?? null,
    };

    profileForCharacterAccess = {
      plan: profile.plan ?? "free",
      active_character_id: profile.active_character_id ?? null,
      character_limit_choice_locked:
        profile.character_limit_choice_locked ?? false,
    };
  }

  if (profileError) {
    const { data: fallbackProfileData } = await supabase
      .from("profiles")
      .select("plan")
      .eq("id", user.id)
      .maybeSingle();

    if (fallbackProfileData) {
      const fallbackProfile = fallbackProfileData as ProfileQueryRow;

      profileForUsage = {
        plan: fallbackProfile.plan ?? "free",
        created_at: user.created_at ?? null,
      };

      profileForCharacterAccess = {
        plan: fallbackProfile.plan ?? "free",
        active_character_id: null,
        character_limit_choice_locked: false,
      };
    }
  }

  const trialBoostActive = isFreeTrialBoostActive({
    plan: profileForCharacterAccess.plan,
    createdAt: profileForUsage.created_at ?? user.created_at ?? null,
  });

  const isFreeAccessLimited =
    isFreePlan(profileForCharacterAccess.plan) && !trialBoostActive;

  const isGroupChatLocked = isGroupChat && isFreeAccessLimited;

  const { count: characterCount } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const totalCharacters = characterCount ?? 0;

  const needsActiveCharacterSelection =
    !isGroupChat &&
    isFreeAccessLimited &&
    totalCharacters > 1 &&
    !profileForCharacterAccess.character_limit_choice_locked;

  const messageUsageStatus = await getMessageUsageStatus({
    supabase,
    userId: user.id,
    profile: {
      plan: profileForUsage.plan,
      created_at: profileForUsage.created_at,
    },
  });

  const trialRemainingMessages = messageUsageStatus.trialBoost.remaining;
  const monthlyRemainingMessages = messageUsageStatus.monthlyRemaining;

  const purchasedRemainingMessages =
    messageUsageStatus.purchased.usableRemaining;

  const shouldShowPurchasedMessages =
    messageUsageStatus.purchased.canUse && purchasedRemainingMessages > 0;

  const messageUsageLabel =
  messageUsageStatus.trialBoost.isActive && trialRemainingMessages > 0
    ? `Trialあと ${trialRemainingMessages} 通 / 今月あと ${monthlyRemainingMessages} 通`
    : shouldShowPurchasedMessages
      ? `今月あと ${monthlyRemainingMessages} 通 / 追加あと ${purchasedRemainingMessages} 通`
      : `今月あと ${monthlyRemainingMessages} 通`;

  const messageLimitDetailText =
  messageUsageStatus.planTier === "free"
    ? messageUsageStatus.trialBoost.isActive
      ? "初回72時間のボーナス300メッセージを使い切った後は、Free通常枠の月250メッセージ送信を使います。AI返信は消費に含まれません。"
      : "Freeプランでは、通常は月250メッセージ送信まで話せます。AI返信は消費に含まれません。"
    : messageUsageStatus.planTier === "premium_lite"
      ? "Liteプランでは、月500メッセージ送信まで話せます。AI返信は消費に含まれません。"
      : "Premiumプランでは、月1000メッセージ送信まで話せます。AI返信は消費に含まれません。";

  const isWaitingThreadCharacter =
    !isGroupChat &&
    isFreeAccessLimited &&
    Boolean(profileForCharacterAccess.character_limit_choice_locked) &&
    Boolean(profileForCharacterAccess.active_character_id) &&
    Boolean(thread.character_id) &&
    profileForCharacterAccess.active_character_id !== thread.character_id;

  const hasNoMessages = messageUsageStatus.isLimitReached;

  const isMessageInputDisabled =
    needsActiveCharacterSelection ||
    isMessageLimitReached ||
    hasNoMessages ||
    isWaitingThreadCharacter ||
    isGroupChatLocked;

  const shouldShowLimitNotice = isMessageLimitReached || hasNoMessages;

  const latestMessageKey =
    messages.length > 0 ? messages[messages.length - 1].id : "empty";

  return (
    <main
      id="chat-scroll-container"
      className={[
        "fixed inset-0 h-[100dvh] w-full max-w-full overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[calc(18rem+env(safe-area-inset-bottom))] pt-3 text-[#F4F1EA] sm:px-5",
        pageBackgroundClass,
      ].join(" ")}
    >
      {isGroupChat ? (
        <>
          <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_10%_8%,rgba(250,204,21,0.22),transparent_30%),radial-gradient(circle_at_88%_14%,rgba(125,211,252,0.24),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(190,242,100,0.16),transparent_34%),linear-gradient(180deg,#FFFFFF_0%,#FFFDEB_46%,#EFF6FF_100%)]" />

          <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.50),transparent_24%,rgba(255,255,255,0.18)_100%)]" />

          <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.76),transparent_62%)]" />
        </>
      ) : characterBackgroundUrl ? (
        <>
          <div className="pointer-events-none fixed inset-0 z-0 flex items-center justify-center overflow-hidden bg-[#EEF1F4]">
            <img
              src={characterBackgroundUrl}
              alt=""
              className="h-[100svh] w-auto max-w-none object-contain object-center opacity-[0.92]"
            />
          </div>

          <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(180deg,rgba(238,241,244,0.24),rgba(238,241,244,0.14)_14%,rgba(15,23,42,0.12)_34%,rgba(15,23,42,0.24)_56%,rgba(15,23,42,0.42)_78%,rgba(15,23,42,0.62)_100%)]" />

          <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,0.28),transparent_26%),radial-gradient(circle_at_50%_48%,rgba(125,211,252,0.08),transparent_30%),radial-gradient(circle_at_18%_82%,rgba(190,242,100,0.06),transparent_22%)]" />
        </>
      ) : (
        <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.20),transparent_34%),linear-gradient(180deg,#FFFFFF_0%,#FFFDEB_52%,#EFF6FF_100%)]" />
      )}

      <ScrollToLatestMessage latestMessageKey={latestMessageKey} />

      <section className="relative z-10 mx-auto w-full max-w-md">
        <header className="sticky top-2 z-30 rounded-[1.5rem] border border-white/14 bg-[#0F172A]/68 p-3 shadow-xl shadow-black/16 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="relative">
              {isGroupChat ? (
                <div
                  className={[
                    "relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border text-2xl font-black",
                    groupHeaderIconClasses.icon,
                  ].join(" ")}
                >
                  {groupHeaderInitial}
                </div>
              ) : (
                <CharacterAvatar
                  name={characterName}
                  imageUrl={characterIconUrl}
                  sizeClass="h-16 w-16"
                  roundedClass="rounded-2xl"
                  textClass="text-2xl"
                  borderClass="border-[#BEF264]/25"
                />
              )}

              <span
                className={[
                  "absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border border-[#0B1020]",
                  needsActiveCharacterSelection ||
                  isWaitingThreadCharacter ||
                  isGroupChatLocked
                    ? "bg-[#FACC15]"
                    : "bg-[#BEF264]",
                ].join(" ")}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="truncate text-lg font-black leading-tight text-white">
                  {characterName}
                </h1>

                {isGroupChat ? (
                  <Link
                    href={`/app/chats/group/${thread.id}/settings`}
                    className="shrink-0 rounded-full border border-white/12 bg-white/[0.08] px-2 py-0.5 text-[10px] font-black text-[#F8FAFC] transition hover:bg-white/[0.14]"
                  >
                    編集
                  </Link>
                ) : null}

                {isGroupChat ? (
                  <span className="shrink-0 rounded-full border border-[#7DD3FC]/25 bg-[#7DD3FC]/10 px-2 py-0.5 text-[10px] font-black text-[#BAE6FD]">
                    {groupCharacters.length}人
                  </span>
                ) : null}

                {trialBoostActive && isGroupChat ? (
                  <span className="shrink-0 rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-2 py-0.5 text-[10px] font-black text-[#FDE68A]">
                    Trial
                  </span>
                ) : null}

                {needsActiveCharacterSelection ? (
                  <span className="shrink-0 rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-2 py-0.5 text-[10px] font-black text-[#FDE68A]">
                    選択が必要
                  </span>
                ) : null}

                {isWaitingThreadCharacter ? (
                  <span className="shrink-0 rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-2 py-0.5 text-[10px] font-black text-[#FDE68A]">
                    待機中
                  </span>
                ) : null}

                {isGroupChatLocked ? (
                  <span className="shrink-0 rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-2 py-0.5 text-[10px] font-black text-[#FDE68A]">
                    ロック中
                  </span>
                ) : null}
              </div>

              <div className="mt-1 flex items-center gap-2 text-[10px] font-black tracking-[0.18em] text-[#7DD3FC]">
                <span>{chatModeLabel}</span>
                {isGroupChat && groupCharacters.length > 0 ? (
                  <span className="min-w-0 truncate tracking-normal text-[#CBD5E1]">
                    {groupCharacterNames.join("・")}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {pendingCelebrationEvent ? (
          <section className="mt-5 overflow-hidden rounded-[2rem] border border-[#FDE68A]/70 bg-white text-[#17212F] shadow-2xl shadow-[#FDE68A]/20">
            <div className="relative min-h-[26rem] overflow-hidden bg-[radial-gradient(circle_at_50%_12%,rgba(254,243,199,0.95),transparent_34%),radial-gradient(circle_at_50%_48%,rgba(224,242,254,0.88),transparent_38%),linear-gradient(180deg,#FFFFFF_0%,#FFF7ED_58%,#EFF6FF_100%)] p-5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(250,204,21,0.20),transparent_18%),radial-gradient(circle_at_82%_18%,rgba(125,211,252,0.22),transparent_22%),radial-gradient(circle_at_50%_78%,rgba(190,242,100,0.16),transparent_26%)]" />
              <div className="pointer-events-none absolute left-1/2 top-10 h-44 w-44 -translate-x-1/2 rounded-full bg-white/80 blur-2xl" />

              <div className="relative z-10 text-center">
                <p className="text-xs font-black tracking-[0.24em] text-[#FACC15]">
                  SPECIAL DAY
                </p>
                <h2 className="mt-2 text-2xl font-black text-[#0F172A]">
                  {pendingCelebrationEvent.celebrationTitle}
                </h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#64748B]">
                  {pendingCelebrationEvent.character.name}が、あなたを待っています。
                </p>
              </div>

              <div className="relative z-10 mt-6 flex justify-center">
                <div className="relative">
                  <div className="absolute inset-x-4 bottom-0 h-20 rounded-full bg-[#0F172A]/15 blur-2xl" />

                  {pendingCelebrationEvent.character.imageUrl ? (
                    <img
                      src={pendingCelebrationEvent.character.imageUrl}
                      alt=""
                      className="relative max-h-72 w-auto max-w-full object-contain drop-shadow-2xl"
                    />
                  ) : pendingCelebrationEvent.character.iconImageUrl ? (
                    <img
                      src={pendingCelebrationEvent.character.iconImageUrl}
                      alt=""
                      className="relative h-40 w-40 rounded-[2rem] object-cover shadow-2xl shadow-black/20"
                    />
                  ) : (
                    <div className="relative flex h-40 w-40 items-center justify-center rounded-[2rem] border border-[#FACC15]/35 bg-white/70 text-5xl font-black text-[#0F172A] shadow-2xl shadow-black/10">
                      {pendingCelebrationEvent.character.name.slice(0, 1)}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative z-10 mt-5 rounded-[2rem] border border-white/80 bg-white/80 p-4 shadow-xl shadow-black/10 backdrop-blur">
                <p className="text-sm font-bold leading-7 text-[#334155]">
                  今日は「{pendingCelebrationEvent.celebrationTitle}」の日だね。
                  覚えてたよ。おめでとう。
                </p>
              </div>

              <form action={completeCelebrationEvent} className="relative z-10 mt-5">
                <input
                  type="hidden"
                  name="threadId"
                  value={thread.id}
                />
                <input
                  type="hidden"
                  name="celebrationEventLogId"
                  value={pendingCelebrationEvent.id}
                />

                <button
                  type="submit"
                  className="w-full rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#BEF264] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#FACC15]/20 transition hover:scale-[1.01] hover:opacity-95"
                >
                  メッセージを受け取る
                </button>
              </form>
            </div>
          </section>
        ) : null}

        {showMemoryDebug ? (
          <details className="mt-4 rounded-[1.5rem] border border-[#7DD3FC]/20 bg-[#7DD3FC]/12 p-4 shadow-lg shadow-[#7DD3FC]/5 backdrop-blur">
            <summary className="cursor-pointer select-none text-sm font-black text-[#BAE6FD]">
              この子が覚えていること（開発用）
            </summary>

            <div className="mt-4 space-y-4 border-t border-[#7DD3FC]/15 pt-4">
              {chatSummary ? (
                <>
                  <div>
                    <p className="text-xs font-black tracking-[0.18em] text-[#7DD3FC]">
                      SUMMARY
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#F4F1EA]">
                      {chatSummary.summary_text?.trim() ||
                        "要約本文はまだ空です。"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-black tracking-[0.18em] text-[#D9F99D]">
                      IMPORTANT FACTS
                    </p>
                    {importantFacts.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-6 text-[#D8DEE9]">
                        {importantFacts.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-[#A7B0C0]">なし</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-black tracking-[0.18em] text-[#FDE68A]">
                      OPEN QUESTIONS
                    </p>
                    {openQuestions.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-6 text-[#D8DEE9]">
                        {openQuestions.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-[#A7B0C0]">なし</p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-black tracking-[0.18em] text-[#F9A8D4]">
                      USER PREFERENCES
                    </p>
                    {userPreferences.length > 0 ? (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-6 text-[#D8DEE9]">
                        {userPreferences.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-[#A7B0C0]">なし</p>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#0B1020]/45 p-3">
                    <p className="text-xs leading-6 text-[#A7B0C0]">
                      要約済みメッセージ数：
                      <span className="font-black text-[#F4F1EA]">
                        {chatSummary.summarized_message_count ?? 0}
                      </span>
                    </p>
                    <p className="text-xs leading-6 text-[#A7B0C0]">
                      要約対象の最終日時：
                      <span className="font-semibold text-[#F4F1EA]">
                        {formatMemoryDateTime(
                          chatSummary.summarized_until_created_at,
                        )}
                      </span>
                    </p>
                    <p className="text-xs leading-6 text-[#A7B0C0]">
                      メモ更新日時：
                      <span className="font-semibold text-[#F4F1EA]">
                        {formatMemoryDateTime(chatSummary.updated_at)}
                      </span>
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-[#0B1020]/45 p-4">
                  <p className="text-sm font-bold text-[#F4F1EA]">
                    まだ長期メモはありません。
                  </p>
                  <p className="mt-2 text-xs leading-6 text-[#A7B0C0]">
                    会話が一定数たまると、古い会話が要約されて
                    chat_thread_summaries に保存されます。
                  </p>
                </div>
              )}
            </div>
          </details>
        ) : null}

        {query.error ? (
          <div className="mt-5 rounded-[1.5rem] border border-red-400/30 bg-red-400/12 p-4 text-sm leading-6 text-red-100 backdrop-blur">
            {query.error}
          </div>
        ) : null}

        {isGroupChatLocked ? (
          <div className="mt-5 rounded-[2rem] border border-[#FACC15]/30 bg-[#FACC15]/10 p-5 text-sm leading-7 text-[#FDE68A] shadow-lg shadow-[#FACC15]/5 backdrop-blur">
            <p className="font-black text-[#FDE68A]">
              グループチャットは現在ロック中です。
            </p>
            <p className="mt-2 text-[#F8FAFC]">
              Free通常時は1対1チャットのみ利用できます。Lite以上にすると、作成済みのグループチャットを再開できます。
            </p>
          </div>
        ) : null}

        {needsActiveCharacterSelection ? (
          <div className="mt-5 rounded-[2rem] border border-[#FACC15]/30 bg-[#FACC15]/10 p-5 text-sm leading-7 text-[#FDE68A] shadow-lg shadow-[#FACC15]/5 backdrop-blur">
            <p className="font-black text-[#FDE68A]">
              先に使うキャラクターを選んでください。
            </p>
            <p className="mt-2 text-[#F8FAFC]">
              現在キャラクターが{totalCharacters}
              人います。Freeプランでは、チャットできるキャラクターを1人だけ選ぶ必要があります。
            </p>
            <Link
              href="/app/characters/select-active"
              className="mt-4 block rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#BEF264] px-5 py-3 text-center text-sm font-black text-[#07111F]"
            >
              使うキャラを選ぶ
            </Link>
          </div>
        ) : null}

        {shouldShowLimitNotice ? (
          <div className="mt-5 rounded-[2rem] border border-[#FACC15]/30 bg-[#FACC15]/10 p-5 text-sm leading-7 text-[#FDE68A] shadow-lg shadow-[#FACC15]/5 backdrop-blur">
            <p className="font-black text-[#FDE68A]">
              今月のメッセージ上限に達しました。
            </p>
            <p className="mt-2 text-[#F8FAFC]">
              この子との会話は、ちゃんと残っています。
              <br />
              アップグレードすると、またこの続きから話せます。
            </p>
            <p className="mt-3 text-xs leading-5 text-[#E2E8F0]">
              {messageLimitDetailText}
            </p>
          </div>
        ) : null}

        {!needsActiveCharacterSelection && isWaitingThreadCharacter ? (
          <div className="mt-5 rounded-[2rem] border border-[#FACC15]/30 bg-[#FACC15]/10 p-5 text-sm leading-7 text-[#FDE68A] shadow-lg shadow-[#FACC15]/5 backdrop-blur">
            <p className="font-black text-[#FDE68A]">
              このキャラクターは現在待機中です。
            </p>
            <p className="mt-2 text-[#F8FAFC]">
              Freeプランでは、選択した1人のキャラクターだけとチャットできます。
            </p>
            <p className="mt-3 text-xs leading-5 text-[#E2E8F0]">
              このキャラクターの設定や会話履歴は削除されません。
              Lite以上で再開できます。
            </p>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {messages.length > 0 ? (
            messages.map((message) => {
              const isUser = message.sender_type === "user";
              const speakerCharacter =
                isGroupChat && message.character_id
                  ? groupMessageCharacterMap.get(message.character_id) ?? null
                  : character;

              const speakerName =
                isGroupChat && speakerCharacter
                  ? getCharacterName(speakerCharacter)
                  : isGroupChat
                    ? "キャラクター"
                    : characterName;

              const speakerIconUrl =
                isGroupChat && speakerCharacter
                  ? speakerCharacter.icon_image_url
                  : characterIconUrl;

              return (
                <div
                  key={message.id}
                  className={[
                    "flex items-end gap-2",
                    isUser ? "justify-end" : "justify-start",
                  ].join(" ")}
                >
                  {!isUser ? (
                    <div className="mb-5">
                      <CharacterAvatar
                        name={speakerName}
                        imageUrl={speakerIconUrl}
                        sizeClass="h-14 w-14"
                        roundedClass="rounded-2xl"
                        textClass="text-lg"
                        borderClass="border-[#7DD3FC]/20"
                      />
                    </div>
                  ) : null}

                  <div
                    className={[
                      "flex max-w-[80%] flex-col",
                      isUser ? "items-end" : "items-start",
                    ].join(" ")}
                  >
                    {!isUser ? (
                      <div className="mb-1 px-1">
                        <span className="inline-flex rounded-full border border-[#0F172A]/22 bg-[#0F172A]/52 px-2.5 py-1 text-[11px] font-bold text-[#F8FAFC] shadow-sm backdrop-blur-md">
                          {speakerName}
                        </span>
                      </div>
                    ) : null}

                    <div
                      className={[
                        "rounded-[1.5rem] border px-4 py-3 shadow-lg backdrop-blur-md",
                        isUser
                          ? "rounded-br-md border-[#D9F99D]/38 bg-[rgba(235,255,198,0.68)] text-[#17212F] shadow-[#BEF264]/8"
                          : "rounded-bl-md border-white/14 bg-[#0F172A]/56 text-[#F8FAFC] shadow-black/12",
                      ].join(" ")}
                    >
                      <p
                        className={[
                          "whitespace-pre-wrap text-sm leading-7",
                          isUser ? "font-semibold" : "",
                        ].join(" ")}
                      >
                        {message.content}
                      </p>
                    </div>

                    <div className="mt-1 px-1">
                      <span
                        className={[
                          "inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium shadow-sm backdrop-blur-md",
                          isUser
                            ? "border-[#0F172A]/16 bg-[rgba(255,255,255,0.52)] text-[#334155]"
                            : "border-[#0F172A]/20 bg-[#0F172A]/46 text-[#F1F5F9]",
                        ].join(" ")}
                      >
                        {formatMessageTime(message.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/[0.08] p-6 text-center backdrop-blur">
              <div className="mx-auto w-fit">
                <CharacterAvatar
                  name={characterName}
                  imageUrl={characterIconUrl}
                  sizeClass="h-16 w-16"
                  roundedClass="rounded-3xl"
                  textClass="text-2xl"
                  borderClass="border-[#BEF264]/20"
                />
              </div>

              <h2 className="mt-5 text-xl font-black text-white">
                まだ会話はありません
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#E2E8F0]">
                最初のひと言を送って、
                {isGroupChat ? "このグループ" : "このキャラクター"}
                と話し始めましょう。
              </p>
            </div>
          )}
        </div>

        <div id="chat-latest-message" className="h-1" aria-hidden="true" />
      </section>

      <form
        action={sendUserMessage}
        className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-40 px-4 sm:px-5"
      >
        <div className="mx-auto max-w-md rounded-[2rem] border border-white/14 bg-[#0F172A]/50 p-3 shadow-2xl shadow-black/25 backdrop-blur-xl">
          <input type="hidden" name="threadId" value={thread.id} />

          {isGroupChatLocked ? (
            <div className="mb-3 rounded-[1.25rem] border border-[#FACC15]/25 bg-[#FACC15]/10 px-4 py-3 backdrop-blur">
              <p className="text-xs font-black text-[#FDE68A]">
                グループチャットはロック中です
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[#E2E8F0]">
                Lite以上で再開できます。
              </p>
            </div>
          ) : null}

          {needsActiveCharacterSelection ? (
            <div className="mb-3 rounded-[1.25rem] border border-[#FACC15]/25 bg-[#FACC15]/10 px-4 py-3 backdrop-blur">
              <p className="text-xs font-black text-[#FDE68A]">
                先に使うキャラクターを選んでください
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[#E2E8F0]">
                Freeプランでは、チャットできるキャラクターを1人だけ選ぶ必要があります。
              </p>
            </div>
          ) : null}

          {!needsActiveCharacterSelection && isWaitingThreadCharacter ? (
            <div className="mb-3 rounded-[1.25rem] border border-[#FACC15]/25 bg-[#FACC15]/10 px-4 py-3 backdrop-blur">
              <p className="text-xs font-black text-[#FDE68A]">
                このキャラクターは待機中です
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[#E2E8F0]">
                現在のFreeプランでは、選択したキャラクターだけに送信できます。
              </p>
            </div>
          ) : null}

          {!needsActiveCharacterSelection &&
          !isWaitingThreadCharacter &&
          !isGroupChatLocked &&
          shouldShowLimitNotice ? (
            <div className="mb-3 rounded-[1.25rem] border border-[#FACC15]/25 bg-[#FACC15]/10 px-4 py-3 backdrop-blur">
              <p className="text-xs font-black text-[#FDE68A]">
                今月のFreeメッセージ上限に達しました
              </p>

              <p className="mt-1 text-[11px] leading-5 text-[#E2E8F0]">
                この子との会話は、ちゃんと残っています。
                <br />
                アップグレードすると、またこの続きから話せます。
              </p>

              <Link
                href="/app/settings"
                className="mt-3 block rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#BEF264] px-4 py-2.5 text-center text-xs font-black text-[#07111F]"
              >
                Liteを見る
              </Link>
            </div>
          ) : null}

          <label className="block">
            <span className="sr-only">メッセージ</span>
            <textarea
              name="content"
              placeholder={
                isGroupChatLocked
                  ? "グループチャットはLite以上で再開できます"
                  : needsActiveCharacterSelection
                    ? "先に使うキャラクターを選んでください"
                    : isWaitingThreadCharacter
                      ? "このキャラクターは現在待機中です"
                      : isMessageInputDisabled
                        ? "本日のFreeメッセージ上限に達しました"
                        : isGroupChat
                          ? "グループに話しかける"
                          : `${characterName}に話しかける`
              }
              rows={3}
              required
              disabled={isMessageInputDisabled}
              enterKeyHint="send"
              className="w-full resize-none rounded-[1.5rem] border border-white/14 bg-[#0B1020]/40 px-4 py-3 text-base leading-6 text-[#F8FAFC] outline-none placeholder:text-[#CBD5E1] backdrop-blur-md disabled:cursor-not-allowed disabled:opacity-50 focus:border-[#BEF264]/50 sm:text-sm"
            />
          </label>

          <div className="mt-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              {isGroupChatLocked ? (
                <p className="truncate text-[11px] text-[#FACC15]">
                  Lite以上でグループ再開
                </p>
              ) : needsActiveCharacterSelection ? (
                <p className="truncate text-[11px] text-[#FACC15]">
                  使うキャラの選択が必要です
                </p>
              ) : isWaitingThreadCharacter ? (
                <p className="truncate text-[11px] text-[#FACC15]">
                  Freeプランでは待機中
                </p>
              ) : hasNoMessages ? (
                <p className="truncate text-[11px] text-[#FACC15]">
                  今月の上限に達しました
                </p>
              ) : (
                <p className="truncate text-[11px] text-[#E2E8F0]">
                  {messageUsageLabel}
                </p>
              )}
            </div>

            {needsActiveCharacterSelection ? (
              <Link
                href="/app/characters/select-active"
                className="shrink-0 rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#BEF264] px-5 py-3 text-sm font-black text-[#07111F] shadow-lg shadow-[#FACC15]/20 transition active:scale-[0.98] hover:scale-[1.02] hover:opacity-95"
              >
                選ぶ
              </Link>
            ) : (
              <ChatSubmitButton
                disabled={isMessageInputDisabled}
                isGroupChatLocked={isGroupChatLocked}
                isWaitingThreadCharacter={isWaitingThreadCharacter}
              />
            )}
          </div>
        </div>
      </form>

      <AppBottomNav />
    </main>
  );
}
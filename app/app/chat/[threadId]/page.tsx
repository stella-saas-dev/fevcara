import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import { sendUserMessage } from "./actions";

type ChatPageProps = {
  params: Promise<{
    threadId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    limit?: string;
  }>;
};

type CharacterRelation =
  | {
      id: string;
      temporary_name: string | null;
      final_name: string | null;
      role_name: string | null;
      default_expression: string | null;
    }
  | {
      id: string;
      temporary_name: string | null;
      final_name: string | null;
      role_name: string | null;
      default_expression: string | null;
    }[]
  | null;

type ThreadRow = {
  id: string;
  title: string | null;
  chat_type: string;
  character_id: string | null;
  characters: CharacterRelation;
};

type MessageRow = {
  id: string;
  sender_type: string;
  content: string;
  character_id: string | null;
  created_at: string;
};

type ProfileForUsage = {
  plan: string | null;
  created_at: string | null;
};

type ProfileQueryRow = {
  plan: string | null;
  created_at?: string | null;
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

function getJstDateParts(date: Date) {
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

  return {
    year: jstDate.getUTCFullYear(),
    month: jstDate.getUTCMonth(),
    date: jstDate.getUTCDate(),
  };
}

function getTodayJstRange() {
  const now = new Date();
  const { year, month, date } = getJstDateParts(now);

  const startUtcMs =
    Date.UTC(year, month, date, 0, 0, 0, 0) - 9 * 60 * 60 * 1000;
  const endUtcMs = startUtcMs + 24 * 60 * 60 * 1000;

  return {
    start: new Date(startUtcMs).toISOString(),
    end: new Date(endUtcMs).toISOString(),
  };
}

function isSameJstDate(a: Date, b: Date) {
  const aParts = getJstDateParts(a);
  const bParts = getJstDateParts(b);

  return (
    aParts.year === bParts.year &&
    aParts.month === bParts.month &&
    aParts.date === bParts.date
  );
}

function getDailyMessageLimit(profile: ProfileForUsage) {
  if (isPaidPlan(profile.plan)) {
    return null;
  }

  const createdAt = profile.created_at
    ? new Date(profile.created_at)
    : new Date();

  const isFirstDay = isSameJstDate(createdAt, new Date());

  return isFirstDay ? 30 : 10;
}

function getCharacterFromRelation(characterRelation: CharacterRelation) {
  if (Array.isArray(characterRelation)) {
    return characterRelation[0] ?? null;
  }

  return characterRelation;
}

function getCharacterName(
  character: ReturnType<typeof getCharacterFromRelation>,
) {
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
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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

export default async function ChatPage({
  params,
  searchParams,
}: ChatPageProps) {
  const { threadId } = await params;
  const query = await searchParams;
  const isFreeDailyLimitReached = query.limit === "free_daily_message";
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
      characters (
        id,
        temporary_name,
        final_name,
        role_name,
        default_expression
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
  const character = getCharacterFromRelation(thread.characters);
  const characterName = getCharacterName(character);

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

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("plan, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileData) {
    const profile = profileData as ProfileQueryRow;

    profileForUsage = {
      plan: profile.plan ?? "free",
      created_at: profile.created_at ?? user.created_at ?? null,
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
    }
  }

  const dailyMessageLimit = getDailyMessageLimit(profileForUsage);
  let usedMessagesToday = 0;
  let remainingMessagesToday: number | null = null;

  if (dailyMessageLimit !== null) {
    const { start, end } = getTodayJstRange();

    const { count } = await supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("event_type", "chat_user_message")
      .gte("created_at", start)
      .lt("created_at", end);

    usedMessagesToday = count ?? 0;
    remainingMessagesToday = Math.max(dailyMessageLimit - usedMessagesToday, 0);
  }

  const hasNoFreeMessages =
    dailyMessageLimit !== null && remainingMessagesToday === 0;
  const isMessageInputDisabled =
    isFreeDailyLimitReached || hasNoFreeMessages;
  const shouldShowLimitNotice = isFreeDailyLimitReached || hasNoFreeMessages;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.12),transparent_34%),#0B1020] px-4 pb-[18rem] pt-5 text-[#F4F1EA] sm:px-5">
      <section className="mx-auto w-full max-w-md">
        <header className="rounded-[2rem] border border-white/10 bg-[#111827]/85 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/app/chats"
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#7DD3FC]/40 hover:text-[#F4F1EA]"
            >
              ← チャット一覧
            </Link>

            <Link
              href="/app/characters"
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#BEF264]/40 hover:text-[#F4F1EA]"
            >
              キャラ一覧
            </Link>
          </div>

          <div className="mt-5 flex items-center gap-4">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.4rem] border border-[#BEF264]/25 bg-gradient-to-br from-[#BEF264]/20 via-white/[0.04] to-[#7DD3FC]/20 text-2xl font-black text-[#F4F1EA] shadow-lg shadow-[#7DD3FC]/10">
              {getAvatarText(characterName)}
              <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full border border-[#0B1020] bg-[#BEF264]" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-black tracking-[0.24em] text-[#7DD3FC]">
                SINGLE CHAT
              </p>

              <h1 className="mt-2 break-words text-2xl font-black leading-tight">
                {characterName}
              </h1>
            </div>
          </div>
        </header>

      {showMemoryDebug ? (
        <details className="mt-4 rounded-[1.5rem] border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 p-4 shadow-lg shadow-[#7DD3FC]/5">
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
          <div className="mt-5 rounded-[1.5rem] border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            {query.error}
          </div>
        ) : null}

        {shouldShowLimitNotice ? (
          <div className="mt-5 rounded-[2rem] border border-[#FACC15]/30 bg-[#FACC15]/10 p-5 text-sm leading-7 text-[#FDE68A] shadow-lg shadow-[#FACC15]/5">
            <p className="font-black text-[#FDE68A]">
              この子はまだ話したそうにしています。
            </p>
            <p className="mt-2 text-[#F4F1EA]">
              続きは明日、またはPremium Liteで今すぐ再開できます。
            </p>
            <p className="mt-3 text-xs leading-5 text-[#A7B0C0]">
              Freeプランでは、通常1日10メッセージまで話せます。
              初回登録日は30メッセージまで体験できます。
            </p>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {messages.length > 0 ? (
            messages.map((message) => {
              const isUser = message.sender_type === "user";

              return (
                <div
                  key={message.id}
                  className={[
                    "flex items-end gap-2",
                    isUser ? "justify-end" : "justify-start",
                  ].join(" ")}
                >
                  {!isUser ? (
                    <div className="mb-5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 text-sm font-black text-[#E0F2FE]">
                      {getAvatarText(characterName)}
                    </div>
                  ) : null}

                  <div
                    className={[
                      "flex max-w-[80%] flex-col",
                      isUser ? "items-end" : "items-start",
                    ].join(" ")}
                  >
                    {!isUser ? (
                      <p className="mb-1 px-2 text-[11px] font-semibold text-[#A7B0C0]">
                        {characterName}
                      </p>
                    ) : null}

                    <div
                      className={[
                        "rounded-[1.5rem] border px-4 py-3 shadow-lg",
                        isUser
                          ? "rounded-br-md border-[#BEF264]/20 bg-[#BEF264]/15 text-[#F4F1EA] shadow-[#BEF264]/5"
                          : "rounded-bl-md border-white/10 bg-[#111827]/90 text-[#F4F1EA] shadow-black/20",
                      ].join(" ")}
                    >
                      <p className="whitespace-pre-wrap text-sm leading-7">
                        {message.content}
                      </p>
                    </div>

                    <p className="mt-1 px-2 text-[10px] text-[#7D8AA3]">
                      {formatMessageTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/[0.04] p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[#BEF264]/20 bg-[#BEF264]/10 text-2xl font-black text-[#D9F99D]">
                {getAvatarText(characterName)}
              </div>
              <h2 className="mt-5 text-xl font-black">
                まだ会話はありません
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
                最初のひと言を送って、このキャラクターと話し始めましょう。
              </p>
            </div>
          )}
        </div>
      </section>

      <form
        action={sendUserMessage}
        className="fixed inset-x-0 bottom-[5.25rem] z-40 px-4 sm:px-5"
      >
        <div className="mx-auto max-w-md rounded-[2rem] border border-white/10 bg-[#111827]/95 p-3 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <input type="hidden" name="threadId" value={thread.id} />

          <label className="block">
            <span className="sr-only">メッセージ</span>
            <textarea
              name="content"
              placeholder={
                isMessageInputDisabled
                  ? "本日のFreeメッセージ上限に達しました"
                  : `${characterName}に話しかける`
              }
              rows={3}
              required
              disabled={isMessageInputDisabled}
              className="w-full resize-none rounded-[1.5rem] border border-white/10 bg-[#0B1020]/80 px-4 py-3 text-sm leading-6 text-[#F4F1EA] outline-none placeholder:text-[#6B7280] disabled:cursor-not-allowed disabled:opacity-50 focus:border-[#BEF264]/60"
            />
          </label>

          <div className="mt-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              {dailyMessageLimit !== null ? (
                <p className="truncate text-[11px] text-[#A7B0C0]">
                  今日あと {remainingMessagesToday ?? 0} 通
                </p>
              ) : (
                <p className="truncate text-[11px] text-[#A7B0C0]">
                  Premiumメッセージ
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isMessageInputDisabled}
              className="shrink-0 rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-6 py-3 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.02] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            >
              {isMessageInputDisabled ? "今日はここまで" : "送信"}
            </button>
          </div>
        </div>
      </form>

      <AppBottomNav />
    </main>
  );
}
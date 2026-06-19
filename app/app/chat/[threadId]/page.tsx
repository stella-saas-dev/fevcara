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

function formatMessageTime(createdAt: string) {
  return new Date(createdAt).toLocaleString("ja-JP", {
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

  return (
    <main className="min-h-screen bg-[#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-md flex-col">
        <header>
          <Link
            href="/app/characters"
            className="text-sm text-[#A7B0C0] hover:text-[#F4F1EA]"
          >
            ← キャラクター一覧へ戻る
          </Link>

          <div className="mt-6 rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
            <p className="text-xs font-semibold tracking-[0.24em] text-[#7DD3FC]">
              SINGLE CHAT
            </p>

            <div className="mt-3 flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#BEF264]/20 bg-gradient-to-br from-[#BEF264]/20 to-[#7DD3FC]/20 text-2xl">
                ◇
              </div>

              <div className="min-w-0 flex-1">
                <h1 className="break-words text-2xl font-black">
                  {characterName}
                </h1>

                <div className="mt-2 flex flex-wrap gap-2">
                  {character?.role_name ? (
                    <span className="rounded-full border border-[#BEF264]/20 bg-[#BEF264]/10 px-3 py-1 text-xs text-[#D9F99D]">
                      {character.role_name}
                    </span>
                  ) : null}

                  {character?.default_expression ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-[#A7B0C0]">
                      {character.default_expression}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <p className="mt-4 text-xs leading-6 text-[#A7B0C0]">
              キャラクター設定・役割・専門性をもとに、AI返信を生成します。
              Freeプランでは通常1日10メッセージまで話せます。
            </p>
          </div>
        </header>

        {query.error ? (
          <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            {query.error}
          </div>
        ) : null}

        {isFreeDailyLimitReached ? (
          <div className="mt-5 rounded-[2rem] border border-[#FACC15]/30 bg-[#FACC15]/10 p-5 text-sm leading-7 text-[#FDE68A]">
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

        <div className="mt-6 flex-1 space-y-4">
          {messages.length > 0 ? (
            messages.map((message) => {
              const isUser = message.sender_type === "user";

              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={[
                      "max-w-[85%] rounded-[1.5rem] border px-4 py-3",
                      isUser
                        ? "border-[#BEF264]/20 bg-[#BEF264]/10 text-[#F4F1EA]"
                        : "border-white/10 bg-[#111827]/80 text-[#F4F1EA]",
                    ].join(" ")}
                  >
                    <p className="text-xs font-semibold text-[#A7B0C0]">
                      {isUser ? "あなた" : characterName}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7">
                      {message.content}
                    </p>
                    <p className="mt-2 text-right text-[11px] text-[#7D8AA3]">
                      {formatMessageTime(message.created_at)}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[2rem] border border-dashed border-white/15 bg-white/[0.04] p-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#BEF264]/10 text-2xl">
                ◇
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

        <form
          action={sendUserMessage}
          className="mt-6 rounded-[2rem] border border-white/10 bg-[#111827]/90 p-4 shadow-2xl shadow-black/30"
        >
          <input type="hidden" name="threadId" value={thread.id} />

          <label className="block">
            <span className="text-xs font-semibold text-[#A7B0C0]">
              メッセージ
            </span>
            <textarea
              name="content"
              placeholder={
                isFreeDailyLimitReached
                  ? "本日のFreeメッセージ上限に達しました"
                  : `${characterName}に話しかける`
              }
              rows={4}
              required
              disabled={isFreeDailyLimitReached}
              className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#0B1020]/70 px-4 py-3 text-sm outline-none placeholder:text-[#6B7280] disabled:cursor-not-allowed disabled:opacity-50 focus:border-[#BEF264]/60"
            />
          </label>

          <button
            type="submit"
            disabled={isFreeDailyLimitReached}
            className="mt-3 w-full rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            {isFreeDailyLimitReached ? "本日のFree上限に達しました" : "送信する"}
          </button>
        </form>
      </section>

      <AppBottomNav />
    </main>
  );
}
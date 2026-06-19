import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";

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
  created_at: string;
  updated_at: string;
  characters: CharacterRelation;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_type: string;
  content: string;
  created_at: string;
};

function getCharacterFromRelation(characterRelation: CharacterRelation) {
  if (Array.isArray(characterRelation)) {
    return characterRelation[0] ?? null;
  }

  return characterRelation;
}

function getCharacterName(character: ReturnType<typeof getCharacterFromRelation>) {
  if (!character) {
    return "キャラクター";
  }

  return (
    character.final_name ||
    character.temporary_name ||
    "名前のないキャラクター"
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMessagePreview(message: MessageRow | undefined) {
  if (!message) {
    return "まだメッセージはありません。";
  }

  const prefix = message.sender_type === "user" ? "あなた：" : "キャラ：";
  const content = message.content.replace(/\s+/g, " ").trim();

  if (content.length > 60) {
    return `${prefix}${content.slice(0, 60)}…`;
  }

  return `${prefix}${content}`;
}

export default async function ChatsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: threadsData } = await supabase
    .from("chat_threads")
    .select(
      `
      id,
      title,
      chat_type,
      character_id,
      created_at,
      updated_at,
      characters (
        id,
        temporary_name,
        final_name,
        role_name,
        default_expression
      )
    `,
    )
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const threads = (threadsData ?? []) as ThreadRow[];
  const threadIds = threads.map((thread) => thread.id);

  let latestMessages: MessageRow[] = [];

  if (threadIds.length > 0) {
    const { data: messagesData } = await supabase
      .from("chat_messages")
      .select("id, thread_id, sender_type, content, created_at")
      .eq("user_id", user.id)
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false });

    latestMessages = (messagesData ?? []) as MessageRow[];
  }

  const latestMessageMap = new Map<string, MessageRow>();

  latestMessages.forEach((message) => {
    if (!latestMessageMap.has(message.thread_id)) {
      latestMessageMap.set(message.thread_id, message);
    }
  });

  return (
    <main className="min-h-screen bg-[#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <Link
            href="/app"
            className="text-sm text-[#A7B0C0] hover:text-[#F4F1EA]"
          >
            ← ホームへ戻る
          </Link>

          <p className="mt-8 text-sm font-semibold tracking-[0.24em] text-[#FACC15]">
            CHATS
          </p>
          <h1 className="mt-2 text-3xl font-black">チャット一覧</h1>
          <p className="mt-3 text-sm leading-7 text-[#A7B0C0]">
            キャラクターとの会話を最近話した順に表示します。
            前の相談や会話の続きに戻れます。
          </p>
        </header>

        {threads.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border border-dashed border-white/15 bg-white/[0.04] p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#BEF264]/10 text-2xl">
              ◇
            </div>

            <h2 className="mt-5 text-xl font-black">
              まだチャットはありません
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
              キャラクター詳細ページから「話しかける」を押すと、
              ここにチャットが表示されます。
            </p>

            <Link
              href="/app/characters"
              className="mt-6 block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F]"
            >
              キャラクター一覧へ
            </Link>
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            {threads.map((thread) => {
              const character = getCharacterFromRelation(thread.characters);
              const characterName = getCharacterName(character);
              const latestMessage = latestMessageMap.get(thread.id);

              return (
                <Link
                  key={thread.id}
                  href={`/app/chat/${thread.id}`}
                  className="block rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/20 transition hover:scale-[1.01] hover:border-[#7DD3FC]/30 hover:bg-[#172033]"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#BEF264]/20 bg-gradient-to-br from-[#BEF264]/20 to-[#7DD3FC]/20 text-2xl">
                      ◇
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold tracking-[0.18em] text-[#7DD3FC]">
                            {thread.chat_type === "group"
                              ? "GROUP CHAT"
                              : "SINGLE CHAT"}
                          </p>

                          <h2 className="mt-1 break-words text-xl font-black">
                            {characterName}
                          </h2>
                        </div>

                        <p className="shrink-0 text-[11px] text-[#7D8AA3]">
                          {formatDateTime(thread.updated_at)}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
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

                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#D8DEE9]">
                        {getMessagePreview(latestMessage)}
                      </p>

                      <p className="mt-3 text-xs font-semibold text-[#BAE6FD]">
                        チャットを開く →
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <AppBottomNav />
    </main>
  );
}
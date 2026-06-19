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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMessagePreview(
  message: MessageRow | undefined,
  characterName: string,
) {
  if (!message) {
    return "まだ会話はありません。最初のひと言を送ってみましょう。";
  }

  const senderName = message.sender_type === "user" ? "あなた" : characterName;
  const content = message.content.replace(/\s+/g, " ").trim();

  if (!content) {
    return `${senderName}：メッセージ`;
  }

  if (content.length > 70) {
    return `${senderName}：${content.slice(0, 70)}…`;
  }

  return `${senderName}：${content}`;
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.12),transparent_34%),#0B1020] px-4 pb-28 pt-6 text-[#F4F1EA] sm:px-5">
      <section className="mx-auto w-full max-w-md">
        <header className="rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/app"
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-[#A7B0C0] transition hover:border-[#7DD3FC]/40 hover:text-[#F4F1EA]"
            >
              ← ホーム
            </Link>

            <Link
              href="/app/characters"
              className="rounded-full border border-[#BEF264]/20 bg-[#BEF264]/10 px-3 py-2 text-xs font-black text-[#D9F99D] transition hover:bg-[#BEF264]/15"
            >
              キャラ一覧
            </Link>
          </div>

          <p className="mt-6 text-[11px] font-black tracking-[0.24em] text-[#FACC15]">
            CHATS
          </p>

          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black">チャット</h1>
              <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                最近話したキャラクターから順に表示します。
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-center">
              <p className="text-xl font-black text-[#F4F1EA]">
                {threads.length}
              </p>
              <p className="text-[10px] font-semibold text-[#A7B0C0]">
                chats
              </p>
            </div>
          </div>
        </header>

        {threads.length === 0 ? (
          <div className="mt-6 rounded-[2rem] border border-dashed border-white/15 bg-white/[0.04] p-6 text-center shadow-xl shadow-black/20">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[#BEF264]/20 bg-[#BEF264]/10 text-2xl font-black text-[#D9F99D]">
              ◇
            </div>

            <h2 className="mt-5 text-xl font-black">
              まだチャットはありません
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
              キャラクター詳細ページから「話しかける」を押すと、
              ここに会話が表示されます。
            </p>

            <div className="mt-6 grid gap-3">
              <Link
                href="/app/characters"
                className="block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20"
              >
                キャラクター一覧へ
              </Link>

              <Link
                href="/app/characters/new"
                className="block rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-bold text-[#F4F1EA] transition hover:border-[#BEF264]/30"
              >
                新しいキャラクターを作る
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {threads.map((thread) => {
              const character = getCharacterFromRelation(thread.characters);
              const characterName = getCharacterName(character);
              const latestMessage = latestMessageMap.get(thread.id);
              const isGroupChat = thread.chat_type === "group";

              return (
                <Link
                  key={thread.id}
                  href={`/app/chat/${thread.id}`}
                  className="group block rounded-[1.75rem] border border-white/10 bg-[#111827]/82 p-4 shadow-xl shadow-black/20 transition hover:scale-[1.01] hover:border-[#7DD3FC]/35 hover:bg-[#172033]"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.4rem] border border-[#BEF264]/20 bg-gradient-to-br from-[#BEF264]/20 via-white/[0.04] to-[#7DD3FC]/20 text-xl font-black text-[#F4F1EA] shadow-lg shadow-[#7DD3FC]/10">
                      {isGroupChat ? "群" : getAvatarText(characterName)}
                      <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border border-[#0B1020] bg-[#BEF264]" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-lg font-black leading-tight">
                              {characterName}
                            </p>

                            {isGroupChat ? (
                              <span className="shrink-0 rounded-full border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 px-2 py-0.5 text-[10px] font-black text-[#BAE6FD]">
                                GROUP
                              </span>
                            ) : null}
                          </div>

                          {character?.role_name ? (
                            <p className="mt-1 truncate text-xs font-semibold text-[#D9F99D]">
                              {character.role_name}
                            </p>
                          ) : (
                            <p className="mt-1 text-xs font-semibold text-[#7DD3FC]">
                              SINGLE CHAT
                            </p>
                          )}
                        </div>

                        <p className="shrink-0 pt-0.5 text-[10px] text-[#7D8AA3]">
                          {formatDateTime(thread.updated_at)}
                        </p>
                      </div>

                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#C9D2E3]">
                        {getMessagePreview(latestMessage, characterName)}
                      </p>
                    </div>

                    <div className="hidden shrink-0 text-[#7D8AA3] transition group-hover:translate-x-0.5 group-hover:text-[#BAE6FD] sm:block">
                      →
                    </div>
                  </div>
                </Link>
              );
            })}

            <Link
              href="/app/characters"
              className="block rounded-[1.5rem] border border-dashed border-white/15 bg-white/[0.03] px-5 py-4 text-center text-sm font-bold text-[#A7B0C0] transition hover:border-[#BEF264]/30 hover:text-[#F4F1EA]"
            >
              別のキャラクターに話しかける
            </Link>
          </div>
        )}
      </section>

      <AppBottomNav />
    </main>
  );
}
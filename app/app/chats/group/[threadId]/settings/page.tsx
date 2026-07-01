import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import {
  GROUP_ICON_COLOR_OPTIONS,
  getGroupIconClasses,
  getGroupInitial,
  normalizeGroupIconColor,
} from "@/lib/fevcara/groupIcon";
import {
  GROUP_ROLE_MAX_TAGS,
  GROUP_ROLE_OPTIONS,
  getGroupRoleLabels,
} from "@/lib/fevcara/groupRoles";
import { updateGroupChatSettings } from "./actions";

type GroupSettingsPageProps = {
  params: Promise<{
    threadId: string;
  }>;
  searchParams: Promise<{
    updated?: string;
    error?: string;
  }>;
};

type ThreadRow = {
  id: string;
  title: string | null;
  chat_type: string | null;
  group_icon_color: string | null;
};

type GroupMemberRow = {
  character_id: string;
  group_role_tags: string[] | null;
};

type CharacterRow = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;
  role_name: string | null;
  icon_image_url: string | null;
};

function getCharacterName(character: CharacterRow | null | undefined) {
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

function CharacterAvatar({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  if (imageUrl) {
    return (
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-[#BEF264]/25 bg-white shadow-lg shadow-[#7DD3FC]/10">
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#BEF264]/25 bg-gradient-to-br from-[#BEF264]/20 to-[#7DD3FC]/20 text-lg font-black text-[#F4F1EA]">
      {getAvatarText(name)}
    </div>
  );
}

export default async function GroupSettingsPage({
  params,
  searchParams,
}: GroupSettingsPageProps) {
  const { threadId } = await params;
  const query = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: threadData, error: threadError } = await supabase
    .from("chat_threads")
    .select("id, title, chat_type, group_icon_color")
    .eq("id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (threadError || !threadData) {
    redirect("/app/chats");
  }

  const thread = threadData as ThreadRow;

  if (thread.chat_type !== "group") {
    redirect(`/app/chat/${thread.id}`);
  }

  const { data: membersData } = await supabase
    .from("group_chat_members")
    .select("character_id, group_role_tags")
    .eq("thread_id", thread.id)
    .eq("user_id", user.id);

  const members = (membersData ?? []) as GroupMemberRow[];
  const memberCharacterIds = members.map((member) => member.character_id);

  let characters: CharacterRow[] = [];

  if (memberCharacterIds.length > 0) {
    const { data: charactersData } = await supabase
      .from("characters")
      .select("id, temporary_name, final_name, role_name, icon_image_url")
      .eq("user_id", user.id)
      .in("id", memberCharacterIds);

    const characterMap = new Map(
      ((charactersData ?? []) as CharacterRow[]).map((character) => [
        character.id,
        character,
      ]),
    );

    characters = memberCharacterIds
      .map((characterId) => characterMap.get(characterId) ?? null)
      .filter((character): character is CharacterRow => Boolean(character));
  }

  const memberMap = new Map(
    members.map((member) => [member.character_id, member]),
  );

  const title = thread.title || "グループチャット";
  const currentColor = normalizeGroupIconColor(thread.group_icon_color);
  const previewClasses = getGroupIconClasses(currentColor);
  const groupInitial = getGroupInitial(title);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,0.22),transparent_34%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.22),transparent_34%),linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_54%,#F1F5F9_100%)] px-5 pb-28 pt-8 text-[#1E293B]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <Link
            href={`/app/chat/${thread.id}`}
            className="text-sm font-semibold text-[#64748B] hover:text-[#0F172A]"
          >
            ← グループチャットへ戻る
          </Link>

          <p className="mt-8 text-sm font-semibold tracking-[0.24em] text-[#7DD3FC]">
            GROUP SETTINGS
          </p>
          <h1 className="mt-2 text-3xl font-black">
            グループ設定
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#64748B]">
            グループ名とアイコン色を変更できます。
            アイコンの文字はグループ名の最初の1文字から自動で表示されます。
          </p>
        </header>

        {query.updated ? (
          <div className="mt-6 rounded-2xl border border-[#BEF264]/40 bg-[#F7FEE7] p-4 text-sm font-semibold leading-6 text-[#3F6212]">
            グループ設定を保存しました。
          </div>
        ) : null}

        {query.error ? (
          <div className="mt-6 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {query.error}
          </div>
        ) : null}

        <section className="mt-8 rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30">
          <p className="text-xs font-black tracking-[0.2em] text-[#FACC15]">
            PREVIEW
          </p>

          <div className="mt-4 flex items-center gap-4">
            <div
              className={[
                "flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.6rem] border text-3xl font-black",
                previewClasses.icon,
              ].join(" ")}
            >
              {groupInitial}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-2xl font-black text-white">
                {title}
              </h2>
              <p className="mt-2 text-sm font-semibold text-[#7DD3FC]">
                GROUP CHAT ・ {members.length}人
              </p>
              <p className="mt-2 text-xs leading-5 text-[#A7B0C0]">
                グループ名を変更すると、アイコン内の1文字も自動で変わります。
              </p>
            </div>
          </div>
        </section>

        <form
          action={updateGroupChatSettings}
          className="mt-5 rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30"
        >
          <input type="hidden" name="threadId" value={thread.id} />

          <label className="block">
            <span className="text-sm font-semibold text-[#D8DEE9]">
              グループ名
            </span>
            <input
              name="title"
              type="text"
              maxLength={50}
              defaultValue={title}
              className="mt-2 w-full rounded-2xl border border-white/15 bg-[#0B1220]/60 px-4 py-4 text-base font-semibold text-[#F8FAFC] outline-none placeholder:text-[#94A3B8] focus:border-[#BEF264]/70"
            />
            <p className="mt-2 text-xs leading-5 text-[#7D8AA3]">
              50文字以内で入力してください。
            </p>
          </label>

          <div className="mt-6">
            <p className="text-sm font-semibold text-[#D8DEE9]">
              アイコン色
            </p>
            <p className="mt-2 text-xs leading-5 text-[#A7B0C0]">
              チャット一覧とグループチャット画面に表示される色です。
            </p>

            <div className="mt-4 grid gap-3">
              {GROUP_ICON_COLOR_OPTIONS.map((option) => {
                const colorClasses = getGroupIconClasses(option.value);

                return (
                  <label key={option.value} className="block cursor-pointer">
                    <input
                      type="radio"
                      name="groupIconColor"
                      value={option.value}
                      defaultChecked={option.value === currentColor}
                      className="peer sr-only"
                    />

                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition peer-checked:border-[#BEF264]/40 peer-checked:bg-white/[0.08] peer-checked:ring-1 peer-checked:ring-[#BEF264]/35">
                      <div className="flex items-center gap-3">
                        <div
                          className={[
                            "flex h-12 w-12 items-center justify-center rounded-2xl border text-lg font-black",
                            colorClasses.icon,
                          ].join(" ")}
                        >
                          {groupInitial}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-black text-[#F4F1EA]">
                            {option.label}
                          </p>
                          <p className="mt-1 text-xs text-[#A7B0C0]">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="mt-6 border-t border-white/10 pt-6">
            <p className="text-sm font-semibold text-[#D8DEE9]">
              キャラクターごとのグループ内役割
            </p>
            <p className="mt-2 text-xs leading-5 text-[#A7B0C0]">
              相談と雑談の会話バランスを作るための役割です。
              各キャラクターにつき最大{GROUP_ROLE_MAX_TAGS}個まで選べます。
            </p>

            <div className="mt-4 grid gap-4">
              {characters.map((character) => {
                const member = memberMap.get(character.id) ?? null;
                const selectedRoleLabels = getGroupRoleLabels(
                  member?.group_role_tags,
                );
                const characterName = getCharacterName(character);

                return (
                  <div
                    key={character.id}
                    className="rounded-3xl border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-start gap-3">
                      <CharacterAvatar
                        name={characterName}
                        imageUrl={character.icon_image_url}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-black text-[#F4F1EA]">
                          {characterName}
                        </p>

                        {character.role_name ? (
                          <p className="mt-1 text-xs font-bold text-[#BAE6FD]">
                            {character.role_name}
                          </p>
                        ) : null}

                        <p className="mt-2 text-[11px] leading-5 text-[#A7B0C0]">
                          現在：
                          {selectedRoleLabels.length > 0
                            ? selectedRoleLabels.join(" / ")
                            : "未設定"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {GROUP_ROLE_OPTIONS.map((roleOption) => (
                        <label
                          key={roleOption.value}
                          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-[11px] font-bold text-[#D8DEE9] transition hover:border-[#BEF264]/35 hover:bg-white/[0.08]"
                        >
                          <input
                            type="checkbox"
                            name={`groupRoleTags:${character.id}`}
                            value={roleOption.value}
                            defaultChecked={Boolean(
                              member?.group_role_tags?.includes(roleOption.value),
                            )}
                            className="accent-[#BEF264]"
                          />
                          <span>{roleOption.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
          >
            グループ設定を保存する
          </button>
        </form>
      </section>

      <AppBottomNav />
    </main>
  );
}

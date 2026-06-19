import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import { selectActiveCharacter } from "./actions";

type SelectActiveCharacterPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

type ProfileForActiveSelection = {
  plan: string | null;
  active_character_id: string | null;
  character_limit_choice_locked: boolean | null;
};

type CharacterRow = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;
  role_name: string | null;
  default_expression: string | null;
  created_at: string;
};

function normalizePlan(plan: string | null) {
  return (plan || "free").trim().toLowerCase().replace(/\s+/g, "_");
}

function isFreePlan(plan: string | null) {
  return normalizePlan(plan) === "free";
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

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function SelectActiveCharacterPage({
  searchParams,
}: SelectActiveCharacterPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("plan, active_character_id, character_limit_choice_locked")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profileData) {
    redirect("/app/characters");
  }

  const profile = profileData as ProfileForActiveSelection;

  const { data: charactersData } = await supabase
    .from("characters")
    .select(
      "id, temporary_name, final_name, role_name, default_expression, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const characters = (charactersData ?? []) as CharacterRow[];

  if (!isFreePlan(profile.plan) || characters.length <= 1) {
    redirect("/app/characters");
  }

  const selectedCharacter =
    characters.find((character) => character.id === profile.active_character_id) ??
    null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.12),transparent_34%),#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <Link
            href="/app/characters"
            className="text-sm text-[#A7B0C0] hover:text-[#F4F1EA]"
          >
            ← キャラクター一覧へ戻る
          </Link>

          <p className="mt-8 text-sm font-semibold tracking-[0.24em] text-[#FACC15]">
            FREE CHARACTER SELECTION
          </p>

          <h1 className="mt-2 text-3xl font-black">
            使い続けるキャラを選ぶ
          </h1>

          <p className="mt-3 text-sm leading-7 text-[#A7B0C0]">
            Freeプランでは、通常チャットで使えるキャラクターは1人です。
            ダウングレード後もキャラは削除されませんが、Free中に話せるキャラを一度だけ選ぶ必要があります。
          </p>
        </header>

        <div className="mt-6 rounded-[2rem] border border-[#FACC15]/25 bg-[#FACC15]/10 p-5 shadow-xl shadow-[#FACC15]/5">
          <p className="text-sm font-black text-[#FDE68A]">
            この選択はFreeプラン中は変更できません
          </p>
          <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
            選ばなかったキャラクターは削除されず、待機中として保持されます。
            Premium Lite以上に戻すと、複数キャラの利用を再開できる設計にします。
          </p>
        </div>

        {params.error ? (
          <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            {params.error}
          </div>
        ) : null}

        {profile.character_limit_choice_locked ? (
          <div className="mt-8 rounded-[2rem] border border-white/10 bg-[#111827]/85 p-6 text-center shadow-2xl shadow-black/30">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[#BEF264]/20 bg-[#BEF264]/10 text-2xl">
              ✓
            </div>

            <h2 className="mt-5 text-2xl font-black">
              選択済みです
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#A7B0C0]">
              Freeプラン中に使うキャラクターはすでに選ばれています。
            </p>

            {selectedCharacter ? (
              <div className="mt-5 rounded-3xl border border-[#BEF264]/20 bg-[#BEF264]/10 p-4">
                <p className="text-sm text-[#A7B0C0]">現在使えるキャラ</p>
                <p className="mt-1 text-xl font-black text-[#F4F1EA]">
                  {getCharacterName(selectedCharacter)}
                </p>
              </div>
            ) : null}

            <Link
              href="/app/characters"
              className="mt-6 block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F]"
            >
              キャラクター一覧へ
            </Link>
          </div>
        ) : (
          <form action={selectActiveCharacter} className="mt-8 space-y-4">
            {characters.map((character, index) => {
              const characterName = getCharacterName(character);

              return (
                <label
                  key={character.id}
                  className="block cursor-pointer rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-xl shadow-black/20 transition hover:border-[#BEF264]/35 hover:bg-[#172033]"
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="radio"
                      name="characterId"
                      value={character.id}
                      defaultChecked={index === 0}
                      className="mt-5 shrink-0 accent-[#BEF264]"
                    />

                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.4rem] border border-[#BEF264]/20 bg-gradient-to-br from-[#BEF264]/20 via-white/[0.04] to-[#7DD3FC]/20 text-xl font-black text-[#F4F1EA]">
                      {getAvatarText(characterName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="break-words text-xl font-black">
                        {characterName}
                      </h2>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {character.role_name ? (
                          <span className="rounded-full border border-[#BEF264]/20 bg-[#BEF264]/10 px-3 py-1 text-xs text-[#D9F99D]">
                            {character.role_name}
                          </span>
                        ) : null}

                        {character.default_expression ? (
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-[#A7B0C0]">
                            {character.default_expression}
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 text-xs text-[#7D8AA3]">
                        作成日時：{formatDateTime(character.created_at)}
                      </p>
                    </div>
                  </div>
                </label>
              );
            })}

            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
            >
              このキャラをFreeで使う
            </button>

            <p className="text-center text-xs leading-6 text-[#7D8AA3]">
              選ばなかったキャラクターは削除されません。
              今後、Premium Lite以上で再び使えるようにします。
            </p>
          </form>
        )}
      </section>

      <AppBottomNav />
    </main>
  );
}
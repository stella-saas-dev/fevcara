import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import { selectActiveCharacter } from "./actions";

type CharacterRow = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;
  role_name: string | null;
  status: string | null;
  created_at: string;
};

type ProfileRow = {
  plan: string | null;
  active_character_id: string | null;
  character_limit_choice_locked: boolean | null;
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

export default async function SelectActiveCharacterPage() {
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
  }) as ProfileRow;

  const { data: charactersData } = await supabase
    .from("characters")
    .select(
      `
      id,
      temporary_name,
      final_name,
      role_name,
      status,
      created_at
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const characters = (charactersData ?? []) as CharacterRow[];

  const canSelectActiveCharacter =
    isFreePlan(profile.plan) &&
    characters.length > 1 &&
    !profile.character_limit_choice_locked;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(249,168,212,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.12),transparent_34%),#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <Link
            href="/app/characters"
            className="text-sm text-[#A7B0C0] hover:text-[#F4F1EA]"
          >
            ← キャラクター一覧へ戻る
          </Link>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30">
            <p className="text-xs font-black tracking-[0.24em] text-[#F9A8D4]">
              ACTIVE CHARACTER
            </p>
            <h1 className="mt-2 text-3xl font-black">
              使うキャラを選ぶ
            </h1>
            <p className="mt-3 text-sm leading-7 text-[#A7B0C0]">
              Freeプランでは、チャットできるキャラクターを1人だけ選びます。
              選ばなかったキャラクターは削除されず、待機中になります。
            </p>
          </div>
        </header>

        {profile.character_limit_choice_locked ? (
          <div className="mt-6 rounded-[2rem] border border-[#BEF264]/25 bg-[#BEF264]/10 p-5 shadow-xl shadow-[#BEF264]/5">
            <p className="text-sm font-black text-[#D9F99D]">
              Freeで使うキャラクターは選択済みです
            </p>
            <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
              選択済みのキャラクターだけがFreeプランで利用できます。
              Premium Lite以上にすると、複数キャラクターを使えるようにします。
            </p>

            <Link
              href="/app/characters"
              className="mt-5 block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F]"
            >
              キャラクター一覧へ
            </Link>
          </div>
        ) : null}

        {!isFreePlan(profile.plan) ? (
          <div className="mt-6 rounded-[2rem] border border-[#7DD3FC]/25 bg-[#7DD3FC]/10 p-5 shadow-xl shadow-[#7DD3FC]/5">
            <p className="text-sm font-black text-[#BAE6FD]">
              現在のプランでは選択不要です
            </p>
            <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
              Premium Lite以上では、複数キャラクターをそのまま利用できます。
            </p>

            <Link
              href="/app/characters"
              className="mt-5 block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F]"
            >
              キャラクター一覧へ
            </Link>
          </div>
        ) : null}

        {isFreePlan(profile.plan) && characters.length <= 1 ? (
          <div className="mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/20">
            <p className="text-sm font-black text-[#F4F1EA]">
              選択はまだ必要ありません
            </p>
            <p className="mt-2 text-xs leading-6 text-[#A7B0C0]">
              現在のキャラクター数は{characters.length}人です。
              Freeプランの上限内なので、使うキャラを固定する必要はありません。
            </p>

            <Link
              href="/app/characters"
              className="mt-5 block rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black text-[#F4F1EA] transition hover:bg-white/[0.08]"
            >
              キャラクター一覧へ
            </Link>
          </div>
        ) : null}

        {canSelectActiveCharacter ? (
          <form action={selectActiveCharacter} className="mt-6 grid gap-4">
            <div className="rounded-[2rem] border border-[#FACC15]/25 bg-[#FACC15]/10 p-5">
              <p className="text-sm font-black text-[#FDE68A]">
                どのキャラクターをFreeで使いますか？
              </p>
              <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
                選択は一度だけ行います。選ばなかったキャラクターは待機中として残ります。
              </p>
            </div>

            <div className="grid gap-4">
              {characters.map((character) => {
                const characterName = getCharacterName(character);

                return (
                  <label
                    key={character.id}
                    className="group relative block cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="characterId"
                      value={character.id}
                      required
                      className="sr-only"
                    />

                    <div className="rounded-[2rem] border-2 border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30 transition hover:border-[#F9A8D4]/45 hover:bg-[#151B2A] group-has-[:checked]:border-[#F9A8D4] group-has-[:checked]:bg-[#F9A8D4]/12 group-has-[:checked]:shadow-[0_0_0_2px_rgba(249,168,212,0.55),0_0_34px_rgba(249,168,212,0.28)]">
                      <div className="absolute right-4 top-4 hidden rounded-full bg-[#F9A8D4] px-3 py-1 text-[10px] font-black text-[#07111F] shadow-lg shadow-[#F9A8D4]/30 group-has-[:checked]:block">
                        選択中
                      </div>

                      <div className="flex items-start gap-4 pr-16">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-[#BEF264]/20 bg-gradient-to-br from-[#BEF264]/20 to-[#7DD3FC]/20 text-2xl font-black text-[#F4F1EA] transition group-has-[:checked]:border-[#F9A8D4]/60 group-has-[:checked]:bg-[#F9A8D4]/20 group-has-[:checked]:text-[#FCE7F3]">
                          {getAvatarText(characterName)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="break-words text-xl font-black text-[#F4F1EA]">
                            {characterName}
                          </p>

                          {character.role_name ? (
                            <p className="mt-2 text-sm font-semibold text-[#BAE6FD]">
                              {character.role_name}
                            </p>
                          ) : (
                            <p className="mt-2 text-sm font-semibold text-[#A7B0C0]">
                              役割は未設定です
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full border border-[#FACC15]/20 bg-[#FACC15]/10 px-3 py-1 text-xs text-[#FDE68A]">
                              {character.status || "draft"}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-[#A7B0C0]">
                              待機候補
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-black text-[#D8DEE9] transition group-hover:border-[#F9A8D4]/35 group-hover:text-[#FCE7F3] group-has-[:checked]:border-[#F9A8D4] group-has-[:checked]:bg-[#F9A8D4] group-has-[:checked]:text-[#07111F] group-has-[:checked]:shadow-lg group-has-[:checked]:shadow-[#F9A8D4]/25">
                        この子を選ぶ
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>

            <button
              type="submit"
              className="mt-2 rounded-2xl bg-gradient-to-r from-[#F9A8D4] via-[#FACC15] to-[#BEF264] px-5 py-4 text-center text-sm font-black text-[#07111F] shadow-xl shadow-[#F9A8D4]/20 transition hover:scale-[1.01] hover:opacity-95"
            >
              選択を確定する
            </button>

            <p className="text-center text-xs leading-6 text-[#A7B0C0]">
              確定後、選ばなかったキャラクターはFreeプラン中は待機中になります。
            </p>
          </form>
        ) : null}
      </section>

      <AppBottomNav />
    </main>
  );
}
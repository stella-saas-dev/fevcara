import Link from "next/link";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";

type CharactersPageProps = {
  searchParams: Promise<{
    created?: string;
  }>;
};

type ArtStylePresetRelation =
  | {
      name: string | null;
    }
  | {
      name: string | null;
    }[]
  | null;

type CharacterRow = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;
  gender_feel: string | null;
  eye_color: string | null;
  hair_color: string | null;
  default_expression: string | null;
  status: string | null;
  created_at: string;
  art_style_presets: ArtStylePresetRelation;
};

function getArtStyleName(artStylePresets: ArtStylePresetRelation) {
  if (Array.isArray(artStylePresets)) {
    return artStylePresets[0]?.name ?? "Art Style";
  }

  return artStylePresets?.name ?? "Art Style";
}

export default async function CharactersPage({
  searchParams,
}: CharactersPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let characters: CharacterRow[] = [];

  if (user) {
    const { data } = await supabase
      .from("characters")
      .select(
        `
        id,
        temporary_name,
        final_name,
        gender_feel,
        eye_color,
        hair_color,
        default_expression,
        status,
        created_at,
        art_style_presets (
          name
        )
      `,
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    characters = (data ?? []) as CharacterRow[];
  }

  return (
    <main className="min-h-screen bg-[#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <p className="text-sm font-semibold tracking-[0.24em] text-[#7DD3FC]">
            CHARACTERS
          </p>
          <h1 className="mt-2 text-3xl font-black">キャラクター</h1>
          <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
            あなたが生み出したキャラクターたちが、ここに並びます。
          </p>
        </header>

        {params.created ? (
          <div className="mt-6 rounded-2xl border border-[#BEF264]/30 bg-[#BEF264]/10 p-4 text-sm leading-6 text-[#D9F99D]">
            キャラクターを保存しました。次は、この子に姿を与えていきましょう。
          </div>
        ) : null}

        <div className="mt-8">
          {characters.length > 0 ? (
            <div className="grid gap-4">
              {characters.map((character) => {
                const name =
                  character.final_name ||
                  character.temporary_name ||
                  "名前のないキャラクター";

                const artStyleName = getArtStyleName(
                  character.art_style_presets,
                );

                return (
                  <div
                    key={character.id}
                    className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-[#BEF264]/20 bg-gradient-to-br from-[#BEF264]/20 to-[#7DD3FC]/20 text-2xl">
                        ◇
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xl font-black">{name}</p>

                        <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                          {character.gender_feel || "雰囲気未設定"}
                          {character.eye_color
                            ? ` / 目の色：${character.eye_color}`
                            : ""}
                          {character.hair_color
                            ? ` / 髪色：${character.hair_color}`
                            : ""}
                        </p>

                        {character.default_expression ? (
                          <p className="mt-2 text-xs leading-5 text-[#D8DEE9]">
                            表情：{character.default_expression}
                          </p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-[#A7B0C0]">
                            {artStyleName}
                          </span>

                          <span className="rounded-full border border-[#FACC15]/20 bg-[#FACC15]/10 px-3 py-1 text-xs text-[#FDE68A]">
                            {character.status || "draft"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={`/app/characters/${character.id}`}
                      className="mt-5 block rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-center text-sm font-semibold text-[#F4F1EA] transition hover:bg-white/[0.08]"
                    >
                      詳細を見る
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

        {characters.length > 0 ? (
          <Link
            href="/app/characters/new"
            className="mt-6 block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F]"
          >
            新しいキャラクターを作成する
          </Link>
        ) : null}
      </section>

      <AppBottomNav />
    </main>
  );
}
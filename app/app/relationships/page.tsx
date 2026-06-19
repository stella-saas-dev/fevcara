import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import { saveCharacterRelationshipPair } from "./actions";

type RelationshipsPageProps = {
  searchParams: Promise<{
    saved?: string;
    error?: string;
  }>;
};

type CharacterRow = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;
  role_name: string | null;
  expertise: string | null;
};

type RelationshipRow = {
  id: string;
  from_character_id: string;
  to_character_id: string;
  relationship_label: string | null;
  impression: string | null;
  speaking_style: string | null;
  group_chat_behavior: string | null;
  forbidden_behavior: string | null;
};

function getCharacterName(character: CharacterRow) {
  return (
    character.final_name ||
    character.temporary_name ||
    "名前のないキャラクター"
  );
}

function getRelationshipKey(fromCharacterId: string, toCharacterId: string) {
  return `${fromCharacterId}:${toCharacterId}`;
}

function DirectionFields({
  prefix,
  fromName,
  toName,
  relationship,
  accentClass,
}: {
  prefix: "ab" | "ba";
  fromName: string;
  toName: string;
  relationship: RelationshipRow | null;
  accentClass: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4">
      <p className={`text-sm font-black ${accentClass}`}>
        {fromName} から見た {toName}
      </p>

      <div className="mt-4 space-y-4">
        <label className="block">
          <span className="text-xs font-medium text-[#D8DEE9]">
            関係ラベル
          </span>
          <input
            name={`${prefix}RelationshipLabel`}
            type="text"
            defaultValue={relationship?.relationship_label ?? ""}
            placeholder="例：相棒 / ライバル / 先輩後輩 / 保護者と自由人"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0B1020]/70 px-4 py-3 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-[#D8DEE9]">
            相手をどう見ているか
          </span>
          <textarea
            name={`${prefix}Impression`}
            defaultValue={relationship?.impression ?? ""}
            placeholder="例：自由すぎるが、発想力は信頼している。時々たしなめる。"
            rows={3}
            className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#0B1020]/70 px-4 py-3 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-[#D8DEE9]">
            相手への話し方
          </span>
          <textarea
            name={`${prefix}SpeakingStyle`}
            defaultValue={relationship?.speaking_style ?? ""}
            placeholder="例：少し厳しめ。ただし否定だけで終わらせず、必ず改善案を添える。"
            rows={3}
            className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#0B1020]/70 px-4 py-3 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-[#D8DEE9]">
            グループチャットでの絡み方
          </span>
          <textarea
            name={`${prefix}GroupChatBehavior`}
            defaultValue={relationship?.group_chat_behavior ?? ""}
            placeholder="例：相手が広げた案を、現実的に整理する。意見が違っても人格否定はしない。"
            rows={3}
            className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#0B1020]/70 px-4 py-3 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
          />
        </label>

        <label className="block">
          <span className="text-xs font-medium text-[#D8DEE9]">
            禁止したい絡み方
          </span>
          <textarea
            name={`${prefix}ForbiddenBehavior`}
            defaultValue={relationship?.forbidden_behavior ?? ""}
            placeholder="例：相手を馬鹿にしない。冷たすぎる言い方をしない。関係性を壊す発言をしない。"
            rows={3}
            className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#0B1020]/70 px-4 py-3 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
          />
        </label>
      </div>
    </div>
  );
}

export default async function RelationshipsPage({
  searchParams,
}: RelationshipsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: charactersData } = await supabase
    .from("characters")
    .select(
      `
      id,
      temporary_name,
      final_name,
      role_name,
      expertise
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const characters = (charactersData ?? []) as CharacterRow[];
  const characterIds = characters.map((character) => character.id);

  let relationships: RelationshipRow[] = [];

  if (characterIds.length >= 2) {
    const { data: relationshipsData } = await supabase
      .from("character_relationships")
      .select(
        `
        id,
        from_character_id,
        to_character_id,
        relationship_label,
        impression,
        speaking_style,
        group_chat_behavior,
        forbidden_behavior
      `,
      )
      .eq("user_id", user.id)
      .in("from_character_id", characterIds)
      .in("to_character_id", characterIds);

    relationships = (relationshipsData ?? []) as RelationshipRow[];
  }

  const relationshipMap = new Map<string, RelationshipRow>();

  relationships.forEach((relationship) => {
    relationshipMap.set(
      getRelationshipKey(
        relationship.from_character_id,
        relationship.to_character_id,
      ),
      relationship,
    );
  });

  const pairs: {
    a: CharacterRow;
    b: CharacterRow;
    ab: RelationshipRow | null;
    ba: RelationshipRow | null;
  }[] = [];

  for (let i = 0; i < characters.length; i += 1) {
    for (let j = i + 1; j < characters.length; j += 1) {
      const a = characters[i];
      const b = characters[j];

      if (!a || !b) {
        continue;
      }

      pairs.push({
        a,
        b,
        ab: relationshipMap.get(getRelationshipKey(a.id, b.id)) ?? null,
        ba: relationshipMap.get(getRelationshipKey(b.id, a.id)) ?? null,
      });
    }
  }

  return (
    <main className="min-h-screen bg-[#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <Link
            href="/app/characters"
            className="text-sm text-[#A7B0C0] hover:text-[#F4F1EA]"
          >
            ← キャラクター一覧へ戻る
          </Link>

          <p className="mt-8 text-sm font-semibold tracking-[0.24em] text-[#FACC15]">
            RELATIONSHIPS
          </p>
          <h1 className="mt-2 text-3xl font-black">
            キャラ同士の関係性
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#A7B0C0]">
            グループチャットで世界観が崩れないように、
            キャラクター同士の見方・話し方・絡み方を設定します。
          </p>
        </header>

        {params.saved ? (
          <div className="mt-6 rounded-2xl border border-[#BEF264]/30 bg-[#BEF264]/10 p-4 text-sm leading-6 text-[#D9F99D]">
            関係性を保存しました。
          </div>
        ) : null}

        {params.error ? (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            {params.error}
          </div>
        ) : null}

        {characters.length < 2 ? (
          <div className="mt-8 rounded-[2rem] border border-dashed border-white/15 bg-white/[0.04] p-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#BEF264]/10 text-2xl">
              ◇
            </div>

            <h2 className="mt-5 text-xl font-black">
              関係性を作るには2人以上必要です
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
              まずはキャラクターをもう1人作成しましょう。
              複数人になると、ここで関係性を編集できます。
            </p>

            <Link
              href="/app/characters/new"
              className="mt-6 block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F]"
            >
              キャラクターを作成する
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-4">
            <div className="rounded-3xl border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 p-4">
              <p className="text-sm font-semibold text-[#BAE6FD]">
                {pairs.length}組の関係性を編集できます
              </p>
              <p className="mt-2 text-xs leading-5 text-[#D8DEE9]">
                各ペアをタップすると編集欄が開きます。
                「Aから見たB」と「Bから見たA」は別々に設定できます。
              </p>
            </div>

            {pairs.map(({ a, b, ab, ba }) => {
              const aName = getCharacterName(a);
              const bName = getCharacterName(b);
              const hasRelationship =
                Boolean(ab?.relationship_label) ||
                Boolean(ab?.impression) ||
                Boolean(ab?.speaking_style) ||
                Boolean(ab?.group_chat_behavior) ||
                Boolean(ab?.forbidden_behavior) ||
                Boolean(ba?.relationship_label) ||
                Boolean(ba?.impression) ||
                Boolean(ba?.speaking_style) ||
                Boolean(ba?.group_chat_behavior) ||
                Boolean(ba?.forbidden_behavior);

              return (
                <details
                  key={`${a.id}-${b.id}`}
                  className="group rounded-[2rem] border border-white/10 bg-[#111827]/80 shadow-2xl shadow-black/30 [&>summary::-webkit-details-marker]:hidden"
                >
                  <summary className="cursor-pointer list-none p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold tracking-[0.2em] text-[#7DD3FC]">
                          CHARACTER PAIR
                        </p>

                        <h2 className="mt-2 break-words text-2xl font-black">
                          {aName} ↔ {bName}
                        </h2>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {a.role_name ? (
                            <span className="rounded-full border border-[#BEF264]/20 bg-[#BEF264]/10 px-3 py-1 text-xs text-[#D9F99D]">
                              {aName}：{a.role_name}
                            </span>
                          ) : null}

                          {b.role_name ? (
                            <span className="rounded-full border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 px-3 py-1 text-xs text-[#BAE6FD]">
                              {bName}：{b.role_name}
                            </span>
                          ) : null}

                          {hasRelationship ? (
                            <span className="rounded-full border border-[#FACC15]/20 bg-[#FACC15]/10 px-3 py-1 text-xs text-[#FDE68A]">
                              設定済み
                            </span>
                          ) : (
                            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-[#A7B0C0]">
                              未設定
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-xs leading-5 text-[#A7B0C0]">
                          タップして、このペアの関係性を編集
                        </p>
                      </div>

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-lg text-[#F4F1EA] transition group-open:rotate-180">
                        ↓
                      </div>
                    </div>
                  </summary>

                  <form
                    action={saveCharacterRelationshipPair}
                    className="border-t border-white/10 p-5 pt-5"
                  >
                    <input type="hidden" name="aCharacterId" value={a.id} />
                    <input type="hidden" name="bCharacterId" value={b.id} />

                    <div className="grid gap-4">
                      <DirectionFields
                        prefix="ab"
                        fromName={aName}
                        toName={bName}
                        relationship={ab}
                        accentClass="text-[#BEF264]"
                      />

                      <DirectionFields
                        prefix="ba"
                        fromName={bName}
                        toName={aName}
                        relationship={ba}
                        accentClass="text-[#7DD3FC]"
                      />
                    </div>

                    <button
                      type="submit"
                      className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
                    >
                      このペアの関係性を保存する
                    </button>
                  </form>
                </details>
              );
            })}
          </div>
        )}
      </section>

      <AppBottomNav />
    </main>
  );
}
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";

type CharacterDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

type ArtStylePresetRelation =
  | {
      name: string | null;
      description: string | null;
    }
  | {
      name: string | null;
      description: string | null;
    }[]
  | null;

type CharacterDetailRow = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;

  gender_feel: string | null;
  age_feel: string | null;
  hair_color: string | null;
  eye_color: string | null;
  hairstyle: string | null;
  outfit: string | null;
  appearance_detail: string | null;

  default_expression: string | null;
  expression_detail: string | null;

  personality: string | null;
  first_person: string | null;
  user_nickname: string | null;
  speech_style: string | null;
  forbidden_speech: string | null;
  absolute_settings: string | null;

  likes: string | null;
  dislikes: string | null;

  status: string | null;
  created_at: string;
  art_style_presets: ArtStylePresetRelation;
};

type CelebrationDayRow = {
  id: string;
  month: number;
  day: number;
  title: string;
  message_hint: string | null;
};

function getArtStyleName(artStylePresets: ArtStylePresetRelation) {
  if (Array.isArray(artStylePresets)) {
    return artStylePresets[0]?.name ?? "Art Style";
  }

  return artStylePresets?.name ?? "Art Style";
}

function getArtStyleDescription(artStylePresets: ArtStylePresetRelation) {
  if (Array.isArray(artStylePresets)) {
    return artStylePresets[0]?.description ?? null;
  }

  return artStylePresets?.description ?? null;
}

function DetailSection({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
      <p className={`text-sm font-semibold ${accent}`}>{title}</p>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs font-semibold text-[#A7B0C0]">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#F4F1EA]">
        {value || "未設定"}
      </p>
    </div>
  );
}

export default async function CharacterDetailPage({
  params,
}: CharacterDetailPageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: characterData, error: characterError } = await supabase
    .from("characters")
    .select(
      `
      id,
      temporary_name,
      final_name,
      gender_feel,
      age_feel,
      hair_color,
      eye_color,
      hairstyle,
      outfit,
      appearance_detail,
      default_expression,
      expression_detail,
      personality,
      first_person,
      user_nickname,
      speech_style,
      forbidden_speech,
      absolute_settings,
      likes,
      dislikes,
      status,
      created_at,
      art_style_presets (
        name,
        description
      )
    `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (characterError || !characterData) {
    notFound();
  }

  const character = characterData as CharacterDetailRow;

  const { data: celebrationDaysData } = await supabase
    .from("celebration_days")
    .select("id, month, day, title, message_hint")
    .eq("character_id", character.id)
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("month", { ascending: true })
    .order("day", { ascending: true });

  const celebrationDays = (celebrationDaysData ?? []) as CelebrationDayRow[];

  const characterName =
    character.final_name ||
    character.temporary_name ||
    "名前のないキャラクター";

  const artStyleName = getArtStyleName(character.art_style_presets);
  const artStyleDescription = getArtStyleDescription(
    character.art_style_presets,
  );

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

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-[#111827] to-[#0B1020] p-5 shadow-2xl shadow-black/30">
            <div className="flex items-start gap-4">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] border border-[#BEF264]/20 bg-gradient-to-br from-[#BEF264]/20 to-[#7DD3FC]/20 text-3xl">
                ◇
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold tracking-[0.24em] text-[#FACC15]">
                  CHARACTER DETAIL
                </p>
                <h1 className="mt-2 break-words text-3xl font-black">
                  {characterName}
                </h1>

                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-[#A7B0C0]">
                    {character.status || "draft"}
                  </span>
                  <span className="rounded-full border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 px-3 py-1 text-xs text-[#BAE6FD]">
                    {artStyleName}
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-[#A7B0C0]">
              このページでは、保存したキャラクター設定を確認できます。
              次はここから画像生成やチャットへ進める導線を作っていきます。
            </p>
          </div>
        </header>

        <div className="mt-6 grid gap-5">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              disabled
              className="rounded-2xl border border-[#BEF264]/20 bg-[#BEF264]/10 px-4 py-4 text-sm font-black text-[#D9F99D] opacity-70"
            >
              姿を生成する
              <span className="mt-1 block text-xs font-medium text-[#A7B0C0]">
                準備中
              </span>
            </button>

            <button
              type="button"
              disabled
              className="rounded-2xl border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 px-4 py-4 text-sm font-black text-[#BAE6FD] opacity-70"
            >
              話しかける
              <span className="mt-1 block text-xs font-medium text-[#A7B0C0]">
                準備中
              </span>
            </button>
          </div>

          <DetailSection title="基本プロフィール" accent="text-[#7DD3FC]">
            <DetailItem label="仮名" value={character.temporary_name} />
            <DetailItem label="正式名" value={character.final_name} />
            <DetailItem label="性別・雰囲気" value={character.gender_feel} />
            <DetailItem label="年齢感" value={character.age_feel} />
            <DetailItem label="髪色" value={character.hair_color} />
            <DetailItem label="目の色" value={character.eye_color} />
            <DetailItem label="髪型" value={character.hairstyle} />
            <DetailItem label="服装" value={character.outfit} />
        　</DetailSection>

          <DetailSection title="表情" accent="text-[#BEF264]">
            <DetailItem label="基本表情" value={character.default_expression} />
            <DetailItem label="表情のこだわり" value={character.expression_detail} />
          </DetailSection>

          <DetailSection title="性格・話し方" accent="text-[#FACC15]">
            <DetailItem label="性格" value={character.personality} />
            <DetailItem label="一人称" value={character.first_person} />
            <DetailItem label="あなたの呼び方" value={character.user_nickname} />
            <DetailItem label="口調・話し方" value={character.speech_style} />
            <DetailItem
              label="禁止したい話し方"
              value={character.forbidden_speech}
            />
            <DetailItem
              label="絶対に守ってほしい設定"
              value={character.absolute_settings}
            />
          </DetailSection>

          <DetailSection title="好きなもの・苦手なもの" accent="text-[#7DD3FC]">
            <DetailItem label="好きなもの" value={character.likes} />
            <DetailItem label="苦手なもの" value={character.dislikes} />
          </DetailSection>

          <DetailSection title="大切な日" accent="text-[#FACC15]">
            {celebrationDays.length > 0 ? (
              celebrationDays.map((day) => (
                <div
                  key={day.id}
                  className="rounded-3xl border border-[#FACC15]/20 bg-[#FACC15]/10 p-4"
                >
                  <p className="text-sm font-bold text-[#FDE68A]">
                    {day.month}月{day.day}日
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#F4F1EA]">
                    {day.title}
                  </p>
                  {day.message_hint ? (
                    <p className="mt-2 text-xs leading-5 text-[#A7B0C0]">
                      {day.message_hint}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <DetailItem label="登録された日" value="未設定" />
            )}
          </DetailSection>

          <DetailSection title="絵柄プリセット" accent="text-[#BEF264]">
            <DetailItem label="プリセット名" value={artStyleName} />
            <DetailItem label="説明" value={artStyleDescription} />
          </DetailSection>

          <DetailSection title="こだわり設定" accent="text-[#FACC15]">
            <DetailItem
              label="外見の詳細プロンプト"
              value={character.appearance_detail}
            />
          </DetailSection>
        </div>
      </section>

      <AppBottomNav />
    </main>
  );
}
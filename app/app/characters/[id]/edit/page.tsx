import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import { updateCharacter } from "./actions";

type EditCharacterPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

type CharacterRow = {
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

  role_name: string | null;
  expertise: string | null;
  consultation_style: string | null;
  thinking_style: string | null;
  team_position: string | null;

  likes: string | null;
  dislikes: string | null;

  art_style_preset_id: string | null;
};

type CelebrationDayRow = {
  month: number;
  day: number;
  title: string;
};

type CurrentArtStyleRow = {
  slug: string | null;
};

function valueOrEmpty(value: string | number | null | undefined) {
  return value === null || value === undefined ? "" : String(value);
}

function Field({
  label,
  name,
  defaultValue,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#D8DEE9]">{label}</span>
      <input
        name={name}
        type="text"
        required={required}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0B1020]/70 px-4 py-3 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
      />
    </label>
  );
}

function TextAreaField({
  label,
  name,
  defaultValue,
  placeholder,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-[#D8DEE9]">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        rows={rows}
        className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#0B1020]/70 px-4 py-3 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
      />
    </label>
  );
}

function EditSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/20">
      <h2 className="text-xl font-black">{title}</h2>
      {description ? (
        <p className="mt-2 text-xs leading-6 text-[#A7B0C0]">{description}</p>
      ) : null}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export default async function EditCharacterPage({
  params,
  searchParams,
}: EditCharacterPageProps) {
  const { id } = await params;
  const query = await searchParams;

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
      role_name,
      expertise,
      consultation_style,
      thinking_style,
      team_position,
      likes,
      dislikes,
      art_style_preset_id
    `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (characterError || !characterData) {
    redirect("/app/characters");
  }

  const character = characterData as CharacterRow;

  const { data: celebrationData } = await supabase
    .from("celebration_days")
    .select("month, day, title")
    .eq("user_id", user.id)
    .eq("character_id", character.id)
    .limit(1)
    .maybeSingle();

  const celebration = celebrationData as CelebrationDayRow | null;

  let selectedArtStyle = "midnight_anime";

  if (character.art_style_preset_id) {
    const { data: currentArtStyleData } = await supabase
      .from("art_style_presets")
      .select("slug")
      .eq("id", character.art_style_preset_id)
      .maybeSingle();

    const currentArtStyle = currentArtStyleData as CurrentArtStyleRow | null;

    selectedArtStyle = currentArtStyle?.slug || "midnight_anime";
  }

  return (
    <main className="min-h-screen bg-[#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <Link
            href={`/app/characters/${character.id}`}
            className="text-sm text-[#A7B0C0] hover:text-[#F4F1EA]"
          >
            ← キャラクター詳細へ戻る
          </Link>

          <p className="mt-8 text-sm font-semibold tracking-[0.24em] text-[#FACC15]">
            EDIT CHARACTER
          </p>
          <h1 className="mt-2 text-3xl font-black">キャラ設定を編集</h1>
          <p className="mt-3 text-sm leading-7 text-[#A7B0C0]">
            外見・口調・専門性・大切な日を修正できます。
            保存後のチャットでは、新しい設定がAI返信に反映されます。
          </p>
        </header>

        {query.error ? (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            {query.error}
          </div>
        ) : null}

        <form action={updateCharacter} className="mt-8 space-y-6">
          <input type="hidden" name="characterId" value={character.id} />
          <input type="hidden" name="artStyle" value={selectedArtStyle} />

          <EditSection
            title="基本プロフィール"
            description="名前や外見の中心になる情報です。"
          >
            <Field
              label="仮名"
              name="temporaryName"
              defaultValue={character.temporary_name}
              placeholder="例：千鶴"
              required
            />

            <Field
              label="正式名"
              name="finalName"
              defaultValue={character.final_name}
              placeholder="例：白栖 千鶴"
            />

            <Field
              label="性別・雰囲気"
              name="genderFeel"
              defaultValue={character.gender_feel}
              placeholder="例：女性的 / 中性的 / 少年っぽい"
            />

            <Field
              label="年齢感"
              name="ageFeel"
              defaultValue={character.age_feel}
              placeholder="例：20代前半くらい"
            />

            <Field
              label="髪色"
              name="hairColor"
              defaultValue={character.hair_color}
              placeholder="例：黒髪に少し青み"
            />

            <Field
              label="目の色"
              name="eyeColor"
              defaultValue={character.eye_color}
              placeholder="例：落ち着いた青"
            />

            <Field
              label="髪型"
              name="hairstyle"
              defaultValue={character.hairstyle}
              placeholder="例：肩下のストレート"
            />

            <Field
              label="服装"
              name="outfit"
              defaultValue={character.outfit}
              placeholder="例：白シャツにロングコート"
            />

            <TextAreaField
              label="外見詳細"
              name="appearanceDetail"
              defaultValue={character.appearance_detail}
              placeholder="細かな装飾、雰囲気、体型、色味など"
              rows={4}
            />
          </EditSection>

          <EditSection
            title="表情"
            description="チャットや画像生成でキャラの印象に関わる部分です。"
          >
            <Field
              label="基本表情"
              name="defaultExpression"
              defaultValue={character.default_expression}
              placeholder="例：穏やかな微笑み"
            />

            <TextAreaField
              label="表情のこだわり"
              name="expressionDetail"
              defaultValue={character.expression_detail}
              placeholder="例：感情が高ぶると少し目元が鋭くなる"
            />
          </EditSection>

          <EditSection
            title="性格・話し方"
            description="AI返信のキャラクター性に強く影響します。"
          >
            <TextAreaField
              label="性格"
              name="personality"
              defaultValue={character.personality}
              placeholder="例：冷静で面倒見がよく、相手の考えを整理するのが得意"
              rows={4}
            />

            <Field
              label="一人称"
              name="firstPerson"
              defaultValue={character.first_person}
              placeholder="例：私 / ぼく / あたし"
            />

            <Field
              label="ユーザーの呼び方"
              name="userNickname"
              defaultValue={character.user_nickname}
              placeholder="例：あなた / マスター / 〇〇くん"
            />

            <TextAreaField
              label="口調・話し方"
              name="speechStyle"
              defaultValue={character.speech_style}
              placeholder="例：落ち着いたお姉さん口調。優しいが、必要なことははっきり言う。"
              rows={4}
            />

            <TextAreaField
              label="禁止したい話し方"
              name="forbiddenSpeech"
              defaultValue={character.forbidden_speech}
              placeholder="例：冷たすぎる言い方、過剰な敬語、語尾の乱用はしない"
              rows={3}
            />

            <TextAreaField
              label="絶対に守ってほしい設定"
              name="absoluteSettings"
              defaultValue={character.absolute_settings}
              placeholder="例：ユーザーを見下さない。キャラ崩壊する冗談を言わない。"
              rows={4}
            />
          </EditSection>

          <EditSection
            title="役割・専門性"
            description="FevCaraのAIチーム化に向けて重要な設定です。"
          >
            <Field
              label="役割名"
              name="roleName"
              defaultValue={character.role_name}
              placeholder="例：戦略担当 / アイデア担当 / メンタル担当"
            />

            <TextAreaField
              label="専門分野"
              name="expertise"
              defaultValue={character.expertise}
              placeholder="例：SaaS設計、マーケティング、事業戦略、文章整理"
              rows={3}
            />

            <TextAreaField
              label="得意な相談"
              name="consultationStyle"
              defaultValue={character.consultation_style}
              placeholder="例：曖昧な相談を整理し、次にやることへ落とし込む"
              rows={3}
            />

            <TextAreaField
              label="思考スタイル"
              name="thinkingStyle"
              defaultValue={character.thinking_style}
              placeholder="例：論理的、慎重、リスクを先に洗い出す"
              rows={3}
            />

            <TextAreaField
              label="チーム内での立ち位置"
              name="teamPosition"
              defaultValue={character.team_position}
              placeholder="例：チーム全体の方針をまとめる進行役"
              rows={3}
            />
          </EditSection>

          <EditSection title="好きなもの・苦手なもの">
            <TextAreaField
              label="好きなもの"
              name="likes"
              defaultValue={character.likes}
              placeholder="例：静かな夜、整理された計画、甘い紅茶"
              rows={3}
            />

            <TextAreaField
              label="苦手なもの"
              name="dislikes"
              defaultValue={character.dislikes}
              placeholder="例：無計画な突進、雑な言葉、急かされること"
              rows={3}
            />
          </EditSection>

          <EditSection
            title="大切な日"
            description="キャラクターに祝ってほしい記念日です。空欄で保存すると削除されます。"
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-[#D8DEE9]">
                  月
                </span>
                <input
                  name="celebrationMonth"
                  type="number"
                  min={1}
                  max={12}
                  defaultValue={valueOrEmpty(celebration?.month)}
                  placeholder="例：6"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0B1020]/70 px-4 py-3 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold text-[#D8DEE9]">
                  日
                </span>
                <input
                  name="celebrationDay"
                  type="number"
                  min={1}
                  max={31}
                  defaultValue={valueOrEmpty(celebration?.day)}
                  placeholder="例：19"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#0B1020]/70 px-4 py-3 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
              </label>
            </div>

            <Field
              label="何の日か"
              name="celebrationTitle"
              defaultValue={celebration?.title}
              placeholder="例：出会った日 / 誕生日 / デビュー記念日"
            />
          </EditSection>

          <div className="sticky bottom-24 z-10 rounded-[2rem] border border-white/10 bg-[#111827]/95 p-4 shadow-2xl shadow-black/40 backdrop-blur">
            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
            >
              変更を保存する
            </button>

            <Link
              href={`/app/characters/${character.id}`}
              className="mt-3 block rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black text-[#D8DEE9] transition hover:bg-white/[0.08]"
            >
              キャンセル
            </Link>
          </div>
        </form>
      </section>

      <AppBottomNav />
    </main>
  );
}
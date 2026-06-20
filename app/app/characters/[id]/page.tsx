import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import { deleteCharacter, startSingleChat } from "./actions";

type CharacterDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

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

  role_name: string | null;
  expertise: string | null;
  consultation_style: string | null;
  thinking_style: string | null;
  team_position: string | null;

  likes: string | null;
  dislikes: string | null;

  status: string | null;
  image_url: string | null;
  icon_image_url: string | null;
  created_at: string;
};

type CelebrationDayRow = {
  id: string;
  month: number;
  day: number;
  title: string;
  message_hint: string | null;
};

type ProfileForCharacterAccess = {
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

function getAvatarText(name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return "◇";
  }

  return trimmedName.slice(0, 1);
}

function DetailSection({
  title,
  accent,
  children,
}: {
  title: string;
  accent: string;
  children: ReactNode;
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

function CharacterAvatar({
  name,
  imageUrl,
  sizeClass,
  roundedClass,
  textClass,
  muted = false,
}: {
  name: string;
  imageUrl: string | null;
  sizeClass: string;
  roundedClass: string;
  textClass: string;
  muted?: boolean;
}) {
  const baseClass = [
    "relative shrink-0 overflow-hidden border bg-gradient-to-br from-[#BEF264]/20 via-white/[0.06] to-[#7DD3FC]/20 shadow-lg shadow-[#7DD3FC]/10",
    sizeClass,
    roundedClass,
    textClass,
    muted
      ? "border-white/10 opacity-75"
      : "border-[#BEF264]/25",
  ].join(" ");

  if (imageUrl) {
    return (
      <div className={baseClass}>
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={[
        baseClass,
        "flex items-center justify-center font-black text-[#F4F1EA]",
      ].join(" ")}
    >
      {getAvatarText(name)}
    </div>
  );
}

export default async function CharacterDetailPage({
  params,
  searchParams,
}: CharacterDetailPageProps) {
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
      status,
      image_url,
      icon_image_url,
      created_at
    `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (characterError || !characterData) {
    notFound();
  }

  const character = characterData as CharacterDetailRow;

  const { data: profileData } = await supabase
    .from("profiles")
    .select("plan, active_character_id, character_limit_choice_locked")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileData ?? {
    plan: "free",
    active_character_id: null,
    character_limit_choice_locked: false,
  }) as ProfileForCharacterAccess;

  const { count: characterCount } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const totalCharacters = characterCount ?? 0;

  const needsActiveCharacterSelection =
    isFreePlan(profile.plan) &&
    totalCharacters > 1 &&
    !profile.character_limit_choice_locked;

  const isWaitingCharacter =
    isFreePlan(profile.plan) &&
    Boolean(profile.character_limit_choice_locked) &&
    Boolean(profile.active_character_id) &&
    profile.active_character_id !== character.id;

  const isActiveFreeCharacter =
    isFreePlan(profile.plan) &&
    Boolean(profile.character_limit_choice_locked) &&
    profile.active_character_id === character.id;

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

          <section
            className={[
              "mt-8 overflow-hidden rounded-[2rem] border shadow-2xl shadow-black/30",
              needsActiveCharacterSelection
                ? "border-[#F9A8D4]/25 bg-[#111827]/80 shadow-[#F9A8D4]/10"
                : isWaitingCharacter
                  ? "border-white/10 bg-[#111827]/60 opacity-85"
                  : "border-white/10 bg-[#111827]/80",
            ].join(" ")}
          >
            <div className="relative aspect-square w-full bg-[#EEF1F4]">
              {character.image_url ? (
                <img
                  src={character.image_url}
                  alt=""
                  className="absolute inset-0 h-full w-full object-contain object-center"
                />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(190,242,100,0.22),transparent_32%),radial-gradient(circle_at_50%_60%,rgba(125,211,252,0.18),transparent_38%),#111827]" />
              )}

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08),rgba(15,23,42,0.12)_28%,rgba(15,23,42,0.62)_66%,rgba(15,23,42,0.94))]" />

              <div className="relative z-10 flex h-full flex-col justify-end p-5">
                <div className="mb-4 flex items-center gap-3">
                  <CharacterAvatar
                    name={characterName}
                    imageUrl={character.icon_image_url}
                    sizeClass="h-16 w-16"
                    roundedClass="rounded-3xl"
                    textClass="text-2xl"
                    muted={isWaitingCharacter}
                  />

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-black tracking-[0.2em] text-[#BEF264]">
                      CHARACTER PROFILE
                    </p>
                    <h1 className="mt-1 break-words text-3xl font-black text-white">
                      {characterName}
                    </h1>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {character.role_name ? (
                        <span className="rounded-full border border-[#7DD3FC]/25 bg-[#7DD3FC]/15 px-3 py-1 text-xs font-bold text-[#BAE6FD] backdrop-blur">
                          {character.role_name}
                        </span>
                      ) : null}

                      {needsActiveCharacterSelection ? (
                        <span className="rounded-full border border-[#F9A8D4]/30 bg-[#F9A8D4]/15 px-3 py-1 text-xs font-black text-[#FCE7F3] backdrop-blur">
                          選択が必要
                        </span>
                      ) : null}

                      {isActiveFreeCharacter ? (
                        <span className="rounded-full border border-[#BEF264]/25 bg-[#BEF264]/10 px-3 py-1 text-xs font-black text-[#D9F99D] backdrop-blur">
                          Freeで利用中
                        </span>
                      ) : null}

                      {!needsActiveCharacterSelection && isWaitingCharacter ? (
                        <span className="rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-3 py-1 text-xs font-black text-[#FDE68A] backdrop-blur">
                          待機中
                        </span>
                      ) : null}

                      <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-bold text-[#F4F1EA] backdrop-blur">
                        {character.status || "draft"}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="rounded-3xl border border-white/10 bg-[#0F172A]/52 p-4 text-sm leading-7 text-[#E2E8F0] shadow-xl shadow-black/20 backdrop-blur-md">
                  {character.status === "active"
                    ? "このキャラクターのプロフィールです。話し方、役割、好きなもの、こだわり設定をここから確認できます。"
                    : "このキャラクターはまだ出会いの途中です。ビジュアルを整えて、最初の出会いイベントへ進みましょう。"}
                </p>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Link
                    href={`/app/characters/${character.id}/visual`}
                    className="block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-4 py-4 text-center text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
                  >
                    ビジュアル変更
                    <span className="mt-1 block text-xs font-bold text-[#17212F]/75">
                      姿・アイコン
                    </span>
                  </Link>

                  {needsActiveCharacterSelection ? (
                    <Link
                      href="/app/characters/select-active"
                      className="block rounded-2xl border border-[#F9A8D4]/30 bg-[#F9A8D4]/15 px-4 py-4 text-center text-sm font-black text-[#FCE7F3] shadow-lg shadow-[#F9A8D4]/15 backdrop-blur transition hover:bg-[#F9A8D4]/20"
                    >
                      使うキャラを選ぶ
                      <span className="mt-1 block text-xs font-medium text-[#F9A8D4]">
                        選択が必要
                      </span>
                    </Link>
                  ) : isWaitingCharacter ? (
                    <button
                      type="button"
                      disabled
                      className="rounded-2xl border border-white/10 bg-white/[0.08] px-4 py-4 text-sm font-black text-[#A7B0C0] opacity-75 backdrop-blur"
                    >
                      話しかける
                      <span className="mt-1 block text-xs font-medium text-[#7D8AA3]">
                        待機中
                      </span>
                    </button>
                  ) : (
                    <form action={startSingleChat}>
                      <input
                        type="hidden"
                        name="characterId"
                        value={character.id}
                      />
                      <button
                        type="submit"
                        className="h-full w-full rounded-2xl border border-white/12 bg-white/[0.10] px-4 py-4 text-center text-sm font-black text-[#F8FAFC] shadow-lg shadow-black/10 backdrop-blur transition hover:bg-white/[0.16]"
                      >
                        話しかける
                        <span className="mt-1 block text-xs font-medium text-[#D8DEE9]">
                          チャットへ
                        </span>
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          </section>
        </header>

        {query.error ? (
          <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            {query.error}
          </div>
        ) : null}

        {needsActiveCharacterSelection ? (
          <div className="mt-6 rounded-[2rem] border border-[#F9A8D4]/30 bg-[#F9A8D4]/10 p-5 shadow-xl shadow-[#F9A8D4]/10">
            <p className="text-sm font-black text-[#FCE7F3]">
              先に使うキャラクターを選んでください
            </p>
            <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
              現在キャラクターが{totalCharacters}
              人います。Freeプランでは、チャットできるキャラクターを1人だけ選ぶ必要があります。
              選ばなかったキャラクターは削除されず、待機中になります。
            </p>

            <Link
              href="/app/characters/select-active"
              className="mt-5 block rounded-2xl bg-gradient-to-r from-[#F9A8D4] via-[#FACC15] to-[#BEF264] px-5 py-4 text-center text-sm font-black text-[#07111F] shadow-lg shadow-[#F9A8D4]/20 transition hover:scale-[1.01] hover:opacity-95"
            >
              使うキャラを選ぶ
            </Link>
          </div>
        ) : null}

        {!needsActiveCharacterSelection && isWaitingCharacter ? (
          <div className="mt-6 rounded-[2rem] border border-[#FACC15]/25 bg-[#FACC15]/10 p-5 shadow-xl shadow-[#FACC15]/5">
            <p className="text-sm font-black text-[#FDE68A]">
              このキャラクターは待機中です
            </p>
            <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
              現在のFreeプランでは、選択した1人のキャラクターだけに話しかけられます。
              このキャラクターの設定は残っていますが、チャットはLite以上で再開できる設計にします。
            </p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-5">
          <Link
            href={`/app/characters/${character.id}/edit`}
            className="block rounded-2xl border border-[#FACC15]/20 bg-[#FACC15]/10 px-5 py-4 text-center text-sm font-black text-[#FDE68A] transition hover:bg-[#FACC15]/15"
          >
            設定を編集する
          </Link>

          <Link
            href="/app/chats"
            className="block rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-black text-[#D8DEE9] transition hover:bg-white/[0.08]"
          >
            チャット一覧を見る
          </Link>

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
            <DetailItem
              label="表情のこだわり"
              value={character.expression_detail}
            />
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

          <DetailSection title="役割・専門性" accent="text-[#7DD3FC]">
            <DetailItem label="役割名" value={character.role_name} />
            <DetailItem label="専門分野" value={character.expertise} />
            <DetailItem label="得意な相談" value={character.consultation_style} />
            <DetailItem label="思考スタイル" value={character.thinking_style} />
            <DetailItem
              label="チーム内での立ち位置"
              value={character.team_position}
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

          <DetailSection title="こだわり設定" accent="text-[#FACC15]">
            <DetailItem
              label="外見の詳細プロンプト"
              value={character.appearance_detail}
            />
          </DetailSection>

          <section className="rounded-[2rem] border border-red-400/25 bg-red-400/10 p-5 shadow-2xl shadow-black/30">
            <p className="text-sm font-black text-red-100">Danger Zone</p>
            <h2 className="mt-2 text-xl font-black text-[#F4F1EA]">
              このキャラクターを削除する
            </h2>

            <p className="mt-3 text-sm leading-7 text-red-100/90">
              この操作は取り消せません。キャラクター設定、大切な日、
              このキャラクターとの1対1チャット履歴、長期メモが削除されます。
            </p>

            {isActiveFreeCharacter ? (
              <div className="mt-4 rounded-2xl border border-[#FACC15]/25 bg-[#FACC15]/10 p-4">
                <p className="text-xs font-bold leading-6 text-[#FDE68A]">
                  Freeで利用中のキャラクターを削除すると、
                  Free中に使うキャラクターの選択状態も解除されます。
                </p>
              </div>
            ) : null}

            <form action={deleteCharacter} className="mt-5 space-y-4">
              <input type="hidden" name="characterId" value={character.id} />

              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#0B1020]/45 p-4">
                <input
                  type="checkbox"
                  name="confirmDelete"
                  value="yes"
                  required
                  className="mt-1 h-4 w-4 shrink-0 accent-red-400"
                />
                <span className="text-xs leading-6 text-[#D8DEE9]">
                  削除すると、このキャラクターと関連するチャット履歴が消えることを理解しました。
                </span>
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl border border-red-300/30 bg-red-400/15 px-5 py-4 text-sm font-black text-red-100 transition hover:bg-red-400/25"
              >
                このキャラクターを削除する
              </button>
            </form>
          </section>
        </div>
      </section>

      <AppBottomNav />
    </main>
  );
}
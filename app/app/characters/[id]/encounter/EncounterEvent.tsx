"use client";

import { useMemo, useState } from "react";
import { completeEncounter } from "./actions";

type EncounterTone =
  | "cheerful"
  | "polite"
  | "cool"
  | "rough"
  | "shy"
  | "mysterious"
  | "gentle"
  | "default";

type EncounterEventProps = {
  characterId: string;
  initialCharacterName: string;
  avatarText: string;
  firstPerson: string | null;
  characterImageUrl: string | null;
  genderFeel?: string | null;
  ageFeel?: string | null;
  personality?: string | null;
  speechStyle?: string | null;
  forbiddenSpeech?: string | null;
  absoluteSettings?: string | null;
  roleName?: string | null;
  expertise?: string | null;
  consultationStyle?: string | null;
  thinkingStyle?: string | null;
  teamPosition?: string | null;
  likes?: string | null;
  dislikes?: string | null;
  defaultExpression?: string | null;
  error?: string;
};

function getFirstPerson(firstPerson: string | null) {
  const trimmed = firstPerson?.trim();

  if (trimmed) {
    return trimmed;
  }

  return "私";
}

function normalizeText(...values: (string | null | undefined)[]) {
  return values
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length > 0)
    .join(" ")
    .toLowerCase();
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function getEncounterTone({
  personality,
  speechStyle,
  forbiddenSpeech,
  absoluteSettings,
  roleName,
  expertise,
  consultationStyle,
  thinkingStyle,
  teamPosition,
  likes,
  dislikes,
  defaultExpression,
  genderFeel,
  ageFeel,
}: Pick<
  EncounterEventProps,
  | "personality"
  | "speechStyle"
  | "forbiddenSpeech"
  | "absoluteSettings"
  | "roleName"
  | "expertise"
  | "consultationStyle"
  | "thinkingStyle"
  | "teamPosition"
  | "likes"
  | "dislikes"
  | "defaultExpression"
  | "genderFeel"
  | "ageFeel"
>): EncounterTone {
  const settingsText = normalizeText(
    personality,
    speechStyle,
    forbiddenSpeech,
    absoluteSettings,
    roleName,
    expertise,
    consultationStyle,
    thinkingStyle,
    teamPosition,
    likes,
    dislikes,
    defaultExpression,
    genderFeel,
    ageFeel,
  );

  if (
    includesAny(settingsText, [
      "元気",
      "明る",
      "陽気",
      "活発",
      "人懐っこ",
      "ムードメーカー",
      "テンション",
      "にぎやか",
      "楽しい",
      "かわいい",
      "キラキラ",
    ])
  ) {
    return "cheerful";
  }

  if (
    includesAny(settingsText, [
      "敬語",
      "丁寧",
      "上品",
      "礼儀",
      "淑やか",
      "お嬢",
      "執事",
      "紳士",
      "優雅",
      "ですます",
      "ございます",
    ])
  ) {
    return "polite";
  }

  if (
    includesAny(settingsText, [
      "クール",
      "冷静",
      "無表情",
      "淡々",
      "無口",
      "寡黙",
      "ドライ",
      "知的",
      "論理",
      "鋭い",
    ])
  ) {
    return "cool";
  }

  if (
    includesAny(settingsText, [
      "俺",
      "オレ",
      "あんた",
      "乱暴",
      "ぶっきらぼう",
      "やんちゃ",
      "兄貴",
      "姉御",
      "男勝り",
      "荒い",
      "熱い",
    ])
  ) {
    return "rough";
  }

  if (
    includesAny(settingsText, [
      "恥ずか",
      "内気",
      "控えめ",
      "臆病",
      "人見知り",
      "おどおど",
      "照れ",
      "小声",
      "不安げ",
    ])
  ) {
    return "shy";
  }

  if (
    includesAny(settingsText, [
      "神秘",
      "不思議",
      "幻想",
      "夢",
      "夜",
      "星",
      "海",
      "魔法",
      "儚",
      "ミステリアス",
      "詩的",
    ])
  ) {
    return "mysterious";
  }

  if (
    includesAny(settingsText, [
      "優しい",
      "穏やか",
      "包容",
      "癒",
      "寄り添",
      "温厚",
      "柔らか",
      "安心",
      "共感",
    ])
  ) {
    return "gentle";
  }

  return "default";
}

function getNameStepLine({
  selfName,
  tone,
}: {
  selfName: string;
  tone: EncounterTone;
}) {
  switch (tone) {
    case "cheerful":
      return `わ……ほんとに会えた！\n${selfName}の名前、あなたがくれるの？`;
    case "polite":
      return `……はじめまして。\n${selfName}に、名前を授けてくださるのですか？`;
    case "cool":
      return `……来たんだ。\n${selfName}の名前、決めてくれる？`;
    case "rough":
      return `お、来たな。\n${selfName}の名前、あんたが決めてくれるのか？`;
    case "shy":
      return `……あの。\n${selfName}の名前、あなたが……くれるの？`;
    case "mysterious":
      return `……やっと声が届いた。\n${selfName}に名前をくれるのは、あなた？`;
    case "gentle":
      return `……来てくれたんだね。\n${selfName}に、名前をくれるの？`;
    case "default":
    default:
      return `……${selfName}を作ってくれたのは、あなた？\n名前を、くれるの？`;
  }
}

function getNicknameStepLine({
  finalName,
  selfName,
  tone,
}: {
  finalName: string;
  selfName: string;
  tone: EncounterTone;
}) {
  switch (tone) {
    case "cheerful":
      return `${finalName}！ うん、すごくいい！\nじゃあ次は、あなたの呼び方を教えて？`;
    case "polite":
      return `${finalName}……素敵な名前です。\nあなたのことは、どのようにお呼びすればよいでしょうか？`;
    case "cool":
      return `${finalName}……悪くない。\nで、あなたのことは何て呼べばいい？`;
    case "rough":
      return `${finalName}、いい名前じゃん。\nで、あんたのことは何て呼べばいい？`;
    case "shy":
      return `${finalName}……。\nうれしい。あなたのこと、なんて呼んだらいいかな。`;
    case "mysterious":
      return `${finalName}……名前が、灯った。\nあなたの名も、${selfName}に教えて。`;
    case "gentle":
      return `${finalName}……うん、あたたかい名前だね。\nあなたのことは、なんて呼べばいい？`;
    case "default":
    default:
      return `${finalName}……。\nそれが、${selfName}の名前……。\nあなたのことは、なんて呼べばいい？`;
  }
}

export function EncounterEvent({
  characterId,
  initialCharacterName,
  avatarText,
  firstPerson,
  characterImageUrl,
  genderFeel,
  ageFeel,
  personality,
  speechStyle,
  forbiddenSpeech,
  absoluteSettings,
  roleName,
  expertise,
  consultationStyle,
  thinkingStyle,
  teamPosition,
  likes,
  dislikes,
  defaultExpression,
  error,
}: EncounterEventProps) {
  const [step, setStep] = useState<"name" | "nickname">("name");
  const [finalName, setFinalName] = useState(initialCharacterName);
  const [userNickname, setUserNickname] = useState("");

  const selfName = useMemo(() => getFirstPerson(firstPerson), [firstPerson]);
  const encounterTone = useMemo(
    () =>
      getEncounterTone({
        personality,
        speechStyle,
        forbiddenSpeech,
        absoluteSettings,
        roleName,
        expertise,
        consultationStyle,
        thinkingStyle,
        teamPosition,
        likes,
        dislikes,
        defaultExpression,
        genderFeel,
        ageFeel,
      }),
    [
      personality,
      speechStyle,
      forbiddenSpeech,
      absoluteSettings,
      roleName,
      expertise,
      consultationStyle,
      thinkingStyle,
      teamPosition,
      likes,
      dislikes,
      defaultExpression,
      genderFeel,
      ageFeel,
    ],
  );

  const nameStepLine = useMemo(
    () =>
      getNameStepLine({
        selfName,
        tone: encounterTone,
      }),
    [selfName, encounterTone],
  );

  const nicknameStepLine = useMemo(
    () =>
      getNicknameStepLine({
        finalName: finalName.trim() || initialCharacterName,
        selfName,
        tone: encounterTone,
      }),
    [finalName, initialCharacterName, selfName, encounterTone],
  );

  const canGiveName = finalName.trim().length > 0;
  const canComplete =
    finalName.trim().length > 0 && userNickname.trim().length > 0;

  return (
    <main className="min-h-screen overflow-hidden bg-[#F7F3E8] px-5 py-8 text-[#111827]">
      <style jsx global>{`
        @keyframes encounterFadeIn {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.94);
            filter: blur(16px);
          }
          55% {
            opacity: 0.65;
            filter: blur(5px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes encounterGlow {
          0%,
          100% {
            box-shadow:
              0 0 50px rgba(250, 204, 21, 0.28),
              0 0 120px rgba(125, 211, 252, 0.22);
          }
          50% {
            box-shadow:
              0 0 80px rgba(250, 204, 21, 0.44),
              0 0 160px rgba(125, 211, 252, 0.34);
          }
        }

        @keyframes encounterImageFloat {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>

      <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md flex-col justify-center">
        <div className="relative rounded-[2.5rem] border border-white/70 bg-white/70 p-6 shadow-2xl shadow-[#CBD5E1]/70 backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 rounded-[2.5rem] bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.95),transparent_35%),radial-gradient(circle_at_50%_55%,rgba(125,211,252,0.22),transparent_46%),radial-gradient(circle_at_50%_80%,rgba(250,204,21,0.18),transparent_45%)]" />

          <div className="relative">
            <div
              className={[
                "mx-auto flex items-center justify-center overflow-hidden border border-white/80 bg-gradient-to-br from-white via-[#EFF6FF] to-[#FEF3C7] text-6xl font-black text-[#0B1020]",
                characterImageUrl
                  ? "h-72 w-72 rounded-[3rem]"
                  : "h-40 w-40 rounded-[3rem]",
              ].join(" ")}
              style={{
                animation:
                  "encounterFadeIn 2200ms ease-out both, encounterGlow 4200ms ease-in-out infinite",
              }}
            >
              {characterImageUrl ? (
                <img
                  src={characterImageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{
                    animation: "encounterImageFloat 5200ms ease-in-out infinite",
                  }}
                />
              ) : (
                avatarText
              )}
            </div>

            <div className="mt-8 rounded-[2rem] border border-[#0B1020]/10 bg-white/80 p-5 shadow-xl shadow-[#CBD5E1]/50">
              {error ? (
                <div className="mb-5 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm font-bold leading-6 text-red-700">
                  {error}
                </div>
              ) : null}

              {step === "name" ? (
                <>
                  <p className="whitespace-pre-wrap text-lg font-black leading-9 text-[#111827]">
                    {nameStepLine}
                  </p>

                  <label className="mt-6 block">
                    <span className="sr-only">名前</span>
                    <input
                      type="text"
                      value={finalName}
                      onChange={(event) => setFinalName(event.target.value)}
                      placeholder="名前を入力"
                      maxLength={50}
                      className="w-full rounded-2xl border border-[#CBD5E1] bg-white px-4 py-4 text-base font-bold text-[#111827] outline-none placeholder:text-[#94A3B8] focus:border-[#FACC15] focus:ring-4 focus:ring-[#FACC15]/20"
                    />
                  </label>

                  <button
                    type="button"
                    disabled={!canGiveName}
                    onClick={() => setStep("nickname")}
                    className="mt-4 w-full rounded-2xl bg-[#111827] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#111827]/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                  >
                    名前をあげる
                  </button>
                </>
              ) : (
                <>
                  <p className="whitespace-pre-wrap text-lg font-black leading-9 text-[#111827]">
                    {nicknameStepLine}
                  </p>

                  <form action={completeEncounter} className="mt-6">
                    <input type="hidden" name="characterId" value={characterId} />
                    <input
                      type="hidden"
                      name="finalName"
                      value={finalName.trim()}
                    />

                    <label className="block">
                      <span className="sr-only">呼び名</span>
                      <input
                        name="userNickname"
                        type="text"
                        value={userNickname}
                        onChange={(event) =>
                          setUserNickname(event.target.value)
                        }
                        placeholder="呼ばれたい名前"
                        maxLength={50}
                        className="w-full rounded-2xl border border-[#CBD5E1] bg-white px-4 py-4 text-base font-bold text-[#111827] outline-none placeholder:text-[#94A3B8] focus:border-[#7DD3FC] focus:ring-4 focus:ring-[#7DD3FC]/20"
                      />
                    </label>

                    <button
                      type="submit"
                      disabled={!canComplete}
                      className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#111827] to-[#334155] px-5 py-4 text-sm font-black text-white shadow-lg shadow-[#111827]/20 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                    >
                      教える
                    </button>

                    <button
                      type="button"
                      onClick={() => setStep("name")}
                      className="mt-3 w-full rounded-2xl border border-[#CBD5E1] bg-white/70 px-5 py-4 text-sm font-black text-[#475569] transition hover:bg-white"
                    >
                      名前をもう一度考える
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

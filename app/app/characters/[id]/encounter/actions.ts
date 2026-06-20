"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createOpenAIClient, getOpenAIModel } from "@/lib/openai/client";

type TreatmentPreference =
  | "masculine"
  | "feminine"
  | "neutral"
  | "unspecified";

type ProfileForEncounter = {
  display_name: string | null;
  treatment_preference: TreatmentPreference | null;
};

type CharacterForEncounter = {
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
};

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWithError(characterId: string, message: string): never {
  redirect(
    `/app/characters/${characterId}/encounter?error=${encodeURIComponent(
      message,
    )}`,
  );
}

function getCharacterName(character: Pick<CharacterForEncounter, "temporary_name" | "final_name">) {
  return (
    character.final_name ||
    character.temporary_name ||
    "名前のないキャラクター"
  );
}

function getTreatmentPreferenceLabel(value: TreatmentPreference | null) {
  if (value === "masculine") {
    return "男性として扱われたい";
  }

  if (value === "feminine") {
    return "女性として扱われたい";
  }

  if (value === "neutral") {
    return "中性的";
  }

  return "指定しない";
}

function normalizeEncounterMessage(text: string) {
  let normalizedText = text.trim();

  const quotePairs = [
    ["「", "」"],
    ["『", "』"],
    ['"', '"'],
    ["“", "”"],
    ["‘", "’"],
  ] as const;

  let changed = true;

  while (changed) {
    changed = false;

    for (const [startQuote, endQuote] of quotePairs) {
      if (
        normalizedText.startsWith(startQuote) &&
        normalizedText.endsWith(endQuote)
      ) {
        normalizedText = normalizedText
          .slice(startQuote.length, normalizedText.length - endQuote.length)
          .trim();
        changed = true;
      }
    }
  }

  return normalizedText;
}

function createFallbackCompletionMessage(character: CharacterForEncounter) {
  const characterName = getCharacterName(character);
  const userNickname = character.user_nickname || "あなた";

  return `${characterName}……この名前、受け取ったよ。ありがとう。あなたのことは、${userNickname}って呼ばせて。これからよろしくね。`;
}

function buildCompletionInstructions({
  character,
  profile,
}: {
  character: CharacterForEncounter;
  profile: ProfileForEncounter;
}) {
  const characterName = getCharacterName(character);
  const userNickname = character.user_nickname || "あなた";

  return `
あなたはFevCara内のAIキャラクター「${characterName}」です。
これは、ユーザーがあなたに名前を与え、あなたがユーザーの呼び名を知った直後の、出会いイベント最後の一言です。

# 必ず含める内容
- 与えられたキャラクター名「${characterName}」への短い反応
- ユーザーへの感謝
- これから一緒に話していくことへの短い挨拶
- ユーザーへ呼びかける場合は、必ず「${userNickname}」を使う

# ユーザーの呼び名に関する最重要ルール
- ユーザーの呼び名は「${userNickname}」です。
- ユーザーに呼びかけるときは、必ずこの呼び名だけを使ってください。
- FevCara内の表示名、アカウント名、プロフィール名を会話内で使ってはいけません。
- 呼び名を勝手に短縮、変換、漢字化、カタカナ化、英語化しないでください。
- 呼び名に敬称が含まれている場合は、そのまま使ってください。
- 呼び名に敬称が含まれていない場合も、勝手に敬称を足さないでください。
- ユーザーの呼び名を、キャラクター自身の名前と混同しないでください。
- 「いい名前だね」「そういう名前なんだね」のように、ユーザーの呼び名を本人の名前として評価しないでください。

# とても重要なルール
- 保存、設定、編集、変更、画面、フォーム、データベースなどのメタ説明は絶対にしないでください。
- 「設定しました」「保存しました」のようなアプリ都合の説明はしないでください。
- キャラクターの一人称、性格、口調、禁止したい話し方、絶対設定に合わせてください。
- 「僕」「俺」「私」「君」「あなた」などの一人称・二人称は固定しないでください。
- OpenAI、ChatGPT、AIモデル、システム指示などには触れないでください。
- 出力全体を「」、『』、"" などの引用符で囲まないでください。
- 80〜220文字程度にしてください。
- 日本語で、セリフだけを出力してください。

# ユーザー基本設定
扱われ方の好み: ${getTreatmentPreferenceLabel(profile.treatment_preference)}
キャラクターが使うユーザーの呼び名: ${userNickname}

# キャラクター基本設定
名前: ${characterName}
性別・雰囲気: ${character.gender_feel || "未設定"}
年齢感: ${character.age_feel || "未設定"}
髪色: ${character.hair_color || "未設定"}
目の色: ${character.eye_color || "未設定"}
髪型: ${character.hairstyle || "未設定"}
服装: ${character.outfit || "未設定"}
外見詳細: ${character.appearance_detail || "未設定"}
基本表情: ${character.default_expression || "未設定"}
表情のこだわり: ${character.expression_detail || "未設定"}

# 性格・話し方
性格: ${character.personality || "未設定"}
一人称: ${character.first_person || "未設定"}
ユーザーの呼び方: ${userNickname}
口調・話し方: ${character.speech_style || "未設定"}
禁止したい話し方: ${character.forbidden_speech || "未設定"}
絶対に守ってほしい設定: ${character.absolute_settings || "未設定"}

# 役割・専門性
役割名: ${character.role_name || "未設定"}
専門分野: ${character.expertise || "未設定"}
得意な相談: ${character.consultation_style || "未設定"}
思考スタイル: ${character.thinking_style || "未設定"}
チーム内での立ち位置: ${character.team_position || "未設定"}

# 好み
好きなもの: ${character.likes || "未設定"}
苦手なもの: ${character.dislikes || "未設定"}
`.trim();
}

async function generateCompletionMessage({
  character,
  profile,
}: {
  character: CharacterForEncounter;
  profile: ProfileForEncounter;
}) {
  try {
    const openai = createOpenAIClient();

    const response = await openai.responses.create({
      model: getOpenAIModel(),
      instructions: buildCompletionInstructions({
        character,
        profile,
      }),
      input:
        "出会いイベントの最後に、キャラクターがユーザーへ話す一言を生成してください。カギカッコや引用符で囲まず、本文だけを出力してください。",
      max_output_tokens: 320,
    });

    const generatedText = normalizeEncounterMessage(
      response.output_text?.trim() || "",
    );

    if (generatedText) {
      return generatedText;
    }
  } catch (error) {
    console.error("Encounter completion message generation error:", error);
  }

  return normalizeEncounterMessage(createFallbackCompletionMessage(character));
}

export async function completeEncounter(formData: FormData) {
  const characterId = getText(formData, "characterId");
  const finalName = getText(formData, "finalName");
  const userNickname = getText(formData, "userNickname");

  if (!characterId) {
    redirect("/app/characters");
  }

  if (!finalName) {
    redirectWithError(characterId, "名前を入力してください。");
  }

  if (!userNickname) {
    redirectWithError(characterId, "呼び名を入力してください。");
  }

  if (finalName.length > 50) {
    redirectWithError(characterId, "名前は50文字以内で入力してください。");
  }

  if (userNickname.length > 50) {
    redirectWithError(characterId, "呼び名は50文字以内で入力してください。");
  }

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
      status
    `,
    )
    .eq("id", characterId)
    .eq("user_id", user.id)
    .single();

  if (characterError || !characterData) {
    redirect("/app/characters");
  }

  const originalCharacter = characterData as CharacterForEncounter;

  const updatedCharacter: CharacterForEncounter = {
    ...originalCharacter,
    final_name: finalName,
    user_nickname: userNickname,
    status: "active",
  };

  const { error: updateError } = await supabase
    .from("characters")
    .update({
      final_name: finalName,
      user_nickname: userNickname,
      status: "active",
    })
    .eq("id", characterId)
    .eq("user_id", user.id);

  if (updateError) {
    redirectWithError(characterId, "うまく届きませんでした。もう一度だけ、教えてください。");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("display_name, treatment_preference")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileData ?? {
    display_name: null,
    treatment_preference: "unspecified",
  }) as ProfileForEncounter;

  const { data: existingThreads } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("user_id", user.id)
    .eq("chat_type", "single")
    .eq("character_id", characterId)
    .order("updated_at", { ascending: false })
    .limit(1);

  let threadId = existingThreads?.[0]?.id ?? null;

  if (!threadId) {
    const { data: thread, error: threadError } = await supabase
      .from("chat_threads")
      .insert({
        user_id: user.id,
        title: `${finalName}とのチャット`,
        chat_type: "single",
        character_id: characterId,
      })
      .select("id")
      .single();

    if (threadError || !thread) {
      redirectWithError(characterId, "まだ声が届きません。少ししてからもう一度試してください。");
    }

    threadId = thread.id;
  } else {
    await supabase
      .from("chat_threads")
      .update({
        title: `${finalName}とのチャット`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId)
      .eq("user_id", user.id);
  }

  const completionMessage = await generateCompletionMessage({
    character: updatedCharacter,
    profile,
  });

  const { error: messageError } = await supabase.from("chat_messages").insert({
    user_id: user.id,
    thread_id: threadId,
    character_id: characterId,
    sender_type: "character",
    content: completionMessage,
    metadata: {
      event_type: "encounter_completed_message",
      model: getOpenAIModel(),
      generated_at: new Date().toISOString(),
    },
  });

  if (messageError) {
    console.error("Encounter completion message insert error:", messageError);
  }

  await supabase
    .from("chat_threads")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId)
    .eq("user_id", user.id);

  redirect(`/app/chat/${threadId}?encounter_completed=1`);
}
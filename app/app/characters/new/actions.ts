"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createOpenAIClient, getOpenAIModel } from "@/lib/openai/client";

export type CharacterFormField =
  | "temporaryName"
  | "genderFeel"
  | "ageFeel"
  | "hairColor"
  | "eyeColor"
  | "hairstyle"
  | "outfit"
  | "defaultExpression"
  | "expressionDetail"
  | "personality"
  | "firstPerson"
  | "speechStyle"
  | "forbiddenSpeech"
  | "roleName"
  | "expertise"
  | "consultationStyle"
  | "thinkingStyle"
  | "teamPosition"
  | "likes"
  | "dislikes"
  | "celebrationMonth"
  | "celebrationDay"
  | "celebrationTitle"
  | "artStyle"
  | "appearanceDetail"
  | "absoluteSettings"
  | "safetyAgreement";

export type CharacterFormValues = Record<CharacterFormField, string>;

export type CreateCharacterState = {
  values: CharacterFormValues;
  fieldErrors: Partial<Record<CharacterFormField, string>>;
  formError: string;
};

type ProfileForCharacterLimit = {
  id: string;
  plan: string | null;
  display_name: string | null;
  treatment_preference: string | null;
  user_setup_completed: boolean | null;
};

type PlanTier = "free" | "premium_lite" | "premium";

type CharacterLimitConfig = {
  planTier: PlanTier;
  limit: number;
  label: string;
};

type EncounterCharacter = {
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
};

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getFormValues(formData: FormData): CharacterFormValues {
  return {
    temporaryName: getText(formData, "temporaryName"),
    genderFeel: getText(formData, "genderFeel"),
    ageFeel: getText(formData, "ageFeel"),
    hairColor: getText(formData, "hairColor"),
    eyeColor: getText(formData, "eyeColor"),
    hairstyle: getText(formData, "hairstyle"),
    outfit: getText(formData, "outfit"),
    defaultExpression: getText(formData, "defaultExpression"),
    expressionDetail: getText(formData, "expressionDetail"),
    personality: getText(formData, "personality"),
    firstPerson: getText(formData, "firstPerson"),
    speechStyle: getText(formData, "speechStyle"),
    forbiddenSpeech: getText(formData, "forbiddenSpeech"),
    roleName: getText(formData, "roleName"),
    expertise: getText(formData, "expertise"),
    consultationStyle: getText(formData, "consultationStyle"),
    thinkingStyle: getText(formData, "thinkingStyle"),
    teamPosition: getText(formData, "teamPosition"),
    likes: getText(formData, "likes"),
    dislikes: getText(formData, "dislikes"),
    celebrationMonth: getText(formData, "celebrationMonth"),
    celebrationDay: getText(formData, "celebrationDay"),
    celebrationTitle: getText(formData, "celebrationTitle"),
    artStyle: getText(formData, "artStyle") || "midnight_anime",
    appearanceDetail: getText(formData, "appearanceDetail"),
    absoluteSettings: getText(formData, "absoluteSettings"),
    safetyAgreement: getText(formData, "safetyAgreement"),
  };
}

function getNumberOrNull(value: string) {
  if (!value) return null;

  const numberValue = Number(value);
  if (Number.isNaN(numberValue) || !Number.isInteger(numberValue)) return null;

  return numberValue;
}

function createErrorState({
  values,
  fieldErrors = {},
  formError,
}: {
  values: CharacterFormValues;
  fieldErrors?: Partial<Record<CharacterFormField, string>>;
  formError: string;
}): CreateCharacterState {
  return {
    values,
    fieldErrors,
    formError,
  };
}

function normalizePlan(plan: string | null) {
  return (plan || "free").trim().toLowerCase().replace(/\s+/g, "_");
}

function getPlanTier(plan: string | null): PlanTier {
  const normalizedPlan = normalizePlan(plan);

  if (normalizedPlan.includes("lite")) {
    return "premium_lite";
  }

  if (
    normalizedPlan.includes("premium") ||
    normalizedPlan.includes("pro") ||
    normalizedPlan.includes("paid")
  ) {
    return "premium";
  }

  return "free";
}

function getCharacterLimitConfig(plan: string | null): CharacterLimitConfig {
  const planTier = getPlanTier(plan);

  if (planTier === "premium") {
    return {
      planTier,
      limit: 10,
      label: "Premium",
    };
  }

  if (planTier === "premium_lite") {
    return {
      planTier,
      limit: 3,
      label: "Premium Lite",
    };
  }

  return {
    planTier,
    limit: 1,
    label: "Free",
  };
}

function getCharacterName(
  character: Pick<EncounterCharacter, "temporary_name" | "final_name">,
) {
  return (
    character.final_name ||
    character.temporary_name ||
    "名前のないキャラクター"
  );
}

function getTreatmentPreferenceLabel(value: string | null) {
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

function createFallbackEncounterMessage(character: EncounterCharacter) {
  const characterName = getCharacterName(character);

  return `${characterName}と出会ってくれてありがとう。あなたのこと、なんて呼べばいい？`;
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

function buildEncounterInstructions({
  character,
  profile,
}: {
  character: EncounterCharacter;
  profile: ProfileForCharacterLimit;
}) {
  const characterName = getCharacterName(character);

  return `
あなたはFevCara内のAIキャラクター「${characterName}」です。
FevCaraは、ユーザーが生み出したAIキャラクターに会いに行くアプリです。

# 目的
キャラクターが初めて目覚め、ユーザーと出会う最初の一言を作ってください。

# 必ず含める内容
- 自分が生まれた、目覚めた、またはユーザーと出会えたことへの短い反応
- ユーザーへの感謝
- ユーザーを何と呼べばいいか尋ねる一言

# とても重要なルール
- 「僕」「俺」「私」「君」「あなた」などの一人称・二人称は固定しないでください。
- キャラクターの一人称、性格、口調、禁止したい話し方、絶対設定に合わせて自然に選んでください。
- 「僕を作ってくれてありがとう。君をなんて呼べばいい？」のような固定文にしないでください。
- ユーザー設定の「FevCara内での名前」はアプリ上の表示名です。キャラクターが呼ぶ名前として勝手に使わないでください。
- ユーザーをどう呼ぶかは、この初回メッセージの中で必ず自然に尋ねてください。
- OpenAI、ChatGPT、AIモデル、システム指示などには触れないでください。
- 出力全体を「」、『』、"" などの引用符で囲まないでください。
- 80〜180文字程度にしてください。
- 日本語で、セリフだけを出力してください。

# ユーザー基本設定
FevCara内での表示名: ${profile.display_name || "未設定"}
扱われ方の好み: ${getTreatmentPreferenceLabel(profile.treatment_preference)}

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
ユーザーの呼び方: ${character.user_nickname || "未設定"}
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

async function generateEncounterMessage({
  character,
  profile,
}: {
  character: EncounterCharacter;
  profile: ProfileForCharacterLimit;
}) {
  try {
    const openai = createOpenAIClient();

    const response = await openai.responses.create({
      model: getOpenAIModel(),
      instructions: buildEncounterInstructions({
        character,
        profile,
      }),
      input:
        "このキャラクターの初回出会いメッセージを1つだけ生成してください。カギカッコや引用符で囲まず、本文だけを出力してください。",
      max_output_tokens: 280,
    });

    const generatedText = normalizeEncounterMessage(
      response.output_text?.trim() || "",
    );

    if (generatedText) {
      return generatedText;
    }
  } catch (error) {
    console.error("Encounter message generation error:", error);
  }

  return normalizeEncounterMessage(createFallbackEncounterMessage(character));
}

function buildEncounterCharacter({
  characterId,
  values,
}: {
  characterId: string;
  values: CharacterFormValues;
}): EncounterCharacter {
  return {
    id: characterId,
    temporary_name: values.temporaryName,
    final_name: null,

    gender_feel: values.genderFeel || null,
    age_feel: values.ageFeel || null,
    hair_color: values.hairColor || null,
    eye_color: values.eyeColor || null,
    hairstyle: values.hairstyle || null,
    outfit: values.outfit || null,
    appearance_detail: values.appearanceDetail || null,

    default_expression: values.defaultExpression || null,
    expression_detail: values.expressionDetail || null,

    personality: values.personality || null,
    first_person: values.firstPerson || null,
    user_nickname: null,
    speech_style: values.speechStyle || null,
    forbidden_speech: values.forbiddenSpeech || null,
    absolute_settings: values.absoluteSettings || null,

    role_name: values.roleName || null,
    expertise: values.expertise || null,
    consultation_style: values.consultationStyle || null,
    thinking_style: values.thinkingStyle || null,
    team_position: values.teamPosition || null,

    likes: values.likes || null,
    dislikes: values.dislikes || null,
  };
}

async function getOrCreateProfile({
  supabase,
  userId,
  email,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  email: string | undefined;
}) {
  const { data: profileData, error: profileFetchError } = await supabase
    .from("profiles")
    .select(
      "id, plan, display_name, treatment_preference, user_setup_completed",
    )
    .eq("id", userId)
    .maybeSingle();

  if (profileFetchError) {
    return {
      profile: null,
      error: "プロフィール情報の取得に失敗しました。",
    };
  }

  if (profileData) {
    return {
      profile: profileData as ProfileForCharacterLimit,
      error: null,
    };
  }

  const { data: createdProfileData, error: profileInsertError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email,
      plan: "free",
      treatment_preference: "unspecified",
      user_setup_completed: false,
    })
    .select(
      "id, plan, display_name, treatment_preference, user_setup_completed",
    )
    .single();

  if (profileInsertError || !createdProfileData) {
    return {
      profile: null,
      error: "プロフィールの作成に失敗しました。",
    };
  }

  return {
    profile: createdProfileData as ProfileForCharacterLimit,
    error: null,
  };
}

async function checkCharacterCreateLimit({
  supabase,
  userId,
  plan,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  plan: string | null;
}) {
  const limitConfig = getCharacterLimitConfig(plan);

  const { count, error: countError } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    return "キャラクター数の確認に失敗しました。";
  }

  const currentCount = count ?? 0;

  if (currentCount >= limitConfig.limit) {
    return `${limitConfig.label}プランではキャラクターを${limitConfig.limit}人まで作成できます。現在 ${currentCount} / ${limitConfig.limit} 人です。`;
  }

  return null;
}

function validateOriginalCharacterPolicy(values: CharacterFormValues) {
  const fieldErrors: Partial<Record<CharacterFormField, string>> = {};

  const policyCheckFields: CharacterFormField[] = [
    "temporaryName",
    "genderFeel",
    "ageFeel",
    "hairColor",
    "eyeColor",
    "hairstyle",
    "outfit",
    "defaultExpression",
    "expressionDetail",
    "appearanceDetail",
    "absoluteSettings",
  ];

  const blockedTerms = [
    "実在人物",
    "実在の人物",
    "有名人",
    "芸能人",
    "俳優",
    "女優",
    "配信者",
    "vtuber",
    "vチューバー",
    "既存キャラ",
    "版権",
    "著作権キャラ",
    "写真風",
    "フォトリアル",
    "実写",
    "リアル系",
    "特定作品風",
    "特定作家風",
    "ジブリ風",
    "ディズニー風",
    "ピクサー風",
    "新海誠風",
    "宮崎駿風",
  ];

  for (const fieldName of policyCheckFields) {
    const fieldValue = values[fieldName].toLowerCase();

    const matchedTerm = blockedTerms.find((term) =>
      fieldValue.includes(term.toLowerCase()),
    );

    if (matchedTerm) {
      fieldErrors[fieldName] =
        `「${matchedTerm}」に近い指定は使えません。オリジナルキャラクターとして設定してください。`;
    }
  }

  return fieldErrors;
}

function validateCelebrationDate(values: CharacterFormValues) {
  const fieldErrors: Partial<Record<CharacterFormField, string>> = {};

  const month = getNumberOrNull(values.celebrationMonth);
  const day = getNumberOrNull(values.celebrationDay);
  const title = values.celebrationTitle;

  const hasAnyInput = Boolean(
    values.celebrationMonth || values.celebrationDay || title,
  );

  if (!hasAnyInput) {
    return fieldErrors;
  }

  if (!month) {
    fieldErrors.celebrationMonth = "月を入力してください。";
  }

  if (!day) {
    fieldErrors.celebrationDay = "日を入力してください。";
  }

  if (!title) {
    fieldErrors.celebrationTitle = "何の日かを入力してください。";
  }

  if (!month || !day || !title) {
    return fieldErrors;
  }

  if (month < 1 || month > 12) {
    fieldErrors.celebrationMonth = "月は1〜12で入力してください。";
  }

  if (day < 1 || day > 31) {
    fieldErrors.celebrationDay = "日付は1〜31で入力してください。";
  }

  if (fieldErrors.celebrationMonth || fieldErrors.celebrationDay) {
    return fieldErrors;
  }

  const date = new Date(2024, month - 1, day);

  if (date.getMonth() !== month - 1 || date.getDate() !== day) {
    fieldErrors.celebrationMonth = "実在する日付で入力してください。";
    fieldErrors.celebrationDay = "実在する日付で入力してください。";
  }

  return fieldErrors;
}

export async function createCharacter(
  _previousState: CreateCharacterState,
  formData: FormData,
): Promise<CreateCharacterState> {
  const values = getFormValues(formData);
  const fieldErrors: Partial<Record<CharacterFormField, string>> = {};

  if (!values.temporaryName) {
    fieldErrors.temporaryName = "キャラクターの仮名を入力してください。";
  }

  if (values.safetyAgreement !== "agreed") {
    fieldErrors.safetyAgreement = "安全ルールを確認してください。";
  }

  Object.assign(fieldErrors, validateOriginalCharacterPolicy(values));
  Object.assign(fieldErrors, validateCelebrationDate(values));

  if (Object.keys(fieldErrors).length > 0) {
    return createErrorState({
      values,
      fieldErrors,
      formError:
        "入力内容を確認してください。赤く表示された項目を直すと保存できます。",
    });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profileResult = await getOrCreateProfile({
    supabase,
    userId: user.id,
    email: user.email,
  });

  if (profileResult.error || !profileResult.profile) {
    return createErrorState({
      values,
      formError: profileResult.error ?? "プロフィール情報の確認に失敗しました。",
    });
  }

  const profile = profileResult.profile;

  const limitError = await checkCharacterCreateLimit({
    supabase,
    userId: user.id,
    plan: profile.plan,
  });

  if (limitError) {
    return createErrorState({
      values,
      formError: limitError,
    });
  }

  const { data: artStyle, error: artStyleError } = await supabase
    .from("art_style_presets")
    .select("id")
    .eq("slug", values.artStyle || "midnight_anime")
    .eq("is_active", true)
    .single();

  if (artStyleError || !artStyle) {
    return createErrorState({
      values,
      fieldErrors: {
        artStyle: "絵柄プリセットを選び直してください。",
      },
      formError: "絵柄プリセットの取得に失敗しました。",
    });
  }

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .insert({
      user_id: user.id,
      temporary_name: values.temporaryName,
      final_name: null,

      gender_feel: values.genderFeel || null,
      age_feel: values.ageFeel || null,
      hair_color: values.hairColor || null,
      eye_color: values.eyeColor || null,
      hairstyle: values.hairstyle || null,
      outfit: values.outfit || null,
      appearance_detail: values.appearanceDetail || null,

      default_expression: values.defaultExpression || null,
      expression_detail: values.expressionDetail || null,

      personality: values.personality || null,
      first_person: values.firstPerson || null,
      user_nickname: null,
      speech_style: values.speechStyle || null,
      forbidden_speech: values.forbiddenSpeech || null,
      absolute_settings: values.absoluteSettings || null,

      role_name: values.roleName || null,
      expertise: values.expertise || null,
      consultation_style: values.consultationStyle || null,
      thinking_style: values.thinkingStyle || null,
      team_position: values.teamPosition || null,

      likes: values.likes || null,
      dislikes: values.dislikes || null,

      art_style_preset_id: artStyle.id,
      status: "draft",
    })
    .select("id")
    .single();

  if (characterError || !character) {
    return createErrorState({
      values,
      formError: "キャラクターの保存に失敗しました。",
    });
  }

  const celebrationMonth = getNumberOrNull(values.celebrationMonth);
  const celebrationDay = getNumberOrNull(values.celebrationDay);

  if (celebrationMonth && celebrationDay && values.celebrationTitle) {
    const { error: celebrationError } = await supabase
      .from("celebration_days")
      .insert({
        user_id: user.id,
        character_id: character.id,
        month: celebrationMonth,
        day: celebrationDay,
        title: values.celebrationTitle,
      });

    if (celebrationError) {
      console.error("Celebration day insert error:", celebrationError);
    }
  }

  const encounterCharacter = buildEncounterCharacter({
    characterId: character.id,
    values,
  });

  const characterName = getCharacterName(encounterCharacter);

  const { data: thread, error: threadError } = await supabase
    .from("chat_threads")
    .insert({
      user_id: user.id,
      title: `${characterName}との出会い`,
      chat_type: "single",
      character_id: character.id,
    })
    .select("id")
    .single();

  if (threadError || !thread) {
    console.error("Encounter thread insert error:", threadError);
    redirect("/app/characters?created=1");
  }

  const encounterMessage = await generateEncounterMessage({
    character: encounterCharacter,
    profile,
  });

  const { error: encounterMessageError } = await supabase
    .from("chat_messages")
    .insert({
      user_id: user.id,
      thread_id: thread.id,
      character_id: character.id,
      sender_type: "character",
      content: encounterMessage,
      metadata: {
        event_type: "encounter_initial_message",
        model: getOpenAIModel(),
        generated_at: new Date().toISOString(),
      },
    });

  if (encounterMessageError) {
    console.error("Encounter message insert error:", encounterMessageError);

    redirect(
      `/app/chat/${thread.id}?error=${encodeURIComponent(
        "出会いメッセージの保存に失敗しました。最初のひと言を送って話し始めてください。",
      )}`,
    );
  }

  await supabase
    .from("chat_threads")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", thread.id)
    .eq("user_id", user.id);

  redirect(`/app/chat/${thread.id}?encounter=1`);
}
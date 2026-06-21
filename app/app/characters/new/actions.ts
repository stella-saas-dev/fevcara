"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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
};

type PlanTier = "free" | "premium_lite" | "premium";

type CharacterLimitConfig = {
  planTier: PlanTier;
  limit: number;
  label: string;
  isTrialBoostActive: boolean;
};

const TRIAL_BOOST_DURATION_MS = 72 * 60 * 60 * 1000;

type ArtStyleIdRow = {
  id: string;
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

function isFreeTrialBoostActive({
  plan,
  userCreatedAt,
}: {
  plan: string | null;
  userCreatedAt: string | null | undefined;
}) {
  if (getPlanTier(plan) !== "free") {
    return false;
  }

  const createdAtTime = new Date(userCreatedAt ?? "").getTime();

  if (!Number.isFinite(createdAtTime)) {
    return false;
  }

  return Date.now() < createdAtTime + TRIAL_BOOST_DURATION_MS;
}

function getCharacterLimitConfig(
  plan: string | null,
  userCreatedAt?: string | null,
): CharacterLimitConfig {
  const planTier = getPlanTier(plan);

  if (planTier === "premium") {
    return {
      planTier,
      limit: 10,
      label: "Premium",
      isTrialBoostActive: false,
    };
  }

  if (planTier === "premium_lite") {
    return {
      planTier,
      limit: 3,
      label: "Lite",
      isTrialBoostActive: false,
    };
  }

  const isTrialBoostActive = isFreeTrialBoostActive({
    plan,
    userCreatedAt,
  });

  return {
    planTier,
    limit: isTrialBoostActive ? 3 : 1,
    label: isTrialBoostActive ? "Free Trial" : "Free",
    isTrialBoostActive,
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
    .select("id, plan")
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
    .select("id, plan")
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
  userCreatedAt,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  plan: string | null;
  userCreatedAt: string | null | undefined;
}) {
  const limitConfig = getCharacterLimitConfig(plan, userCreatedAt);

  const { count, error: countError } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (countError) {
    return "キャラクター数の確認に失敗しました。";
  }

  const currentCount = count ?? 0;

  if (currentCount >= limitConfig.limit) {
    if (limitConfig.isTrialBoostActive) {
      return `初回72時間トライアル中はキャラクターを${limitConfig.limit}人まで作成できます。現在 ${currentCount} / ${limitConfig.limit} 人です。`;
    }

    return `${limitConfig.label}プランではキャラクターを${limitConfig.limit}人まで作成できます。現在 ${currentCount} / ${limitConfig.limit} 人です。`;
  }

  return null;
}

async function getDefaultArtStylePresetId({
  supabase,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  const { data, error } = await supabase
    .from("art_style_presets")
    .select("id")
    .eq("slug", "midnight_anime")
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return (data as ArtStyleIdRow).id;
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

  const limitError = await checkCharacterCreateLimit({
    supabase,
    userId: user.id,
    plan: profileResult.profile.plan,
    userCreatedAt: user.created_at,
  });

  if (limitError) {
    return createErrorState({
      values,
      formError: limitError,
    });
  }

  const defaultArtStylePresetId = await getDefaultArtStylePresetId({
    supabase,
  });

  if (!defaultArtStylePresetId) {
    return createErrorState({
      values,
      formError:
        "初期絵柄プリセットの取得に失敗しました。絵柄プリセットSQLが実行済みか確認してください。",
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

      art_style_preset_id: defaultArtStylePresetId,
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

  redirect(`/app/characters/${character.id}/visual`);
}
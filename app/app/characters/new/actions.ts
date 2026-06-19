"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getNumberOrNull(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) return null;

  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return null;

  return numberValue;
}

function redirectWithError(message: string): never {
  redirect(`/app/characters/new?error=${encodeURIComponent(message)}`);
}

type ProfileForCharacterLimit = {
  id: string;
  plan: string | null;
};

type PlanTier = "free" | "premium_lite" | "premium";

type CharacterLimitConfig = {
  planTier: PlanTier;
  limit: number;
  label: string;
};

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
    redirectWithError("プロフィール情報の取得に失敗しました。");
  }

  if (profileData) {
    return profileData as ProfileForCharacterLimit;
  }

  const { data: createdProfileData, error: profileInsertError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email,
      plan: "free",
    })
    .select("id, plan")
    .single();

  if (profileInsertError || !createdProfileData) {
    redirectWithError("プロフィールの作成に失敗しました。");
  }

  return createdProfileData as ProfileForCharacterLimit;
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
    redirectWithError("キャラクター数の確認に失敗しました。");
  }

  const currentCount = count ?? 0;

  if (currentCount >= limitConfig.limit) {
    redirectWithError(
      `${limitConfig.label}プランではキャラクターを${limitConfig.limit}人まで作成できます。現在 ${currentCount} / ${limitConfig.limit} 人です。`,
    );
  }

  return {
    currentCount,
    ...limitConfig,
  };
}

export async function createCharacter(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const temporaryName = getText(formData, "temporaryName");
  const artStyleSlug = getText(formData, "artStyle") || "midnight_anime";

  if (!temporaryName) {
    redirectWithError("キャラクターの仮名を入力してください。");
  }

  const profile = await getOrCreateProfile({
    supabase,
    userId: user.id,
    email: user.email,
  });

  await checkCharacterCreateLimit({
    supabase,
    userId: user.id,
    plan: profile.plan,
  });

  const { data: artStyle, error: artStyleError } = await supabase
    .from("art_style_presets")
    .select("id")
    .eq("slug", artStyleSlug)
    .eq("is_active", true)
    .single();

  if (artStyleError || !artStyle) {
    redirectWithError("絵柄プリセットの取得に失敗しました。");
  }

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .insert({
      user_id: user.id,
      temporary_name: temporaryName,
      final_name: null,

      gender_feel: getText(formData, "genderFeel") || null,
      age_feel: getText(formData, "ageFeel") || null,
      hair_color: getText(formData, "hairColor") || null,
      eye_color: getText(formData, "eyeColor") || null,
      hairstyle: getText(formData, "hairstyle") || null,
      outfit: getText(formData, "outfit") || null,
      appearance_detail: getText(formData, "appearanceDetail") || null,

      default_expression: getText(formData, "defaultExpression") || null,
      expression_detail: getText(formData, "expressionDetail") || null,

      personality: getText(formData, "personality") || null,
      first_person: getText(formData, "firstPerson") || null,
      user_nickname: getText(formData, "userNickname") || null,
      speech_style: getText(formData, "speechStyle") || null,
      forbidden_speech: getText(formData, "forbiddenSpeech") || null,
      absolute_settings: getText(formData, "absoluteSettings") || null,

      role_name: getText(formData, "roleName") || null,
      expertise: getText(formData, "expertise") || null,
      consultation_style: getText(formData, "consultationStyle") || null,
      thinking_style: getText(formData, "thinkingStyle") || null,
      team_position: getText(formData, "teamPosition") || null,

      likes: getText(formData, "likes") || null,
      dislikes: getText(formData, "dislikes") || null,

      art_style_preset_id: artStyle.id,
      status: "draft",
    })
    .select("id")
    .single();

  if (characterError || !character) {
    redirectWithError("キャラクターの保存に失敗しました。");
  }

  const celebrationMonth = getNumberOrNull(formData, "celebrationMonth");
  const celebrationDay = getNumberOrNull(formData, "celebrationDay");
  const celebrationTitle = getText(formData, "celebrationTitle");

  if (celebrationMonth && celebrationDay && celebrationTitle) {
    const { error: celebrationError } = await supabase
      .from("celebration_days")
      .insert({
        user_id: user.id,
        character_id: character.id,
        month: celebrationMonth,
        day: celebrationDay,
        title: celebrationTitle,
      });

    if (celebrationError) {
      redirectWithError("大切な日の保存に失敗しました。");
    }
  }

  redirect("/app/characters?created=1");
}
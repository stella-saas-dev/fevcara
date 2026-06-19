"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getTextOrNull(formData: FormData, key: string) {
  const value = getText(formData, key);
  return value || null;
}

function getNumberOrNull(formData: FormData, key: string) {
  const value = getText(formData, key);

  if (!value) {
    return null;
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return null;
  }

  return numberValue;
}

function redirectWithError(characterId: string, message: string): never {
  redirect(
    `/app/characters/${characterId}/edit?error=${encodeURIComponent(message)}`,
  );
}

export async function updateCharacter(formData: FormData) {
  const characterId = getText(formData, "characterId");

  if (!characterId) {
    redirect("/app/characters");
  }

  const temporaryName = getText(formData, "temporaryName");

  if (!temporaryName) {
    redirectWithError(characterId, "キャラクターの仮名を入力してください。");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: character, error: characterError } = await supabase
    .from("characters")
    .select("id")
    .eq("id", characterId)
    .eq("user_id", user.id)
    .single();

  if (characterError || !character) {
    redirect("/app/characters");
  }

  const artStyleSlug = getText(formData, "artStyle") || "midnight_anime";

  const { data: artStyle, error: artStyleError } = await supabase
    .from("art_style_presets")
    .select("id")
    .eq("slug", artStyleSlug)
    .eq("is_active", true)
    .single();

  if (artStyleError || !artStyle) {
    redirectWithError(characterId, "絵柄プリセットの取得に失敗しました。");
  }

  const { error: updateError } = await supabase
    .from("characters")
    .update({
      temporary_name: temporaryName,
      final_name: getTextOrNull(formData, "finalName"),

      gender_feel: getTextOrNull(formData, "genderFeel"),
      age_feel: getTextOrNull(formData, "ageFeel"),
      hair_color: getTextOrNull(formData, "hairColor"),
      eye_color: getTextOrNull(formData, "eyeColor"),
      hairstyle: getTextOrNull(formData, "hairstyle"),
      outfit: getTextOrNull(formData, "outfit"),
      appearance_detail: getTextOrNull(formData, "appearanceDetail"),

      default_expression: getTextOrNull(formData, "defaultExpression"),
      expression_detail: getTextOrNull(formData, "expressionDetail"),

      personality: getTextOrNull(formData, "personality"),
      first_person: getTextOrNull(formData, "firstPerson"),
      user_nickname: getTextOrNull(formData, "userNickname"),
      speech_style: getTextOrNull(formData, "speechStyle"),
      forbidden_speech: getTextOrNull(formData, "forbiddenSpeech"),
      absolute_settings: getTextOrNull(formData, "absoluteSettings"),

      role_name: getTextOrNull(formData, "roleName"),
      expertise: getTextOrNull(formData, "expertise"),
      consultation_style: getTextOrNull(formData, "consultationStyle"),
      thinking_style: getTextOrNull(formData, "thinkingStyle"),
      team_position: getTextOrNull(formData, "teamPosition"),

      likes: getTextOrNull(formData, "likes"),
      dislikes: getTextOrNull(formData, "dislikes"),

      art_style_preset_id: artStyle.id,
    })
    .eq("id", characterId)
    .eq("user_id", user.id);

  if (updateError) {
    redirectWithError(characterId, "キャラクター設定の保存に失敗しました。");
  }

  const celebrationMonth = getNumberOrNull(formData, "celebrationMonth");
  const celebrationDay = getNumberOrNull(formData, "celebrationDay");
  const celebrationTitle = getText(formData, "celebrationTitle");

  await supabase
    .from("celebration_days")
    .delete()
    .eq("user_id", user.id)
    .eq("character_id", characterId);

  if (celebrationMonth && celebrationDay && celebrationTitle) {
    const { error: celebrationError } = await supabase
      .from("celebration_days")
      .insert({
        user_id: user.id,
        character_id: characterId,
        month: celebrationMonth,
        day: celebrationDay,
        title: celebrationTitle,
      });

    if (celebrationError) {
      redirectWithError(characterId, "大切な日の保存に失敗しました。");
    }
  }

  revalidatePath(`/app/characters/${characterId}`);
  revalidatePath(`/app/characters/${characterId}/edit`);
  revalidatePath("/app/characters");

  redirect(`/app/characters/${characterId}?updated=1`);
}
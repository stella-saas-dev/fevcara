"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWithError(message: string): never {
  redirect(
    `/app/characters/select-active?error=${encodeURIComponent(message)}`,
  );
}

type ProfileForActiveSelection = {
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

export async function selectActiveCharacter(formData: FormData) {
  const characterId = getText(formData, "characterId");

  if (!characterId) {
    redirectWithError("使い続けるキャラクターを選んでください。");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("plan, active_character_id, character_limit_choice_locked")
    .eq("id", user.id)
    .single();

  if (profileError || !profileData) {
    redirectWithError("プロフィール情報の取得に失敗しました。");
  }

  const profile = profileData as ProfileForActiveSelection;

  if (!isFreePlan(profile.plan)) {
    redirect("/app/characters");
  }

  if (profile.character_limit_choice_locked) {
    redirectWithError(
      "Freeプラン中に使うキャラクターはすでに選択済みです。",
    );
  }

  const { count, error: countError } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (countError) {
    redirectWithError("キャラクター数の確認に失敗しました。");
  }

  const characterCount = count ?? 0;

  if (characterCount <= 1) {
    redirect("/app/characters");
  }

  const { data: selectedCharacter, error: selectedCharacterError } =
    await supabase
      .from("characters")
      .select("id")
      .eq("id", characterId)
      .eq("user_id", user.id)
      .single();

  if (selectedCharacterError || !selectedCharacter) {
    redirectWithError("選択したキャラクターが見つかりません。");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      active_character_id: selectedCharacter.id,
      character_limit_choice_locked: true,
    })
    .eq("id", user.id);

  if (updateError) {
    redirectWithError("使うキャラクターの保存に失敗しました。");
  }

  redirect("/app/characters?active_selected=1");
}
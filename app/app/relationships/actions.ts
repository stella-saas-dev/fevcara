"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getTextOrNull(formData: FormData, key: string) {
  const value = getText(formData, key);
  return value || null;
}

function redirectWithError(message: string): never {
  redirect(`/app/relationships?error=${encodeURIComponent(message)}`);
}

export async function saveCharacterRelationshipPair(formData: FormData) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const aCharacterId = getText(formData, "aCharacterId");
  const bCharacterId = getText(formData, "bCharacterId");

  if (!aCharacterId || !bCharacterId) {
    redirectWithError("キャラクターの指定が正しくありません。");
  }

  if (aCharacterId === bCharacterId) {
    redirectWithError("同じキャラクター同士の関係性は設定できません。");
  }

  const { data: ownedCharacters, error: ownedCharactersError } = await supabase
    .from("characters")
    .select("id")
    .eq("user_id", user.id)
    .in("id", [aCharacterId, bCharacterId]);

  if (ownedCharactersError || !ownedCharacters || ownedCharacters.length !== 2) {
    redirectWithError("キャラクターの確認に失敗しました。");
  }

  const rows = [
    {
      user_id: user.id,
      from_character_id: aCharacterId,
      to_character_id: bCharacterId,
      relationship_label: getTextOrNull(formData, "abRelationshipLabel"),
      impression: getTextOrNull(formData, "abImpression"),
      speaking_style: getTextOrNull(formData, "abSpeakingStyle"),
      group_chat_behavior: getTextOrNull(formData, "abGroupChatBehavior"),
      forbidden_behavior: getTextOrNull(formData, "abForbiddenBehavior"),
    },
    {
      user_id: user.id,
      from_character_id: bCharacterId,
      to_character_id: aCharacterId,
      relationship_label: getTextOrNull(formData, "baRelationshipLabel"),
      impression: getTextOrNull(formData, "baImpression"),
      speaking_style: getTextOrNull(formData, "baSpeakingStyle"),
      group_chat_behavior: getTextOrNull(formData, "baGroupChatBehavior"),
      forbidden_behavior: getTextOrNull(formData, "baForbiddenBehavior"),
    },
  ];

  const { error: upsertError } = await supabase
    .from("character_relationships")
    .upsert(rows, {
      onConflict: "user_id,from_character_id,to_character_id",
    });

  if (upsertError) {
    redirectWithError("関係性の保存に失敗しました。");
  }

  revalidatePath("/app/relationships");
  redirect("/app/relationships?saved=1");
}
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWithError(characterId: string, message: string): never {
  redirect(
    `/app/characters/${characterId}?error=${encodeURIComponent(message)}`,
  );
}

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

export async function startSingleChat(formData: FormData) {
  const characterId = getText(formData, "characterId");

  if (!characterId) {
    redirect("/app/characters");
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
    .select("id, temporary_name, final_name")
    .eq("id", characterId)
    .eq("user_id", user.id)
    .single();

  if (characterError || !character) {
    redirect("/app/characters");
  }

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

  if (isFreePlan(profile.plan)) {
    const { count, error: countError } = await supabase
      .from("characters")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      redirectWithError(character.id, "キャラクター数の確認に失敗しました。");
    }

    const characterCount = count ?? 0;

    if (characterCount > 1 && !profile.character_limit_choice_locked) {
      redirect("/app/characters/select-active");
    }

    const isWaitingCharacter =
      Boolean(profile.character_limit_choice_locked) &&
      Boolean(profile.active_character_id) &&
      profile.active_character_id !== character.id;

    if (isWaitingCharacter) {
      redirectWithError(
        character.id,
        "このキャラクターは現在のFreeプランでは待機中です。Premium Lite以上で再開できます。",
      );
    }
  }

  const { data: existingThreads } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("user_id", user.id)
    .eq("chat_type", "single")
    .eq("character_id", character.id)
    .order("updated_at", { ascending: false })
    .limit(1);

  const existingThread = existingThreads?.[0];

  if (existingThread?.id) {
    redirect(`/app/chat/${existingThread.id}`);
  }

  const characterName =
    character.final_name || character.temporary_name || "名前のないキャラクター";

  const { data: thread, error: threadError } = await supabase
    .from("chat_threads")
    .insert({
      user_id: user.id,
      title: `${characterName}とのチャット`,
      chat_type: "single",
      character_id: character.id,
    })
    .select("id")
    .single();

  if (threadError || !thread) {
    redirect("/app/characters");
  }

  redirect(`/app/chat/${thread.id}`);
}
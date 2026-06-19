"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
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
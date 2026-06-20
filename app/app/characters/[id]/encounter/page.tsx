import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EncounterEvent } from "./EncounterEvent";

type EncounterPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
  }>;
};

type CharacterRow = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;
  first_person: string | null;
  gender_feel: string | null;
  default_expression: string | null;
  status: string | null;
  image_url: string | null;
};

function getCharacterName(character: CharacterRow) {
  return (
    character.final_name ||
    character.temporary_name ||
    "名前のないキャラクター"
  );
}

function getAvatarText(name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return "◇";
  }

  return trimmedName.slice(0, 1);
}

export default async function CharacterEncounterPage({
  params,
  searchParams,
}: EncounterPageProps) {
  const { id } = await params;
  const query = await searchParams;

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
      first_person,
      gender_feel,
      default_expression,
      status,
      image_url
    `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (characterError || !characterData) {
    redirect("/app/characters");
  }

  const character = characterData as CharacterRow;

  if (character.status === "active") {
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

    redirect(`/app/characters/${character.id}`);
  }

  const characterName = getCharacterName(character);
  const avatarText = getAvatarText(characterName);

  return (
    <EncounterEvent
      characterId={character.id}
      initialCharacterName={characterName}
      avatarText={avatarText}
      firstPerson={character.first_person}
      characterImageUrl={character.image_url}
      error={query.error}
    />
  );
}
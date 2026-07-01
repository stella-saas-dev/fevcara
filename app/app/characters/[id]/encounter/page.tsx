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
  age_feel: string | null;
  default_expression: string | null;
  personality: string | null;
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
      age_feel,
      default_expression,
      personality,
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
      genderFeel={character.gender_feel}
      ageFeel={character.age_feel}
      personality={character.personality}
      speechStyle={character.speech_style}
      forbiddenSpeech={character.forbidden_speech}
      absoluteSettings={character.absolute_settings}
      roleName={character.role_name}
      expertise={character.expertise}
      consultationStyle={character.consultation_style}
      thinkingStyle={character.thinking_style}
      teamPosition={character.team_position}
      likes={character.likes}
      dislikes={character.dislikes}
      defaultExpression={character.default_expression}
      error={query.error}
    />
  );
}

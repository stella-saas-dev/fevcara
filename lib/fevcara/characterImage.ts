import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import {
  createOpenAIClient,
  getOpenAIImageModel,
} from "@/lib/openai/client";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type CharacterImageQuality = "medium" | "high";
export type CharacterImageFraming = "full_body" | "upper_body";

export type CharacterForImageGeneration = {
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
  role_name: string | null;
  likes: string | null;
  dislikes: string | null;
  absolute_settings: string | null;
};

export type ArtStyleForImageGeneration = {
  id: string;
  slug: string;
  name: string | null;
  description: string | null;
  prompt_template: string | null;
  safety_note: string | null;
};

type GenerateAndStoreCharacterImageArgs = {
  supabase: SupabaseClient;
  userId: string;
  character: CharacterForImageGeneration;
  artStyle: ArtStyleForImageGeneration;
  imageQuality: CharacterImageQuality;
  imageFraming: CharacterImageFraming;
  creditCost: number;
  backgroundPrompt?: string;
  characterPosePrompt?: string;
};

function cleanPromptValue(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return "not specified";
  }

  return trimmed.replace(/\s+/g, " ");
}

function cleanLongPromptValue(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return "";
  }

  return trimmed.replace(/\s+/g, " ");
}

function getCharacterDisplayName(character: CharacterForImageGeneration) {
  return (
    character.final_name ||
    character.temporary_name ||
    "unnamed original character"
  );
}

function getFramingPrompt(imageFraming: CharacterImageFraming) {
  if (imageFraming === "upper_body") {
    return `
Selected composition:
Upper-body portrait.

Composition rules:
- Draw the character as an upper-body portrait.
- Show the head, face, hair, shoulders, chest, and upper torso clearly.
- The face must be large enough to work well as a future chat icon.
- Keep the character centered in the square canvas.
- Do not draw a tiny full-body figure.
- Do not crop off the top of the head.
- Leave enough clean visual margin around the character for later icon cropping.
- Make the expression and face readable at small sizes.
- The background may be visible, but it must not overpower the face or silhouette.
`.trim();
  }

  return `
Selected composition:
Full-body character view.

Composition rules:
- Draw the character as a full-body illustration.
- Show the entire character from head to toe.
- Do not crop off the head, hands, legs, feet, shoes, or outfit edges.
- Keep the full silhouette readable.
- Center the character in the square canvas.
- Leave clean visual margin around the character.
- This image should work well as an encounter image, profile card image, and chat background.
- The character may be standing, lightly posing, or calmly floating only if it matches the character.
- The background may be detailed, but it must not hide the character.
`.trim();
}

function getBackgroundInstruction(backgroundPrompt?: string) {
  const safeBackgroundPrompt = cleanLongPromptValue(backgroundPrompt);

  if (safeBackgroundPrompt) {
    return `
Background / Scene:
Draw the character in the following original background or scene:
${safeBackgroundPrompt}

Background rules:
- The background must support the character's atmosphere.
- Keep the character clearly visible as the main subject.
- Do not hide the face, hair, outfit, hands, feet, or silhouette.
- Keep enough separation between the character and the background.
- The background should be illustrated, not photorealistic.
- Do not reference existing copyrighted works, real people, celebrities, specific artists, studios, anime titles, game titles, or franchises.
- Do not include text, logos, watermarks, signs with readable writing, UI, posters, or brand marks.
`.trim();
  }

  return `
Background / Scene:
Use a simple original illustrated background that matches the character.

Background rules:
- Do not force a plain white background.
- The background may include soft colors, abstract shapes, light gradients, simple atmospheric space, or a subtle fantasy-like environment.
- Keep the character clearly visible as the main subject.
- Do not hide the face, hair, outfit, hands, feet, or silhouette.
- Keep enough separation between the character and the background.
- The background should be illustrated, not photorealistic.
- Do not include text, logos, watermarks, signs with readable writing, UI, posters, or brand marks.
`.trim();
}


function getPoseInstruction(characterPosePrompt?: string) {
  const safeCharacterPosePrompt = cleanLongPromptValue(characterPosePrompt);

  if (safeCharacterPosePrompt) {
    return `
Character pose / body direction:
Use the following pose direction for the character:
${safeCharacterPosePrompt}

Pose rules:
- Keep the pose natural and readable.
- Do not change the character's core design, outfit, hair, eye color, or personality.
- Keep the face, hair, outfit, hands, feet, and silhouette visible unless upper-body framing makes feet irrelevant.
- Avoid broken anatomy, extra fingers, missing fingers, twisted limbs, or impossible joints.
- The pose should support the character's personality and role.
- Do not make the pose sexualized, violent, or copied from a specific copyrighted work.
`.trim();
  }

  return `
Character pose / body direction:
Use a simple natural pose that fits the character's personality.

Pose rules:
- Full-body framing may use a relaxed standing pose, a light gesture, or a calm character-introduction pose.
- Upper-body framing may use a gentle hand gesture, a natural shoulder angle, or a readable facial expression.
- Keep the face, hair, outfit, hands, and silhouette clear.
- Avoid broken anatomy, extra fingers, missing fingers, twisted limbs, or impossible joints.
- Do not make the pose sexualized, violent, or copied from a specific copyrighted work.
`.trim();
}

function buildCharacterImagePrompt({
  character,
  artStyle,
  imageQuality,
  imageFraming,
  backgroundPrompt,
  characterPosePrompt,
}: {
  character: CharacterForImageGeneration;
  artStyle: ArtStyleForImageGeneration;
  imageQuality: CharacterImageQuality;
  imageFraming: CharacterImageFraming;
  backgroundPrompt?: string;
  characterPosePrompt?: string;
}) {
  const characterName = getCharacterDisplayName(character);

  return `
Create a square 1:1 original fictional character illustration for FevCara, a character creation and encounter app.

Core rules:
- Show one original character only.
- Non-photorealistic illustration only.
- Do not imitate any existing copyrighted character, real person, celebrity, influencer, artist, studio, anime title, game title, or specific franchise.
- Do not generate photorealistic, realistic, live-action, or cosplay imagery.
- Do not include sexualized content.
- Do not include gore or graphic violence.
- Do not include text, logo, watermark, UI, readable signs, brand marks, or captions.
- Center the character clearly.
- Keep the silhouette readable.
- The character must remain the main subject even when a background is included.
- Follow the selected composition rules exactly.

${getFramingPrompt(imageFraming)}

${getPoseInstruction(characterPosePrompt)}

${getBackgroundInstruction(backgroundPrompt)}

Image quality direction:
${
  imageQuality === "high"
    ? "Extra polished, highly refined, more detailed rendering, premium finish."
    : "Polished medium-detail rendering, clean mobile-app friendly finish."
}

Character name:
${cleanPromptValue(characterName)}

Selected art style:
${cleanPromptValue(artStyle.name)}

Art style description:
${cleanPromptValue(artStyle.description)}

Art style prompt:
${cleanPromptValue(artStyle.prompt_template)}

Safety note:
${cleanPromptValue(artStyle.safety_note)}

Character design notes:
- Gender / aura: ${cleanPromptValue(character.gender_feel)}
- Age impression: ${cleanPromptValue(character.age_feel)}
- Hair color: ${cleanPromptValue(character.hair_color)}
- Eye color: ${cleanPromptValue(character.eye_color)}
- Hairstyle: ${cleanPromptValue(character.hairstyle)}
- Outfit: ${cleanPromptValue(character.outfit)}
- Appearance details: ${cleanPromptValue(character.appearance_detail)}
- Default expression: ${cleanPromptValue(character.default_expression)}
- Expression details: ${cleanPromptValue(character.expression_detail)}
- Personality: ${cleanPromptValue(character.personality)}
- Role: ${cleanPromptValue(character.role_name)}
- Likes: ${cleanPromptValue(character.likes)}
- Dislikes: ${cleanPromptValue(character.dislikes)}
- Absolute settings: ${cleanPromptValue(character.absolute_settings)}

Final image:
A beautiful original character illustration, square 1:1 composition, refined colors, appealing face, expressive design, high-quality mobile app character art, character clearly visible, no text.
`.trim();
}

export async function generateAndStoreCharacterImage({
  supabase,
  userId,
  character,
  artStyle,
  imageQuality,
  imageFraming,
  creditCost,
  backgroundPrompt,
  characterPosePrompt,
}: GenerateAndStoreCharacterImageArgs) {
  const prompt = buildCharacterImagePrompt({
    character,
    artStyle,
    imageQuality,
    imageFraming,
    backgroundPrompt,
    characterPosePrompt,
  });

  const imageId = randomUUID();
  const storagePath = `${userId}/${character.id}/${imageId}.png`;

  const openai = createOpenAIClient();

  const imageRequest = {
    model: getOpenAIImageModel(),
    prompt,
    size: "1024x1024",
    quality: imageQuality,
    n: 1,
  } as any;

  const imageResponse = await openai.images.generate(imageRequest);
  const imageBase64 = imageResponse.data?.[0]?.b64_json;

  if (!imageBase64) {
    throw new Error("Image generation response did not include b64_json.");
  }

  const imageBuffer = Buffer.from(imageBase64, "base64");

  const { error: uploadError } = await supabase.storage
    .from("character-images")
    .upload(storagePath, imageBuffer, {
      contentType: "image/png",
      upsert: true,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: publicUrlData } = supabase.storage
    .from("character-images")
    .getPublicUrl(storagePath);

  const imageUrl = publicUrlData.publicUrl;

  const { data: imageRow, error: insertError } = await supabase
    .from("character_images")
    .insert({
      id: imageId,
      user_id: userId,
      character_id: character.id,
      art_style_preset_id: artStyle.id,
      image_url: imageUrl,
      storage_path: storagePath,
      image_prompt: prompt,
      image_quality: imageQuality,
      credit_cost: creditCost,
    })
    .select(
      "id, image_url, storage_path, image_prompt, image_quality, credit_cost, created_at",
    )
    .single();

  if (insertError || !imageRow) {
    throw insertError ?? new Error("Failed to save generated character image.");
  }

  await supabase
    .from("characters")
    .update({
      art_style_preset_id: artStyle.id,
      image_prompt: prompt,
      image_generation_error: null,
      image_generated_at: new Date().toISOString(),
    })
    .eq("id", character.id)
    .eq("user_id", userId);

  return imageRow;
}
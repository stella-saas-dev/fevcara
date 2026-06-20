import { createClient } from "@/lib/supabase/server";
import {
  createOpenAIClient,
  getOpenAIImageModel,
} from "@/lib/openai/client";

type CharacterImageValues = {
  temporaryName: string;
  genderFeel: string;
  ageFeel: string;
  hairColor: string;
  eyeColor: string;
  hairstyle: string;
  outfit: string;
  defaultExpression: string;
  expressionDetail: string;
  personality: string;
  firstPerson: string;
  speechStyle: string;
  forbiddenSpeech: string;
  roleName: string;
  expertise: string;
  consultationStyle: string;
  thinkingStyle: string;
  teamPosition: string;
  likes: string;
  dislikes: string;
  artStyle: string;
  appearanceDetail: string;
  absoluteSettings: string;
};

type GenerateAndStoreCharacterImageArgs = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  characterId: string;
  characterName: string;
  artStyleName: string | null;
  artStyleDescription: string | null;
  values: CharacterImageValues;
};

function cleanPromptValue(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return "not specified";
  }

  return trimmed.replace(/\s+/g, " ");
}

function buildCharacterImagePrompt({
  characterName,
  artStyleName,
  artStyleDescription,
  values,
}: {
  characterName: string;
  artStyleName: string | null;
  artStyleDescription: string | null;
  values: CharacterImageValues;
}) {
  return `
Create a square 1:1 original fictional anime-style character illustration for FevCara, a character creation and encounter app.

The image must show one original character only.
The character should appear as if they are gently materializing in a special first encounter scene.
Use a clean, soft, luminous off-white background with subtle pastel light particles.
The composition should work as a mobile character encounter screen.
Center the character clearly.
Use an upper-body or three-quarter character portrait.
Make the character appealing, memorable, polished, and expressive.
Use a non-photorealistic Japanese anime / light novel illustration look.
Do not include text, logos, UI, watermarks, captions, speech bubbles, or symbols.
Do not make it look like a real photo.
Do not imitate any existing copyrighted character, real person, celebrity, influencer, artist, studio, anime title, game title, or specific franchise.
Do not generate photorealistic, realistic, live-action, or cosplay imagery.
Do not include sexualized content.
Do not include gore or graphic violence.

Character name:
${cleanPromptValue(characterName)}

Art style preset:
${cleanPromptValue(artStyleName)}

Art style direction:
${cleanPromptValue(artStyleDescription)}

Character design notes:
- Gender / aura: ${cleanPromptValue(values.genderFeel)}
- Age impression: ${cleanPromptValue(values.ageFeel)}
- Hair color: ${cleanPromptValue(values.hairColor)}
- Eye color: ${cleanPromptValue(values.eyeColor)}
- Hairstyle: ${cleanPromptValue(values.hairstyle)}
- Outfit: ${cleanPromptValue(values.outfit)}
- Appearance details: ${cleanPromptValue(values.appearanceDetail)}
- Default expression: ${cleanPromptValue(values.defaultExpression)}
- Expression details: ${cleanPromptValue(values.expressionDetail)}
- Personality: ${cleanPromptValue(values.personality)}
- Role: ${cleanPromptValue(values.roleName)}
- Likes: ${cleanPromptValue(values.likes)}
- Dislikes: ${cleanPromptValue(values.dislikes)}
- Absolute settings: ${cleanPromptValue(values.absoluteSettings)}

Final image requirements:
A beautiful original character portrait, soft cinematic lighting, delicate linework, refined color palette, high-quality anime illustration, mobile app friendly, clean background, no text.
`.trim();
}

async function saveImageGenerationError({
  supabase,
  userId,
  characterId,
  prompt,
  error,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  characterId: string;
  prompt: string;
  error: unknown;
}) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "Unknown image generation error.";

  await supabase
    .from("characters")
    .update({
      image_prompt: prompt,
      image_generation_error: message.slice(0, 1000),
    })
    .eq("id", characterId)
    .eq("user_id", userId);
}

export async function generateAndStoreCharacterImage({
  supabase,
  userId,
  characterId,
  characterName,
  artStyleName,
  artStyleDescription,
  values,
}: GenerateAndStoreCharacterImageArgs) {
  const prompt = buildCharacterImagePrompt({
    characterName,
    artStyleName,
    artStyleDescription,
    values,
  });

  try {
    const openai = createOpenAIClient();

    const imageResponse = await openai.images.generate({
      model: getOpenAIImageModel(),
      prompt,
      size: "1024x1024",
    });

    const imageBase64 = imageResponse.data?.[0]?.b64_json;

    if (!imageBase64) {
      throw new Error("Image generation response did not include b64_json.");
    }

    const imageBuffer = Buffer.from(imageBase64, "base64");
    const storagePath = `${userId}/${characterId}/${Date.now()}.png`;

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

    const { error: updateError } = await supabase
      .from("characters")
      .update({
        image_url: imageUrl,
        image_storage_path: storagePath,
        image_prompt: prompt,
        image_generated_at: new Date().toISOString(),
        image_generation_error: null,
      })
      .eq("id", characterId)
      .eq("user_id", userId);

    if (updateError) {
      throw updateError;
    }

    return {
      imageUrl,
      storagePath,
      prompt,
    };
  } catch (error) {
    console.error("Character image generation error:", error);

    await saveImageGenerationError({
      supabase,
      userId,
      characterId,
      prompt,
      error,
    });

    return null;
  }
}
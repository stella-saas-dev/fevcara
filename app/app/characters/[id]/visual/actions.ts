"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { generateAndStoreCharacterImage } from "@/lib/fevcara/characterImage";
import {
  consumeImageCredits,
  ensureImageCreditGrants,
  getImageCreditBalance,
  getImagePlanConfig,
  refundImageCredits,
} from "@/lib/fevcara/imageCredits";
import type {
  ArtStyleForImageGeneration,
  CharacterForImageGeneration,
  CharacterImageFraming,
  CharacterImageQuality,
} from "@/lib/fevcara/characterImage";

type ProfileRow = {
  plan: string | null;
};

type CharacterImageRow = {
  id: string;
  image_url: string;
  storage_path: string;
  image_prompt: string | null;
};

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWithError(characterId: string, message: string): never {
  redirect(
    `/app/characters/${characterId}/visual?error=${encodeURIComponent(
      message,
    )}`,
  );
}

function redirectWithSuccess(characterId: string, message: string): never {
  redirect(
    `/app/characters/${characterId}/visual?success=${encodeURIComponent(
      message,
    )}`,
  );
}

function getCreditCost(quality: CharacterImageQuality) {
  if (quality === "high") {
    return 4;
  }

  return 1;
}

function getImageFraming(value: string): CharacterImageFraming {
  if (value === "upper_body") {
    return "upper_body";
  }

  return "full_body";
}

async function getAuthenticatedUser() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return {
    supabase,
    user,
  };
}

export async function generateCharacterVisual(formData: FormData) {
  const characterId = getText(formData, "characterId");
  const artStyleSlug = getText(formData, "artStyle");
  const requestedQuality = getText(formData, "imageQuality");
  const requestedFraming = getText(formData, "imageFraming");
  const backgroundPrompt = getText(formData, "backgroundPrompt");

  if (!characterId) {
    redirect("/app/characters");
  }

  if (backgroundPrompt.length > 500) {
    redirectWithError(
      characterId,
      "背景・シーン設定は500文字以内で入力してください。",
    );
  }

  const imageQuality: CharacterImageQuality =
    requestedQuality === "high" ? "high" : "medium";

  const imageFraming = getImageFraming(requestedFraming);

  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileData ?? { plan: "free" }) as ProfileRow;
  const planConfig = getImagePlanConfig(profile.plan);

  if (imageQuality === "high" && !planConfig.canUseHighQuality) {
    redirectWithError(characterId, "High品質はLite以上で利用できます。");
  }

  await ensureImageCreditGrants({
    supabase,
    userId: user.id,
    plan: profile.plan,
  });

  const { count: imageCount, error: imageCountError } = await supabase
    .from("character_images")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (imageCountError) {
    redirectWithError(characterId, "画像保存枚数の確認に失敗しました。");
  }

  if ((imageCount ?? 0) >= planConfig.imageSaveLimit) {
    redirectWithError(
      characterId,
      `${planConfig.label}プランの画像保存枚数上限 ${planConfig.imageSaveLimit} 枚に達しています。不要な画像を削除するか、上位プランを検討してください。`,
    );
  }

  const creditCost = getCreditCost(imageQuality);

  const balance = await getImageCreditBalance({
    supabase,
    userId: user.id,
  });

  if (balance < creditCost) {
    redirectWithError(
      characterId,
      `画像クレジットが足りません。必要: ${creditCost} / 残り: ${balance}`,
    );
  }

  const { data: characterData, error: characterError } = await supabase
    .from("characters")
    .select(
      `
      id,
      temporary_name,
      final_name,
      gender_feel,
      age_feel,
      hair_color,
      eye_color,
      hairstyle,
      outfit,
      appearance_detail,
      default_expression,
      expression_detail,
      personality,
      role_name,
      likes,
      dislikes,
      absolute_settings
    `,
    )
    .eq("id", characterId)
    .eq("user_id", user.id)
    .single();

  if (characterError || !characterData) {
    redirectWithError(characterId, "キャラクター情報の取得に失敗しました。");
  }

  const { data: artStyleData, error: artStyleError } = await supabase
    .from("art_style_presets")
    .select("id, slug, name, description, prompt_template, safety_note")
    .eq("slug", artStyleSlug || "midnight_anime")
    .eq("is_active", true)
    .single();

  if (artStyleError || !artStyleData) {
    redirectWithError(characterId, "絵柄プリセットの取得に失敗しました。");
  }

  const consumed = await consumeImageCredits({
    supabase,
    userId: user.id,
    plan: profile.plan,
    amount: creditCost,
    relatedCharacterId: characterId,
  });

  if (!consumed) {
    redirectWithError(characterId, "画像クレジットの消費に失敗しました。");
  }

  try {
    await generateAndStoreCharacterImage({
      supabase,
      userId: user.id,
      character: characterData as CharacterForImageGeneration,
      artStyle: artStyleData as ArtStyleForImageGeneration,
      imageQuality,
      imageFraming,
      creditCost,
      backgroundPrompt,
    });
  } catch (error) {
    console.error("Character visual generation failed:", error);

    await supabase
      .from("characters")
      .update({
        image_generation_error:
          error instanceof Error
            ? error.message.slice(0, 1000)
            : "画像生成に失敗しました。",
      })
      .eq("id", characterId)
      .eq("user_id", user.id);

    await refundImageCredits({
      supabase,
      userId: user.id,
      plan: profile.plan,
      amount: creditCost,
      relatedCharacterId: characterId,
      note: "Refund for failed image generation.",
    });

    redirectWithError(
      characterId,
      "画像生成に失敗しました。クレジットは返却しました。",
    );
  }

  revalidatePath(`/app/characters/${characterId}/visual`);

  redirectWithSuccess(characterId, "画像を生成しました。");
}

export async function selectCharacterVisual(formData: FormData) {
  const characterId = getText(formData, "characterId");
  const imageId = getText(formData, "imageId");
  const purpose = getText(formData, "purpose");

  if (!characterId || !imageId) {
    redirect("/app/characters");
  }

  if (purpose !== "background" && purpose !== "icon") {
    redirectWithError(characterId, "画像の用途が不正です。");
  }

  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const { data: imageData, error: imageError } = await supabase
    .from("character_images")
    .select("id, image_url, storage_path, image_prompt")
    .eq("id", imageId)
    .eq("character_id", characterId)
    .eq("user_id", user.id)
    .single();

  if (imageError || !imageData) {
    redirectWithError(characterId, "選択した画像が見つかりません。");
  }

  const image = imageData as CharacterImageRow;

  if (purpose === "background") {
    await supabase
      .from("character_images")
      .update({ is_background_selected: false })
      .eq("character_id", characterId)
      .eq("user_id", user.id);

    const { error: imageUpdateError } = await supabase
      .from("character_images")
      .update({ is_background_selected: true })
      .eq("id", imageId)
      .eq("user_id", user.id);

    if (imageUpdateError) {
      redirectWithError(characterId, "背景用画像の選択に失敗しました。");
    }

    const { error: characterUpdateError } = await supabase
      .from("characters")
      .update({
        background_image_id: image.id,
        image_url: image.image_url,
        image_storage_path: image.storage_path,
        image_prompt: image.image_prompt,
      })
      .eq("id", characterId)
      .eq("user_id", user.id);

    if (characterUpdateError) {
      redirectWithError(characterId, "キャラクター画像の更新に失敗しました。");
    }

    revalidatePath(`/app/characters/${characterId}/visual`);
    redirectWithSuccess(characterId, "背景用画像を選びました。");
  }

  await supabase
    .from("character_images")
    .update({ is_icon_selected: false })
    .eq("character_id", characterId)
    .eq("user_id", user.id);

  const { error: imageUpdateError } = await supabase
    .from("character_images")
    .update({ is_icon_selected: true })
    .eq("id", imageId)
    .eq("user_id", user.id);

  if (imageUpdateError) {
    redirectWithError(characterId, "アイコン用画像の選択に失敗しました。");
  }

  const { error: characterUpdateError } = await supabase
    .from("characters")
    .update({
      icon_image_id: image.id,
      icon_image_url: image.image_url,
      icon_image_storage_path: image.storage_path,
    })
    .eq("id", characterId)
    .eq("user_id", user.id);

  if (characterUpdateError) {
    redirectWithError(characterId, "キャラクターアイコンの更新に失敗しました。");
  }

  revalidatePath(`/app/characters/${characterId}/visual`);
  redirectWithSuccess(characterId, "アイコン用画像を選びました。");
}

export async function startEncounterFromVisual(formData: FormData) {
  const characterId = getText(formData, "characterId");

  if (!characterId) {
    redirect("/app/characters");
  }

  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const { data: characterData, error: characterError } = await supabase
    .from("characters")
    .select("background_image_id, icon_image_id, status")
    .eq("id", characterId)
    .eq("user_id", user.id)
    .single();

  if (characterError || !characterData) {
    redirectWithError(characterId, "キャラクター情報の確認に失敗しました。");
  }

  if (!characterData.background_image_id) {
    redirectWithError(characterId, "背景用画像を選んでください。");
  }

  if (!characterData.icon_image_id) {
    redirectWithError(characterId, "アイコン用画像を選んでください。");
  }

  if (characterData.status === "active") {
    redirect(`/app/characters/${characterId}`);
  }

  redirect(`/app/characters/${characterId}/encounter`);
}

export async function deleteCharacterVisual(formData: FormData) {
  const characterId = getText(formData, "characterId");
  const imageId = getText(formData, "imageId");

  if (!characterId || !imageId) {
    redirect("/app/characters");
  }

  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const { data: imageData, error: imageError } = await supabase
    .from("character_images")
    .select("id, storage_path")
    .eq("id", imageId)
    .eq("character_id", characterId)
    .eq("user_id", user.id)
    .single();

  if (imageError || !imageData) {
    redirectWithError(characterId, "削除する画像が見つかりません。");
  }

  const { data: characterData, error: characterError } = await supabase
    .from("characters")
    .select("background_image_id, icon_image_id")
    .eq("id", characterId)
    .eq("user_id", user.id)
    .single();

  if (characterError || !characterData) {
    redirectWithError(characterId, "キャラクター情報の確認に失敗しました。");
  }

  const updatePayload: Record<string, string | null> = {};

  if (characterData.background_image_id === imageId) {
    updatePayload.background_image_id = null;
    updatePayload.image_url = null;
    updatePayload.image_storage_path = null;
    updatePayload.image_prompt = null;
  }

  if (characterData.icon_image_id === imageId) {
    updatePayload.icon_image_id = null;
    updatePayload.icon_image_url = null;
    updatePayload.icon_image_storage_path = null;
  }

  if (Object.keys(updatePayload).length > 0) {
    const { error: characterUpdateError } = await supabase
      .from("characters")
      .update(updatePayload)
      .eq("id", characterId)
      .eq("user_id", user.id);

    if (characterUpdateError) {
      redirectWithError(characterId, "選択中画像の解除に失敗しました。");
    }
  }

  const storagePath = String(imageData.storage_path ?? "").trim();

  if (storagePath) {
    const { error: storageDeleteError } = await supabase.storage
      .from("character-images")
      .remove([storagePath]);

    if (storageDeleteError) {
      console.error("Character image storage delete error:", storageDeleteError);
    }
  }

  const { error: imageDeleteError } = await supabase
    .from("character_images")
    .delete()
    .eq("id", imageId)
    .eq("character_id", characterId)
    .eq("user_id", user.id);

  if (imageDeleteError) {
    redirectWithError(characterId, "画像の削除に失敗しました。");
  }

  revalidatePath(`/app/characters/${characterId}/visual`);
  revalidatePath(`/app/characters/${characterId}`);
  revalidatePath("/app/characters");

  redirectWithSuccess(characterId, "画像を削除しました。");
}

export async function saveCroppedCharacterIcon(formData: FormData) {
  const characterId = getText(formData, "characterId");
  const imageId = getText(formData, "imageId");
  const croppedImageDataUrl = getText(formData, "croppedImageDataUrl");

  if (!characterId || !imageId) {
    redirect("/app/characters");
  }

  if (!croppedImageDataUrl) {
    redirectWithError(characterId, "アイコン画像の切り抜きデータがありません。");
  }

  const match = croppedImageDataUrl.match(
    /^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i,
  );

  if (!match) {
    redirectWithError(characterId, "アイコン画像の形式が不正です。");
  }

  const extension = match[1]?.toLowerCase();
  const base64Data = match[2];

  if (!extension || !base64Data) {
    redirectWithError(characterId, "アイコン画像のデータが不正です。");
  }

  const mimeType = extension === "jpg" ? "image/jpeg" : `image/${extension}`;
  const imageBuffer = Buffer.from(base64Data, "base64");

  if (imageBuffer.length <= 0) {
    redirectWithError(characterId, "アイコン画像の保存データが空です。");
  }

  const { supabase, user } = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sourceImageData, error: sourceImageError } = await supabase
    .from("character_images")
    .select("id, image_url, storage_path")
    .eq("id", imageId)
    .eq("character_id", characterId)
    .eq("user_id", user.id)
    .single();

  if (sourceImageError || !sourceImageData) {
    redirectWithError(characterId, "元画像が見つかりません。");
  }

  const { data: characterData, error: characterError } = await supabase
    .from("characters")
    .select("icon_image_storage_path")
    .eq("id", characterId)
    .eq("user_id", user.id)
    .single();

  if (characterError || !characterData) {
    redirectWithError(characterId, "キャラクター情報の確認に失敗しました。");
  }

  const croppedIconId = randomUUID();
  const iconStoragePath = `${user.id}/${characterId}/icons/${croppedIconId}.png`;

  const { error: uploadError } = await supabase.storage
    .from("character-images")
    .upload(iconStoragePath, imageBuffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (uploadError) {
    redirectWithError(
      characterId,
      "切り抜きアイコンのアップロードに失敗しました。",
    );
  }

  const { data: publicUrlData } = supabase.storage
    .from("character-images")
    .getPublicUrl(iconStoragePath);

  const iconUrl = publicUrlData.publicUrl;

  await supabase
    .from("character_images")
    .update({ is_icon_selected: false })
    .eq("character_id", characterId)
    .eq("user_id", user.id);

  const { error: imageUpdateError } = await supabase
    .from("character_images")
    .update({ is_icon_selected: true })
    .eq("id", imageId)
    .eq("user_id", user.id);

  if (imageUpdateError) {
    redirectWithError(characterId, "アイコン元画像の選択に失敗しました。");
  }

  const { error: characterUpdateError } = await supabase
    .from("characters")
    .update({
      icon_image_id: imageId,
      icon_image_url: iconUrl,
      icon_image_storage_path: iconStoragePath,
    })
    .eq("id", characterId)
    .eq("user_id", user.id);

  if (characterUpdateError) {
    redirectWithError(characterId, "キャラクターアイコンの保存に失敗しました。");
  }

  const oldIconStoragePath = String(
    characterData.icon_image_storage_path ?? "",
  ).trim();

  if (
    oldIconStoragePath &&
    oldIconStoragePath !== iconStoragePath &&
    oldIconStoragePath.startsWith(`${user.id}/${characterId}/icons/`)
  ) {
    const { error: oldIconDeleteError } = await supabase.storage
      .from("character-images")
      .remove([oldIconStoragePath]);

    if (oldIconDeleteError) {
      console.error("Old cropped icon delete error:", oldIconDeleteError);
    }
  }

  revalidatePath(`/app/characters/${characterId}/visual`);
  revalidatePath(`/app/characters/${characterId}`);
  revalidatePath("/app/characters");

  redirectWithSuccess(characterId, "アイコン画像を保存しました。");
}
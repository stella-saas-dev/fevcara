import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { IconCropEditor } from "./IconCropEditor";

type IconCropPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    imageId?: string;
  }>;
};

type CharacterRow = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;
};

type CharacterImageRow = {
  id: string;
  image_url: string;
};

function getCharacterName(character: CharacterRow) {
  return (
    character.final_name ||
    character.temporary_name ||
    "名前のないキャラクター"
  );
}

function redirectToVisualWithError(characterId: string, message: string): never {
  redirect(
    `/app/characters/${characterId}/visual?error=${encodeURIComponent(
      message,
    )}`,
  );
}

export default async function IconCropPage({
  params,
  searchParams,
}: IconCropPageProps) {
  const { id } = await params;
  const query = await searchParams;
  const imageId = String(query.imageId ?? "").trim();

  if (!imageId) {
    redirectToVisualWithError(id, "調整する画像を選んでください。");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: characterData, error: characterError } = await supabase
    .from("characters")
    .select("id, temporary_name, final_name")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (characterError || !characterData) {
    redirect("/app/characters");
  }

  const character = characterData as CharacterRow;

  const { data: imageData, error: imageError } = await supabase
    .from("character_images")
    .select("id, image_url")
    .eq("id", imageId)
    .eq("character_id", character.id)
    .eq("user_id", user.id)
    .single();

  if (imageError || !imageData) {
    redirectToVisualWithError(character.id, "調整する画像が見つかりません。");
  }

  const image = imageData as CharacterImageRow;
  const characterName = getCharacterName(character);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(190,242,100,0.12),transparent_34%),#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <Link
            href={`/app/characters/${character.id}/visual`}
            className="text-sm text-[#A7B0C0] hover:text-[#F4F1EA]"
          >
            ← ビジュアル設定へ戻る
          </Link>

          <p className="mt-8 text-sm font-semibold tracking-[0.24em] text-[#7DD3FC]">
            ICON CROP
          </p>
          <h1 className="mt-2 text-3xl font-black">
            {characterName}のアイコンを調整する
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#A7B0C0]">
            画像を拡大・移動して、チャットで見やすいアイコンに調整します。
          </p>
        </header>

        <IconCropEditor
          characterId={character.id}
          imageId={image.id}
          imageUrl={image.image_url}
        />
      </section>
    </main>
  );
}
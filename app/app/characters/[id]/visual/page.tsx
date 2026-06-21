import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import {
  ensureImageCreditGrants,
  getImageCreditBalance,
  getImagePlanConfig,
} from "@/lib/fevcara/imageCredits";
import {
  deleteCharacterVisual,
  generateCharacterVisual,
  selectCharacterVisual,
  startEncounterFromVisual,
} from "./actions";

type VisualPageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

type ProfileRow = {
  plan: string | null;
};

type CharacterRow = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;
  status: string | null;
  art_style_preset_id: string | null;
  background_image_id: string | null;
  icon_image_id: string | null;
  image_url: string | null;
  icon_image_url: string | null;
};

type ArtStyleRow = {
  id: string;
  slug: string;
  name: string | null;
  description: string | null;
  sort_order: number | null;
};

type CharacterImageRow = {
  id: string;
  image_url: string;
  image_quality: string | null;
  credit_cost: number | null;
  is_background_selected: boolean | null;
  is_icon_selected: boolean | null;
  created_at: string | null;
};

function getCharacterName(character: CharacterRow) {
  return (
    character.final_name ||
    character.temporary_name ||
    "名前のないキャラクター"
  );
}

function getPreviewClass(slug: string) {
  if (slug === "midnight_anime") {
    return "bg-[radial-gradient(circle_at_35%_30%,_#FCE7F3_0_8%,_transparent_9%),radial-gradient(circle_at_65%_30%,_#FDE68A_0_8%,_transparent_9%),linear-gradient(135deg,_#831843,_#312E81)]";
  }

  if (slug === "shonen_manga") {
    return "bg-[radial-gradient(circle_at_35%_32%,_#FFFFFF_0_8%,_transparent_9%),radial-gradient(circle_at_65%_32%,_#F97316_0_8%,_transparent_9%),linear-gradient(135deg,_#111827,_#DC2626)]";
  }

  if (slug === "light_novel") {
    return "bg-[radial-gradient(circle_at_35%_35%,_#E0F2FE_0_9%,_transparent_10%),radial-gradient(circle_at_65%_35%,_#FBCFE8_0_9%,_transparent_10%),linear-gradient(135deg,_#7DD3FC,_#C4B5FD)]";
  }

  if (slug === "cel_anime") {
    return "bg-[radial-gradient(circle_at_35%_32%,_#FFFFFF_0_8%,_transparent_9%),radial-gradient(circle_at_65%_32%,_#FACC15_0_8%,_transparent_9%),linear-gradient(135deg,_#2563EB,_#22C55E)]";
  }

  if (slug === "webtoon") {
    return "bg-[radial-gradient(circle_at_35%_32%,_#FFFFFF_0_8%,_transparent_9%),radial-gradient(circle_at_65%_32%,_#7DD3FC_0_8%,_transparent_9%),linear-gradient(135deg,_#EC4899,_#22C55E)]";
  }

  if (slug === "chibi") {
    return "bg-[radial-gradient(circle_at_35%_30%,_#FFFFFF_0_11%,_transparent_12%),radial-gradient(circle_at_65%_30%,_#FDE68A_0_11%,_transparent_12%),linear-gradient(135deg,_#F9A8D4,_#A7F3D0)]";
  }

  if (slug === "fantasy") {
    return "bg-[radial-gradient(circle_at_35%_35%,_#A78BFA_0_8%,_transparent_9%),radial-gradient(circle_at_65%_35%,_#FACC15_0_7%,_transparent_8%),linear-gradient(135deg,_#111827,_#581C87)]";
  }

  return "bg-[radial-gradient(circle_at_35%_32%,_#FFFFFF_0_8%,_transparent_9%),radial-gradient(circle_at_65%_32%,_#BEF264_0_8%,_transparent_9%),linear-gradient(135deg,_#1E293B,_#0B1020)]";
}

function formatDate(value: string | null) {
  if (!value) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export default async function CharacterVisualPage({
  params,
  searchParams,
}: VisualPageProps) {
  const { id } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  await ensureImageCreditGrants({
    supabase,
    userId: user.id,
    plan: profile.plan,
  });

  const balance = await getImageCreditBalance({
    supabase,
    userId: user.id,
  });

  const { data: characterData, error: characterError } = await supabase
    .from("characters")
    .select(
      `
      id,
      temporary_name,
      final_name,
      status,
      art_style_preset_id,
      background_image_id,
      icon_image_id,
      image_url,
      icon_image_url
    `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (characterError || !characterData) {
    redirect("/app/characters");
  }

  const character = characterData as CharacterRow;

  const { data: artStyleData } = await supabase
    .from("art_style_presets")
    .select("id, slug, name, description, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const artStyles = (artStyleData ?? []) as ArtStyleRow[];

  const { data: imageData } = await supabase
    .from("character_images")
    .select(
      `
      id,
      image_url,
      image_quality,
      credit_cost,
      is_background_selected,
      is_icon_selected,
      created_at
    `,
    )
    .eq("character_id", character.id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const images = (imageData ?? []) as CharacterImageRow[];

  let imageCountQuery = supabase
    .from("character_images")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (planConfig.imageSaveLimitScope === "character") {
    imageCountQuery = imageCountQuery.eq("character_id", character.id);
  }

  const { count: scopedImageCount } = await imageCountQuery;

    const characterName = getCharacterName(character);
  const savedImageCount = scopedImageCount ?? 0;

  const saveLimitTitle =
    planConfig.imageSaveLimitScope === "character" ? "キャラ画像" : "保存画像";

  const saveLimitHelperText =
    planConfig.imageSaveLimitScope === "character"
      ? `${planConfig.label}はこのキャラクターごとに最大${planConfig.imageSaveLimit}枚まで保存できます。`
      : `${planConfig.label}はアカウント全体で最大${planConfig.imageSaveLimit}枚まで保存できます。`;

  const saveLimitPercent = Math.min(
    100,
    Math.round((savedImageCount / planConfig.imageSaveLimit) * 100),
  );
  const isNearSaveLimit = saveLimitPercent >= 80;
  const selectedBackgroundImage = images.find((image) =>
    Boolean(image.is_background_selected),
  );
  const selectedIconSourceImage = images.find((image) =>
    Boolean(image.is_icon_selected),
  );
  const currentBackgroundUrl = character.image_url || selectedBackgroundImage?.image_url;
  const currentIconUrl = character.icon_image_url || selectedIconSourceImage?.image_url;
  const canStartEncounter =
    Boolean(character.background_image_id) && Boolean(character.icon_image_id);
  const isEncounterCompleted = character.status === "active";

  const defaultArtStyleId =
    character.art_style_preset_id || artStyles[0]?.id || "";
  const defaultArtStyleSlug =
    artStyles.find((style) => style.id === defaultArtStyleId)?.slug ||
    artStyles[0]?.slug ||
    "midnight_anime";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.12),transparent_34%),#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <Link
            href="/app/characters"
            className="text-sm text-[#A7B0C0] hover:text-[#F4F1EA]"
          >
            ← キャラクター一覧へ戻る
          </Link>

          <div className="mt-8 rounded-[2rem] border border-white/10 bg-[#111827]/70 p-5 shadow-2xl shadow-black/30">
            <div className="flex items-start gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-3xl border border-white/15 bg-white/[0.05] shadow-lg shadow-black/30">
                {currentIconUrl ? (
                  <img
                    src={currentIconUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : currentBackgroundUrl ? (
                  <img
                    src={currentBackgroundUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1E293B] to-[#0B1020] text-xl font-black text-[#BEF264]">
                    {characterName.slice(0, 1)}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-xs font-black tracking-[0.2em] text-[#FACC15]">
                  CHARACTER VISUAL
                </p>
                <h1 className="mt-2 break-words text-3xl font-black leading-tight">
                  {characterName}の姿を決める
                </h1>
                <p className="mt-2 text-xs font-bold text-[#A7B0C0]">
                  {isEncounterCompleted
                    ? "出会い済み：変更後は詳細ページへ戻ります"
                    : "出会い前：背景とアイコンを選ぶと会いに行けます"}
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm leading-7 text-[#A7B0C0]">
              絵柄・背景・構図を選んで画像を生成し、背景用画像とアイコン用画像を決めます。
              ここで選んだ姿が、ホーム・詳細・チャット画面でキャラクターの存在感になります。
            </p>
          </div>
        </header>

        {query.error ? (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm font-bold leading-6 text-red-100">
            {query.error}
          </div>
        ) : null}

        {query.success ? (
          <div className="mt-6 rounded-2xl border border-[#BEF264]/30 bg-[#BEF264]/10 p-4 text-sm font-bold leading-6 text-[#D9F99D]">
            {query.success}
          </div>
        ) : null}

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-[#7DD3FC]">
                IMAGE STATUS
              </p>
              <h2 className="mt-2 text-2xl font-black">
                残り {balance} クレジット
              </h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-[#FACC15]/25 bg-[#FACC15]/10 px-3 py-1 text-xs font-black text-[#FDE68A]">
                  {planConfig.label}
                </span>

                <span className="text-sm font-bold text-[#D6DCE8]">
                  {saveLimitTitle}{" "}
                  <span className="font-black text-[#F4F1EA]">
                    {savedImageCount}/{planConfig.imageSaveLimit}枚
                  </span>
                </span>
              </div>

              <p className="mt-2 text-xs leading-5 text-[#7D8AA3]">
                {saveLimitHelperText}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-[#FACC15]/20 bg-[#FACC15]/10 px-4 py-3 text-center">
              <p className="text-xl font-black text-[#FDE68A]">1</p>
              <p className="mt-1 text-[10px] font-semibold text-[#FDE68A]">
                Medium
              </p>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#BEF264] to-[#7DD3FC]"
              style={{ width: `${saveLimitPercent}%` }}
            />
          </div>

          <p
            className={[
              "mt-3 text-xs leading-6",
              isNearSaveLimit ? "text-[#FDE68A]" : "text-[#7D8AA3]",
            ].join(" ")}
          >
            Medium品質は1クレジット、High品質は4クレジット消費します。
            High品質はLite以上で利用できます。
            {isNearSaveLimit
              ? " 保存上限が近いので、不要な画像は整理しておくと安心です。"
              : ""}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div
              className={[
                "rounded-3xl border p-3",
                currentBackgroundUrl
                  ? "border-[#BEF264]/25 bg-[#BEF264]/10"
                  : "border-white/10 bg-white/[0.04]",
              ].join(" ")}
            >
              <p className="text-[11px] font-black tracking-[0.16em] text-[#BEF264]">
                BACKGROUND
              </p>
              <div className="mt-3 aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                {currentBackgroundUrl ? (
                  <img
                    src={currentBackgroundUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] leading-5 text-[#7D8AA3]">
                    未選択
                  </div>
                )}
              </div>
            </div>

            <div
              className={[
                "rounded-3xl border p-3",
                currentIconUrl
                  ? "border-[#7DD3FC]/25 bg-[#7DD3FC]/10"
                  : "border-white/10 bg-white/[0.04]",
              ].join(" ")}
            >
              <p className="text-[11px] font-black tracking-[0.16em] text-[#7DD3FC]">
                ICON
              </p>
              <div className="mt-3 aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                {currentIconUrl ? (
                  <img
                    src={currentIconUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center px-3 text-center text-[11px] leading-5 text-[#7D8AA3]">
                    未選択
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <form
          action={generateCharacterVisual}
          className="mt-6 rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30"
        >
          <input type="hidden" name="characterId" value={character.id} />

          <p className="text-xs font-black tracking-[0.2em] text-[#BEF264]">
            GENERATE
          </p>
          <h2 className="mt-2 text-xl font-black">新しい画像を生成する</h2>
          <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
            1枚生成したあと、保存済み画像から「背景用」と「アイコン用」を選びます。
            迷ったら、まずは全身・Mediumで背景用を作るのがおすすめです。
          </p>

          <div className="mt-5 rounded-3xl border border-[#BEF264]/20 bg-[#BEF264]/10 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#BEF264] text-xs font-black text-[#07111F]">
                1
              </span>
              <div>
                <p className="text-sm font-black text-[#D9F99D]">
                  絵柄プリセット
                </p>
                <p className="mt-1 text-xs leading-5 text-[#A7B0C0]">
                  FevCara用の安全なオリジナル絵柄だけを選べます。
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {artStyles.map((style, index) => (
                <label
                  key={style.id}
                  className="block cursor-pointer rounded-3xl border border-white/10 bg-[#0B1020]/40 p-4 transition hover:border-[#BEF264]/40 hover:bg-white/[0.07]"
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="radio"
                      name="artStyle"
                      value={style.slug}
                      defaultChecked={
                        style.slug === defaultArtStyleSlug ||
                        (!defaultArtStyleSlug && index === 0)
                      }
                      className="shrink-0 accent-[#BEF264]"
                    />

                    <div
                      className={[
                        "relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-lg shadow-black/30",
                        getPreviewClass(style.slug),
                      ].join(" ")}
                    >
                      <div className="absolute bottom-0 left-1/2 h-8 w-8 -translate-x-1/2 rounded-t-full bg-black/25" />
                      <div className="absolute left-1/2 top-3 h-7 w-7 -translate-x-1/2 rounded-full border border-white/20 bg-white/15 backdrop-blur-sm" />
                    </div>

                    <div>
                      <p className="text-sm font-black text-[#F4F1EA]">
                        {style.name ?? style.slug}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[#A7B0C0]">
                        {style.description ??
                          "オリジナルキャラクター用の絵柄です。"}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#7DD3FC] text-xs font-black text-[#07111F]">
                2
              </span>
              <div>
                <p className="text-sm font-black text-[#BAE6FD]">
                  背景・シーン設定
                </p>
                <p className="mt-1 text-xs leading-5 text-[#A7B0C0]">
                  キャラの後ろにある場所や光を指定します。
                </p>
              </div>
            </div>

            <label className="mt-4 block">
              <textarea
                name="backgroundPrompt"
                rows={5}
                maxLength={500}
                placeholder="例：星空の下、淡い月明かりが差す静かな屋上。背景は幻想的で、キャラクターの顔・髪・服・シルエットが見やすい構図。"
                className="w-full resize-none rounded-2xl border border-white/10 bg-[#0B1020]/70 px-4 py-3 text-sm leading-6 text-[#F4F1EA] outline-none placeholder:text-[#6B7280] focus:border-[#7DD3FC]/60"
              />
            </label>

            <div className="mt-3 grid gap-2 text-[11px] leading-5 text-[#A7B0C0]">
              <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                おすすめ：星空、海辺、森、教室、部屋、街角、図書館、屋上、夕暮れ、月明かり
              </div>
              <div className="rounded-2xl border border-red-300/20 bg-red-400/10 p-3 text-red-100/90">
                避ける指定：実在人物、既存キャラ、特定作品風、特定作家風、写真風、フォトリアル
              </div>
            </div>
          </div>

          <div className="mt-5 rounded-3xl border border-white/10 bg-black/15 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-[#FACC15] text-xs font-black text-[#07111F]">
                3
              </span>
              <div>
                <p className="text-sm font-black text-[#FDE68A]">
                  構図と品質
                </p>
                <p className="mt-1 text-xs leading-5 text-[#A7B0C0]">
                  使いたい用途に合わせて選びます。
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#BEF264]/25 bg-[#BEF264]/10 p-4">
                <input
                  type="radio"
                  name="imageFraming"
                  value="full_body"
                  defaultChecked
                  className="mt-1 shrink-0 accent-[#BEF264]"
                />
                <span>
                  <span className="block text-sm font-black text-[#D9F99D]">
                    全身 / 背景・出会いイベント向き
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#A7B0C0]">
                    頭から足先まで入る構図。ホームや詳細の正方形カードにも使いやすいです。
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-[#7DD3FC]/25 bg-[#7DD3FC]/10 p-4">
                <input
                  type="radio"
                  name="imageFraming"
                  value="upper_body"
                  className="mt-1 shrink-0 accent-[#7DD3FC]"
                />
                <span>
                  <span className="block text-sm font-black text-[#BAE6FD]">
                    上半身 / アイコン向き
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#A7B0C0]">
                    顔・髪・肩まわりが大きく見える構図。生成後にトリミングしてアイコンにします。
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <input
                  type="radio"
                  name="imageQuality"
                  value="medium"
                  defaultChecked
                  className="mt-1 shrink-0 accent-[#BEF264]"
                />
                <span>
                  <span className="block text-sm font-black text-[#F4F1EA]">
                    Medium / 1クレジット
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#A7B0C0]">
                    まず試すならこちら。MVPでは基本品質として扱います。
                  </span>
                </span>
              </label>

              <label
                className={[
                  "flex items-start gap-3 rounded-2xl border p-4",
                  planConfig.canUseHighQuality
                    ? "cursor-pointer border-[#FACC15]/25 bg-[#FACC15]/10"
                    : "cursor-not-allowed border-white/10 bg-white/[0.03] opacity-50",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="imageQuality"
                  value="high"
                  disabled={!planConfig.canUseHighQuality}
                  className="mt-1 shrink-0 accent-[#FACC15]"
                />
                <span>
                  <span className="block text-sm font-black text-[#FDE68A]">
                    High / 4クレジット
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#A7B0C0]">
                    Lite以上で利用できます。決定版にしたい画像向きです。
                  </span>
                </span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={balance <= 0}
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            画像を生成する
          </button>

          {balance <= 0 ? (
            <p className="mt-3 text-center text-xs font-bold leading-5 text-[#FDE68A]">
              クレジットが不足しています。次回付与、または追加購入導線の実装後に生成できます。
            </p>
          ) : null}
        </form>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30">
          <p className="text-xs font-black tracking-[0.2em] text-[#FACC15]">
            GENERATED IMAGES
          </p>
          <h2 className="mt-2 text-xl font-black">保存済み画像</h2>
          <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
            画像ごとに、背景用にするか、アイコンとしてトリミングするかを選びます。
            同じ画像を両方に使っても大丈夫です。
          </p>

          {images.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center">
              <p className="text-sm font-black text-[#F4F1EA]">
                まだ画像がありません
              </p>
              <p className="mt-2 text-xs leading-6 text-[#A7B0C0]">
                まずは絵柄・背景・構図を選んで、最初の1枚を生成してみましょう。
              </p>
            </div>
          ) : (
            <div className="mt-5 grid gap-5">
              {images.map((image) => {
                const isBackgroundSelected = Boolean(
                  image.is_background_selected,
                );
                const isIconSelected = Boolean(image.is_icon_selected);
                const selectionLabel =
                  isBackgroundSelected && isIconSelected
                    ? "背景用・アイコン元画像"
                    : isBackgroundSelected
                      ? "背景用画像"
                      : isIconSelected
                        ? "アイコン元画像"
                        : "未使用";

                return (
                  <article
                    key={image.id}
                    className={[
                      "overflow-hidden rounded-[2rem] border bg-white/[0.04]",
                      isBackgroundSelected || isIconSelected
                        ? "border-[#BEF264]/25 shadow-lg shadow-[#BEF264]/5"
                        : "border-white/10",
                    ].join(" ")}
                  >
                    <div className="relative aspect-square bg-[#0B1020]">
                      <img
                        src={image.image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute inset-x-0 top-0 flex flex-wrap gap-2 bg-gradient-to-b from-black/70 to-transparent p-3">
                        {isBackgroundSelected ? (
                          <span className="rounded-full bg-[#BEF264] px-3 py-1 text-[10px] font-black text-[#07111F]">
                            背景用
                          </span>
                        ) : null}

                        {isIconSelected ? (
                          <span className="rounded-full bg-[#7DD3FC] px-3 py-1 text-[10px] font-black text-[#07111F]">
                            アイコン元
                          </span>
                        ) : null}

                        {!isBackgroundSelected && !isIconSelected ? (
                          <span className="rounded-full bg-black/50 px-3 py-1 text-[10px] font-black text-white/80 backdrop-blur">
                            未使用
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 text-xs text-[#A7B0C0]">
                        <div>
                          <p className="font-black text-[#F4F1EA]">
                            {selectionLabel}
                          </p>
                          <p className="mt-1">
                            {image.image_quality === "high"
                              ? "High"
                              : "Medium"}{" "}
                            / {image.credit_cost ?? 1} credit
                          </p>
                        </div>
                        <span className="shrink-0">{formatDate(image.created_at)}</span>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <form action={selectCharacterVisual}>
                          <input
                            type="hidden"
                            name="characterId"
                            value={character.id}
                          />
                          <input type="hidden" name="imageId" value={image.id} />
                          <input
                            type="hidden"
                            name="purpose"
                            value="background"
                          />
                          <button
                            type="submit"
                            className={[
                              "w-full rounded-2xl px-4 py-3 text-xs font-black transition",
                              isBackgroundSelected
                                ? "border border-[#BEF264]/40 bg-[#BEF264]/20 text-[#D9F99D]"
                                : "border border-white/10 bg-white/[0.04] text-[#F4F1EA] hover:border-[#BEF264]/35",
                            ].join(" ")}
                          >
                            {isBackgroundSelected
                              ? "背景用に選択中"
                              : "背景用にする"}
                          </button>
                        </form>

                        <Link
                          href={`/app/characters/${character.id}/visual/icon-crop?imageId=${image.id}`}
                          className={[
                            "block w-full rounded-2xl px-4 py-3 text-center text-xs font-black transition",
                            isIconSelected
                              ? "border border-[#7DD3FC]/40 bg-[#7DD3FC]/20 text-[#BAE6FD]"
                              : "border border-white/10 bg-white/[0.04] text-[#F4F1EA] hover:border-[#7DD3FC]/35",
                          ].join(" ")}
                        >
                          {isIconSelected
                            ? "アイコンを再トリミング"
                            : "アイコンとしてトリミング"}
                        </Link>
                      </div>

                      <details className="mt-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-3">
                        <summary className="cursor-pointer text-xs font-black text-red-100">
                          削除メニューを開く
                        </summary>

                        <p className="mt-2 text-xs leading-5 text-red-100/80">
                          この画像を削除します。背景用・アイコン用に選択中の場合は、その設定も解除されます。
                          消費済みクレジットは返却されません。
                        </p>

                        <form action={deleteCharacterVisual} className="mt-3">
                          <input
                            type="hidden"
                            name="characterId"
                            value={character.id}
                          />
                          <input type="hidden" name="imageId" value={image.id} />
                          <button
                            type="submit"
                            className="w-full rounded-2xl border border-red-300/30 bg-red-400/20 px-4 py-3 text-xs font-black text-red-50 transition hover:bg-red-400/30"
                          >
                            この画像を削除する
                          </button>
                        </form>
                      </details>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-6 rounded-[2rem] border border-[#BEF264]/20 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30">
          <p className="text-xs font-black tracking-[0.2em] text-[#BEF264]">
            NEXT
          </p>

          <h2 className="mt-2 text-xl font-black">
            {isEncounterCompleted
              ? "ビジュアル設定を保存する"
              : "キャラクターに会いに行く"}
          </h2>

          <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
            {isEncounterCompleted
              ? "背景用画像とアイコン用画像の設定を確認して、キャラクター詳細へ戻ります。出会いイベントはもう一度発生しません。"
              : "背景用画像とアイコン用画像を選ぶと、出会いイベントへ進めます。"}
          </p>

          <div className="mt-4 grid gap-3">
            <div
              className={[
                "rounded-2xl border p-4",
                character.background_image_id
                  ? "border-[#BEF264]/25 bg-[#BEF264]/10"
                  : "border-white/10 bg-white/[0.04]",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  {currentBackgroundUrl ? (
                    <img
                      src={currentBackgroundUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div>
                  <p className="text-sm font-black">
                    背景用画像：
                    {character.background_image_id ? "選択済み" : "未選択"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#A7B0C0]">
                    ホーム・詳細・チャット背景のメイン画像になります。
                  </p>
                </div>
              </div>
            </div>

            <div
              className={[
                "rounded-2xl border p-4",
                character.icon_image_id
                  ? "border-[#7DD3FC]/25 bg-[#7DD3FC]/10"
                  : "border-white/10 bg-white/[0.04]",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20">
                  {currentIconUrl ? (
                    <img
                      src={currentIconUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div>
                  <p className="text-sm font-black">
                    アイコン用画像：
                    {character.icon_image_id ? "選択済み" : "未選択"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#A7B0C0]">
                    一覧・チャット吹き出し横に表示されます。
                  </p>
                </div>
              </div>
            </div>
          </div>

          {canStartEncounter ? (
            isEncounterCompleted ? (
              <Link
                href={`/app/characters/${character.id}`}
                className="mt-5 block w-full rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
              >
                設定を保存して詳細へ戻る
              </Link>
            ) : (
              <form action={startEncounterFromVisual} className="mt-5">
                <input type="hidden" name="characterId" value={character.id} />
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
                >
                  キャラクターに会いに行く
                </button>
              </form>
            )
          ) : (
            <button
              type="button"
              disabled
              className="mt-5 w-full cursor-not-allowed rounded-2xl bg-white/[0.08] px-5 py-4 text-sm font-black text-[#7D8AA3]"
            >
              背景用・アイコン用を設定すると
              {isEncounterCompleted ? "保存できます" : "進めます"}
            </button>
          )}
        </section>
      </section>

      <AppBottomNav />
    </main>
  );
}

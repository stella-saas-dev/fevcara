"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PlanTier = "free" | "premium_lite" | "premium";

type ProfileForGroupChat = {
  plan: string | null;
  created_at: string | null;
};

type CharacterForGroupChat = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;
  role_name: string | null;
  status: string | null;
};

const FREE_TRIAL_BOOST_HOURS = 72;
const GROUP_CHAT_MAX_MEMBERS = 3;

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function normalizePlan(plan: string | null) {
  return (plan || "free").trim().toLowerCase().replace(/\s+/g, "_");
}

function getPlanTier(plan: string | null): PlanTier {
  const normalizedPlan = normalizePlan(plan);

  if (normalizedPlan.includes("lite")) {
    return "premium_lite";
  }

  if (
    normalizedPlan.includes("premium") ||
    normalizedPlan.includes("pro") ||
    normalizedPlan.includes("paid")
  ) {
    return "premium";
  }

  return "free";
}

function isFreeTrialBoostActive({
  plan,
  createdAt,
}: {
  plan: string | null;
  createdAt: string | null | undefined;
}) {
  if (getPlanTier(plan) !== "free" || !createdAt) {
    return false;
  }

  const createdAtTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdAtTime)) {
    return false;
  }

  const endsAtTime =
    createdAtTime + FREE_TRIAL_BOOST_HOURS * 60 * 60 * 1000;

  return Date.now() < endsAtTime;
}

function canUseGroupChat(profile: ProfileForGroupChat) {
  const planTier = getPlanTier(profile.plan);

  if (planTier === "premium" || planTier === "premium_lite") {
    return true;
  }

  return isFreeTrialBoostActive({
    plan: profile.plan,
    createdAt: profile.created_at,
  });
}

function getCharacterName(character: CharacterForGroupChat) {
  return (
    character.final_name ||
    character.temporary_name ||
    "名前のないキャラクター"
  );
}

function redirectWithError(message: string): never {
  redirect(`/app/chats/group/new?error=${encodeURIComponent(message)}`);
}

export async function createGroupChat(formData: FormData) {
  const requestedTitle = getText(formData, "title");
  const selectedCharacterIds = Array.from(
    new Set(
      formData
        .getAll("characterIds")
        .map((value) => String(value ?? "").trim())
        .filter((value) => value.length > 0),
    ),
  );

  if (requestedTitle.length > 50) {
    redirectWithError("グループ名は50文字以内で入力してください。");
  }

  if (selectedCharacterIds.length < 2) {
    redirectWithError("グループチャットには2人以上のキャラクターを選んでください。");
  }

  if (selectedCharacterIds.length > GROUP_CHAT_MAX_MEMBERS) {
    redirectWithError(
      `最初のグループチャットでは${GROUP_CHAT_MAX_MEMBERS}人まで選べます。`,
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("plan, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    redirectWithError("プロフィール情報の確認に失敗しました。");
  }

  const profile = (profileData ?? {
    plan: "free",
    created_at: user.created_at ?? null,
  }) as ProfileForGroupChat;

  if (!canUseGroupChat(profile)) {
    redirectWithError(
      "グループチャットはLite以上、または初回72時間トライアル中に利用できます。",
    );
  }

  const { data: charactersData, error: charactersError } = await supabase
    .from("characters")
    .select(
      `
      id,
      temporary_name,
      final_name,
      role_name,
      status
    `,
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("id", selectedCharacterIds);

  if (charactersError) {
    redirectWithError("キャラクター情報の取得に失敗しました。");
  }

  const fetchedCharacters = (charactersData ?? []) as CharacterForGroupChat[];

  if (fetchedCharacters.length !== selectedCharacterIds.length) {
    redirectWithError(
      "選択したキャラクターの中に、利用できないキャラクターが含まれています。",
    );
  }

  const characterMap = new Map(
    fetchedCharacters.map((character) => [character.id, character]),
  );

  const selectedCharacters = selectedCharacterIds
    .map((characterId) => characterMap.get(characterId) ?? null)
    .filter((character): character is CharacterForGroupChat =>
      Boolean(character),
    );

  const characterNames = selectedCharacters.map(getCharacterName);

  const title =
    requestedTitle ||
    `${characterNames.slice(0, GROUP_CHAT_MAX_MEMBERS).join("・")}のグループ`;

  const { data: threadData, error: threadError } = await supabase
    .from("chat_threads")
    .insert({
      user_id: user.id,
      title,
      chat_type: "group",
      character_id: null,
    })
    .select("id")
    .single();

  if (threadError || !threadData) {
    redirectWithError("グループチャットの作成に失敗しました。");
  }

  const thread = threadData as { id: string };

  const memberRows = selectedCharacters.map((character, index) => ({
    thread_id: thread.id,
    user_id: user.id,
    character_id: character.id,
    display_order: index,
  }));

  const { error: membersError } = await supabase
    .from("group_chat_members")
    .insert(memberRows);

  if (membersError) {
    await supabase
      .from("chat_threads")
      .delete()
      .eq("id", thread.id)
      .eq("user_id", user.id);

    redirectWithError("グループメンバーの保存に失敗しました。");
  }

  revalidatePath("/app/chats");
  redirect(`/app/chat/${thread.id}`);
}
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeGroupIconColor } from "@/lib/fevcara/groupIcon";
import {
  GROUP_ROLE_MAX_TAGS,
  normalizeGroupRoleTags,
} from "@/lib/fevcara/groupRoles";

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
const GROUP_CHAT_STANDARD_MAX_MEMBERS = 3;
const GROUP_CHAT_PREMIUM_MAX_MEMBERS = 10;
const GROUP_CHAT_TITLE_NAME_LIMIT = 3;

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

function getGroupChatMaxMembers(profile: ProfileForGroupChat) {
  const planTier = getPlanTier(profile.plan);

  if (planTier === "premium") {
    return GROUP_CHAT_PREMIUM_MAX_MEMBERS;
  }

  return GROUP_CHAT_STANDARD_MAX_MEMBERS;
}

function getGroupChatLimitLabel(profile: ProfileForGroupChat) {
  const planTier = getPlanTier(profile.plan);

  if (planTier === "premium") {
    return "Premium";
  }

  if (planTier === "premium_lite") {
    return "Lite";
  }

  if (
    isFreeTrialBoostActive({
      plan: profile.plan,
      createdAt: profile.created_at,
    })
  ) {
    return "Free Trial";
  }

  return "Free";
}

function getCharacterName(character: CharacterForGroupChat) {
  return (
    character.final_name ||
    character.temporary_name ||
    "名前のないキャラクター"
  );
}

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function buildDefaultGroupTitle(characterNames: string[]) {
  const visibleNames = characterNames.slice(0, GROUP_CHAT_TITLE_NAME_LIMIT);
  const hiddenCount = Math.max(0, characterNames.length - visibleNames.length);

  const baseTitle =
    hiddenCount > 0
      ? `${visibleNames.join("・")} 他${hiddenCount}人のグループ`
      : `${visibleNames.join("・")}のグループ`;

  return truncateText(baseTitle, 50);
}

function redirectWithError(message: string): never {
  return redirect(`/app/chats/group/new?error=${encodeURIComponent(message)}`);
}

export async function createGroupChat(formData: FormData) {
  const requestedTitle = getText(formData, "title");
  const groupIconColor = normalizeGroupIconColor(
    getText(formData, "groupIconColor"),
  );

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

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect("/login");
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

  const maxMembers = getGroupChatMaxMembers(profile);

  if (selectedCharacterIds.length > maxMembers) {
    redirectWithError(
      `${getGroupChatLimitLabel(profile)}では最大${maxMembers}人まで選べます。`,
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
  const title = requestedTitle || buildDefaultGroupTitle(characterNames);

  const { data: threadData, error: threadError } = await supabase
    .from("chat_threads")
    .insert({
      user_id: user.id,
      title,
      chat_type: "group",
      character_id: null,
      group_icon_color: groupIconColor,
    })
    .select("id")
    .single();

  if (threadError || !threadData) {
    redirectWithError("グループチャットの作成に失敗しました。");
  }

  const thread = threadData as { id: string };

  const memberRows = selectedCharacters.map((character, index) => {
    const groupRoleTags = normalizeGroupRoleTags(
      formData.getAll(`groupRoleTags:${character.id}`),
    );

    if (groupRoleTags.length > GROUP_ROLE_MAX_TAGS) {
      redirectWithError(
        `${getCharacterName(character)}のグループ内役割は最大${GROUP_ROLE_MAX_TAGS}個まで選べます。`,
      );
    }

    return {
      thread_id: thread.id,
      user_id: user.id,
      character_id: character.id,
      display_order: index,
      group_role_tags: groupRoleTags,
    };
  });

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

  return redirect(`/app/chat/${thread.id}`);
}

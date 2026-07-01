"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { normalizeGroupIconColor } from "@/lib/fevcara/groupIcon";
import {
  GROUP_ROLE_MAX_TAGS,
  normalizeGroupRoleTags,
} from "@/lib/fevcara/groupRoles";
import { createClient } from "@/lib/supabase/server";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWithError(threadId: string, message: string): never {
  redirect(
    `/app/chats/group/${threadId}/settings?error=${encodeURIComponent(message)}`,
  );
}

export async function updateGroupChatSettings(formData: FormData) {
  const threadId = getText(formData, "threadId");
  const title = getText(formData, "title");
  const groupIconColor = normalizeGroupIconColor(
    getText(formData, "groupIconColor"),
  );

  if (!threadId) {
    redirect("/app/chats");
  }

  if (!title) {
    redirectWithError(threadId, "グループ名を入力してください。");
  }

  if (title.length > 50) {
    redirectWithError(threadId, "グループ名は50文字以内で入力してください。");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: threadData, error: threadFetchError } = await supabase
    .from("chat_threads")
    .select("id, chat_type")
    .eq("id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (threadFetchError || !threadData) {
    redirectWithError(threadId, "グループチャットの確認に失敗しました。");
  }

  const thread = threadData as { id: string; chat_type: string | null };

  if (thread.chat_type !== "group") {
    redirectWithError(threadId, "グループチャットだけ編集できます。");
  }

  const { data: membersData, error: membersFetchError } = await supabase
    .from("group_chat_members")
    .select("character_id")
    .eq("thread_id", threadId)
    .eq("user_id", user.id);

  if (membersFetchError) {
    redirectWithError(threadId, "グループメンバーの取得に失敗しました。");
  }

  const members = (membersData ?? []) as { character_id: string }[];

  for (const member of members) {
    const groupRoleTags = normalizeGroupRoleTags(
      formData.getAll(`groupRoleTags:${member.character_id}`),
    );

    if (groupRoleTags.length > GROUP_ROLE_MAX_TAGS) {
      redirectWithError(
        threadId,
        `各キャラクターのグループ内役割は最大${GROUP_ROLE_MAX_TAGS}個まで選べます。`,
      );
    }

    const { error: memberUpdateError } = await supabase
      .from("group_chat_members")
      .update({
        group_role_tags: groupRoleTags,
      })
      .eq("thread_id", threadId)
      .eq("user_id", user.id)
      .eq("character_id", member.character_id);

    if (memberUpdateError) {
      redirectWithError(threadId, "グループ内役割の保存に失敗しました。");
    }
  }

  const { error: updateError } = await supabase
    .from("chat_threads")
    .update({
      title,
      group_icon_color: groupIconColor,
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId)
    .eq("user_id", user.id);

  if (updateError) {
    redirectWithError(threadId, "グループ設定の保存に失敗しました。");
  }

  revalidatePath("/app/chats");
  revalidatePath(`/app/chat/${threadId}`);
  revalidatePath(`/app/chats/group/${threadId}/settings`);

  redirect(`/app/chats/group/${threadId}/settings?updated=1`);
}


export async function deleteGroupChat(formData: FormData) {
  const threadId = getText(formData, "threadId");
  const confirmDelete = formData.get("confirmDelete") === "on";

  if (!threadId) {
    redirect("/app/chats");
  }

  if (!confirmDelete) {
    redirectWithError(
      threadId,
      "グループチャットを削除するには、確認チェックを入れてください。",
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: threadData, error: threadFetchError } = await supabase
    .from("chat_threads")
    .select("id, chat_type")
    .eq("id", threadId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (threadFetchError || !threadData) {
    redirectWithError(threadId, "削除するグループチャットの確認に失敗しました。");
  }

  const thread = threadData as { id: string; chat_type: string | null };

  if (thread.chat_type !== "group") {
    redirectWithError(threadId, "グループチャットだけ削除できます。");
  }

  const deleteTargets = [
    supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id)
      .eq("related_thread_id", threadId),
    supabase
      .from("chat_thread_summaries")
      .delete()
      .eq("user_id", user.id)
      .eq("thread_id", threadId),
    supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", user.id)
      .eq("thread_id", threadId),
    supabase
      .from("group_chat_members")
      .delete()
      .eq("user_id", user.id)
      .eq("thread_id", threadId),
  ];

  const deleteResults = await Promise.all(deleteTargets);

  const deleteError = deleteResults.find((result) => result.error)?.error;

  if (deleteError) {
    redirectWithError(threadId, "関連データの削除に失敗しました。");
  }

  const { error: threadDeleteError } = await supabase
    .from("chat_threads")
    .delete()
    .eq("id", threadId)
    .eq("user_id", user.id)
    .eq("chat_type", "group");

  if (threadDeleteError) {
    redirectWithError(threadId, "グループチャットの削除に失敗しました。");
  }

  revalidatePath("/app/chats");
  revalidatePath("/app");

  redirect("/app/chats?deleted=group");
}

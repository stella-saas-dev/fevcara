"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function redirectWithError(threadId: string, message: string): never {
  redirect(`/app/chat/${threadId}?error=${encodeURIComponent(message)}`);
}

export async function sendUserMessage(formData: FormData) {
  const threadId = getText(formData, "threadId");
  const content = getText(formData, "content");

  if (!threadId) {
    redirect("/app/characters");
  }

  if (!content) {
    redirectWithError(threadId, "メッセージを入力してください。");
  }

  if (content.length > 2000) {
    redirectWithError(threadId, "メッセージは2000文字以内で入力してください。");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: thread, error: threadError } = await supabase
    .from("chat_threads")
    .select("id")
    .eq("id", threadId)
    .eq("user_id", user.id)
    .single();

  if (threadError || !thread) {
    redirect("/app/characters");
  }

  const { error: messageError } = await supabase.from("chat_messages").insert({
    user_id: user.id,
    thread_id: thread.id,
    sender_type: "user",
    content,
  });

  if (messageError) {
    redirectWithError(threadId, "メッセージの保存に失敗しました。");
  }

  await supabase
    .from("chat_threads")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", thread.id)
    .eq("user_id", user.id);

  revalidatePath(`/app/chat/${thread.id}`);
  redirect(`/app/chat/${thread.id}`);
}
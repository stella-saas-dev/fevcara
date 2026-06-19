"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type DevPlan = "free" | "premium_lite" | "premium";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function isDevPlan(value: string): value is DevPlan {
  return value === "free" || value === "premium_lite" || value === "premium";
}

function redirectWithError(message: string): never {
  redirect(`/app/settings?error=${encodeURIComponent(message)}`);
}

export async function updateDevPlan(formData: FormData) {
  const plan = getText(formData, "plan");

  if (!isDevPlan(plan)) {
    redirectWithError("不正なプランが指定されました。");
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData, error: profileFetchError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileFetchError) {
    redirectWithError("プロフィール情報の取得に失敗しました。");
  }

  if (!profileData) {
    redirectWithError("プロフィール情報が見つかりません。");
  }

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      plan,
      active_character_id: null,
      character_limit_choice_locked: false,
    })
    .eq("id", user.id);

  if (updateError) {
    redirectWithError("プラン変更に失敗しました。");
  }

  revalidatePath("/app/settings");
  revalidatePath("/app/characters");
  revalidatePath("/app/chats");

  redirect(`/app/settings?plan_updated=${plan}`);
}
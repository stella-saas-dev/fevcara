"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type DevPlan = "free" | "premium_lite" | "premium";

type TreatmentPreference =
  | "masculine"
  | "feminine"
  | "neutral"
  | "unspecified";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function getTextOrNull(formData: FormData, key: string) {
  const value = getText(formData, key);
  return value || null;
}

function getCheckbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function isDevPlan(value: string): value is DevPlan {
  return value === "free" || value === "premium_lite" || value === "premium";
}

function isTreatmentPreference(value: string): value is TreatmentPreference {
  return (
    value === "masculine" ||
    value === "feminine" ||
    value === "neutral" ||
    value === "unspecified"
  );
}

function isDevPlanSwitchEnabled() {
  return process.env.FEVCARA_ENABLE_DEV_PLAN_SWITCH === "true";
}

function redirectWithError(message: string): never {
  redirect(`/app/settings?error=${encodeURIComponent(message)}`);
}

export async function updateUserProfile(formData: FormData) {
  const displayName = getText(formData, "displayName");
  const treatmentPreference = getText(formData, "treatmentPreference");
  const userProfileNote = getTextOrNull(formData, "userProfileNote");

  if (!displayName) {
    redirectWithError("FevCara内でのあなたの名前を入力してください。");
  }

  if (!isTreatmentPreference(treatmentPreference)) {
    redirectWithError("扱われ方の好みを選択してください。");
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

  if (profileData) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        treatment_preference: treatmentPreference,
        user_profile_note: userProfileNote,
        user_setup_completed: true,
      })
      .eq("id", user.id);

    if (updateError) {
      redirectWithError("ユーザー設定の保存に失敗しました。");
    }
  } else {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      email: user.email,
      plan: "free",
      display_name: displayName,
      treatment_preference: treatmentPreference,
      user_profile_note: userProfileNote,
      user_setup_completed: true,
    });

    if (insertError) {
      redirectWithError("ユーザー設定の作成に失敗しました。");
    }
  }

  revalidatePath("/app");
  revalidatePath("/app/settings");

  redirect("/app/settings?profile_updated=1");
}

export async function updateNotificationSettings(formData: FormData) {
  const inAppNotificationsEnabled = getCheckbox(
    formData,
    "inAppNotificationsEnabled",
  );
  const autonomousChatEnabled = getCheckbox(
    formData,
    "autonomousChatEnabled",
  );
  const autonomousChatNotificationsEnabled = getCheckbox(
    formData,
    "autonomousChatNotificationsEnabled",
  );

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.from("user_notification_settings").upsert(
    {
      user_id: user.id,
      in_app_notifications_enabled: inAppNotificationsEnabled,
      autonomous_chat_enabled: autonomousChatEnabled,
      autonomous_chat_notifications_enabled:
        autonomousChatNotificationsEnabled,
      email_notifications_enabled: false,
      push_notifications_enabled: false,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    redirectWithError("通知設定の保存に失敗しました。");
  }

  revalidatePath("/app/settings");
  revalidatePath("/app");

  redirect("/app/settings?notifications_updated=1");
}

export async function updateDevPlan(formData: FormData) {
  if (!isDevPlanSwitchEnabled()) {
    redirectWithError("開発用プラン切り替えは現在無効です。");
  }

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

export type PlanTier = "free" | "premium_lite" | "premium";

export type AutonomousChatProfile = {
  id?: string;
  plan: string | null;
};

export type UserNotificationSettings = {
  user_id: string;
  in_app_notifications_enabled: boolean;
  autonomous_chat_enabled: boolean;
  autonomous_chat_notifications_enabled: boolean;
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AutonomousChatStatus = {
  planTier: PlanTier;
  isPremium: boolean;
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  canUse: boolean;
  reason:
    | "ok"
    | "not_premium"
    | "autonomous_chat_disabled"
    | "monthly_limit_reached";
  settings: UserNotificationSettings;
  monthStart: string;
  monthEnd: string;
};

export type RecordAutonomousChatUsageResult =
  | {
      ok: true;
      status: AutonomousChatStatus;
    }
  | {
      ok: false;
      reason:
        | "not_premium"
        | "autonomous_chat_disabled"
        | "monthly_limit_reached"
        | "status_check_failed"
        | "usage_insert_failed";
      message: string;
      status?: AutonomousChatStatus;
    };

export type CreateNotificationResult =
  | {
      ok: true;
      notificationId: string | null;
    }
  | {
      ok: false;
      message: string;
    };

type AutonomousChatUsageRow = {
  messages_used: number | null;
};

const AUTONOMOUS_CHAT_MONTHLY_LIMIT = 30;

function normalizePlan(plan: string | null) {
  return (plan || "free").trim().toLowerCase().replace(/\s+/g, "_");
}

export function getPlanTier(plan: string | null): PlanTier {
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

export function isPremiumPlan(plan: string | null) {
  return getPlanTier(plan) === "premium";
}

function getJstMonthRange(date = new Date()) {
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const year = jstDate.getUTCFullYear();
  const month = jstDate.getUTCMonth();

  const startUtcMs = Date.UTC(year, month, 1, 0, 0, 0, 0) - 9 * 60 * 60 * 1000;
  const endUtcMs =
    Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - 9 * 60 * 60 * 1000;

  return {
    start: new Date(startUtcMs).toISOString(),
    end: new Date(endUtcMs).toISOString(),
  };
}

function getDefaultNotificationSettings(
  userId: string,
): UserNotificationSettings {
  return {
    user_id: userId,
    in_app_notifications_enabled: true,
    autonomous_chat_enabled: true,
    autonomous_chat_notifications_enabled: true,
    email_notifications_enabled: false,
    push_notifications_enabled: false,
  };
}

export async function getOrCreateUserNotificationSettings({
  supabase,
  userId,
}: {
  supabase: any;
  userId: string;
}): Promise<UserNotificationSettings> {
  const { data, error } = await supabase
    .from("user_notification_settings")
    .select(
      "user_id, in_app_notifications_enabled, autonomous_chat_enabled, autonomous_chat_notifications_enabled, email_notifications_enabled, push_notifications_enabled, created_at, updated_at",
    )
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (data) {
    return data as UserNotificationSettings;
  }

  const { data: insertedData, error: insertError } = await supabase
    .from("user_notification_settings")
    .insert({
      user_id: userId,
    })
    .select(
      "user_id, in_app_notifications_enabled, autonomous_chat_enabled, autonomous_chat_notifications_enabled, email_notifications_enabled, push_notifications_enabled, created_at, updated_at",
    )
    .maybeSingle();

  if (insertError) {
    throw insertError;
  }

  return (
    (insertedData as UserNotificationSettings | null) ??
    getDefaultNotificationSettings(userId)
  );
}

async function getMonthlyAutonomousChatUsed({
  supabase,
  userId,
  monthStart,
  monthEnd,
}: {
  supabase: any;
  userId: string;
  monthStart: string;
  monthEnd: string;
}) {
  const { data, error } = await supabase
    .from("autonomous_chat_usage")
    .select("messages_used")
    .eq("user_id", userId)
    .gte("created_at", monthStart)
    .lt("created_at", monthEnd)
    .eq("status", "completed");

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as AutonomousChatUsageRow[];

  return rows.reduce((total, row) => {
    return total + Math.max(Number(row.messages_used ?? 0), 0);
  }, 0);
}

export async function getAutonomousChatStatus({
  supabase,
  userId,
  profile,
}: {
  supabase: any;
  userId: string;
  profile: AutonomousChatProfile;
}): Promise<AutonomousChatStatus> {
  const planTier = getPlanTier(profile.plan);
  const isPremium = planTier === "premium";
  const monthRange = getJstMonthRange();

  const settings = await getOrCreateUserNotificationSettings({
    supabase,
    userId,
  });

  const monthlyUsed = await getMonthlyAutonomousChatUsed({
    supabase,
    userId,
    monthStart: monthRange.start,
    monthEnd: monthRange.end,
  });

  const monthlyRemaining = Math.max(
    AUTONOMOUS_CHAT_MONTHLY_LIMIT - monthlyUsed,
    0,
  );

  if (!isPremium) {
    return {
      planTier,
      isPremium,
      monthlyLimit: AUTONOMOUS_CHAT_MONTHLY_LIMIT,
      monthlyUsed,
      monthlyRemaining,
      canUse: false,
      reason: "not_premium",
      settings,
      monthStart: monthRange.start,
      monthEnd: monthRange.end,
    };
  }

  if (!settings.autonomous_chat_enabled) {
    return {
      planTier,
      isPremium,
      monthlyLimit: AUTONOMOUS_CHAT_MONTHLY_LIMIT,
      monthlyUsed,
      monthlyRemaining,
      canUse: false,
      reason: "autonomous_chat_disabled",
      settings,
      monthStart: monthRange.start,
      monthEnd: monthRange.end,
    };
  }

  if (monthlyRemaining <= 0) {
    return {
      planTier,
      isPremium,
      monthlyLimit: AUTONOMOUS_CHAT_MONTHLY_LIMIT,
      monthlyUsed,
      monthlyRemaining,
      canUse: false,
      reason: "monthly_limit_reached",
      settings,
      monthStart: monthRange.start,
      monthEnd: monthRange.end,
    };
  }

  return {
    planTier,
    isPremium,
    monthlyLimit: AUTONOMOUS_CHAT_MONTHLY_LIMIT,
    monthlyUsed,
    monthlyRemaining,
    canUse: true,
    reason: "ok",
    settings,
    monthStart: monthRange.start,
    monthEnd: monthRange.end,
  };
}

export async function recordAutonomousChatUsage({
  supabase,
  userId,
  threadId,
  profile,
  messagesUsed = 1,
  metadata = {},
}: {
  supabase: any;
  userId: string;
  threadId: string;
  profile: AutonomousChatProfile;
  messagesUsed?: number;
  metadata?: Record<string, unknown>;
}): Promise<RecordAutonomousChatUsageResult> {
  let status: AutonomousChatStatus;

  try {
    status = await getAutonomousChatStatus({
      supabase,
      userId,
      profile,
    });
  } catch (error) {
    console.error("Autonomous chat status check error:", error);

    return {
      ok: false,
      reason: "status_check_failed",
      message: "キャラ同士の自主会話の利用状況確認に失敗しました。",
    };
  }

  if (!status.canUse) {
    const failureReason =
        status.reason === "not_premium" ||
        status.reason === "autonomous_chat_disabled" ||
        status.reason === "monthly_limit_reached"
        ? status.reason
        : "monthly_limit_reached";

    const message =
        failureReason === "not_premium"
        ? "キャラ同士の自主会話はPremiumプラン専用です。"
        : failureReason === "autonomous_chat_disabled"
            ? "キャラ同士の自主会話がオフになっています。"
            : "今月のキャラ同士の自主会話回数に達しました。";

    return {
        ok: false,
        reason: failureReason,
        message,
        status,
    };
    }

  const safeMessagesUsed = Math.max(1, Math.floor(messagesUsed));

  if (safeMessagesUsed > status.monthlyRemaining) {
    return {
      ok: false,
      reason: "monthly_limit_reached",
      message: "今月のキャラ同士の自主会話回数が不足しています。",
      status,
    };
  }

  const { error } = await supabase.from("autonomous_chat_usage").insert({
    user_id: userId,
    thread_id: threadId,
    plan_at_use: profile.plan || "premium",
    messages_used: safeMessagesUsed,
    status: "completed",
    metadata: {
      ...metadata,
      plan_tier: status.planTier,
      monthly_limit: status.monthlyLimit,
      monthly_used_before_use: status.monthlyUsed,
      monthly_remaining_before_use: status.monthlyRemaining,
      month_start: status.monthStart,
      month_end: status.monthEnd,
      reset_basis: "Asia/Tokyo calendar month",
    },
  });

  if (error) {
    console.error("Autonomous chat usage insert error:", error);

    return {
      ok: false,
      reason: "usage_insert_failed",
      message: "キャラ同士の自主会話の利用記録に失敗しました。",
      status,
    };
  }

  return {
    ok: true,
    status,
  };
}

export async function createInAppNotification({
  supabase,
  userId,
  type = "general",
  title,
  body,
  linkPath,
  relatedThreadId,
  relatedCharacterId,
  metadata = {},
}: {
  supabase: any;
  userId: string;
  type?: string;
  title: string;
  body: string;
  linkPath?: string | null;
  relatedThreadId?: string | null;
  relatedCharacterId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<CreateNotificationResult> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({
      user_id: userId,
      type,
      title,
      body,
      link_path: linkPath ?? null,
      related_thread_id: relatedThreadId ?? null,
      related_character_id: relatedCharacterId ?? null,
      metadata,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Create notification error:", error);

    return {
      ok: false,
      message: "通知の作成に失敗しました。",
    };
  }

  return {
    ok: true,
    notificationId: data?.id ?? null,
  };
}

export async function createAutonomousChatNotification({
  supabase,
  userId,
  threadId,
  groupName,
  previewText,
}: {
  supabase: any;
  userId: string;
  threadId: string;
  groupName: string;
  previewText?: string | null;
}) {
  const settings = await getOrCreateUserNotificationSettings({
    supabase,
    userId,
  });

  if (
    !settings.in_app_notifications_enabled ||
    !settings.autonomous_chat_notifications_enabled
  ) {
    return {
      ok: true,
      notificationId: null,
    } satisfies CreateNotificationResult;
  }

  return createInAppNotification({
    supabase,
    userId,
    type: "autonomous_chat",
    title: `${groupName}で新しい会話がありました`,
    body:
      previewText && previewText.trim()
        ? previewText.trim()
        : "キャラクターたちが、あなたのいない間に少し話していたようです。",
    linkPath: `/app/chat/${threadId}`,
    relatedThreadId: threadId,
    metadata: {
      source: "autonomous_chat",
      group_name: groupName,
    },
  });
}
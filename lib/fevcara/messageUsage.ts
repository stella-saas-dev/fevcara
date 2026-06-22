export type PlanTier = "free" | "premium_lite" | "premium";

export type MessageUsageBucket = "trial_boost" | "monthly";

export type MessageUsageProfile = {
  id?: string;
  plan: string | null;
  created_at: string | null;
};

export type TrialBoostMessageStatus = {
  isActive: boolean;
  limit: number;
  used: number;
  remaining: number;
  startsAt: string | null;
  endsAt: string | null;
};

export type MessageUsageStatus = {
  planTier: PlanTier;
  monthlyLimit: number;
  monthlyUsed: number;
  monthlyRemaining: number;
  trialBoost: TrialBoostMessageStatus;
  totalRemaining: number;
  nextBucket: MessageUsageBucket | null;
  isLimitReached: boolean;
  monthStart: string;
  monthEnd: string;
};

export type RecordMessageUsageResult =
  | {
      ok: true;
      status: MessageUsageStatus;
      bucket: MessageUsageBucket;
    }
  | {
      ok: false;
      reason: "limit_reached" | "usage_count_failed" | "usage_insert_failed";
      message: string;
      status?: MessageUsageStatus;
    };

export const MESSAGE_LIMIT_REACHED_CODE = "message_monthly_limit";
export const MESSAGE_USAGE_EVENT_TYPE = "chat_user_message";

const FREE_TRIAL_BOOST_HOURS = 72;
const FREE_TRIAL_BOOST_MESSAGE_LIMIT = 300;

const MONTHLY_MESSAGE_LIMITS: Record<PlanTier, number> = {
  free: 250,
  premium_lite: 500,
  premium: 1000,
};

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

export function isFreePlan(plan: string | null) {
  return getPlanTier(plan) === "free";
}

export function getMonthlyMessageLimit(plan: string | null) {
  return MONTHLY_MESSAGE_LIMITS[getPlanTier(plan)];
}

export function getFreeTrialBoostEndsAt(profile: MessageUsageProfile) {
  if (!isFreePlan(profile.plan) || !profile.created_at) {
    return null;
  }

  const createdAtTime = new Date(profile.created_at).getTime();

  if (Number.isNaN(createdAtTime)) {
    return null;
  }

  return new Date(
    createdAtTime + FREE_TRIAL_BOOST_HOURS * 60 * 60 * 1000,
  ).toISOString();
}

export function isFreeTrialBoostActive(profile: MessageUsageProfile) {
  const endsAt = getFreeTrialBoostEndsAt(profile);

  if (!endsAt) {
    return false;
  }

  return Date.now() < new Date(endsAt).getTime();
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

async function countUsageEvents({
  supabase,
  userId,
  start,
  end,
  bucket,
}: {
  supabase: any;
  userId: string;
  start: string;
  end: string;
  bucket?: MessageUsageBucket;
}) {
  let query = supabase
    .from("usage_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("event_type", MESSAGE_USAGE_EVENT_TYPE)
    .gte("created_at", start)
    .lt("created_at", end);

  if (bucket) {
    query = query.contains("metadata", {
      message_bucket: bucket,
    });
  }

  const { count, error } = await query;

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function getMessageUsageStatus({
  supabase,
  userId,
  profile,
}: {
  supabase: any;
  userId: string;
  profile: MessageUsageProfile;
}): Promise<MessageUsageStatus> {
  const planTier = getPlanTier(profile.plan);
  const monthlyLimit = getMonthlyMessageLimit(profile.plan);
  const monthRange = getJstMonthRange();

  const totalUsedInMonth = await countUsageEvents({
    supabase,
    userId,
    start: monthRange.start,
    end: monthRange.end,
  });

  const trialUsedInMonth = await countUsageEvents({
    supabase,
    userId,
    start: monthRange.start,
    end: monthRange.end,
    bucket: "trial_boost",
  });

  const monthlyUsed = Math.max(totalUsedInMonth - trialUsedInMonth, 0);
  const monthlyRemaining = Math.max(monthlyLimit - monthlyUsed, 0);

  const trialStartsAt =
    isFreePlan(profile.plan) && profile.created_at ? profile.created_at : null;
  const trialEndsAt = getFreeTrialBoostEndsAt(profile);
  const trialActive = isFreeTrialBoostActive(profile);

  let trialUsed = 0;

  if (trialStartsAt && trialEndsAt) {
    trialUsed = await countUsageEvents({
      supabase,
      userId,
      start: trialStartsAt,
      end: trialEndsAt,
      bucket: "trial_boost",
    });
  }

  const trialLimit = trialActive ? FREE_TRIAL_BOOST_MESSAGE_LIMIT : 0;
  const trialRemaining = trialActive
    ? Math.max(FREE_TRIAL_BOOST_MESSAGE_LIMIT - trialUsed, 0)
    : 0;

  const nextBucket =
    trialRemaining > 0
      ? "trial_boost"
      : monthlyRemaining > 0
        ? "monthly"
        : null;

  const totalRemaining = trialRemaining + monthlyRemaining;

  return {
    planTier,
    monthlyLimit,
    monthlyUsed,
    monthlyRemaining,
    trialBoost: {
      isActive: trialActive,
      limit: trialLimit,
      used: trialUsed,
      remaining: trialRemaining,
      startsAt: trialStartsAt,
      endsAt: trialEndsAt,
    },
    totalRemaining,
    nextBucket,
    isLimitReached: !nextBucket,
    monthStart: monthRange.start,
    monthEnd: monthRange.end,
  };
}

export async function recordMessageUsage({
  supabase,
  userId,
  threadId,
  profile,
}: {
  supabase: any;
  userId: string;
  threadId: string;
  profile: MessageUsageProfile;
}): Promise<RecordMessageUsageResult> {
  let status: MessageUsageStatus;

  try {
    status = await getMessageUsageStatus({
      supabase,
      userId,
      profile,
    });
  } catch (error) {
    console.error("Message usage count error:", error);

    return {
      ok: false,
      reason: "usage_count_failed",
      message: "利用回数の確認に失敗しました。",
    };
  }

  if (!status.nextBucket) {
    return {
      ok: false,
      reason: "limit_reached",
      message: "今月のメッセージ上限に達しました。",
      status,
    };
  }

  const { error: usageInsertError } = await supabase.from("usage_events").insert({
    user_id: userId,
    event_type: MESSAGE_USAGE_EVENT_TYPE,
    amount: 1,
    metadata: {
      thread_id: threadId,
      plan: profile.plan || "free",
      plan_tier: status.planTier,
      message_bucket: status.nextBucket,
      monthly_limit: status.monthlyLimit,
      monthly_used_before_send: status.monthlyUsed,
      monthly_remaining_before_send: status.monthlyRemaining,
      trial_boost_active: status.trialBoost.isActive,
      trial_boost_limit: status.trialBoost.limit,
      trial_boost_used_before_send: status.trialBoost.used,
      trial_boost_remaining_before_send: status.trialBoost.remaining,
      month_start: status.monthStart,
      month_end: status.monthEnd,
      reset_basis: "Asia/Tokyo calendar month",
    },
  });

  if (usageInsertError) {
    console.error("Message usage insert error:", usageInsertError);

    return {
      ok: false,
      reason: "usage_insert_failed",
      message: "利用回数の記録に失敗しました。",
      status,
    };
  }

  return {
    ok: true,
    status,
    bucket: status.nextBucket,
  };
}

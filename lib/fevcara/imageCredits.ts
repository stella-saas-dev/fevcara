import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type PlanTier = "free" | "premium_lite" | "premium";

export type ImageSaveLimitScope = "account" | "character";

export type ImagePlanConfig = {
  planTier: PlanTier;
  label: string;
  imageSaveLimit: number;
  imageSaveLimitScope: ImageSaveLimitScope;
  imageSaveLimitLabel: string;
  canUseHighQuality: boolean;
};

type CreditTransactionRow = {
  amount: number;
  expires_at: string | null;
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

export function getImagePlanConfig(plan: string | null): ImagePlanConfig {
  const planTier = getPlanTier(plan);

  if (planTier === "premium") {
    return {
      planTier,
      label: "Premium",
      imageSaveLimit: 10,
      imageSaveLimitScope: "character",
      imageSaveLimitLabel: "このキャラ",
      canUseHighQuality: true,
    };
  }

  if (planTier === "premium_lite") {
    return {
      planTier,
      label: "Lite",
      imageSaveLimit: 10,
      imageSaveLimitScope: "character",
      imageSaveLimitLabel: "このキャラ",
      canUseHighQuality: true,
    };
  }

  return {
    planTier,
    label: "Free",
    imageSaveLimit: 10,
    imageSaveLimitScope: "account",
    imageSaveLimitLabel: "アカウント全体",
    canUseHighQuality: false,
  };
}

function getCurrentMonthKey() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getNextMonthStartIso() {
  const now = new Date();
  const nextMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );

  return nextMonthStart.toISOString();
}

function addHoursIso(value: string, hours: number) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
  }

  date.setUTCHours(date.getUTCHours() + hours);
  return date.toISOString();
}

function getCurrentMonthStartIso() {
  const now = new Date();
  const currentMonthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );

  return currentMonthStart.toISOString();
}

async function hasCreditSource({
  supabase,
  userId,
  source,
  note,
}: {
  supabase: SupabaseClient;
  userId: string;
  source: string;
  note?: string;
}) {
  let query = supabase
    .from("image_credit_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("source", source)
    .limit(1);

  if (note) {
    query = query.eq("note", note);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Image credit source check error:", error);
    return true;
  }

  return Boolean(data?.[0]);
}

async function getCreditSourceCreatedAt({
  supabase,
  userId,
  source,
}: {
  supabase: SupabaseClient;
  userId: string;
  source: string;
}) {
  const { data, error } = await supabase
    .from("image_credit_transactions")
    .select("created_at")
    .eq("user_id", userId)
    .eq("source", source)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data?.created_at) {
    return null;
  }

  return String(data.created_at);
}

async function grantCredits({
  supabase,
  userId,
  plan,
  source,
  amount,
  expiresAt,
  note,
}: {
  supabase: SupabaseClient;
  userId: string;
  plan: string | null;
  source: string;
  amount: number;
  expiresAt: string | null;
  note: string;
}) {
  const { error } = await supabase.from("image_credit_transactions").insert({
    user_id: userId,
    plan: plan || "free",
    source,
    amount,
    expires_at: expiresAt,
    note,
  });

  if (error) {
    console.error("Image credit grant error:", error);
  }
}

export async function ensureImageCreditGrants({
  supabase,
  userId,
  plan,
}: {
  supabase: SupabaseClient;
  userId: string;
  plan: string | null;
}) {
  const planTier = getPlanTier(plan);
  const monthKey = getCurrentMonthKey();
  const nextMonthStartIso = getNextMonthStartIso();

  if (planTier === "free") {
    const nowIso = new Date().toISOString();
    const alreadyGranted = await hasCreditSource({
      supabase,
      userId,
      source: "free_initial",
    });

    let initialCreatedAt = await getCreditSourceCreatedAt({
      supabase,
      userId,
      source: "free_initial",
    });

    if (!alreadyGranted) {
      initialCreatedAt = nowIso;

      await grantCredits({
        supabase,
        userId,
        plan,
        source: "free_initial",
        amount: 4,
        expiresAt: null,
        note: "Free initial 4 image credits. No monthly renewal.",
      });
    }

    const alreadyGrantedTrialBoost = await hasCreditSource({
      supabase,
      userId,
      source: "free_trial_boost",
    });

    const trialBaseIso = initialCreatedAt ?? nowIso;
    const trialExpiresAt = addHoursIso(trialBaseIso, 72);

    if (!alreadyGrantedTrialBoost && trialExpiresAt > nowIso) {
      await grantCredits({
        supabase,
        userId,
        plan,
        source: "free_trial_boost",
        amount: 6,
        expiresAt: trialExpiresAt,
        note: "Free 72-hour Trial Boost 6 image credits.",
      });
    }

    return;
  }

  if (planTier === "premium_lite") {
    const alreadyGrantedInitial = await hasCreditSource({
      supabase,
      userId,
      source: "lite_initial",
    });

    if (!alreadyGrantedInitial) {
      await grantCredits({
        supabase,
        userId,
        plan,
        source: "lite_initial",
        amount: 30,
        expiresAt: null,
        note: "Lite initial 30 image credits.",
      });

      return;
    }

    const initialCreatedAt = await getCreditSourceCreatedAt({
      supabase,
      userId,
      source: "lite_initial",
    });

    const currentMonthStartIso = getCurrentMonthStartIso();
    const isSecondMonthOrLater =
      Boolean(initialCreatedAt) && String(initialCreatedAt) < currentMonthStartIso;

    if (!isSecondMonthOrLater) {
      return;
    }

    const alreadyGrantedMonthly = await hasCreditSource({
      supabase,
      userId,
      source: "lite_monthly",
      note: monthKey,
    });

    if (!alreadyGrantedMonthly) {
      await grantCredits({
        supabase,
        userId,
        plan,
        source: "lite_monthly",
        amount: 10,
        expiresAt: nextMonthStartIso,
        note: monthKey,
      });
    }

    return;
  }

  const alreadyGrantedPremiumMonthly = await hasCreditSource({
    supabase,
    userId,
    source: "premium_monthly",
    note: monthKey,
  });

  if (!alreadyGrantedPremiumMonthly) {
    await grantCredits({
      supabase,
      userId,
      plan,
      source: "premium_monthly",
      amount: 50,
      expiresAt: nextMonthStartIso,
      note: monthKey,
    });
  }
}

export async function getImageCreditBalance({
  supabase,
  userId,
}: {
  supabase: SupabaseClient;
  userId: string;
}) {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("image_credit_transactions")
    .select("amount, expires_at")
    .eq("user_id", userId);

  if (error) {
    console.error("Image credit balance error:", error);
    return 0;
  }

  return ((data ?? []) as CreditTransactionRow[]).reduce((total, row) => {
    if (row.expires_at && row.expires_at <= nowIso) {
      return total;
    }

    return total + Number(row.amount ?? 0);
  }, 0);
}

export async function consumeImageCredits({
  supabase,
  userId,
  plan,
  amount,
  relatedCharacterId,
}: {
  supabase: SupabaseClient;
  userId: string;
  plan: string | null;
  amount: number;
  relatedCharacterId: string;
}) {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("image_credit_transactions")
    .select("amount, expires_at")
    .eq("user_id", userId);

  if (error) {
    console.error("Image credit consume fetch error:", error);
    return false;
  }

  const validRows = ((data ?? []) as CreditTransactionRow[]).filter((row) => {
    if (!row.expires_at) return true;
    return row.expires_at > nowIso;
  });

  const totalBalance = validRows.reduce(
    (total, row) => total + Number(row.amount ?? 0),
    0,
  );

  if (totalBalance < amount) {
    return false;
  }

  const expiringBuckets = new Map<string, number>();
  let nonExpiringBalance = 0;

  for (const row of validRows) {
    const rowAmount = Number(row.amount ?? 0);

    if (row.expires_at) {
      expiringBuckets.set(
        row.expires_at,
        (expiringBuckets.get(row.expires_at) ?? 0) + rowAmount,
      );
    } else {
      nonExpiringBalance += rowAmount;
    }
  }

  let remaining = amount;
  const usageRows: {
    user_id: string;
    plan: string;
    source: string;
    amount: number;
    expires_at: string | null;
    related_character_id: string;
    note: string;
  }[] = [];

  const sortedExpiringBuckets = Array.from(expiringBuckets.entries())
    .filter(([, bucketBalance]) => bucketBalance > 0)
    .sort(([expiresAtA], [expiresAtB]) =>
      expiresAtA.localeCompare(expiresAtB),
    );

  for (const [expiresAt, bucketBalance] of sortedExpiringBuckets) {
    if (remaining <= 0) break;

    const amountToUse = Math.min(remaining, bucketBalance);

    usageRows.push({
      user_id: userId,
      plan: plan || "free",
      source: "usage_expiring",
      amount: -amountToUse,
      expires_at: expiresAt,
      related_character_id: relatedCharacterId,
      note: "Image generation credit consumed from expiring credits.",
    });

    remaining -= amountToUse;
  }

  if (remaining > 0) {
    if (nonExpiringBalance < remaining) {
      return false;
    }

    usageRows.push({
      user_id: userId,
      plan: plan || "free",
      source: "usage_non_expiring",
      amount: -remaining,
      expires_at: null,
      related_character_id: relatedCharacterId,
      note: "Image generation credit consumed from non-expiring credits.",
    });
  }

  const { error: insertError } = await supabase
    .from("image_credit_transactions")
    .insert(usageRows);

  if (insertError) {
    console.error("Image credit consume insert error:", insertError);
    return false;
  }

  return true;
}

export async function refundImageCredits({
  supabase,
  userId,
  plan,
  amount,
  relatedCharacterId,
  note,
}: {
  supabase: SupabaseClient;
  userId: string;
  plan: string | null;
  amount: number;
  relatedCharacterId: string;
  note: string;
}) {
  const { error } = await supabase.from("image_credit_transactions").insert({
    user_id: userId,
    plan: plan || "free",
    source: "refund",
    amount,
    expires_at: null,
    related_character_id: relatedCharacterId,
    note,
  });

  if (error) {
    console.error("Image credit refund error:", error);
  }
}
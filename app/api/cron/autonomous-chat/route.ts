import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateAutonomousGroupChatForThread } from "@/lib/fevcara/autonomousGroupChat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PremiumProfileRow = {
id: string;
plan: string | null;
};

type NotificationSettingsRow = {
user_id: string;
in_app_notifications_enabled: boolean | null;
autonomous_chat_enabled: boolean | null;
autonomous_chat_notifications_enabled: boolean | null;
};

type GroupThreadRow = {
id: string;
title: string | null;
updated_at: string | null;
};

type CronResultItem = {
userId: string;
threadId?: string;
status: "generated" | "skipped" | "failed";
reason?: string;
generatedMessageCount?: number;
};

const MAX_USERS_PER_RUN = 10;
const MAX_THREADS_PER_USER_TO_SCAN = 8;
const RECENT_AUTONOMOUS_CHAT_HOURS = 24;
const MAX_REPLIES_PER_AUTONOMOUS_CHAT = 3;

function isAuthorized(request: Request) {
const cronSecret = process.env.CRON_SECRET;

if (!cronSecret) {
return false;
}

const authorization = request.headers.get("authorization");

return authorization === `Bearer ${cronSecret}`;
}

function getSinceIso(hours: number) {
return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function defaultNotificationSettings(userId: string): NotificationSettingsRow {
return {
user_id: userId,
in_app_notifications_enabled: true,
autonomous_chat_enabled: true,
autonomous_chat_notifications_enabled: true,
};
}

async function getNotificationSettings({
supabase,
userId,
}: {
supabase: ReturnType<typeof createAdminClient>;
userId: string;
}) {
const { data, error } = await supabase
.from("user_notification_settings")
.select(
"user_id, in_app_notifications_enabled, autonomous_chat_enabled, autonomous_chat_notifications_enabled",
)
.eq("user_id", userId)
.maybeSingle();

if (error) {
console.error("Autonomous chat settings fetch error:", error);

return {
  ok: false as const,
  settings: null,
};

}

return {
ok: true as const,
settings:
((data ?? defaultNotificationSettings(userId)) as NotificationSettingsRow),
};
}

function canRunBySettings(settings: NotificationSettingsRow) {
return (
settings.autonomous_chat_enabled !== false &&
settings.in_app_notifications_enabled !== false &&
settings.autonomous_chat_notifications_enabled !== false
);
}

async function hasUnreadAutonomousNotification({
supabase,
userId,
threadId,
}: {
supabase: ReturnType<typeof createAdminClient>;
userId: string;
threadId: string;
}) {
const { count, error } = await supabase
.from("notifications")
.select("id", { count: "exact", head: true })
.eq("user_id", userId)
.eq("type", "autonomous_chat")
.eq("related_thread_id", threadId)
.is("read_at", null);

if (error) {
console.error("Unread autonomous notification check error:", error);
return true;
}

return (count ?? 0) > 0;
}

async function hasRecentAutonomousChatUsage({
supabase,
userId,
threadId,
}: {
supabase: ReturnType<typeof createAdminClient>;
userId: string;
threadId: string;
}) {
const since = getSinceIso(RECENT_AUTONOMOUS_CHAT_HOURS);

const { count, error } = await supabase
.from("autonomous_chat_usage")
.select("id", { count: "exact", head: true })
.eq("user_id", userId)
.eq("thread_id", threadId)
.eq("status", "completed")
.gte("created_at", since);

if (error) {
console.error("Recent autonomous chat usage check error:", error);
return true;
}

return (count ?? 0) > 0;
}

async function hasEnoughGroupMembers({
supabase,
userId,
threadId,
}: {
supabase: ReturnType<typeof createAdminClient>;
userId: string;
threadId: string;
}) {
const { count, error } = await supabase
.from("group_chat_members")
.select("character_id", { count: "exact", head: true })
.eq("user_id", userId)
.eq("thread_id", threadId);

if (error) {
console.error("Group member count check error:", error);
return false;
}

return (count ?? 0) >= 2;
}

async function findEligibleGroupThread({
supabase,
userId,
}: {
supabase: ReturnType<typeof createAdminClient>;
userId: string;
}) {
const { data, error } = await supabase
.from("chat_threads")
.select("id, title, updated_at")
.eq("user_id", userId)
.eq("chat_type", "group")
.order("updated_at", { ascending: false })
.limit(MAX_THREADS_PER_USER_TO_SCAN);

if (error) {
console.error("Group thread fetch error:", error);
return null;
}

const groupThreads = (data ?? []) as GroupThreadRow[];

for (const thread of groupThreads) {
const hasMembers = await hasEnoughGroupMembers({
supabase,
userId,
threadId: thread.id,
});

if (!hasMembers) {
  continue;
}

const hasUnreadNotification = await hasUnreadAutonomousNotification({
  supabase,
  userId,
  threadId: thread.id,
});

if (hasUnreadNotification) {
  continue;
}

const hasRecentUsage = await hasRecentAutonomousChatUsage({
  supabase,
  userId,
  threadId: thread.id,
});

if (hasRecentUsage) {
  continue;
}

return thread;

}

return null;
}

export async function GET(request: Request) {
if (!isAuthorized(request)) {
return NextResponse.json(
{
ok: false,
error: "Unauthorized",
},
{
status: 401,
},
);
}

const supabase = createAdminClient();
const results: CronResultItem[] = [];

const { data: profilesData, error: profilesError } = await supabase
.from("profiles")
.select("id, plan")
.eq("plan", "premium")
.limit(MAX_USERS_PER_RUN);

if (profilesError) {
console.error("Premium profile fetch error:", profilesError);

return NextResponse.json(
  {
    ok: false,
    error: "Premium profile fetch failed",
  },
  {
    status: 500,
  },
);

}

const premiumProfiles = (profilesData ?? []) as PremiumProfileRow[];

for (const profile of premiumProfiles) {
const settingsResult = await getNotificationSettings({
supabase,
userId: profile.id,
});

if (!settingsResult.ok || !settingsResult.settings) {
  results.push({
    userId: profile.id,
    status: "skipped",
    reason: "settings_fetch_failed",
  });

  continue;
}

if (!canRunBySettings(settingsResult.settings)) {
  results.push({
    userId: profile.id,
    status: "skipped",
    reason: "notification_or_autonomous_chat_disabled",
  });

  continue;
}

const targetThread = await findEligibleGroupThread({
  supabase,
  userId: profile.id,
});

if (!targetThread) {
  results.push({
    userId: profile.id,
    status: "skipped",
    reason:
      "no_eligible_group_thread_or_recent_autonomous_chat_already_exists",
  });

  continue;
}

const generationResult = await generateAutonomousGroupChatForThread({
  supabase,
  userId: profile.id,
  threadId: targetThread.id,
  source: "cron",
  maxReplies: MAX_REPLIES_PER_AUTONOMOUS_CHAT,
});

if (!generationResult.ok) {
  results.push({
    userId: profile.id,
    threadId: targetThread.id,
    status: "failed",
    reason: generationResult.reason,
  });

  continue;
}

results.push({
  userId: profile.id,
  threadId: targetThread.id,
  status: "generated",
  generatedMessageCount: generationResult.generatedMessageCount,
});

}

const generatedCount = results.filter(
(result) => result.status === "generated",
).length;

return NextResponse.json({
ok: true,
generatedCount,
checkedUserCount: premiumProfiles.length,
results,
});
}

import {
  createInAppNotification,
  getOrCreateUserNotificationSettings,
} from "@/lib/fevcara/autonomousChat";

type CelebrationDayRow = {
  id: string;
  character_id: string;
  month: number | null;
  day: number | null;
  title: string | null;
  message_hint: string | null;
};

type CharacterRow = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;
  status: string | null;
  icon_image_url: string | null;
  image_url: string | null;
};

type ChatThreadRow = {
  id: string;
  title: string | null;
};

type CelebrationEventLogRow = {
  id: string;
  user_id: string;
  character_id: string;
  celebration_day_id: string;
  thread_id: string | null;
  event_date: string;
  notification_id: string | null;
  message_text: string | null;
  opened_at: string | null;
  completed_at: string | null;
};

export type PendingCelebrationEvent = {
  id: string;
  eventDate: string;
  threadId: string;
  notificationId: string | null;
  celebrationTitle: string;
  messageHint: string | null;
  character: {
    id: string;
    name: string;
    iconImageUrl: string | null;
    imageUrl: string | null;
  };
};

function getJstDateParts(date = new Date()) {
  const jstDate = new Date(date.getTime() + 9 * 60 * 60 * 1000);

  return {
    year: jstDate.getUTCFullYear(),
    month: jstDate.getUTCMonth() + 1,
    day: jstDate.getUTCDate(),
  };
}

export function getJstDateString(date = new Date()) {
  const parts = getJstDateParts(date);
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");

  return `${parts.year}-${month}-${day}`;
}

function getCharacterName(character: {
  final_name: string | null;
  temporary_name: string | null;
}) {
  return (
    character.final_name ||
    character.temporary_name ||
    "名前のないキャラクター"
  );
}

async function getOrCreateSingleChatThread({
  supabase,
  userId,
  character,
}: {
  supabase: any;
  userId: string;
  character: CharacterRow;
}) {
  const { data: existingThreadData, error: existingThreadError } = await supabase
    .from("chat_threads")
    .select("id, title")
    .eq("user_id", userId)
    .eq("chat_type", "single")
    .eq("character_id", character.id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingThreadError) {
    throw existingThreadError;
  }

  if (existingThreadData) {
    return existingThreadData as ChatThreadRow;
  }

  const characterName = getCharacterName(character);

  const { data: insertedThreadData, error: insertThreadError } = await supabase
    .from("chat_threads")
    .insert({
      user_id: userId,
      title: characterName,
      chat_type: "single",
      character_id: character.id,
    })
    .select("id, title")
    .single();

  if (insertThreadError || !insertedThreadData) {
    throw insertThreadError ?? new Error("Single chat thread was not created.");
  }

  return insertedThreadData as ChatThreadRow;
}

export async function ensureTodayCelebrationNotifications({
  supabase,
  userId,
}: {
  supabase: any;
  userId: string;
}) {
  const settings = await getOrCreateUserNotificationSettings({
    supabase,
    userId,
  });

  if (!settings.in_app_notifications_enabled) {
    return {
      ok: true,
      createdCount: 0,
      skippedReason: "in_app_notifications_disabled",
    };
  }

  const today = getJstDateParts();
  const eventDate = getJstDateString();

  const { data: celebrationDaysData, error: celebrationDaysError } =
    await supabase
      .from("celebration_days")
      .select("id, character_id, month, day, title, message_hint")
      .eq("user_id", userId)
      .eq("month", today.month)
      .eq("day", today.day)
      .eq("is_active", true);

  if (celebrationDaysError) {
    throw celebrationDaysError;
  }

  const celebrationDays = (celebrationDaysData ?? []) as CelebrationDayRow[];
  let createdCount = 0;

  for (const celebrationDay of celebrationDays) {
    if (!celebrationDay.character_id || !celebrationDay.title) {
      continue;
    }

    const { data: characterData, error: characterError } = await supabase
      .from("characters")
      .select("id, temporary_name, final_name, status, icon_image_url, image_url")
      .eq("id", celebrationDay.character_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (characterError || !characterData) {
      continue;
    }

    const character = characterData as CharacterRow;

    if (character.status !== "active") {
      continue;
    }

    const thread = await getOrCreateSingleChatThread({
      supabase,
      userId,
      character,
    });

    const { data: logData, error: logError } = await supabase
      .from("celebration_event_logs")
      .upsert(
        {
          user_id: userId,
          character_id: character.id,
          celebration_day_id: celebrationDay.id,
          thread_id: thread.id,
          event_date: eventDate,
        },
        {
          onConflict: "user_id,character_id,celebration_day_id,event_date",
        },
      )
      .select(
        "id, user_id, character_id, celebration_day_id, thread_id, event_date, notification_id, message_text, opened_at, completed_at, created_at",
      )
      .maybeSingle();

    if (logError || !logData) {
      continue;
    }

    const log = logData as CelebrationEventLogRow;

    if (log.completed_at || log.notification_id) {
      continue;
    }

    const characterName = getCharacterName(character);
    const linkPath = `/app/chat/${thread.id}?celebration=${log.id}`;

    const notificationResult = await createInAppNotification({
      supabase,
      userId,
      type: "celebration_day",
      title: `${characterName}からあなたにメッセージがあるようです`,
      body: `今日は「${celebrationDay.title}」の日。${characterName}があなたを待っています。`,
      linkPath,
      relatedThreadId: thread.id,
      relatedCharacterId: character.id,
      metadata: {
        celebration_event_log_id: log.id,
        celebration_day_id: celebrationDay.id,
        celebration_title: celebrationDay.title,
        event_date: eventDate,
      },
    });

    if (!notificationResult.ok) {
      continue;
    }

    if (notificationResult.notificationId) {
      await supabase
        .from("celebration_event_logs")
        .update({
          notification_id: notificationResult.notificationId,
        })
        .eq("id", log.id)
        .eq("user_id", userId);
    }

    createdCount += 1;
  }

  return {
    ok: true,
    createdCount,
    skippedReason: null,
  };
}

export async function getPendingCelebrationEventForThread({
  supabase,
  userId,
  threadId,
  eventLogId,
}: {
  supabase: any;
  userId: string;
  threadId: string;
  eventLogId: string | null | undefined;
}): Promise<PendingCelebrationEvent | null> {
  if (!eventLogId) {
    return null;
  }

  const eventDate = getJstDateString();

  const { data: logData, error: logError } = await supabase
    .from("celebration_event_logs")
    .select(
      "id, user_id, character_id, celebration_day_id, thread_id, event_date, notification_id, message_text, opened_at, completed_at, created_at",
    )
    .eq("id", eventLogId)
    .eq("user_id", userId)
    .eq("thread_id", threadId)
    .eq("event_date", eventDate)
    .is("completed_at", null)
    .maybeSingle();

  if (logError || !logData) {
    return null;
  }

  const log = logData as CelebrationEventLogRow;

  const { data: celebrationDayData, error: celebrationDayError } = await supabase
    .from("celebration_days")
    .select("id, character_id, month, day, title, message_hint")
    .eq("id", log.celebration_day_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (celebrationDayError || !celebrationDayData) {
    return null;
  }

  const celebrationDay = celebrationDayData as CelebrationDayRow;

  const { data: characterData, error: characterError } = await supabase
    .from("characters")
    .select("id, temporary_name, final_name, status, icon_image_url, image_url")
    .eq("id", log.character_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (characterError || !characterData) {
    return null;
  }

  const character = characterData as CharacterRow;

  if (character.status !== "active") {
    return null;
  }

  return {
    id: log.id,
    eventDate: log.event_date,
    threadId,
    notificationId: log.notification_id,
    celebrationTitle: celebrationDay.title || "大切な日",
    messageHint: celebrationDay.message_hint,
    character: {
      id: character.id,
      name: getCharacterName(character),
      iconImageUrl: character.icon_image_url,
      imageUrl: character.image_url,
    },
  };
}

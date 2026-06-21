import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import { createGroupChat } from "./actions";

type GroupNewPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

type PlanTier = "free" | "premium_lite" | "premium";

type ProfileForGroupChat = {
  plan: string | null;
  created_at: string | null;
};

type CharacterRow = {
  id: string;
  temporary_name: string | null;
  final_name: string | null;
  role_name: string | null;
  expertise: string | null;
  icon_image_url: string | null;
  status: string | null;
};

type GroupChatAccess = {
  canUse: boolean;
  label: string;
  description: string;
  isTrialBoostActive: boolean;
  remainingHours: number;
};

const FREE_TRIAL_BOOST_HOURS = 72;
const GROUP_CHAT_MAX_MEMBERS = 3;

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

function getFreeTrialRemainingHours({
  plan,
  createdAt,
}: {
  plan: string | null;
  createdAt: string | null | undefined;
}) {
  if (getPlanTier(plan) !== "free" || !createdAt) {
    return 0;
  }

  const createdAtTime = new Date(createdAt).getTime();

  if (Number.isNaN(createdAtTime)) {
    return 0;
  }

  const endsAtTime =
    createdAtTime + FREE_TRIAL_BOOST_HOURS * 60 * 60 * 1000;

  if (Date.now() >= endsAtTime) {
    return 0;
  }

  return Math.max(1, Math.ceil((endsAtTime - Date.now()) / (60 * 60 * 1000)));
}

function getGroupChatAccess(profile: ProfileForGroupChat): GroupChatAccess {
  const planTier = getPlanTier(profile.plan);

  if (planTier === "premium") {
    return {
      canUse: true,
      label: "Premium",
      description: "Premiumでは、グループチャットを利用できます。",
      isTrialBoostActive: false,
      remainingHours: 0,
    };
  }

  if (planTier === "premium_lite") {
    return {
      canUse: true,
      label: "Lite",
      description: "Liteでは、グループチャットを利用できます。",
      isTrialBoostActive: false,
      remainingHours: 0,
    };
  }

  const remainingHours = getFreeTrialRemainingHours({
    plan: profile.plan,
    createdAt: profile.created_at,
  });

  if (remainingHours > 0) {
    return {
      canUse: true,
      label: "Free Trial",
      description:
        "初回72時間トライアル中です。今だけグループチャットを体験できます。",
      isTrialBoostActive: true,
      remainingHours,
    };
  }

  return {
    canUse: false,
    label: "Free",
    description:
      "グループチャットはLite以上、または初回72時間トライアル中に利用できます。",
    isTrialBoostActive: false,
    remainingHours: 0,
  };
}

function getCharacterName(character: CharacterRow) {
  return (
    character.final_name ||
    character.temporary_name ||
    "名前のないキャラクター"
  );
}

function getAvatarText(name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return "◇";
  }

  return trimmedName.slice(0, 1);
}

function CharacterAvatar({
  name,
  imageUrl,
}: {
  name: string;
  imageUrl: string | null;
}) {
  if (imageUrl) {
    return (
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-[#BEF264]/25 bg-white shadow-lg shadow-[#7DD3FC]/10">
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#BEF264]/25 bg-gradient-to-br from-[#BEF264]/20 to-[#7DD3FC]/20 text-xl font-black text-[#F4F1EA]">
      {getAvatarText(name)}
    </div>
  );
}

export default async function NewGroupChatPage({
  searchParams,
}: GroupNewPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select("plan, created_at")
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileData ?? {
    plan: "free",
    created_at: user.created_at ?? null,
  }) as ProfileForGroupChat;

  const access = getGroupChatAccess(profile);

  const { data: charactersData } = await supabase
    .from("characters")
    .select(
      `
      id,
      temporary_name,
      final_name,
      role_name,
      expertise,
      icon_image_url,
      status
    `,
    )
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const characters = (charactersData ?? []) as CharacterRow[];
  const canCreateGroup = access.canUse && characters.length >= 2;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.12),transparent_34%),#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <Link
            href="/app/chats"
            className="text-sm text-[#A7B0C0] hover:text-[#F4F1EA]"
          >
            ← チャット一覧へ戻る
          </Link>

          <p className="mt-8 text-sm font-semibold tracking-[0.24em] text-[#7DD3FC]">
            GROUP CHAT
          </p>
          <h1 className="mt-2 text-3xl font-black">
            グループチャットを作る
          </h1>
          <p className="mt-3 text-sm leading-7 text-[#A7B0C0]">
            2人以上のキャラクターを選んで、同じ場所で会話できる部屋を作ります。
            最初のMVPでは最大{GROUP_CHAT_MAX_MEMBERS}人まで選べます。
          </p>
        </header>

        <section className="mt-6 rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-[#FACC15]">
                CURRENT ACCESS
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={[
                    "rounded-full border px-3 py-1 text-xs font-black",
                    access.canUse
                      ? "border-[#BEF264]/25 bg-[#BEF264]/10 text-[#D9F99D]"
                      : "border-[#FACC15]/25 bg-[#FACC15]/10 text-[#FDE68A]",
                  ].join(" ")}
                >
                  {access.label}
                </span>

                {access.isTrialBoostActive ? (
                  <span className="rounded-full border border-[#7DD3FC]/25 bg-[#7DD3FC]/10 px-3 py-1 text-xs font-black text-[#BAE6FD]">
                    残り約{access.remainingHours}時間
                  </span>
                ) : null}
              </div>

              <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
                {access.description}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 px-4 py-3 text-center">
              <p className="text-2xl font-black text-[#F4F1EA]">
                {characters.length}
              </p>
              <p className="mt-1 text-[10px] font-semibold text-[#BAE6FD]">
                active
              </p>
            </div>
          </div>
        </section>

        {params.error ? (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            {params.error}
          </div>
        ) : null}

        {!access.canUse ? (
          <section className="mt-8 rounded-[2rem] border border-[#FACC15]/25 bg-[#FACC15]/10 p-6 text-center shadow-2xl shadow-black/30">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[#FACC15]/25 bg-[#FACC15]/10 text-2xl">
              ✦
            </div>

            <h2 className="mt-5 text-2xl font-black">
              グループチャットは現在ロック中です
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#D8DEE9]">
              Free通常時は1対1チャットのみ利用できます。
              Lite以上にすると、複数キャラクターとのグループチャットを使えるようになります。
            </p>

            <Link
              href="/app/settings"
              className="mt-6 block rounded-2xl bg-gradient-to-r from-[#FACC15] to-[#BEF264] px-5 py-4 text-center text-sm font-black text-[#07111F]"
            >
              プラン設定を見る
            </Link>
          </section>
        ) : characters.length < 2 ? (
          <section className="mt-8 rounded-[2rem] border border-dashed border-white/15 bg-white/[0.04] p-6 text-center shadow-2xl shadow-black/30">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#BEF264]/10 text-2xl">
              ◇
            </div>

            <h2 className="mt-5 text-xl font-black">
              グループチャットには2人以上必要です
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
              出会いイベントを終えて、activeになったキャラクターが2人以上いると作成できます。
            </p>

            <Link
              href="/app/characters"
              className="mt-6 block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F]"
            >
              キャラクター一覧へ
            </Link>
          </section>
        ) : (
          <form action={createGroupChat} className="mt-8 space-y-5">
            <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
              <p className="text-sm font-semibold text-[#7DD3FC]">
                STEP 1 / グループ名
              </p>

              <label className="mt-5 block">
                <span className="text-sm font-medium text-[#D8DEE9]">
                  グループ名
                </span>
                <input
                  name="title"
                  type="text"
                  maxLength={50}
                  placeholder="空欄ならキャラ名から自動で作成"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
              </label>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
              <p className="text-sm font-semibold text-[#BEF264]">
                STEP 2 / 参加キャラクター
              </p>

              <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
                2人以上、最大{GROUP_CHAT_MAX_MEMBERS}人まで選んでください。
                キャラクター同士の関係性設定は、次のAI返信で参照できるように拡張します。
              </p>

              <div className="mt-5 grid gap-3">
                {characters.map((character) => {
                  const name = getCharacterName(character);

                  return (
                    <label
                      key={character.id}
                      className="flex cursor-pointer items-start gap-4 rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#BEF264]/30 hover:bg-white/[0.07]"
                    >
                      <input
                        name="characterIds"
                        type="checkbox"
                        value={character.id}
                        className="mt-5 shrink-0 accent-[#BEF264]"
                      />

                      <CharacterAvatar
                        name={name}
                        imageUrl={character.icon_image_url}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="break-words text-base font-black text-[#F4F1EA]">
                          {name}
                        </p>

                        {character.role_name ? (
                          <p className="mt-1 text-xs font-bold text-[#BAE6FD]">
                            {character.role_name}
                          </p>
                        ) : null}

                        {character.expertise ? (
                          <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#A7B0C0]">
                            {character.expertise}
                          </p>
                        ) : null}
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>

            <button
              type="submit"
              disabled={!canCreateGroup}
              className="w-full rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              グループチャットを作成する
            </button>
          </form>
        )}
      </section>

      <AppBottomNav />
    </main>
  );
}
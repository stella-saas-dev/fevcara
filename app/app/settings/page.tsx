import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import { updateDevPlan, updateUserProfile } from "./actions";

type SettingsPageProps = {
  searchParams: Promise<{
    plan_updated?: string;
    profile_updated?: string;
    error?: string;
  }>;
};

type ProfileRow = {
  plan: string | null;
  active_character_id: string | null;
  character_limit_choice_locked: boolean | null;
  display_name: string | null;
  treatment_preference: string | null;
  user_setup_completed: boolean | null;
};

function normalizePlan(plan: string | null) {
  return (plan || "free").trim().toLowerCase().replace(/\s+/g, "_");
}

function getPlanLabel(plan: string | null) {
  const normalizedPlan = normalizePlan(plan);

  if (normalizedPlan.includes("lite")) {
    return "Premium Lite";
  }

  if (
    normalizedPlan.includes("premium") ||
    normalizedPlan.includes("pro") ||
    normalizedPlan.includes("paid")
  ) {
    return "Premium";
  }

  return "Free";
}

function getPlanDescription(plan: string | null) {
  const normalizedPlan = normalizePlan(plan);

  if (normalizedPlan.includes("lite")) {
    return "キャラクター3人、グループチャット、記憶強化を想定したプランです。";
  }

  if (
    normalizedPlan.includes("premium") ||
    normalizedPlan.includes("pro") ||
    normalizedPlan.includes("paid")
  ) {
    return "キャラクター10人、複数チーム、高度な相談モードを想定したプランです。";
  }

  return "キャラクター1人、1日10メッセージを基本とする無料プランです。";
}

function getUpdatedPlanLabel(plan: string | undefined) {
  if (plan === "premium_lite") {
    return "Premium Lite";
  }

  if (plan === "premium") {
    return "Premium";
  }

  if (plan === "free") {
    return "Free";
  }

  return null;
}

function getTreatmentPreferenceLabel(value: string | null) {
  if (value === "masculine") {
    return "男性として扱われたい";
  }

  if (value === "feminine") {
    return "女性として扱われたい";
  }

  if (value === "neutral") {
    return "中性的";
  }

  return "指定しない";
}

const treatmentPreferenceOptions = [
  {
    value: "masculine",
    label: "男性として扱われたい",
    description:
      "一部のキャラクターが、男性として自然な呼び方や距離感を選びやすくなります。",
  },
  {
    value: "feminine",
    label: "女性として扱われたい",
    description:
      "一部のキャラクターが、女性として自然な呼び方や距離感を選びやすくなります。",
  },
  {
    value: "neutral",
    label: "中性的",
    description: "性別を強く決めず、中性的な言葉選びを優先します。",
  },
  {
    value: "unspecified",
    label: "指定しない",
    description: "キャラクターごとの設定や会話の流れを優先します。",
  },
];

export default async function SettingsPage({
  searchParams,
}: SettingsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const enableDevPlanSwitch =
    process.env.FEVCARA_ENABLE_DEV_PLAN_SWITCH === "true";

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profileData } = await supabase
    .from("profiles")
    .select(
      "plan, active_character_id, character_limit_choice_locked, display_name, treatment_preference, user_setup_completed",
    )
    .eq("id", user.id)
    .maybeSingle();

  const profile = (profileData ?? {
    plan: "free",
    active_character_id: null,
    character_limit_choice_locked: false,
    display_name: "",
    treatment_preference: "unspecified",
    user_setup_completed: false,
  }) as ProfileRow;

  const { count: characterCount } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const currentPlanLabel = getPlanLabel(profile.plan);
  const updatedPlanLabel = getUpdatedPlanLabel(params.plan_updated);
  const hasCharacterLock =
    Boolean(profile.character_limit_choice_locked) &&
    Boolean(profile.active_character_id);
  const currentTreatmentPreference =
    profile.treatment_preference || "unspecified";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(190,242,100,0.12),transparent_32%),radial-gradient(circle_at_top_right,rgba(125,211,252,0.12),transparent_34%),#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <p className="text-sm font-semibold tracking-[0.24em] text-[#FACC15]">
            SETTINGS
          </p>
          <h1 className="mt-2 text-3xl font-black">設定</h1>
          <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
            アカウント、通知、プラン管理などをここから調整します。
          </p>
        </header>

        {params.error ? (
          <div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            {params.error}
          </div>
        ) : null}

        {params.profile_updated ? (
          <div className="mt-6 rounded-2xl border border-[#BEF264]/30 bg-[#BEF264]/10 p-4 text-sm leading-6 text-[#D9F99D]">
            ユーザー設定を保存しました。
          </div>
        ) : null}

        {updatedPlanLabel && enableDevPlanSwitch ? (
          <div className="mt-6 rounded-2xl border border-[#BEF264]/30 bg-[#BEF264]/10 p-4 text-sm leading-6 text-[#D9F99D]">
            プランを{updatedPlanLabel}に変更しました。キャラクター選択ロックも解除されました。
          </div>
        ) : null}

        <div className="mt-8 grid gap-4">
          <section
            id="user-profile"
            className="scroll-mt-6 rounded-[2rem] border border-[#BEF264]/20 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30"
          >
            <p className="text-xs font-black tracking-[0.2em] text-[#BEF264]">
              USER PROFILE
            </p>
            <h2 className="mt-2 text-xl font-black">
              FevCara内でのあなたの設定
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              キャラクターたちが、あなたに自然に話しかけるための基本設定です。
              本名でなくても大丈夫です。
            </p>

            {!profile.user_setup_completed ? (
              <div className="mt-4 rounded-2xl border border-[#FACC15]/25 bg-[#FACC15]/10 p-4">
                <p className="text-sm font-black text-[#FDE68A]">
                  まずはあなたのことを教えてください
                </p>
                <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
                  この設定が完了するまで、ホーム画面に案内カードが表示されます。
                </p>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-[#BEF264]/20 bg-[#BEF264]/10 p-4">
                <p className="text-sm font-black text-[#D9F99D]">
                  ユーザー設定は完了しています
                </p>
                <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
                  現在の扱われ方の好み：
                  {getTreatmentPreferenceLabel(currentTreatmentPreference)}
                </p>
              </div>
            )}

            <form action={updateUserProfile} className="mt-5 grid gap-4">
              <label className="block">
                <span className="flex items-center gap-2 text-sm font-medium text-[#D8DEE9]">
                  FevCara内でのあなたの名前
                  <span className="rounded-full bg-[#FACC15]/15 px-2 py-0.5 text-[10px] font-black text-[#FDE68A]">
                    必須
                  </span>
                </span>
                <input
                  name="displayName"
                  type="text"
                  defaultValue={profile.display_name ?? ""}
                  placeholder="例：そら"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                />
                <p className="mt-2 text-xs leading-5 text-[#7D8AA3]">
                  アプリ内で表示されるユーザー名です。
                  将来の履歴表示や監査ログでも、この名前を使えるようにします。
                </p>
              </label>

              <div className="rounded-3xl border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 p-4">
                <p className="text-sm font-semibold text-[#BAE6FD]">
                  キャラクターに呼ばれたい名前は別で設定できます
                </p>
                <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
                  ここで入力する名前は、FevCara内のユーザー名です。
                  キャラクターにどう呼ばれたいかは、キャラクターごとの設定や出会いイベントで決められます。
                </p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-semibold text-[#F4F1EA]">
                  扱われ方の好み
                </p>
                <p className="mt-3 text-xs leading-6 text-[#A7B0C0]">
                  キャラクターがあなたに話しかけるときの言葉選びの参考にします。
                  戸籍上の性別や本当の性別を聞くものではありません。
                  FevCara内で、どのように接されると自然に感じるかを選んでください。
                </p>

                <div className="mt-4 grid gap-3">
                  {treatmentPreferenceOptions.map((option) => (
                    <label
                      key={option.value}
                      className="block cursor-pointer rounded-2xl border border-white/10 bg-black/10 p-4 transition hover:border-[#BEF264]/35 hover:bg-white/[0.06]"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="treatmentPreference"
                          value={option.value}
                          defaultChecked={
                            currentTreatmentPreference === option.value
                          }
                          className="mt-1 shrink-0 accent-[#BEF264]"
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-black text-[#F4F1EA]">
                            {option.label}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-[#A7B0C0]">
                            {option.description}
                          </p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
              >
                ユーザー設定を保存する
              </button>
            </form>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30">
            <p className="text-xs font-black tracking-[0.2em] text-[#7DD3FC]">
              CURRENT PLAN
            </p>

            <div className="mt-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black">{currentPlanLabel}</h2>
                <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                  {getPlanDescription(profile.plan)}
                </p>
              </div>

              <div className="shrink-0 rounded-2xl border border-[#BEF264]/20 bg-[#BEF264]/10 px-4 py-3 text-center">
                <p className="text-2xl font-black text-[#F4F1EA]">
                  {characterCount ?? 0}
                </p>
                <p className="mt-1 text-[10px] font-semibold text-[#D9F99D]">
                  characters
                </p>
              </div>
            </div>

            {hasCharacterLock ? (
              <div className="mt-5 rounded-2xl border border-[#FACC15]/25 bg-[#FACC15]/10 p-4">
                <p className="text-sm font-black text-[#FDE68A]">
                  Free用キャラクター選択がロックされています
                </p>
                <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
                  Premium Lite以上に変更すると、このロックは解除されます。
                </p>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="text-sm font-black text-[#F4F1EA]">
                  キャラクター選択ロックなし
                </p>
                <p className="mt-2 text-xs leading-6 text-[#A7B0C0]">
                  現在はFree用の固定キャラクター選択は有効ではありません。
                </p>
              </div>
            )}
          </section>

          {enableDevPlanSwitch ? (
            <section className="rounded-[2rem] border border-[#FACC15]/20 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30">
              <p className="text-xs font-black tracking-[0.2em] text-[#FACC15]">
                DEV PLAN SWITCH
              </p>
              <h2 className="mt-2 text-xl font-black">
                開発用プラン切り替え
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                Stripe連携前の開発確認用です。プラン変更時に
                active_character_id と character_limit_choice_locked を解除します。
              </p>

              <div className="mt-4 rounded-2xl border border-[#FACC15]/25 bg-[#FACC15]/10 p-4">
                <p className="text-xs font-bold leading-6 text-[#FDE68A]">
                  このUIは FEVCARA_ENABLE_DEV_PLAN_SWITCH=true の時だけ表示されます。
                  本番では環境変数を未設定または false にしてください。
                </p>
              </div>

              <form action={updateDevPlan} className="mt-5 grid gap-3">
                <button
                  type="submit"
                  name="plan"
                  value="free"
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-left transition hover:border-[#FACC15]/35 hover:bg-white/[0.07]"
                >
                  <span className="block text-sm font-black text-[#F4F1EA]">
                    Freeにする
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#A7B0C0]">
                    キャラ1人まで。2人以上いる場合は、キャラ一覧で使うキャラ選択が必要になります。
                  </span>
                </button>

                <button
                  type="submit"
                  name="plan"
                  value="premium_lite"
                  className="rounded-2xl border border-[#BEF264]/20 bg-[#BEF264]/10 px-5 py-4 text-left transition hover:bg-[#BEF264]/15"
                >
                  <span className="block text-sm font-black text-[#D9F99D]">
                    Premium Liteにする
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#D8DEE9]">
                    キャラ3人まで。Freeのキャラ固定ロックを解除します。
                  </span>
                </button>

                <button
                  type="submit"
                  name="plan"
                  value="premium"
                  className="rounded-2xl border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 px-5 py-4 text-left transition hover:bg-[#7DD3FC]/15"
                >
                  <span className="block text-sm font-black text-[#BAE6FD]">
                    Premiumにする
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#D8DEE9]">
                    キャラ10人まで。複数キャラ利用を想定した上位プランです。
                  </span>
                </button>
              </form>
            </section>
          ) : (
            <section className="rounded-[2rem] border border-white/10 bg-[#111827]/85 p-5 shadow-2xl shadow-black/30">
              <p className="text-xs font-black tracking-[0.2em] text-[#FACC15]">
                PLAN
              </p>
              <h2 className="mt-2 text-xl font-black">プラン管理</h2>
              <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                プラン変更・支払い管理は、Stripe連携後にここから操作できるようにします。
              </p>
            </section>
          )}

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-sm font-semibold">通知</p>
            <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
              キャラクターからの不定期コメント通知を設定します。後で追加します。
            </p>
          </section>

          <Link
            href="/"
            className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-semibold text-[#F4F1EA]"
          >
            トップページへ戻る
          </Link>
        </div>
      </section>

      <AppBottomNav />
    </main>
  );
}
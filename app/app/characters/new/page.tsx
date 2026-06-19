import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/app/_components/AppBottomNav";
import { createClient } from "@/lib/supabase/server";
import { createCharacter } from "./actions";

const artStyles = [
  {
    slug: "midnight_anime",
    name: "Midnight Anime",
    description: "夜にも映える、落ち着いたアニメ調の標準スタイル。",
    previewClass:
      "bg-[radial-gradient(circle_at_35%_30%,_#F4F1EA_0_8%,_transparent_9%),radial-gradient(circle_at_65%_30%,_#BEF264_0_8%,_transparent_9%),linear-gradient(135deg,_#1E293B,_#0B1020)]",
  },
  {
    slug: "soft_novel",
    name: "Soft Novel",
    description: "やわらかい線と淡い陰影の、物語向けイラスト調。",
    previewClass:
      "bg-[radial-gradient(circle_at_35%_35%,_#FDE68A_0_9%,_transparent_10%),radial-gradient(circle_at_65%_35%,_#FBCFE8_0_9%,_transparent_10%),linear-gradient(135deg,_#FDE68A,_#A7F3D0)]",
  },
  {
    slug: "clean_webtoon",
    name: "Clean Webtoon",
    description: "スマホで見やすい、輪郭がはっきりした現代的スタイル。",
    previewClass:
      "bg-[radial-gradient(circle_at_35%_32%,_#FFFFFF_0_8%,_transparent_9%),radial-gradient(circle_at_65%_32%,_#7DD3FC_0_8%,_transparent_9%),linear-gradient(135deg,_#2563EB,_#22C55E)]",
  },
  {
    slug: "dark_fantasy",
    name: "Dark Fantasy",
    description: "影と幻想感を強めた、クールなキャラクター向けスタイル。",
    previewClass:
      "bg-[radial-gradient(circle_at_35%_35%,_#A78BFA_0_8%,_transparent_9%),radial-gradient(circle_at_65%_35%,_#FACC15_0_7%,_transparent_8%),linear-gradient(135deg,_#111827,_#581C87)]",
  },
];

type NewCharacterPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

type PlanTier = "free" | "premium_lite" | "premium";

type CharacterLimitConfig = {
  planTier: PlanTier;
  limit: number;
  label: string;
  description: string;
};

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

function getCharacterLimitConfig(plan: string | null): CharacterLimitConfig {
  const planTier = getPlanTier(plan);

  if (planTier === "premium") {
    return {
      planTier,
      limit: 10,
      label: "Premium",
      description: "Premiumでは、最大10人までキャラクターを作成できます。",
    };
  }

  if (planTier === "premium_lite") {
    return {
      planTier,
      limit: 3,
      label: "Premium Lite",
      description: "Premium Liteでは、最大3人までキャラクターを作成できます。",
    };
  }

  return {
    planTier,
    limit: 1,
    label: "Free",
    description: "Freeでは、まず1人のキャラクターとじっくり出会えます。",
  };
}

export default async function NewCharacterPage({
  searchParams,
}: NewCharacterPageProps) {
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
    .select("plan")
    .eq("id", user.id)
    .maybeSingle();

  const currentPlan = String(profileData?.plan ?? "free");
  const limitConfig = getCharacterLimitConfig(currentPlan);

  const { count } = await supabase
    .from("characters")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const characterCount = count ?? 0;
  const isLimitReached = characterCount >= limitConfig.limit;
  const isOverLimit = characterCount > limitConfig.limit;

  return (
    <main className="min-h-screen bg-[#0B1020] px-5 pb-28 pt-8 text-[#F4F1EA]">
      <section className="mx-auto w-full max-w-md">
        <header>
          <Link
            href="/app/characters"
            className="text-sm text-[#A7B0C0] hover:text-[#F4F1EA]"
          >
            ← キャラクター一覧へ戻る
          </Link>

          <p className="mt-8 text-sm font-semibold tracking-[0.24em] text-[#FACC15]">
            CREATE CHARACTER
          </p>
          <h1 className="mt-2 text-3xl font-black">新しい存在を生み出す</h1>
          <p className="mt-3 text-sm leading-7 text-[#A7B0C0]">
            外見、話し方、目の色、表情、祝ってほしい日。
            あなたの“好き”から、あなただけのAIキャラクターを作ります。
          </p>
        </header>

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black tracking-[0.2em] text-[#7DD3FC]">
                CURRENT PLAN
              </p>
              <h2 className="mt-2 text-xl font-black">{limitConfig.label}</h2>
              <p className="mt-2 text-sm leading-6 text-[#A7B0C0]">
                {limitConfig.description}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-[#BEF264]/20 bg-[#BEF264]/10 px-4 py-3 text-center">
              <p className="text-2xl font-black text-[#F4F1EA]">
                {characterCount}
                <span className="text-sm text-[#A7B0C0]">
                  {" "}
                  / {limitConfig.limit}
                </span>
              </p>
              <p className="mt-1 text-[10px] font-semibold text-[#D9F99D]">
                characters
              </p>
            </div>
          </div>

          {isOverLimit ? (
            <div className="mt-4 rounded-2xl border border-[#FACC15]/25 bg-[#FACC15]/10 p-4">
              <p className="text-sm font-black text-[#FDE68A]">
                現在のプラン上限を超えています。
              </p>
              <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
                ダウングレード後もキャラクターは自動削除しません。
                今後、使い続けるキャラクターを一度だけ選ぶ画面を追加します。
              </p>
            </div>
          ) : null}
        </div>

        {params.error ? (
          <div className="mt-5 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100">
            {params.error}
          </div>
        ) : null}

        {isLimitReached ? (
          <div className="mt-8 rounded-[2rem] border border-[#FACC15]/25 bg-[#111827]/85 p-6 text-center shadow-2xl shadow-black/30">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-[#FACC15]/25 bg-[#FACC15]/10 text-2xl">
              ✦
            </div>

            <h2 className="mt-5 text-2xl font-black">
              キャラクター作成上限に達しています
            </h2>

            <p className="mt-3 text-sm leading-7 text-[#A7B0C0]">
              {limitConfig.label}プランでは、キャラクターを
              <span className="font-black text-[#F4F1EA]">
                {limitConfig.limit}人
              </span>
              まで作成できます。
              現在は
              <span className="font-black text-[#F4F1EA]">
                {characterCount}人
              </span>
              います。
            </p>

            <div className="mt-6 grid gap-3">
              <Link
                href="/app/characters"
                className="block rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-center text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20"
              >
                キャラクター一覧へ
              </Link>

              <Link
                href="/app/settings"
                className="block rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-center text-sm font-bold text-[#F4F1EA] transition hover:border-[#BEF264]/30"
              >
                プラン設定を見る
              </Link>
            </div>

            <p className="mt-5 text-xs leading-6 text-[#7D8AA3]">
              キャラクター削除と、ダウングレード時に使うキャラを一度だけ選ぶ機能は、
              次の作業で追加します。
            </p>
          </div>
        ) : (
          <form action={createCharacter} className="mt-8 space-y-5">
            <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
              <p className="text-sm font-semibold text-[#7DD3FC]">
                STEP 1 / 基本プロフィール
              </p>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    キャラクターの仮名
                  </span>
                  <input
                    name="temporaryName"
                    type="text"
                    placeholder="例：ルイ、ミナト、セレナ"
                    required
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                  <p className="mt-2 text-xs text-[#7D8AA3]">
                    出会いイベントで正式な名前として確認できます。
                  </p>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    性別・雰囲気
                  </span>
                  <input
                    name="genderFeel"
                    type="text"
                    placeholder="例：男性 / 中性的 / 少女 / 性別不詳"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    年齢感
                  </span>
                  <input
                    name="ageFeel"
                    type="text"
                    placeholder="例：20代前半くらい / 年齢不詳 / 少年風"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-medium text-[#D8DEE9]">
                      髪色
                    </span>
                    <input
                      name="hairColor"
                      type="text"
                      placeholder="例：銀色"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-[#D8DEE9]">
                      目の色
                    </span>
                    <input
                      name="eyeColor"
                      type="text"
                      placeholder="例：青紫"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    髪型
                  </span>
                  <input
                    name="hairstyle"
                    type="text"
                    placeholder="例：少し長めの黒髪、前髪あり"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    服装
                  </span>
                  <textarea
                    name="outfit"
                    placeholder="例：黒いロングコート、白いシャツ、細いリボンタイ"
                    rows={3}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    基本表情
                  </span>
                  <input
                    name="defaultExpression"
                    type="text"
                    placeholder="例：やわらかく微笑んでいる / クールな無表情 / 少し照れている"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                  <p className="mt-2 text-xs leading-5 text-[#7D8AA3]">
                    初回の立ち絵画像に反映する表情です。あとから調整できます。
                  </p>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    表情のこだわり
                  </span>
                  <textarea
                    name="expressionDetail"
                    placeholder="例：口元だけ少し笑う。目は落ち着いていて、感情を出しすぎない。"
                    rows={3}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
              <p className="text-sm font-semibold text-[#BEF264]">
                STEP 2 / 性格・話し方
              </p>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    性格
                  </span>
                  <textarea
                    name="personality"
                    placeholder="例：落ち着いているけど少し照れ屋。面倒見がよく、創作の相談に優しく乗ってくれる。"
                    rows={4}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-sm font-medium text-[#D8DEE9]">
                      一人称
                    </span>
                    <input
                      name="firstPerson"
                      type="text"
                      placeholder="例：僕"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-medium text-[#D8DEE9]">
                      あなたの呼び方
                    </span>
                    <input
                      name="userNickname"
                      type="text"
                      placeholder="例：先輩"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    口調・話し方
                  </span>
                  <textarea
                    name="speechStyle"
                    placeholder="例：基本は穏やかで少し甘め。長文すぎず、1〜3文で自然に返す。語尾は柔らかく、押しつけがましくしない。"
                    rows={4}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    禁止したい話し方
                  </span>
                  <textarea
                    name="forbiddenSpeech"
                    placeholder="例：説教っぽくしない。毎回質問で終わらない。語尾に毎回♡を付けない。ユーザーを呼び捨てにしない。"
                    rows={4}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
              <p className="text-sm font-semibold text-[#7DD3FC]">
                STEP 3 / 役割・専門性
              </p>

              <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
                このキャラクターが、AIチームの中でどんな役割を持つかを設定します。
                ただの会話相手ではなく、あなたを支える専門家としての個性になります。
              </p>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    役割名
                  </span>
                  <input
                    name="roleName"
                    type="text"
                    placeholder="例：戦略担当 / アイデア担当 / メンタル担当"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#7DD3FC]/60"
                  />
                  <p className="mt-2 text-xs leading-5 text-[#7D8AA3]">
                    グループチャットでの立ち位置になります。
                  </p>
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    専門分野
                  </span>
                  <textarea
                    name="expertise"
                    placeholder="例：SaaS、ビジネス、マーケティング、分析"
                    rows={3}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#7DD3FC]/60"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    得意な相談
                  </span>
                  <textarea
                    name="consultationStyle"
                    placeholder="例：事業設計、収益モデル、優先順位整理、現実的な改善案"
                    rows={3}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#7DD3FC]/60"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    思考スタイル
                  </span>
                  <textarea
                    name="thinkingStyle"
                    placeholder="例：冷静、論理的、リスク重視。結論から話し、根拠を添える。"
                    rows={3}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#7DD3FC]/60"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    チーム内での立ち位置
                  </span>
                  <textarea
                    name="teamPosition"
                    placeholder="例：現実性と実行可能性を見るまとめ役。楽観的な案に対して冷静に検証する。"
                    rows={3}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#7DD3FC]/60"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
              <p className="text-sm font-semibold text-[#FACC15]">
                STEP 4 / 好きなもの・大切な日
              </p>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    好きなもの
                  </span>
                  <input
                    name="likes"
                    type="text"
                    placeholder="例：夜の散歩、紅茶、古い本"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    苦手なもの
                  </span>
                  <input
                    name="dislikes"
                    type="text"
                    placeholder="例：大きな音、雑な扱い"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>

                <div className="rounded-3xl border border-[#FACC15]/20 bg-[#FACC15]/10 p-4">
                  <p className="text-sm font-semibold text-[#FDE68A]">
                    このキャラに祝ってほしい日
                  </p>
                  <p className="mt-2 text-xs leading-5 text-[#D8DEE9]">
                    本当の誕生日でなくても大丈夫です。
                    「活動記念日」「作品公開日」など、祝ってほしい日を登録できます。
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-medium text-[#D8DEE9]">
                        月
                      </span>
                      <input
                        name="celebrationMonth"
                        type="number"
                        min="1"
                        max="12"
                        placeholder="6"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#FACC15]/60"
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs font-medium text-[#D8DEE9]">
                        日
                      </span>
                      <input
                        name="celebrationDay"
                        type="number"
                        min="1"
                        max="31"
                        placeholder="18"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#FACC15]/60"
                      />
                    </label>
                  </div>

                  <label className="mt-4 block">
                    <span className="text-xs font-medium text-[#D8DEE9]">
                      何の日？
                    </span>
                    <input
                      name="celebrationTitle"
                      type="text"
                      placeholder="例：活動記念日"
                      className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#FACC15]/60"
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
              <p className="text-sm font-semibold text-[#7DD3FC]">
                STEP 5 / 絵柄プリセット
              </p>
              <p className="mt-3 text-sm leading-6 text-[#A7B0C0]">
                FevCaraでは、実在人物・既存キャラクター・写真風の生成を防ぐため、
                安全なオリジナルイラスト用プリセットから選びます。
              </p>

              <div className="mt-5 grid gap-3">
                {artStyles.map((style, index) => (
                  <label
                    key={style.slug}
                    className="block cursor-pointer rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-[#BEF264]/40 hover:bg-white/[0.07]"
                  >
                    <div className="flex items-center gap-4">
                      <input
                        type="radio"
                        name="artStyle"
                        value={style.slug}
                        defaultChecked={index === 0}
                        className="shrink-0 accent-[#BEF264]"
                      />

                      <div
                        className={[
                          "relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-white/15 shadow-lg shadow-black/30",
                          style.previewClass,
                        ].join(" ")}
                      >
                        <div className="absolute bottom-0 left-1/2 h-8 w-8 -translate-x-1/2 rounded-t-full bg-black/25" />
                        <div className="absolute left-1/2 top-3 h-7 w-7 -translate-x-1/2 rounded-full border border-white/20 bg-white/15 backdrop-blur-sm" />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-[#F4F1EA]">
                          {style.name}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#A7B0C0]">
                          {style.description}
                        </p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </section>

            <details className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
              <summary className="cursor-pointer text-sm font-semibold text-[#F4F1EA]">
                こだわり設定を開く
              </summary>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    外見の詳細プロンプト
                  </span>
                  <textarea
                    name="appearanceDetail"
                    placeholder="例：目元は涼しげ。光が当たると瞳が青緑に見える。細身で静かな雰囲気。"
                    rows={5}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#111827]/80 px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-[#D8DEE9]">
                    絶対に守ってほしい設定
                  </span>
                  <textarea
                    name="absoluteSettings"
                    placeholder="例：一人称は必ず僕。ユーザーを必ず先輩と呼ぶ。冷たすぎる言い方はしない。"
                    rows={5}
                    className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-[#111827]/80 px-4 py-4 text-sm outline-none placeholder:text-[#6B7280] focus:border-[#BEF264]/60"
                  />
                </label>
              </div>
            </details>

            <div className="rounded-3xl border border-[#FACC15]/20 bg-[#FACC15]/10 p-4">
              <p className="text-sm font-semibold text-[#FDE68A]">
                画像生成の安全ルール
              </p>
              <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
                実在人物、有名人、知人、既存キャラクター、特定作品、特定作家の絵柄、
                写真風・リアル系の指定はできません。
                FevCaraはオリジナルキャラクターを生み出すためのサービスです。
              </p>
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95"
            >
              この内容で保存する
            </button>
          </form>
        )}
      </section>

      <AppBottomNav />
    </main>
  );
}
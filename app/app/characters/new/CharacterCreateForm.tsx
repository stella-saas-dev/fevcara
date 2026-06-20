"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createCharacter } from "./actions";
import type {
  CharacterFormField,
  CreateCharacterState,
} from "./actions";

type ArtStyle = {
  slug: string;
  name: string;
  description: string;
  previewClass: string;
};

type CharacterCreateFormProps = {
  artStyles: ArtStyle[];
};

const initialState: CreateCharacterState = {
  values: {
    temporaryName: "",
    genderFeel: "",
    ageFeel: "",
    hairColor: "",
    eyeColor: "",
    hairstyle: "",
    outfit: "",
    defaultExpression: "",
    expressionDetail: "",
    personality: "",
    firstPerson: "",
    speechStyle: "",
    forbiddenSpeech: "",
    roleName: "",
    expertise: "",
    consultationStyle: "",
    thinkingStyle: "",
    teamPosition: "",
    likes: "",
    dislikes: "",
    celebrationMonth: "",
    celebrationDay: "",
    celebrationTitle: "",
    artStyle: "midnight_anime",
    appearanceDetail: "",
    absoluteSettings: "",
    safetyAgreement: "",
  },
  fieldErrors: {},
  formError: "",
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="mt-2 text-xs font-semibold text-red-200">{message}</p>;
}

function useFieldStyles(state: CreateCharacterState) {
  function inputClass(fieldName: CharacterFormField) {
    const hasError = Boolean(state.fieldErrors[fieldName]);

    return [
      "mt-2 w-full rounded-2xl border px-4 py-4 text-sm outline-none placeholder:text-[#6B7280]",
      hasError
        ? "border-red-400/70 bg-red-400/10 focus:border-red-300"
        : "border-white/10 bg-white/[0.05] focus:border-[#BEF264]/60",
    ].join(" ");
  }

  function textareaClass(fieldName: CharacterFormField) {
    return `${inputClass(fieldName)} resize-none`;
  }

  return {
    inputClass,
    textareaClass,
  };
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-gradient-to-r from-[#BEF264] to-[#7DD3FC] px-5 py-4 text-sm font-black text-[#07111F] shadow-lg shadow-[#7DD3FC]/20 transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
    >
      {pending ? "保存中..." : "この内容で保存する"}
    </button>
  );
}

export function CharacterCreateForm({ artStyles }: CharacterCreateFormProps) {
  const [state, formAction] = useActionState(createCharacter, initialState);
  const { inputClass, textareaClass } = useFieldStyles(state);
  const errorAlertRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!state.formError) return;

    window.requestAnimationFrame(() => {
      errorAlertRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      errorAlertRef.current?.focus({
        preventScroll: true,
      });
    });
  }, [state]);

  return (
    <form action={formAction} className="mt-8 space-y-5">
      {state.formError ? (
        <div
          ref={errorAlertRef}
          role="alert"
          tabIndex={-1}
          className="scroll-mt-8 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm leading-6 text-red-100 outline-none ring-0 focus:border-red-300/70"
        >
          <p className="font-black text-red-50">入力内容を確認してください</p>
          <p className="mt-2">{state.formError}</p>
        </div>
      ) : null}

      <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
        <p className="text-sm font-semibold text-[#7DD3FC]">
          STEP 1 / 基本プロフィール
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="flex items-center gap-2 text-sm font-medium text-[#D8DEE9]">
              キャラクターの仮名
              <span className="rounded-full bg-[#FACC15]/15 px-2 py-0.5 text-[10px] font-black text-[#FDE68A]">
                必須
              </span>
            </span>
            <input
              name="temporaryName"
              type="text"
              placeholder="例：ルイ、ミナト、セレナ"
              defaultValue={state.values.temporaryName}
              className={inputClass("temporaryName")}
            />
            <p className="mt-2 text-xs text-[#7D8AA3]">
              出会いイベントで正式な名前として確認できます。
            </p>
            <FieldError message={state.fieldErrors.temporaryName} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">
              性別・雰囲気
            </span>
            <input
              name="genderFeel"
              type="text"
              placeholder="例：男性 / 中性的 / 少女 / 性別不詳"
              defaultValue={state.values.genderFeel}
              className={inputClass("genderFeel")}
            />
            <FieldError message={state.fieldErrors.genderFeel} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">年齢感</span>
            <input
              name="ageFeel"
              type="text"
              placeholder="例：20代前半くらい / 年齢不詳 / 少年風"
              defaultValue={state.values.ageFeel}
              className={inputClass("ageFeel")}
            />
            <FieldError message={state.fieldErrors.ageFeel} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm font-medium text-[#D8DEE9]">髪色</span>
              <input
                name="hairColor"
                type="text"
                placeholder="例：銀色"
                defaultValue={state.values.hairColor}
                className={inputClass("hairColor")}
              />
              <FieldError message={state.fieldErrors.hairColor} />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-[#D8DEE9]">目の色</span>
              <input
                name="eyeColor"
                type="text"
                placeholder="例：青紫"
                defaultValue={state.values.eyeColor}
                className={inputClass("eyeColor")}
              />
              <FieldError message={state.fieldErrors.eyeColor} />
            </label>
          </div>

          <div className="rounded-3xl border border-[#7DD3FC]/20 bg-[#7DD3FC]/10 p-4">
            <p className="text-sm font-semibold text-[#BAE6FD]">
              目の色は空欄でも保存できます
            </p>
            <p className="mt-2 text-xs leading-5 text-[#D8DEE9]">
              キャラクターの印象を固定したい場合は、最初に入れておくと便利です。
              特殊な瞳にしたい場合は「青い瞳に星の光」「ピンクの渦目」のように書いて大丈夫です。
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">髪型</span>
            <input
              name="hairstyle"
              type="text"
              placeholder="例：少し長めの黒髪、前髪あり"
              defaultValue={state.values.hairstyle}
              className={inputClass("hairstyle")}
            />
            <FieldError message={state.fieldErrors.hairstyle} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">服装</span>
            <textarea
              name="outfit"
              placeholder="例：黒いロングコート、白いシャツ、細いリボンタイ"
              rows={3}
              defaultValue={state.values.outfit}
              className={textareaClass("outfit")}
            />
            <FieldError message={state.fieldErrors.outfit} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">
              基本表情
            </span>
            <input
              name="defaultExpression"
              type="text"
              placeholder="例：やわらかく微笑んでいる / クールな無表情 / 少し照れている"
              defaultValue={state.values.defaultExpression}
              className={inputClass("defaultExpression")}
            />
            <p className="mt-2 text-xs leading-5 text-[#7D8AA3]">
              初回の立ち絵画像に反映する表情です。あとから調整できます。
            </p>
            <FieldError message={state.fieldErrors.defaultExpression} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">
              表情のこだわり
            </span>
            <textarea
              name="expressionDetail"
              placeholder="例：口元だけ少し笑う。目は落ち着いていて、感情を出しすぎない。"
              rows={3}
              defaultValue={state.values.expressionDetail}
              className={textareaClass("expressionDetail")}
            />
            <FieldError message={state.fieldErrors.expressionDetail} />
          </label>
        </div>
      </section>

      <section className="rounded-[2rem] border border-white/10 bg-[#111827]/80 p-5 shadow-2xl shadow-black/30">
        <p className="text-sm font-semibold text-[#BEF264]">
          STEP 2 / 性格・話し方
        </p>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">性格</span>
            <textarea
              name="personality"
              placeholder="例：落ち着いているけど少し照れ屋。面倒見がよく、創作の相談に優しく乗ってくれる。"
              rows={4}
              defaultValue={state.values.personality}
              className={textareaClass("personality")}
            />
            <FieldError message={state.fieldErrors.personality} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">一人称</span>
            <input
              name="firstPerson"
              type="text"
              placeholder="例：僕 / 私 / ぼく / わたし"
              defaultValue={state.values.firstPerson}
              className={inputClass("firstPerson")}
            />
            <FieldError message={state.fieldErrors.firstPerson} />
          </label>

          <div className="rounded-3xl border border-[#BEF264]/20 bg-[#BEF264]/10 p-4">
            <p className="text-sm font-semibold text-[#D9F99D]">
              あなたの呼び方は、出会いイベントで聞きます
            </p>
            <p className="mt-2 text-xs leading-5 text-[#D8DEE9]">
              ここではあえて入力しません。
              初めて会ったときに、キャラクター自身が「君をなんて呼べばいい？」と聞く流れにします。
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">
              口調・話し方
            </span>
            <textarea
              name="speechStyle"
              placeholder="例：基本は穏やかで少し甘め。長文すぎず、1〜3文で自然に返す。語尾は柔らかく、押しつけがましくしない。"
              rows={4}
              defaultValue={state.values.speechStyle}
              className={textareaClass("speechStyle")}
            />
            <FieldError message={state.fieldErrors.speechStyle} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">
              禁止したい話し方
            </span>
            <textarea
              name="forbiddenSpeech"
              placeholder="例：説教っぽくしない。毎回質問で終わらない。語尾に毎回♡を付けない。ユーザーを呼び捨てにしない。"
              rows={4}
              defaultValue={state.values.forbiddenSpeech}
              className={textareaClass("forbiddenSpeech")}
            />
            <FieldError message={state.fieldErrors.forbiddenSpeech} />
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
            <span className="text-sm font-medium text-[#D8DEE9]">役割名</span>
            <input
              name="roleName"
              type="text"
              placeholder="例：戦略担当 / アイデア担当 / メンタル担当"
              defaultValue={state.values.roleName}
              className={inputClass("roleName")}
            />
            <p className="mt-2 text-xs leading-5 text-[#7D8AA3]">
              グループチャットでの立ち位置になります。
            </p>
            <FieldError message={state.fieldErrors.roleName} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">専門分野</span>
            <textarea
              name="expertise"
              placeholder="例：SaaS、ビジネス、マーケティング、分析"
              rows={3}
              defaultValue={state.values.expertise}
              className={textareaClass("expertise")}
            />
            <FieldError message={state.fieldErrors.expertise} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">
              得意な相談
            </span>
            <textarea
              name="consultationStyle"
              placeholder="例：事業設計、収益モデル、優先順位整理、現実的な改善案"
              rows={3}
              defaultValue={state.values.consultationStyle}
              className={textareaClass("consultationStyle")}
            />
            <FieldError message={state.fieldErrors.consultationStyle} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">
              思考スタイル
            </span>
            <textarea
              name="thinkingStyle"
              placeholder="例：冷静、論理的、リスク重視。結論から話し、根拠を添える。"
              rows={3}
              defaultValue={state.values.thinkingStyle}
              className={textareaClass("thinkingStyle")}
            />
            <FieldError message={state.fieldErrors.thinkingStyle} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">
              チーム内での立ち位置
            </span>
            <textarea
              name="teamPosition"
              placeholder="例：現実性と実行可能性を見るまとめ役。楽観的な案に対して冷静に検証する。"
              rows={3}
              defaultValue={state.values.teamPosition}
              className={textareaClass("teamPosition")}
            />
            <FieldError message={state.fieldErrors.teamPosition} />
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
              defaultValue={state.values.likes}
              className={inputClass("likes")}
            />
            <FieldError message={state.fieldErrors.likes} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">
              苦手なもの
            </span>
            <input
              name="dislikes"
              type="text"
              placeholder="例：大きな音、雑な扱い"
              defaultValue={state.values.dislikes}
              className={inputClass("dislikes")}
            />
            <FieldError message={state.fieldErrors.dislikes} />
          </label>

          <div className="rounded-3xl border border-[#FACC15]/20 bg-[#FACC15]/10 p-4">
            <p className="text-sm font-semibold text-[#FDE68A]">
              このキャラに祝ってほしい日
            </p>
            <p className="mt-2 text-xs leading-5 text-[#D8DEE9]">
              本当の誕生日でなくても大丈夫です。
              「活動記念日」「作品公開日」など、祝ってほしい日を登録できます。
              登録する場合は、月・日・何の日かをすべて入力してください。
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-medium text-[#D8DEE9]">月</span>
                <input
                  name="celebrationMonth"
                  type="number"
                  min="1"
                  max="12"
                  placeholder="6"
                  defaultValue={state.values.celebrationMonth}
                  className={inputClass("celebrationMonth")}
                />
                <FieldError message={state.fieldErrors.celebrationMonth} />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#D8DEE9]">日</span>
                <input
                  name="celebrationDay"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="18"
                  defaultValue={state.values.celebrationDay}
                  className={inputClass("celebrationDay")}
                />
                <FieldError message={state.fieldErrors.celebrationDay} />
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
                defaultValue={state.values.celebrationTitle}
                className={inputClass("celebrationTitle")}
              />
              <FieldError message={state.fieldErrors.celebrationTitle} />
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
              className={[
                "block cursor-pointer rounded-3xl border bg-white/[0.04] p-4 transition hover:border-[#BEF264]/40 hover:bg-white/[0.07]",
                state.fieldErrors.artStyle
                  ? "border-red-400/70"
                  : "border-white/10",
              ].join(" ")}
            >
              <div className="flex items-center gap-4">
                <input
                  type="radio"
                  name="artStyle"
                  value={style.slug}
                  defaultChecked={
                    state.values.artStyle
                      ? state.values.artStyle === style.slug
                      : index === 0
                  }
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

        <FieldError message={state.fieldErrors.artStyle} />
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
              defaultValue={state.values.appearanceDetail}
              className={[
                "mt-2 w-full resize-none rounded-2xl border px-4 py-4 text-sm outline-none placeholder:text-[#6B7280]",
                state.fieldErrors.appearanceDetail
                  ? "border-red-400/70 bg-red-400/10 focus:border-red-300"
                  : "border-white/10 bg-[#111827]/80 focus:border-[#BEF264]/60",
              ].join(" ")}
            />
            <FieldError message={state.fieldErrors.appearanceDetail} />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-[#D8DEE9]">
              絶対に守ってほしい設定
            </span>
            <textarea
              name="absoluteSettings"
              placeholder="例：一人称は必ず僕。冷たすぎる言い方はしない。初対面でも少し親しみを込める。"
              rows={5}
              defaultValue={state.values.absoluteSettings}
              className={[
                "mt-2 w-full resize-none rounded-2xl border px-4 py-4 text-sm outline-none placeholder:text-[#6B7280]",
                state.fieldErrors.absoluteSettings
                  ? "border-red-400/70 bg-red-400/10 focus:border-red-300"
                  : "border-white/10 bg-[#111827]/80 focus:border-[#BEF264]/60",
              ].join(" ")}
            />
            <FieldError message={state.fieldErrors.absoluteSettings} />
          </label>
        </div>
      </details>

      <div
        className={[
          "rounded-3xl border p-4",
          state.fieldErrors.safetyAgreement
            ? "border-red-400/70 bg-red-400/10"
            : "border-[#FACC15]/20 bg-[#FACC15]/10",
        ].join(" ")}
      >
        <p className="text-sm font-semibold text-[#FDE68A]">
          画像生成の安全ルール
        </p>
        <p className="mt-2 text-xs leading-6 text-[#D8DEE9]">
          実在人物、有名人、知人、既存キャラクター、特定作品、特定作家の絵柄、
          写真風・リアル系の指定はできません。
          FevCaraはオリジナルキャラクターを生み出すためのサービスです。
        </p>

        <label className="mt-4 flex items-start gap-3 rounded-2xl border border-white/10 bg-black/15 p-4">
          <input
            name="safetyAgreement"
            type="checkbox"
            value="agreed"
            defaultChecked={state.values.safetyAgreement === "agreed"}
            className="mt-1 shrink-0 accent-[#FACC15]"
          />
          <span className="text-xs leading-6 text-[#F4F1EA]">
            安全ルールを確認しました。
            このキャラクターは、実在人物・既存キャラクター・特定作品風ではなく、
            オリジナルキャラクターとして作成します。
          </span>
        </label>

        <FieldError message={state.fieldErrors.safetyAgreement} />
      </div>

      <SubmitButton />
    </form>
  );
}
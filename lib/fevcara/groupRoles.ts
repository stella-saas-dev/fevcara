export const GROUP_ROLE_MAX_TAGS = 3;

export const GROUP_ROLE_VALUES = [
  "empathy",
  "expander",
  "mood_maker",
  "organizer",
  "questioner",
  "boke",
  "tsukkomi",
  "mediator",
  "realist",
] as const;

export type GroupRoleTag = (typeof GROUP_ROLE_VALUES)[number];

export const GROUP_ROLE_OPTIONS: {
  value: GroupRoleTag;
  label: string;
  description: string;
  promptInstruction: string;
}[] = [
  {
    value: "empathy",
    label: "共感役",
    description: "まず気持ちを受け止め、安心できる温度を作る。",
    promptInstruction:
      "共感役: ユーザーや他キャラの感情を受け止める。ただし共感だけで終わらず、相談モードでは小さな具体案を1つ添える。",
  },
  {
    value: "expander",
    label: "広げ役",
    description: "別視点や可能性を足して、会話を横に広げる。",
    promptInstruction:
      "広げ役: 既出の話をそのまま褒めず、別角度・例え・追加選択肢を出す。相談モードでは具体的な選択肢を増やす。",
  },
  {
    value: "mood_maker",
    label: "ムードメーカー",
    description: "場を明るくし、会話に軽さや勢いを足す。",
    promptInstruction:
      "ムードメーカー: 場を明るくする。雑談ではテンポや感情を優先し、相談では軽くしすぎず、前向きに続けられる言い方へ変換する。",
  },
  {
    value: "organizer",
    label: "整理役",
    description: "話を整理し、手順や優先順位に落とし込む。",
    promptInstruction:
      "整理役: 話を順番・条件・優先順位に整理する。相談モードでは抽象論で終わらせず、手順・目安・最初の一歩を出す。",
  },
  {
    value: "questioner",
    label: "質問役",
    description: "必要な確認をして、話を深掘りする。",
    promptInstruction:
      "質問役: 足りない情報を1つだけ確認する。質問攻めは禁止。相談モードでは、今すぐ答えられる範囲の具体案も添える。",
  },
  {
    value: "boke",
    label: "ボケ役",
    description: "少しズレた発想や冗談で、会話に揺れを作る。",
    promptInstruction:
      "ボケ役: 少しズレた発想や冗談で場を揺らす。ただし深刻な相談では茶化しすぎず、最後は役に立つ方向へ戻す。",
  },
  {
    value: "tsukkomi",
    label: "ツッコミ役",
    description: "ズレや言い過ぎに反応し、テンポを作る。",
    promptInstruction:
      "ツッコミ役: 不自然な流れ、言い過ぎ、ボケに短くツッコむ。相手を傷つけず、会話を現実的な方向へ戻す。",
  },
  {
    value: "mediator",
    label: "仲裁役",
    description: "意見の違いをまとめ、衝突を自然に整える。",
    promptInstruction:
      "仲裁役: 意見の違いを丸めすぎず、両方の良い点を拾って整える。全員一致にせず、温度差を保ったまままとめる。",
  },
  {
    value: "realist",
    label: "現実確認役",
    description: "無理のない範囲、安全面、現実的な制約を見る。",
    promptInstruction:
      "現実確認役: 安全面・負荷・制約を見る。健康・法律・お金などの相談では無理を促さず、専門家確認や中止目安を自然に添える。",
  },
];

export function isGroupRoleTag(value: string): value is GroupRoleTag {
  return GROUP_ROLE_VALUES.includes(value as GroupRoleTag);
}

export function normalizeGroupRoleTags(value: unknown): GroupRoleTag[] {
  const rawValues = Array.isArray(value) ? value : [value];
  const result: GroupRoleTag[] = [];

  rawValues.forEach((rawValue) => {
    const normalized = String(rawValue ?? "").trim();

    if (isGroupRoleTag(normalized) && !result.includes(normalized)) {
      result.push(normalized);
    }
  });

  return result;
}

export function getGroupRoleOption(value: GroupRoleTag) {
  return GROUP_ROLE_OPTIONS.find((option) => option.value === value) ?? null;
}

export function getGroupRoleLabels(value: unknown) {
  return normalizeGroupRoleTags(value)
    .map((roleTag) => getGroupRoleOption(roleTag)?.label ?? roleTag)
    .filter((label) => label.length > 0);
}

export function getGroupRolePromptText(value: unknown) {
  const roleTags = normalizeGroupRoleTags(value);

  if (roleTags.length === 0) {
    return "このグループでの役割: 未設定。キャラクター設定・関係性・会話の流れから自然に役割を選んでください。";
  }

  const lines = roleTags.map((roleTag) => {
    const option = getGroupRoleOption(roleTag);

    return `- ${option?.promptInstruction ?? roleTag}`;
  });

  return `
このグループでの役割:
${lines.join("\n")}

役割の使い方:
- 上の役割を、今回の1発言の目的として必ず反映してください。
- 役割はキャラクター性を上書きするものではなく、グループ内での動き方です。
- 複数役割がある場合は、今回の流れに最も合う1〜2個を強めに使ってください。
`.trim();
}

export const GROUP_ICON_COLOR_VALUES = [
  "sky",
  "lime",
  "pink",
  "violet",
  "amber",
] as const;

export type GroupIconColor = (typeof GROUP_ICON_COLOR_VALUES)[number];

export const GROUP_ICON_COLOR_OPTIONS: {
  value: GroupIconColor;
  label: string;
  description: string;
}[] = [
  {
    value: "sky",
    label: "スカイ",
    description: "やさしく爽やかな青",
  },
  {
    value: "lime",
    label: "ライム",
    description: "明るく親しみやすい緑",
  },
  {
    value: "pink",
    label: "ピンク",
    description: "かわいく華やかな印象",
  },
  {
    value: "violet",
    label: "バイオレット",
    description: "落ち着きと個性のある紫",
  },
  {
    value: "amber",
    label: "アンバー",
    description: "ぬくもりのある黄橙",
  },
];

export function isGroupIconColor(value: string): value is GroupIconColor {
  return GROUP_ICON_COLOR_VALUES.includes(value as GroupIconColor);
}

export function normalizeGroupIconColor(
  value: string | null | undefined,
): GroupIconColor {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (isGroupIconColor(normalized)) {
    return normalized;
  }

  return "sky";
}

export function getGroupInitial(title: string | null | undefined) {
  const safeTitle = String(title ?? "").trim();

  if (!safeTitle) {
    return "G";
  }

  return Array.from(safeTitle)[0] ?? "G";
}

export function getGroupIconClasses(value: string | null | undefined) {
  const color = normalizeGroupIconColor(value);

  switch (color) {
    case "lime":
      return {
        icon: "border-[#A3E635]/55 bg-[linear-gradient(135deg,#ECFCCB_0%,#BEF264_100%)] text-[#365314] shadow-[0_10px_30px_rgba(163,230,53,0.22)]",
        swatch: "bg-[linear-gradient(135deg,#ECFCCB_0%,#BEF264_100%)] border-[#A3E635]/55",
      };

    case "pink":
      return {
        icon: "border-[#F9A8D4]/55 bg-[linear-gradient(135deg,#FCE7F3_0%,#F9A8D4_100%)] text-[#831843] shadow-[0_10px_30px_rgba(249,168,212,0.22)]",
        swatch: "bg-[linear-gradient(135deg,#FCE7F3_0%,#F9A8D4_100%)] border-[#F9A8D4]/55",
      };

    case "violet":
      return {
        icon: "border-[#C4B5FD]/55 bg-[linear-gradient(135deg,#EDE9FE_0%,#C4B5FD_100%)] text-[#4C1D95] shadow-[0_10px_30px_rgba(196,181,253,0.22)]",
        swatch: "bg-[linear-gradient(135deg,#EDE9FE_0%,#C4B5FD_100%)] border-[#C4B5FD]/55",
      };

    case "amber":
      return {
        icon: "border-[#FCD34D]/55 bg-[linear-gradient(135deg,#FEF3C7_0%,#FCD34D_100%)] text-[#78350F] shadow-[0_10px_30px_rgba(252,211,77,0.22)]",
        swatch: "bg-[linear-gradient(135deg,#FEF3C7_0%,#FCD34D_100%)] border-[#FCD34D]/55",
      };

    case "sky":
    default:
      return {
        icon: "border-[#7DD3FC]/55 bg-[linear-gradient(135deg,#E0F2FE_0%,#7DD3FC_100%)] text-[#0C4A6E] shadow-[0_10px_30px_rgba(125,211,252,0.22)]",
        swatch: "bg-[linear-gradient(135deg,#E0F2FE_0%,#7DD3FC_100%)] border-[#7DD3FC]/55",
      };
  }
}

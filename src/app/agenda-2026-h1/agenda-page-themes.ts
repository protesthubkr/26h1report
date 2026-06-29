export type AgendaPageSlug =
  | "election"
  | "femicide"
  | "labour-rights"
  | "marriage-for-all"
  | "peace-for-palestine"
  | "stop-the-train";

export type AgendaTransitionTheme =
  | "disabled"
  | "election"
  | "gender"
  | "labor"
  | "palestine"
  | "pride";

export type AgendaPageTheme = {
  backgroundColor: string;
  label: string;
  slug: AgendaPageSlug;
  transitionTheme: AgendaTransitionTheme;
};

export const agendaPageThemes = {
  election: {
    backgroundColor: "rgb(42, 42, 42)",
    label: "선거와 민주주의",
    slug: "election",
    transitionTheme: "election",
  },
  femicide: {
    backgroundColor: "rgb(145, 70, 201)",
    label: "여성 살해",
    slug: "femicide",
    transitionTheme: "gender",
  },
  "labour-rights": {
    backgroundColor: "rgb(220, 36, 31)",
    label: "일하다 죽지 않을 권리",
    slug: "labour-rights",
    transitionTheme: "labor",
  },
  "marriage-for-all": {
    backgroundColor: "#ffffff",
    label: "서울시청과 퀴어퍼레이드",
    slug: "marriage-for-all",
    transitionTheme: "pride",
  },
  "peace-for-palestine": {
    backgroundColor: "#ffffff",
    label: "전쟁과 평화",
    slug: "peace-for-palestine",
    transitionTheme: "palestine",
  },
  "stop-the-train": {
    backgroundColor: "rgb(88, 88, 88)",
    label: "왜 그들은 열차를 세울까",
    slug: "stop-the-train",
    transitionTheme: "disabled",
  },
} satisfies Record<AgendaPageSlug, AgendaPageTheme>;

export const agendaPageSlugs = Object.keys(agendaPageThemes) as AgendaPageSlug[];

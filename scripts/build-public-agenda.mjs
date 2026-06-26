#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const sourcePath = resolve(process.argv[2] ?? "public/data/layers.json");
const outputPath = resolve(
  process.argv[3] ?? "public/data/public-agenda-2026-h1.json",
);

const model = JSON.parse(readFileSync(sourcePath, "utf8"));
const nodeById = new Map();

for (const nodes of Object.values(model.layers ?? {})) {
  for (const node of nodes) {
    nodeById.set(node.id, node);
  }
}

const agendaSpecs = [
  {
    id: "labor-safety",
    title: "노동권·노동안전·공공안전",
    shortTitle: "노동권",
    subtitle: "위험의 전가에서 책임 요구로",
    coreQuestion: "위험은 누구에게 전가되고, 책임은 어디까지 올라가야 하는가?",
    sourceAgendaIds: ["L4_AGENDA:0002", "L4_AGENDA:0009"],
    accent: "#9d2f2f",
    secondaryAccent: "#245c47",
    status: "ready",
    bridgeAgendaIds: ["climate-energy", "election-democracy", "housing-publicness"],
    phases: [
      {
        id: "labor-risk",
        title: "위험이 드러나다",
        summary:
          "산재, 중대재해, 추모제, 공공안전 참사가 노동환경의 열악함을 먼저 드러낸다.",
        transitionToNext:
          "사고와 추모의 언어는 곧 불안정 노동과 위험 전가의 구조를 묻는 요구로 바뀐다.",
        hiddenKeywords: ["노동안전", "산재", "중대재해", "공공안전", "재난참사"],
        issueIds: [
          "L2:0022",
          "L2:0024",
          "L2:0036",
          "L2:0002",
          "L2:0052",
          "L2:0054",
          "L2:0055",
          "L2:0009",
          "L2:0011",
          "L2:0111",
          "L2:0117",
          "L2:0119",
          "L2:0130",
        ],
      },
      {
        id: "labor-precarity",
        title: "불안정 노동이 위험을 키우다",
        summary:
          "특고, 플랫폼, 도급, 최저임금, 폐지지역 노동 문제가 위험을 개인에게 밀어내는 구조를 보여준다.",
        transitionToNext:
          "위험의 구조가 드러나자 발언은 개별 사업주를 넘어 원청, 정부, 법제도를 향한다.",
        hiddenKeywords: ["특고", "플랫폼", "최저임금", "도급", "정의로운 전환"],
        issueIds: [
          "L2:0006",
          "L2:0026",
          "L2:0086",
          "L2:0096",
          "L2:0115",
          "L2:0143",
          "L2:0144",
          "L2:0149",
          "L2:0150",
        ],
      },
      {
        id: "labor-accountability",
        title: "책임을 원청과 제도로 끌어올리다",
        summary:
          "해고, 고용승계, 직접고용, 원청교섭 요구가 위험과 불안정을 만든 책임 주체를 위로 끌어올린다.",
        transitionToNext:
          "책임 요구는 성명에 머물지 않고 총파업, 교섭, 기자회견, 문화제로 조직된다.",
        hiddenKeywords: ["해고", "고용승계", "원청교섭", "직접고용", "구조조정"],
        issueIds: [
          "L2:0001",
          "L2:0016",
          "L2:0018",
          "L2:0021",
          "L2:0028",
          "L2:0029",
          "L2:0031",
          "L2:0008",
          "L2:0078",
          "L2:0104",
          "L2:0105",
          "L2:0121",
          "L2:0124",
          "L2:0153",
        ],
      },
      {
        id: "labor-action",
        title: "개선을 향한 행동으로 넘어가다",
        summary:
          "총파업, 문화제, 기자회견, 고공농성, 교섭 합의가 노동권 개선 요구의 행동 장면을 만든다.",
        hiddenKeywords: ["총파업", "기자회견", "문화제", "교섭", "고공농성"],
        issueIds: [
          "L2:0019",
          "L2:0049",
          "L2:0057",
          "L2:0060",
          "L2:0070",
          "L2:0072",
          "L2:0087",
          "L2:0088",
          "L2:0093",
          "L2:0100",
          "L2:0113",
          "L2:0151",
        ],
      },
    ],
    closing: {
      title: "위험을 전가한 구조를 책임의 언어로 바꾸다",
      summary:
        "노동 어젠다는 죽음과 사고의 기록에서 시작해, 위험을 만든 기업과 제도를 어떻게 바꿀 것인가로 이동했다. 상반기 노동 발언의 핵심은 사고 이후의 애도가 아니라 원청, 정부, 법제도에 책임을 묻는 일이었다.",
      takeaways: [
        "산재와 참사는 추모에서 책임 규명 요구로 이어졌다.",
        "특고·플랫폼·도급노동은 위험이 불안정 노동에 전가되는 방식을 드러냈다.",
        "해고와 원청교섭 요구는 개선의 책임 주체를 기업과 정부로 끌어올렸다.",
      ],
    },
  },
  {
    id: "disability-rights",
    title: "장애인권·탈시설·이동권",
    shortTitle: "장애인권",
    subtitle: "거리에서 시설, 일터, 투표장으로",
    coreQuestion: "장애인은 어디에서 시민으로 인정받는가?",
    sourceAgendaIds: ["L4_AGENDA:0004"],
    accent: "#276060",
    secondaryAccent: "#8b4f1f",
    status: "draft",
    bridgeAgendaIds: ["rights-equality", "election-democracy", "labor-safety"],
    phases: [
      {
        id: "disability-street",
        title: "거리에서 시민권을 요구하다",
        summary: "이동권과 접근권 투쟁이 장애인 시민권의 가장 익숙한 장면으로 나타난다.",
        hiddenKeywords: ["이동권", "접근권", "지하철", "집회"],
        issueIds: ["L2:0007", "L2:0045", "L2:0051", "L2:0081", "L2:0109"],
      },
      {
        id: "disability-institution",
        title: "시설 안의 폭력과 배제를 드러내다",
        summary: "탈시설과 시설폭력 대응은 조명되지 않은 장애인권의 핵심 요구를 보여준다.",
        hiddenKeywords: ["탈시설", "시설폭력", "색동원", "권리보장"],
        issueIds: ["L2:0003", "L2:0043", "L2:0074"],
      },
      {
        id: "disability-politics",
        title: "투표장과 의회로 들어가다",
        summary: "참정권, 정책협약, 후보 지지는 장애인의 정치 진입이 얼마나 어려운지를 드러낸다.",
        hiddenKeywords: ["참정권", "정책협약", "선거", "조상지"],
        issueIds: [
          "L2:0050",
          "L2:0061",
          "L2:0071",
          "L2:0075",
          "L2:0076",
          "L2:0079",
          "L2:0095",
          "L2:0097",
          "L2:0126",
          "L2:0131",
          "L2:0132",
          "L2:0133",
          "L2:0139",
        ],
      },
    ],
    closing: {
      title: "시민권의 장소를 넓히다",
      summary:
        "장애인권 어젠다는 이동권 시위의 이미지에서 시작하지만, 시설에서 벗어날 권리, 일할 권리, 투표할 권리, 정치에 들어갈 권리로 넓어진다.",
      takeaways: ["거리", "시설과 일터", "투표장과 의회"],
    },
  },
  {
    id: "election-democracy",
    title: "선거·정치개혁·민주주의",
    shortTitle: "선거",
    subtitle: "선거가 드러낸 대표성의 질문",
    coreQuestion: "선거는 시민의 요구를 대표했는가, 아니면 대표되지 못한 문제들을 드러냈는가?",
    sourceAgendaIds: ["L4_AGENDA:0001", "L4_AGENDA:0003"],
    accent: "#1f4f78",
    secondaryAccent: "#6f5421",
    status: "draft",
    bridgeAgendaIds: ["disability-rights", "rights-equality", "housing-publicness"],
    phases: [
      {
        id: "election-demands",
        title: "지방선거가 요구를 모으다",
        summary: "공약평가, 정책협약, 후보 지지, 시민사회 정책 요구가 선거라는 장에 모인다.",
        hiddenKeywords: ["지방선거", "공약평가", "정책협약", "후보"],
        issueIds: [
          "L2:0040",
          "L2:0059",
          "L2:0090",
          "L2:0091",
          "L2:0118",
          "L2:0127",
          "L2:0129",
          "L2:0136",
          "L2:0138",
        ],
      },
      {
        id: "election-trust",
        title: "선거관리 부실이 절차의 신뢰를 흔들다",
        summary: "투표용지 부족과 개표 오류는 선거 절차의 신뢰 문제를 전면화한다.",
        hiddenKeywords: ["선관위", "투표용지", "개표오류", "책임"],
        issueIds: ["L2:0013", "L2:0014", "L2:0154"],
      },
      {
        id: "election-reform",
        title: "선거제도와 정치개혁 요구로 이동하다",
        summary: "정개특위, 5% 봉쇄조항, 지구당, 선거제도 개혁 요구가 이어진다.",
        hiddenKeywords: ["정개특위", "정치개혁", "5% 봉쇄조항", "선거제도"],
        issueIds: ["L2:0017", "L2:0041", "L2:0046", "L2:0047", "L2:0048", "L2:0062", "L2:0120", "L2:0140"],
      },
      {
        id: "election-democracy",
        title: "개헌·참정권·민주주의의 질문으로 확장하다",
        summary: "개헌, 국민투표, 장애인 참정권, 역사기억이 민주주의의 더 큰 질문으로 연결된다.",
        hiddenKeywords: ["개헌", "참정권", "민주주의", "5.18"],
        issueIds: ["L2:0020", "L2:0025", "L2:0027", "L2:0069", "L2:0010", "L2:0131", "L2:0133"],
      },
    ],
    closing: {
      title: "투표 이후 남은 대표성의 문제",
      summary:
        "선거 어젠다는 투표 결과보다 선거가 드러낸 대표성의 문제를 보여준다. 시민사회는 공약을 요구했고, 선거관리 실패는 절차의 신뢰를 흔들었으며, 그 뒤에는 제도 개혁의 요구가 남았다.",
      takeaways: ["공약과 정책협약", "선거관리 책임", "정치개혁과 개헌"],
    },
  },
  {
    id: "rights-equality",
    title: "인권·성평등·차별금지",
    shortTitle: "평등",
    subtitle: "평등입법에서 대표성으로",
    coreQuestion: "누가 평등한 시민으로 인정받고, 그 시민권은 법과 정치에서 어떻게 대표되는가?",
    sourceAgendaIds: ["L4_AGENDA:0006"],
    accent: "#7a3d72",
    secondaryAccent: "#2f6a54",
    status: "draft",
    bridgeAgendaIds: ["disability-rights", "election-democracy"],
    phases: [
      {
        id: "rights-law",
        title: "평등을 법으로 요구하다",
        summary: "차별금지법, 평등입법, 유엔 권고, 지방 조례 요구가 출발점이 된다.",
        hiddenKeywords: ["차별금지법", "평등입법", "유엔 권고", "조례"],
        issueIds: ["L2:0032", "L2:0077", "L2:0102", "L2:0128"],
      },
      {
        id: "rights-hate",
        title: "혐오선동이 선거와 행정 안으로 들어오다",
        summary: "성소수자 혐오 발언, 후보 현수막, 행정의 차별적 태도가 쟁점이 된다.",
        hiddenKeywords: ["성소수자", "혐오선동", "행정", "현수막"],
        issueIds: ["L2:0004", "L2:0084", "L2:0085", "L2:0108", "L2:0141"],
      },
      {
        id: "rights-representation",
        title: "정치대표성의 문제로 수렴하다",
        summary: "여성 공천 비율과 소수자 후보 이슈가 대표되지 않는 시민의 문제를 보여준다.",
        hiddenKeywords: ["여성공천", "정치대표성", "후보", "소수자"],
        issueIds: ["L2:0090", "L2:0050", "L2:0003"],
      },
    ],
    closing: {
      title: "평등은 대표성의 문제로 돌아온다",
      summary:
        "평등의 언어는 법안 요구에서 출발해 혐오선동, 폭력, 추모, 대표성의 문제로 확장된다.",
      takeaways: ["평등입법", "혐오선동 대응", "정치대표성"],
    },
  },
  {
    id: "peace-palestine",
    title: "반전평화·팔레스타인·군사외교",
    shortTitle: "반전평화",
    subtitle: "국제 사건이 국내 행동으로 번역되다",
    coreQuestion: "국제적 폭력은 한국 사회의 행동과 책임 요구로 어떻게 번역되는가?",
    sourceAgendaIds: ["L4_AGENDA:0005"],
    accent: "#6d4c21",
    secondaryAccent: "#214f63",
    status: "draft",
    bridgeAgendaIds: ["climate-energy", "rights-equality"],
    phases: [
      {
        id: "peace-hormuz",
        title: "호르무즈와 이란, 파병 반대가 전면화되다",
        summary: "청해부대와 호르무즈 군사작전, 이란 공격 규탄이 시작점이 된다.",
        hiddenKeywords: ["호르무즈", "이란", "파병", "군사작전"],
        issueIds: ["L2:0033", "L2:0035", "L2:0038", "L2:0039"],
      },
      {
        id: "peace-gaza",
        title: "가자와 구호선, 활동가 억류가 행동을 부르다",
        summary: "구호선 나포와 활동가 억류가 국내 긴급행동과 석방 요구를 만든다.",
        hiddenKeywords: ["가자", "구호선", "활동가", "억류"],
        issueIds: ["L2:0064", "L2:0005", "L2:0012"],
      },
      {
        id: "peace-responsibility",
        title: "한국 정부와 기업의 책임을 묻다",
        summary: "네타냐후 체포, 이스라엘 대사 추방, 가자 천연가스 수탈 비판으로 이어진다.",
        hiddenKeywords: ["정부 책임", "기업 책임", "네타냐후", "천연가스"],
        issueIds: ["L2:0089", "L2:0099", "L2:0147"],
      },
    ],
    closing: {
      title: "먼 전쟁을 국내 책임의 언어로 바꾸다",
      summary:
        "호르무즈, 가자, 활동가 억류, 기업 책임은 모두 한국은 이 폭력에 어떻게 연결되어 있는가라는 질문으로 이어진다.",
      takeaways: ["파병 반대", "가자 연대", "정부와 기업 책임"],
    },
  },
  {
    id: "climate-energy",
    title: "기후·환경·에너지",
    shortTitle: "기후",
    subtitle: "미래 인프라의 책임 정치",
    coreQuestion: "미래를 명분으로 한 인프라 정책은 누구의 통제 아래 놓이는가?",
    sourceAgendaIds: ["L4_AGENDA:0007", "L4_AGENDA:0010"],
    accent: "#315c34",
    secondaryAccent: "#5a4e8f",
    status: "draft",
    bridgeAgendaIds: ["labor-safety", "election-democracy"],
    phases: [
      {
        id: "climate-nuclear",
        title: "과거의 재난이 미래 위험으로 돌아오다",
        summary: "후쿠시마와 신규핵발전소 문제는 과거 재난과 미래 위험을 함께 보여준다.",
        hiddenKeywords: ["후쿠시마", "탈핵", "신규원전", "핵발전"],
        issueIds: ["L2:0030", "L2:0152"],
      },
      {
        id: "climate-development",
        title: "개발 공약이 전력과 물의 문제를 드러내다",
        summary: "반도체 클러스터, 전력, 용수, 신규댐, 난개발 이슈가 개발의 비용을 묻는다.",
        hiddenKeywords: ["반도체", "전력", "용수", "신규댐", "개발"],
        issueIds: ["L2:0103", "L2:0107", "L2:0137"],
      },
      {
        id: "climate-transition",
        title: "전환의 비용을 누가 감당하는가",
        summary: "석탄폐지 지역과 정의로운 전환은 노동권과 기후정의를 연결한다.",
        hiddenKeywords: ["정의로운 전환", "석탄폐지", "노동자", "지역"],
        issueIds: ["L2:0086", "L2:0096"],
      },
      {
        id: "climate-digital",
        title: "미래 기술의 책임으로 확장하다",
        summary: "AI 기본법과 개인정보 문제는 미래 인프라의 공공성과 통제권 질문으로 이어진다.",
        hiddenKeywords: ["AI", "개인정보", "디지털 권리", "공공성"],
        issueIds: ["L2:0007", "L2:0082", "L2:0129"],
      },
    ],
    closing: {
      title: "미래를 말하는 정책의 비용을 묻다",
      summary:
        "기후·환경 어젠다는 미래를 약속하는 개발과 기술이 실제로 어떤 위험과 비용을 만드는지 묻는다.",
      takeaways: ["탈핵", "개발의 비용", "정의로운 전환", "디지털 공공성"],
    },
  },
  {
    id: "housing-publicness",
    title: "개발과 주거권",
    shortTitle: "주거권",
    subtitle: "도시 개발과 공공성",
    coreQuestion: "도시는 누구를 위해 개발되고, 개발의 비용은 누구에게 전가되는가?",
    sourceAgendaIds: ["L4_AGENDA:0008"],
    accent: "#704f2a",
    secondaryAccent: "#2f566c",
    status: "supporting",
    bridgeAgendaIds: ["election-democracy", "labor-safety"],
    phases: [
      {
        id: "housing-development",
        title: "개발 공약이 주거권을 압박하다",
        summary: "용산국제업무지구와 재개발·재건축 속도전이 주거권 문제를 드러낸다.",
        hiddenKeywords: ["개발", "용산", "재개발", "재건축"],
        issueIds: ["L2:0042", "L2:0063", "L2:0106"],
      },
      {
        id: "housing-tax",
        title: "세금과 공공성의 문제가 드러나다",
        summary: "재산세 감면, 조세 형평성, 개발이익 환수가 선거 공약의 쟁점이 된다.",
        hiddenKeywords: ["재산세", "조세", "공공성", "개발이익"],
        issueIds: ["L2:0073"],
      },
      {
        id: "housing-public",
        title: "공공임대와 세입자 보호 요구로 이동하다",
        summary: "동자동, 공공주택, 세입자 보호, 공공임대 확대가 결말 국면을 이룬다.",
        hiddenKeywords: ["공공임대", "동자동", "세입자", "공공주택"],
        issueIds: ["L2:0068", "L2:0122", "L2:0123", "L2:0134", "L2:0135"],
      },
    ],
    closing: {
      title: "개발 경쟁을 주거권의 언어로 다시 읽다",
      summary:
        "누가 더 빨리 개발할 것인가보다 중요한 질문은, 그 개발에서 밀려나는 시민을 누가 보호할 것인가다.",
      takeaways: ["개발 공약", "조세 형평성", "공공임대와 세입자 보호"],
    },
  },
];

const missingIssueIds = collectMissingIssueIds(agendaSpecs);
if (missingIssueIds.length) {
  console.warn(
    JSON.stringify(
      {
        missingIssueIds,
        warning: "Some configured L2 issue ids were not found and will be skipped.",
      },
      null,
      2,
    ),
  );
}

const agendas = agendaSpecs.map((agenda) => buildAgenda(agenda));
const generated = {
  generatedAt: new Date().toISOString(),
  source: {
    path: sourcePath,
    graphGeneratedAt: model.generatedAt,
    summary: model.summary,
  },
  defaultAgendaId: "labor-safety",
  agendas,
  featuredIssues: agendas
    .flatMap((agenda) => agenda.phases.flatMap((phase) => phase.issues.map((issue) => ({
      ...issue,
      agendaId: agenda.id,
      agendaTitle: agenda.title,
      phaseId: phase.id,
      phaseTitle: phase.title,
    }))))
    .sort((a, b) => b.statementCount - a.statementCount || a.date.localeCompare(b.date))
    .slice(0, 12),
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(generated, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      agendas: agendas.length,
      outputPath,
      sourcePath,
      totalIssues: agendas.reduce((sum, agenda) => sum + agenda.issueCount, 0),
    },
    null,
    2,
  ),
);

function buildAgenda(spec) {
  const phases = spec.phases.map((phase) => buildPhase(phase));
  const allIssues = phases.flatMap((phase) => phase.issues);
  const orgs = unique(allIssues.flatMap((issue) => issue.organizations));
  const sourceNodes = spec.sourceAgendaIds.map((id) => nodeById.get(id)).filter(Boolean);

  return {
    id: spec.id,
    title: spec.title,
    shortTitle: spec.shortTitle,
    subtitle: spec.subtitle,
    coreQuestion: spec.coreQuestion,
    sourceAgendaIds: spec.sourceAgendaIds,
    sourceAgendaLabels: sourceNodes.map((node) => node.label),
    accent: spec.accent,
    secondaryAccent: spec.secondaryAccent,
    status: spec.status,
    bridgeAgendaIds: spec.bridgeAgendaIds,
    phases,
    closing: spec.closing,
    issueCount: allIssues.length,
    statementCount: allIssues.reduce((sum, issue) => sum + issue.statementCount, 0),
    organizationCount: orgs.length,
    organizations: orgs,
    dateRange: getDateRange(allIssues),
    topKeywords: topValues(allIssues.flatMap((issue) => issue.keywords), 10),
    topActions: topValues(allIssues.map((issue) => issue.actionType), 8),
  };
}

function buildPhase(phase) {
  const issues = phase.issueIds
    .map((id) => nodeById.get(id))
    .filter(Boolean)
    .map((node) => issueFromNode(node))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

  return {
    id: phase.id,
    title: phase.title,
    summary: phase.summary,
    transitionToNext: phase.transitionToNext ?? "",
    hiddenKeywords: phase.hiddenKeywords,
    dateRange: getDateRange(issues),
    issueCount: issues.length,
    statementCount: issues.reduce((sum, issue) => sum + issue.statementCount, 0),
    organizations: unique(issues.flatMap((issue) => issue.organizations)),
    issues,
  };
}

function issueFromNode(node) {
  const leafItems = Array.isArray(node.leafItems) ? node.leafItems : [];
  const statements = statementsFromNode(node, leafItems);
  const organizations = unique([
    ...statements.map((statement) => statement.organization),
    ...(node.organizationNames ?? []),
  ].filter(Boolean));

  return {
    id: node.id,
    title: node.label,
    date: dateOnly(node.firstSeenAt),
    endDate: dateOnly(node.lastSeenAt),
    dateLabel: dateLabel(node.firstSeenAt, node.lastSeenAt),
    actionType: inferActionType(node),
    organizations,
    organizationLabel: organizations.slice(0, 4).join(", "),
    keywords: unique((node.representativeKeywords ?? []).filter(Boolean)).slice(0, 10),
    leadSentence: statements[0]?.sentence ?? node.representativeSentences?.[0] ?? node.label,
    representativeSentences: unique(node.representativeSentences ?? []).slice(0, 4),
    statements,
    statementCount: statements.length || node.leafCount || 1,
    leafCount: node.leafCount ?? statements.length,
    sourceUrls: unique([
      ...statements.map((statement) => statement.url),
      ...(node.sourceUrls ?? []),
    ].filter(Boolean)).slice(0, 6),
    sourceKeys: unique(node.sourceKeys ?? []).slice(0, 6),
  };
}

function statementsFromNode(node, leafItems) {
  const candidates = leafItems.length
    ? leafItems.map((item) => ({
        date: dateOnly(item.createdAt ?? node.firstSeenAt),
        organization: item.organizationName ?? "알 수 없음",
        sentence: cleanSentence(item.displaySentence ?? item.summary ?? item.sourceText ?? ""),
        sourceKey: item.sourceKey ?? "",
        sourceType: item.sourceType ?? "",
        url: item.sourceUrl ?? "",
      }))
    : (node.representativeSentences ?? []).map((sentence, index) => ({
        date: dateOnly(node.firstSeenAt),
        organization: node.organizationNames?.[index] ?? node.organizationNames?.[0] ?? "알 수 없음",
        sentence: cleanSentence(sentence),
        sourceKey: node.sourceKeys?.[index] ?? "",
        sourceType: node.sourceTypes?.[index] ?? "",
        url: node.sourceUrls?.[index] ?? "",
      }));

  const seen = new Map();
  for (const statement of candidates) {
    if (!statement.sentence) continue;
    const key = `${statement.organization}:${statement.sentence}`;
    if (!seen.has(key)) {
      seen.set(key, statement);
    }
  }

  return [...seen.values()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.organization.localeCompare(b.organization))
    .slice(0, 8);
}

function inferActionType(node) {
  const text = `${node.label} ${(node.representativeKeywords ?? []).join(" ")} ${(node.representativeSentences ?? []).join(" ")}`;
  const rules = [
    ["추모", "추모"],
    ["총파업", "총파업"],
    ["파업", "파업"],
    ["기자회견", "기자회견"],
    ["취재요청", "기자회견"],
    ["정책협약", "정책협약"],
    ["협약", "정책협약"],
    ["판결", "판결"],
    ["헌법소원", "헌법소원"],
    ["법안", "법안"],
    ["공약", "공약평가"],
    ["평가", "공약평가"],
    ["문화제", "문화제"],
    ["결의대회", "결의대회"],
    ["대회", "대회"],
    ["고공농성", "농성"],
    ["농성", "농성"],
    ["삼보일배", "행동"],
    ["행진", "행진"],
    ["선포", "선포"],
    ["성명", "성명"],
    ["논평", "논평"],
    ["규탄", "규탄"],
    ["요구", "요구"],
  ];

  for (const [needle, action] of rules) {
    if (text.includes(needle)) return action;
  }
  return "발언";
}

function cleanSentence(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/^[\s"'“”‘’[\]()]+|[\s"'“”‘’[\](),.]+$/g, "")
    .trim();
}

function dateOnly(value) {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10);
  return parsed.toISOString().slice(0, 10);
}

function dateLabel(start, end) {
  const startDate = dateOnly(start);
  const endDate = dateOnly(end);
  if (!startDate) return "";
  const label = shortDate(startDate);
  if (!endDate || endDate === startDate) return label;
  return `${label} - ${shortDate(endDate)}`;
}

function shortDate(value) {
  const [, month, day] = value.split("-");
  return `${Number(month)}.${Number(day)}`;
}

function getDateRange(items) {
  const dates = items
    .flatMap((item) => [item.date, item.endDate])
    .filter(Boolean)
    .sort();
  if (!dates.length) return { start: "", end: "", label: "" };
  return {
    start: dates[0],
    end: dates.at(-1),
    label: dates[0] === dates.at(-1) ? shortDate(dates[0]) : `${shortDate(dates[0])} - ${shortDate(dates.at(-1))}`,
  };
}

function topValues(values, limit) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function collectMissingIssueIds(specs) {
  return unique(
    specs.flatMap((agenda) =>
      agenda.phases.flatMap((phase) =>
        phase.issueIds.filter((id) => !nodeById.has(id)),
      ),
    ),
  );
}

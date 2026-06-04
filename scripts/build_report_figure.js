// 기말 보고서 docx(그림 포함판) 생성 — final-report.docx와 내용 동일.
// 실제 artifact(혼동행렬)만 임베드하고 나머지는 캡처 가이드+붙여넣기 박스로 둔다.
// 실행: NODE_PATH=$(npm root -g) node scripts/build_report_figure.js → docs/final-report-figure.docx
const fs = require("fs");
const path = require("path");
const M = "/usr/local/lib/node_modules/docx";
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, Footer, PageBreak, HeightRule, ImageRun,
} = require(M);

// PNG 크기(IHDR) 읽어 비율 유지 스케일링
function pngSize(buf) { return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }; }
function imageParagraph(absPath, maxW) {
  const buf = fs.readFileSync(absPath);
  const { w, h } = pngSize(buf);
  const scale = Math.min(1, maxW / w);
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 30 },
    children: [new ImageRun({ type: "png", data: buf,
      transformation: { width: Math.round(w * scale), height: Math.round(h * scale) },
      altText: { title: "figure", description: "real artifact", name: "fig" } })] });
}

const ROOT = path.join(__dirname, "..");
const REPO = "https://github.com/de1ayyy/SecPipeline";
const PR = REPO + "/pull/5";
const FONT = "맑은 고딕";
const MONO = "Consolas";

// ── 기본 단락 ─────────────────────────────────────────
function P(text, o = {}) {
  return new Paragraph({ spacing: { after: o.after ?? 110, line: 276 }, alignment: o.align, pageBreakBefore: o.pb,
    children: [new TextRun({ text, bold: o.bold, italics: o.italics, size: o.size ?? 22, color: o.color, font: FONT })] });
}
function H1(text) { return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 150 },
  children: [new TextRun({ text, bold: true, size: 30, font: FONT, color: "1F3864" })] }); }
function H2(text) { return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 90 },
  children: [new TextRun({ text, bold: true, size: 25, font: FONT, color: "2E5496" })] }); }
function bullet(text, lvl = 0) { return new Paragraph({ numbering: { reference: "b", level: lvl }, spacing: { after: 55, line: 268 },
  children: [new TextRun({ text, size: 22, font: FONT })] }); }
function score(text) { return new Paragraph({ spacing: { before: 50, after: 140 }, shading: { fill: "EAF1FB", type: ShadingType.CLEAR },
  children: [new TextRun({ text: "▶ 충족 배점: " + text, bold: true, italics: true, size: 20, font: FONT, color: "1F3864" })] }); }
function mono(line, o = {}) { return new Paragraph({ spacing: { after: o.after ?? 20, line: 240 }, shading: { fill: o.fill ?? "F2F2F2", type: ShadingType.CLEAR },
  children: [new TextRun({ text: line, font: MONO, size: 18, color: o.color ?? "333333" })] }); }

// ── 표 ────────────────────────────────────────────────
const BD = { style: BorderStyle.SINGLE, size: 1, color: "AAB4C4" };
const BORDERS = { top: BD, left: BD, bottom: BD, right: BD };
function cell(text, w, o = {}) {
  return new TableCell({ borders: BORDERS, width: { size: w, type: WidthType.DXA },
    shading: o.head ? { fill: "2E5496", type: ShadingType.CLEAR } : (o.fill ? { fill: o.fill, type: ShadingType.CLEAR } : undefined),
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ alignment: o.align, children: [new TextRun({ text, bold: o.head || o.bold, color: o.head ? "FFFFFF" : undefined, size: 20, font: FONT })] })] });
}
function table(widths, rows) {
  return new Table({ width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA }, columnWidths: widths,
    rows: rows.map((r, i) => new TableRow({ tableHeader: i === 0, children: r.map((c, j) => {
      const ob = (c !== null && typeof c === "object");
      return cell(ob ? c.t : c, widths[j], { head: i === 0, fill: ob ? c.fill : undefined, bold: ob ? c.bold : false, align: ob ? c.align : undefined });
    }) })) });
}

// ── 캡처 붙여넣기 박스 (1칸 표, 일정 높이) ──────────────
function pasteBox(n) {
  const W = 9306;
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: [W],
    rows: [new TableRow({ height: { value: 2400, rule: HeightRule.ATLEAST }, children: [new TableCell({
      width: { size: W, type: WidthType.DXA },
      borders: { top: { style: BorderStyle.DASHED, size: 8, color: "E0A800" }, left: { style: BorderStyle.DASHED, size: 8, color: "E0A800" }, bottom: { style: BorderStyle.DASHED, size: 8, color: "E0A800" }, right: { style: BorderStyle.DASHED, size: 8, color: "E0A800" } },
      shading: { fill: "FFFDF5", type: ShadingType.CLEAR }, verticalAlign: "center",
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "⬇ 위 ‘캡처 방법’대로 실행한 화면을 캡처해 이 영역에 붙여넣으세요 (그림 " + n + ") ⬇", italics: true, size: 20, color: "B8860B", font: FONT })] })],
    })] })] });
}

// ── 그림(캡처 가이드) 블록 ──────────────────────────────
let FIG = 0;
function fig(o) {
  FIG += 1; const n = FIG; const out = [];
  out.push(new Paragraph({ spacing: { before: 160, after: 50 }, shading: { fill: "DDE7F5", type: ShadingType.CLEAR },
    children: [new TextRun({ text: "■ 그림 " + n + " 캡처 방법", bold: true, size: 21, font: FONT, color: "1F3864" })] }));
  // 명령어
  if (o.cmd && o.cmd.length) {
    out.push(new Paragraph({ spacing: { after: 20 }, children: [new TextRun({ text: "① 명령어 (프로젝트 루트에서):", bold: true, size: 20, font: FONT })] }));
    o.cmd.forEach((l, i) => out.push(mono((o.cmd.length > 1 ? "" : "$ ") + (l.startsWith("#") ? l : (o.cmd.length > 1 ? "$ " + l : l)), { after: i === o.cmd.length - 1 ? 60 : 16 })));
  }
  // 이동/화면
  if (o.where) out.push(new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: "② 이동/화면: ", bold: true, size: 20, font: FONT }), new TextRun({ text: o.where, size: 20, font: FONT })] }));
  // 캡처 대상
  out.push(new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: "③ 캡처할 것: ", bold: true, size: 20, font: FONT }), new TextRun({ text: o.shot, size: 20, font: FONT })] }));
  // 왜 필요
  out.push(new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: "④ 캡처 이유: ", bold: true, size: 20, font: FONT }), new TextRun({ text: o.why, size: 20, font: FONT })] }));
  // 배점
  if (o.score) out.push(new Paragraph({ spacing: { after: 30 }, children: [new TextRun({ text: "⑤ 충족 배점: ", bold: true, size: 20, font: FONT }), new TextRun({ text: o.score, size: 20, italics: true, font: FONT, color: "1F3864" })] }));
  // 예상 출력
  if (o.expect && o.expect.length) {
    out.push(new Paragraph({ spacing: { before: 30, after: 16 }, children: [new TextRun({ text: "[예상 출력 — 화면이 이와 비슷해야 정상]", bold: true, size: 19, font: FONT, color: "555555" })] }));
    o.expect.forEach((l, i) => out.push(mono(l, { fill: "EFF7EF", color: "1E4620", after: i === o.expect.length - 1 ? 50 : 14 })));
  }
  // 실제 artifact가 있으면 임베드, 없으면 붙여넣기 박스
  const imgAbs = o.img ? path.join(ROOT, o.img) : null;
  if (imgAbs && fs.existsSync(imgAbs)) {
    out.push(new Paragraph({ spacing: { before: 20, after: 20 },
      children: [new TextRun({ text: "✔ 아래는 학습 시 자동 저장된 실제 artifact입니다(직접 캡처 불필요). 출처: " + o.img, size: 18, italics: true, color: "1E6B2E", font: FONT })] }));
    out.push(imageParagraph(imgAbs, o.imgW || 420));
  } else {
    out.push(pasteBox(n));
  }
  out.push(new Paragraph({ spacing: { before: 60, after: 200 }, alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "그림 " + n + ". " + o.caption, bold: true, size: 19, font: FONT })] }));
  return out;
}

const children = [];
const C = (...a) => children.push(...a);

// ════════════ 표지 ════════════
C(new Paragraph({ spacing: { before: 1100, after: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "프로젝트 보고서 - 기말", bold: true, size: 46, font: FONT, color: "1F3864" })] }));
C(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "SecPipeline : DevSecOps → MLSecOps 통합", size: 28, font: FONT, color: "2E5496" })] }));
C(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: [new TextRun({ text: "보안 ML(악성 HTTP 요청 탐지) + MLflow 기반 MLOps 파이프라인", size: 22, font: FONT })] }));
C(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600, after: 80 }, children: [new TextRun({ text: "날짜: 2026-06-__   |   학번: ____________   |   이름: ____________", size: 22, font: FONT, color: "C00000" })] }));
C(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "(표지의 학번·이름·날짜는 제출 전 본인 정보로 교체하세요)", size: 18, italics: true, font: FONT, color: "808080" })] }));
C(new Paragraph({ children: [new PageBreak()] }));

// ════════════ 사용 설명 ════════════
C(H1("[이 보고서 사용법 — 캡처 넣는 방법]"));
C(P("본 보고서는 report-template.docx의 15개 섹션을 그대로 따르며, MLOps의 모든 과정(실험관리·모델관리·재학습·배포·운영·롤백)을 글과 스크린샷으로 함께 증빙한다.", {}));
C(P("각 스크린샷 자리에는 파란 ‘■ 그림 N 캡처 방법’ 안내가 있다. 안내의 ①명령어를 그대로 입력하고 ②화면으로 이동해 ③지정된 것을 캡처한 뒤, 바로 아래 노란 점선 박스에 붙여넣으면 된다. ‘그림 N. 설명’ 캡션은 그대로 둔다.", {}));
C(P("※ 그림 11(혼동행렬)은 학습 시 실제로 저장된 artifact라서 이미 채워져 있다(직접 캡처 불필요). 그 외 그림들은 본인이 위 방법대로 직접 캡처해 넣으면 된다.", { color: "1E6B2E" }));
C(P("사전 준비 (모든 명령은 프로젝트 루트에서 실행):", { bold: true }));
C(mono("$ cd ~/Desktop/SecPipeline        # 프로젝트 폴더로 이동"));
C(mono("$ source venv/bin/activate         # 가상환경 활성화 (Windows: venv\\Scripts\\activate)"));
C(mono("$ pip install -r requirements.txt  # 최초 1회 의존성 설치", { after: 120 }));

// ════════════ 1. 프로젝트 개요 ════════════
C(H1("1. 프로젝트 개요"));
C(bullet("프로젝트 이름: SecPipeline (DevSecOps + MLSecOps 통합)"));
C(bullet("프로젝트 목적: 중간 프로젝트의 Flask 학습기록 앱 + DevSecOps 5-Gate 보안 파이프라인 위에, 보안 목적의 ML 기능(악성 HTTP 요청 탐지)과 MLflow 기반 MLOps(실험관리·버전관리·재학습·배포·운영)를 직접 설계·구축한다. 단순 모델 학습이 아니라 Git→CI/CD→Docker→MLflow→Deploy 전 과정을 자동으로 연결하고 운영하는 것이 목표다."));
C(bullet("GitHub 주소(public): " + REPO + "   (Pull Request: " + PR + ")"));
C(bullet("배포 주소: https://secpipeline.onrender.com"));
C(bullet("MLflow Tracking 화면: 로컬 파일 백엔드(mlruns/). 아래 그림 2의 명령으로 UI 실행."));
C(...fig({
  caption: "Render에 배포되어 외부에서 접속되는 SecPipeline 서비스",
  cmd: ["브라우저 주소창에 https://secpipeline.onrender.com 입력"],
  where: "배포된 서비스의 로그인 또는 대시보드 페이지",
  shot: "서비스 화면 전체 + 브라우저 주소창(secpipeline.onrender.com 도메인이 보이도록)",
  why: "외부에서 접근 가능한 형태로 서비스가 실제 배포·운영되고 있음을 증빙",
  score: "배포 및 운영(5), MLOps 파이프라인 완성도(35) 일부",
}));
C(...fig({
  caption: "GitHub public 저장소 메인 화면",
  cmd: ["브라우저에서 " + REPO + " 접속"],
  where: "GitHub 저장소 메인",
  shot: "저장소 이름과 ‘Public’ 배지, 파일 목록이 보이는 화면",
  why: "소스가 public으로 공개되어 있음을 증빙(공지 필수 항목)",
  score: "Git 이력 및 개발 과정(10) 일부",
}));

// ════════════ 2. 소프트웨어 주요 기능 ════════════
C(H1("2. 소프트웨어 주요 기능"));
C(H2("1) 사용자 핵심 기능 (서비스)"));
C(bullet("회원가입/로그인(세션 기반)"));
C(bullet("학습기록 CRUD: 제목·내용·학습시간·과목으로 기록 생성/조회/수정/삭제"));
C(bullet("과목 관리, 검색, 내보내기(export), 대시보드(통계 + 보안 이벤트 위젯)"));
C(H2("2) ML 모델이 사용되는 위치"));
C(bullet("Flask @before_request 미들웨어(app/__init__.py): 모든 HTTP 요청이 라우트에 닿기 전에 ML 모델로 악성 여부를 스코어링한다."));
C(bullet("기본 shadow 모드는 탐지·로깅만, DETECTOR_MODE=enforce면 악성 요청을 403으로 차단한다."));
C(bullet("탐지 결과는 운영 로그(logs/secpipeline.log)와 대시보드 ‘보안 이벤트’ 위젯에 반영된다."));
C(H2("3) 입력 데이터와 출력 결과"));
C(bullet("입력: HTTP 요청의 method + path + query + body 를 하나의 문자열로 정규화(URL 디코드, 소문자화)"));
C(bullet("출력: 라벨(benign / sqli / xss / path_traversal / cmdi) + 신뢰도(0~1)"));
C(P("→ 서비스(학습기록 앱)와 ML 기능(요청 보안 분류)은 책임이 분리되며 미들웨어 한 지점에서 결합된다.", {}));
C(score("애플리케이션 및 ML 기능 구성(10)"));

// ════════════ 3. 실행 환경 ════════════
C(H1("3. 실행 환경"));
C(table([2600, 6706], [
  [{ t: "구분" }, { t: "내용" }],
  ["개발/실행 OS", "macOS(Darwin) / 컨테이너 Linux(python:3.12-slim) / 배포 Render Linux"],
  ["Python", "3.12"],
  ["Git/GitHub", REPO + " (public), feature 브랜치 + Pull Request 기반"],
  ["Docker", "python:3.12-slim, 비특권 appuser, HEALTHCHECK, gunicorn 실행"],
  ["MLflow", "3.13.0, 로컬 파일 백엔드(mlruns/)"],
  ["주요 라이브러리", "scikit-learn 1.9.0, pandas 2.3.3, matplotlib 3.10.9, joblib 1.5.3 (전부 버전 핀)"],
  ["배포 환경", "Render (GitHub Actions deploy 잡이 Deploy Hook 호출)"],
]));
C(score("Docker 및 실행 환경 구성(5) — 버전 핀으로 재현성 확보"));

// ════════════ 4. 전체 MLOps 파이프라인 구조 ════════════
C(H1("4. 전체 MLOps 파이프라인 구조"));
C(P("기존 DevSecOps 5-Gate는 그대로 두고, ML 단계(MLSecOps)를 추가해 한 파이프라인으로 통합했다. 네 가지 흐름으로 설명한다.", {}));
C(bullet("코드 변경 흐름: git commit → push/PR → GitHub Actions 자동 트리거"));
C(bullet("모델 학습 흐름: seed_attacks(데이터) → train(MLflow 로깅) → eval_gate(품질 게이트, macro-F1≥0.80)"));
C(bullet("모델 등록/반영 흐름: 우승 모델 models/attack_clf.pkl 저장 → Docker 이미지에 COPY → 배포"));
C(bullet("서비스 운영 흐름: before_request 탐지 → 로그/대시보드 → (enforce 시 403 차단)"));
C(P("[CI 잡 그래프(텍스트)]", { bold: true }));
["secret-scan · dependency-scan · sast · unit-test · ml-train",
 "        └─(모두 통과)→ build-and-scan(모델 포함) → deploy(Render) → dast(ZAP)"].forEach((l) => C(mono(l)));
C(...fig({
  caption: "GitHub Actions 워크플로 전체 잡 그래프 (5-Gate + ml-train → build → deploy → dast)",
  cmd: ["브라우저에서 " + REPO + "/actions 접속 → 최근 실행(workflow run) 클릭"],
  where: "Actions 실행 상세의 잡 그래프(Jobs 다이어그램) 화면",
  shot: "secret-scan/dependency-scan/sast/unit-test/ml-train → build-and-scan → deploy → dast 잡들이 연결된 그래프 전체. 가능하면 모두 초록 체크가 보이게",
  why: "5-Gate 보안 파이프라인과 ML 단계가 하나로 연결되어 자동 실행됨을 증빙(파이프라인 완성도의 핵심)",
  score: "MLOps 파이프라인 완성도(35), 자동화 수준(10)",
}));

// ════════════ 5. Git 기반 개발 과정 ════════════
C(H1("5. Git 기반 개발 과정"));
C(bullet("개발 흐름: SPEC.md에 11단계 계획을 먼저 수립 → 단계별 구현→로컬 검증→커밋 반복."));
C(bullet("커밋 전략: 한 커밋 = 한 단계(원자적). 메시지는 ‘type(scope): 요약’ + 본문(변경/검증) 규칙."));
C(bullet("브랜치: main 보호, 작업은 feature/mlops-security 브랜치에서 진행 후 Pull Request로 병합."));
C(P("실제 커밋 이력(요약):", { bold: true }));
C(table([1500, 7806], [[{ t: "단계" }, { t: "내용" }],
  ["Step 1", "SPEC·의존성·ML 패키지 골격"], ["Step 2", "합성 공격/정상 데이터 생성기"], ["Step 3", "데이터 로더 + 공유 정규화"],
  ["Step 4", "학습 + MLflow 로깅(핵심)"], ["Step 5", "탐지기 + before_request + 대시보드"], ["Step 6", "탐지기 테스트(15 pass)"],
  ["Step 7", "model-eval 품질 게이트"], ["Step 8", "CI MLSecOps 통합"], ["Step 9", "Dockerfile 모델 COPY"],
  ["Step 10", "재학습 v2 + 버전비교 + 롤백"], ["Step 11", "README 운영 문서화"], ["pin", "ML 의존성 버전 핀(재현성)"]]));
C(...fig({
  caption: "GitHub 커밋 이력 / Pull Request 화면 (지속적 커밋)",
  cmd: ["브라우저에서 " + REPO + "/commits/feature/mlops-security 접속", "또는 " + PR + " 의 Commits 탭"],
  where: "GitHub 커밋 목록 또는 PR Commits 탭",
  shot: "Step 1~11 커밋이 시간순으로 나열된 목록(메시지가 보이게)",
  why: "개발 과정이 지속적 커밋으로 드러남을 증빙",
  score: "Git 이력 및 개발 과정(10)",
}));

// ════════════ 6. CI/CD 구성 ════════════
C(H1("6. CI/CD 구성"));
C(bullet("GitHub Actions(.github/workflows/devsecops.yml): push/PR 시 자동 실행, 수동 재학습용 workflow_dispatch 포함."));
C(bullet("기존 5-Gate(보안): Gitleaks(시크릿)·pip-audit(의존성)·Semgrep+Bandit(SAST)·Trivy(컨테이너)·Hadolint(Dockerfile)."));
C(bullet("추가된 ml-train 잡: 데이터 생성 → 학습(MLflow) → 품질 게이트(eval_gate) → 모델/메트릭/mlruns artifact 업로드."));
C(bullet("build-and-scan: ml-train을 needs로 받아 게이트 통과 모델을 내려받아 이미지에 포함 → deploy(Render) → DAST(ZAP)."));
C(bullet("PR 단계에서는 deploy/dast가 skip되어 CI가 깨지지 않고, main push에서만 배포가 동작한다."));
C(...fig({
  caption: "GitHub Actions 전체 잡 통과(초록) 결과",
  cmd: ["브라우저에서 " + REPO + "/actions → 최근 실행 클릭"],
  where: "Actions 실행 상세(잡 목록)",
  shot: "모든 잡 옆에 초록 체크(✓)가 보이는 화면. PR 실행이면 deploy/dast는 회색 skip으로 표시됨",
  why: "테스트/빌드/학습 자동화가 실제로 통과함을 증빙",
  score: "자동화 수준(10), MLOps 파이프라인 완성도(35)",
}));
C(...fig({
  caption: "ml-train 잡 로그 — 모델 학습과 품질 게이트 통과",
  cmd: ["위 Actions 실행에서 ‘ml-train’ 잡 클릭 → ‘Train models + MLflow logging’ 과 ‘Model quality gate’ 단계 펼치기"],
  where: "ml-train 잡의 로그",
  shot: "[train] logreg/nb macro_f1 값과 [gate] PASS 메시지가 보이는 로그",
  why: "CI 안에서 모델이 학습되고 품질 게이트(macro-F1≥0.80)를 자동 통과함을 증빙",
  score: "MLflow 활용(15), 자동화(10), 파이프라인(35)",
  expect: ["[train] logreg  macro_f1=1.0000 acc=1.0000", "[train] nb      macro_f1=0.9798 acc=0.9800",
    "[gate] PASS: 품질 기준 충족 → 다음 단계 진행"],
}));

// ════════════ 7. Docker ════════════
C(H1("7. Docker 기반 환경 구성"));
C(bullet("베이스 python:3.12-slim, WORKDIR /app, 의존성 설치(--no-cache-dir)."));
C(bullet("보안 하드닝: 비특권 appuser 실행(CWE-250 방어), /health HEALTHCHECK."));
C(bullet("ML 연동: 학습된 models/attack_clf.pkl을 이미지에 COPY, MODEL_PATH·DETECTOR_MODE 환경변수."));
C(...fig({
  caption: "Docker 이미지 빌드 성공",
  cmd: ["docker build -t studylog ."],
  where: "터미널 빌드 로그의 마지막 부분",
  shot: "‘naming to docker.io/library/studylog’ 등 빌드 성공 메시지",
  why: "컨테이너 기반 실행 환경이 재현 가능하게 구성됨을 증빙",
  score: "Docker 및 실행 환경 구성(5)",
}));
C(...fig({
  caption: "컨테이너 실행 후 악성 요청 탐지 로그(SECURITY ALERT)",
  cmd: ["docker rm -f sp 2>/dev/null; docker run -d --name sp -p 5000:5000 studylog",
        "curl \"http://localhost:5000/search?q=%27%20OR%201%3D1--\"",
        "docker logs sp | grep \"SECURITY ALERT\""],
  where: "터미널 출력",
  shot: "SECURITY ALERT [sqli] … 로그 라인",
  why: "이미지에 포함된 ML 모델이 컨테이너 런타임에서 실제로 동작함을 증빙",
  score: "Docker(5), 애플리케이션·ML 기능(10)",
  expect: ["... WARNING in __init__: SECURITY ALERT [sqli] conf=0.875 mode=shadow GET /search?q=' OR 1=1-- from=..."],
}));

// ════════════ 8. ML 모델 구성 ════════════
C(H1("8. ML 모델 구성"));
C(bullet("사용 데이터: 합성 HTTP 요청(scripts/seed_attacks.py). 정상 + 4개 공격 카테고리를 균형(카테고리당 200건, 총 1000건)으로 생성."));
C(bullet("모델 종류: TF-IDF(char n-gram) + ① LogisticRegression, ② MultinomialNB 두 가지를 학습해 비교."));
C(bullet("학습 코드: app/ml/train.py — 두 모델을 각각 MLflow run으로 기록, macro-F1 기준 우승 모델을 attack_clf.pkl로 export."));
C(bullet("평가 지표: 주지표 macro-F1, 보조 accuracy, 카테고리별 F1."));
C(...fig({
  caption: "합성 학습 데이터 생성 결과 (라벨 균형 분포)",
  cmd: ["python scripts/seed_attacks.py"],
  where: "터미널 출력",
  shot: "각 라벨(benign/sqli/xss/path_traversal/cmdi) 200건씩, 총 1000건 분포 출력",
  why: "학습에 사용한 데이터의 구성과 균형을 증빙",
  score: "애플리케이션·ML 기능 구성(10)",
  expect: ["[seed_attacks] total=1000 rows", "  - benign          200", "  - sqli            200",
    "  - xss             200", "  - path_traversal  200", "  - cmdi            200"],
}));
C(...fig({
  caption: "두 모델 학습 및 우승 모델 선정(터미널)",
  cmd: ["python -m app.ml.train"],
  where: "터미널 출력",
  shot: "logreg/nb 각각의 macro_f1과 ‘winner = …’, 모델 저장 경로",
  why: "두 알고리즘을 학습·비교하고 우승 모델을 저장하는 과정을 증빙",
  score: "MLflow 활용 및 모델 관리(15), ML 기능(10)",
  expect: ["[train] logreg  macro_f1=1.0000 acc=1.0000", "[train] nb      macro_f1=0.9798 acc=0.9800",
    "[train] winner = logreg (macro_f1=1.0000)", "[train] saved model → .../models/attack_clf.pkl"],
}));
C(P("초기(v1) vs 신규(v2) 및 모델 간 비교:", { bold: true }));
C(table([2326, 2326, 2327, 2327], [[{ t: "버전" }, { t: "모델" }, { t: "macro-F1" }, { t: "accuracy" }],
  ["v1", "LogReg", "1.0000", "1.00"], ["v1", "NB", "0.9798", "0.98"], ["v2", "LogReg", "1.0000", "1.00"],
  [{ t: "v2", bold: true }, { t: "NB", bold: true }, { t: "0.9899", bold: true }, { t: "0.99", bold: true }]]));
C(P("※ 한계(정직): 합성 데이터라 분리도가 높아 macro-F1이 매우 높게 나온다. 본 과제의 핵심은 탐지 성능 자체가 아니라 MLOps 흐름 자동화의 시연이다.", { color: "C00000", size: 20 }));
C(...fig({
  caption: "혼동행렬(Confusion Matrix) — 우승 모델(logreg-v2)의 카테고리별 분류 결과 (실제 학습 artifact)",
  img: "docs/figures/fig11_confusion.png", imgW: 440,
  cmd: ["# 학습 시 MLflow artifact로 자동 저장됨. 파일로 직접 열려면:",
        "open $(find mlruns -name 'cm_logreg-v2.png' | head -1)   # Windows: 해당 png 더블클릭"],
  where: "그림 파일(cm_*.png) 또는 그림 12~16의 MLflow UI Artifacts 탭",
  shot: "5x5 혼동행렬 이미지",
  why: "모델이 각 공격 유형을 어떻게 분류하는지(평가 지표)를 시각적으로 증빙",
  score: "ML 모델 구성(10), MLflow artifact(15)",
}));
C(score("애플리케이션 및 ML 기능 구성(10)"));

// ════════════ 9. MLflow 기반 실험 관리 (핵심) ════════════
C(H1("9. MLflow 기반 실험 관리"));
C(P("MLflow Tracking(로컬 파일 백엔드 mlruns/)으로 모든 학습 run을 기록한다. 실험명은 secpipeline-attack-detection이며, run마다 parameter·metric·artifact·tag를 남긴다. 아래 그림들의 캡처는 모두 같은 MLflow UI를 띄운 뒤 진행한다.", {}));
C(P("◆ MLflow UI 실행 방법 (이 절의 모든 캡처 공통):", { bold: true }));
C(mono("$ export MLFLOW_ALLOW_FILE_STORE=true"));
C(mono("$ mlflow ui --backend-store-uri \"file://$(pwd)/mlruns\" --port 5001"));
C(P("→ 위 명령 실행 후 브라우저에서 http://localhost:5001 접속. (Flask 앱이 5000을 쓰므로 5001 사용)", { size: 20, italics: true }));
C(P("※ 주의: 반드시 file:// 다음에 절대경로($(pwd))를 써야 한다. file:./mlruns 상대경로는 빈 화면이 나온다.", { size: 20, color: "C00000" }));
C(...fig({
  caption: "MLflow UI — 실험 run 목록(LogReg/NB, v1/v2)",
  where: "http://localhost:5001 접속 → 좌측 실험 목록에서 ‘secpipeline-attack-detection’ 클릭",
  cmd: ["(위 ◆ MLflow UI 실행 방법으로 서버를 먼저 띄운다)"],
  shot: "run 목록 표(여러 run, Run Name에 logreg-v1/nb-v1/logreg-v2/nb-v2 등)와 브라우저 주소창(localhost:5001)이 함께 보이게",
  why: "MLflow로 여러 실험을 추적·관리하고 있음을 증빙",
  score: "MLflow 활용 및 모델 관리(15)",
}));
C(...fig({
  caption: "MLflow UI — run 상세의 Parameters(하이퍼파라미터 기록)",
  cmd: ["(MLflow UI에서) run 목록 중 logreg 계열 run 하나를 클릭"],
  where: "run 상세 페이지의 ‘Parameters’ 패널",
  shot: "model_type, analyzer(char_wb), ngram_range, max_features, n_train/n_test 등 파라미터가 나열된 패널",
  why: "학습 parameter를 MLflow에 기록함을 증빙",
  score: "MLflow 활용 및 모델 관리(15)",
}));
C(...fig({
  caption: "MLflow UI — run 상세의 Metrics(성능 지표 기록)",
  cmd: ["(같은 run 상세 페이지)"],
  where: "run 상세 페이지의 ‘Metrics’ 패널",
  shot: "macro_f1, accuracy, f1_benign/f1_sqli/f1_xss/f1_path_traversal/f1_cmdi 값",
  why: "metric을 MLflow에 기록함을 증빙",
  score: "MLflow 활용 및 모델 관리(15)",
}));
C(...fig({
  caption: "MLflow UI — run 상세의 Artifacts(혼동행렬·리포트·모델)",
  cmd: ["(같은 run 상세 페이지)"],
  where: "run 상세 페이지의 ‘Artifacts’ 패널",
  shot: "cm_*.png(혼동행렬), report_*.txt(분류 리포트), *.pkl(모델)이 트리로 보이고, cm 이미지를 클릭해 미리보기까지",
  why: "artifact(모델·이미지·리포트)를 MLflow에 저장·관리함을 증빙",
  score: "MLflow 활용 및 모델 관리(15)",
}));
C(...fig({
  caption: "MLflow UI — 두 모델 run 비교(Compare)",
  cmd: ["(MLflow run 목록에서) logreg run과 nb run의 체크박스를 선택 → 상단 ‘Compare’ 버튼 클릭"],
  where: "Compare 페이지",
  shot: "두 run의 macro_f1/accuracy가 나란히 비교되는 표 또는 그래프",
  why: "여러 모델을 비교해 더 좋은 모델을 고르는 과정을 증빙(가장 좋은 모델 선정 기준 = macro-F1 최댓값)",
  score: "MLflow 활용 및 모델 관리(15)",
}));
C(score("MLflow 활용 및 모델 관리(15)"));

// ════════════ 10. 모델 등록 및 서비스 반영 ════════════
C(H1("10. 모델 등록 및 서비스 반영"));
C(bullet("모델 저장 방식: 우승 모델을 joblib로 models/attack_clf.pkl 저장 + 요약을 models/metrics.json에 기록."));
C(bullet("서비스 로딩 방식: 앱 기동 시 detector.load_model()이 1회 로드(싱글톤). 모델이 없으면 graceful fallback(탐지 비활성, 앱은 정상)."));
C(bullet("신규 모델 반영: 재학습으로 갱신된 .pkl을 커밋·푸시 → CI가 이미지를 빌드해 Render로 배포 → 운영 반영."));
C(bullet("자동/수동 선택 이유: 정기 push는 v1 자동 학습, 모델 ‘교체’가 필요한 재학습은 영향이 크므로 사람이 비교·승인 후 반영하도록 workflow_dispatch 수동 트리거를 사용."));
C(...fig({
  caption: "저장된 모델 파일과 메타데이터",
  cmd: ["ls -la models/", "cat models/metrics.json"],
  where: "터미널 출력",
  shot: "attack_clf.pkl, metrics.json 목록과 metrics.json 내용(winner, macro_f1 등)",
  why: "우승 모델이 파일로 저장·등록되고 그 정보가 관리됨을 증빙",
  score: "MLOps 파이프라인 완성도(35) 일부, 모델 관리(15)",
  expect: ["attack_clf.pkl   metrics.json",
    "{ \"data_version\": \"v2\", \"winner\": \"logreg\", \"macro_f1\": 1.0, ... }"],
}));
C(...fig({
  caption: "앱 기동 시 모델 로딩 및 탐지 동작(서비스 반영 확인)",
  cmd: ["python run.py    # 다른 터미널에서 실행 (http://localhost:5000)",
        "curl \"http://localhost:5000/search?q=%27%20OR%201%3D1--\"   # 또 다른 터미널"],
  where: "run.py를 실행한 터미널의 로그",
  shot: "‘SecPipeline … 정상 시작됨’ 로그와, 공격 요청 시 SECURITY ALERT 로그가 함께 보이게",
  why: "저장된 모델을 서비스가 불러와 실제 요청에 적용함을 증빙",
  score: "애플리케이션·ML 기능(10), 운영(5)",
}));
C(score("모델 등록·반영 (파이프라인 35, 추가점수 자동/수동 반영)"));

// ════════════ 11. 재학습 / 모델 개선 (상세 시나리오) ════════════
C(H1("11. 재학습 또는 모델 개선 과정"));
C(P("배경(왜 재학습했는가):", { bold: true }));
C(bullet("운영 가정: 초기(v1) 모델 배포 후, URL 인코딩으로 우회하는 변형 공격(예: 이중 인코딩 ..%252f.., busybox 기반 명령주입, math 태그를 이용한 XSS)이 새로 관측되었다."));
C(bullet("문제: v1 학습 데이터에는 이런 변형이 부족해, 특히 가벼운 모델인 NB가 일부 변형을 정상에 가깝게 분류하는 약점이 있었다(NB macro-F1 0.9798)."));
C(bullet("조치: 무엇을 바꿨나 → 데이터. scripts/seed_attacks.py에 신규 공격 변형을 추가(--version v2)했다. 모델 구조·피처(TF-IDF char n-gram)는 동일하게 두고 데이터만 변경해 영향 변수를 통제했다."));
C(...fig({
  caption: "재학습 전 — v1 모델의 성능(기준선)",
  cmd: ["python scripts/compare_versions.py    # v1 행을 확인"],
  where: "터미널 출력의 v1 행",
  shot: "v1 logreg/nb의 macro_f1 (특히 nb 0.9798)",
  why: "재학습 전 기준 성능을 증빙(개선 효과 비교 기준)",
  score: "MLflow 모델 관리(15)",
  expect: ["     v1 logreg  1.000000   1.00", "     v1     nb  0.979776   0.98"],
}));
C(...fig({
  caption: "데이터 변경 — 신규 공격 변형을 포함한 v2 데이터 생성",
  cmd: ["python scripts/seed_attacks.py --version v2"],
  where: "터미널 출력",
  shot: "version=v2 로 데이터가 재생성되는 출력",
  why: "재학습의 입력(데이터)이 실제로 바뀌었음을 증빙",
  score: "재학습(추가점수), 파이프라인(35)",
  expect: ["[seed_attacks] version=v2 → .../data/requests.csv", "[seed_attacks] total=1000 rows"],
}));
C(...fig({
  caption: "v2 재학습 실행",
  cmd: ["python -m app.ml.train --version v2"],
  where: "터미널 출력",
  shot: "v2 학습 결과(nb macro_f1가 0.98→0.99로 오른 것)",
  why: "변경된 데이터로 재학습이 수행됨을 증빙",
  score: "재학습(추가점수), MLflow(15)",
  expect: ["[train] logreg  macro_f1=1.0000 acc=1.0000", "[train] nb      macro_f1=0.9899 acc=0.9900"],
}));
C(...fig({
  caption: "재학습 후 — v1 vs v2 성능 비교(개선 확인)",
  cmd: ["python scripts/compare_versions.py"],
  where: "터미널 출력",
  shot: "v1과 v2가 함께 나오는 표 + 버전별 우승 모델 요약",
  why: "재학습 전후 성능을 정량 비교해 개선(NB 0.9798→0.9899)을 증빙하고, 우승 모델 교체 결정을 뒷받침",
  score: "MLflow 모델 관리(15), 재학습(추가점수)",
  expect: ["     v1     nb  0.979776   0.98", "     v2     nb  0.989934   0.99",
    "버전별 우승: v1 logreg(1.0000), v2 logreg(1.0000)"],
}));
C(...fig({
  caption: "CI에서 수동 재학습 트리거(workflow_dispatch)",
  cmd: ["브라우저에서 " + REPO + "/actions → 좌측 ‘SecPipeline DevSecOps’ → ‘Run workflow’ 클릭 → data_version에 v2 입력 후 실행"],
  where: "Actions의 Run workflow 실행 화면 / 실행된 run",
  shot: "Run workflow 입력창(data_version=v2)과 실행된 ml-train 잡",
  why: "재학습을 사람이 승인·트리거하는 수동 반영 방식을 실제로 사용함을 증빙",
  score: "재학습·자동화(10), 추가점수",
}));
C(P("모델 교체 결과: v2 우승 모델(LogReg)을 배포 모델로 반영(models/attack_clf.pkl 갱신·커밋). NB 계열은 0.9798→0.9899로 일반화가 개선됨을 확인.", {}));
C(score("재학습/개선 (MLflow 15, 추가점수 10)"));

// ════════════ 12. 운영 로그 및 문제 대응 ════════════
C(H1("12. 운영 로그 및 문제 대응"));
C(bullet("서비스 로그: logs/secpipeline.log (RotatingFileHandler). 앱 기동/요청/에러를 기록."));
C(bullet("예측(탐지) 요청 로그: 악성 판정 시 ‘SECURITY ALERT [라벨] conf=… mode=… METHOD path from=IP’ 형식."));
C(bullet("모델 정보 확인: models/metrics.json(버전·우승모델·지표), 대시보드 ‘보안 이벤트’ 위젯(누적/카테고리/최근)."));
C(P("아래 순서대로 캡처하면 ‘요청 → 탐지 → 로그/화면 반영’의 운영 흐름이 한눈에 증빙된다.", {}));
C(...fig({
  caption: "앱 기동 및 정상 운영 로그",
  cmd: ["python run.py", "tail -n 5 logs/secpipeline.log    # 다른 터미널"],
  where: "logs/secpipeline.log 내용",
  shot: "‘SecPipeline 애플리케이션 및 로깅 시스템 정상 시작됨’ 라인",
  why: "서비스가 로깅 체계를 갖추고 정상 가동됨을 증빙",
  score: "배포·운영(5)",
}));
C(...fig({
  caption: "공격 요청 발생 → 보안 경보 로그(예측 요청 로그)",
  cmd: ["curl \"http://localhost:5000/search?q=%27%20OR%201%3D1--\"     # SQLi",
        "curl \"http://localhost:5000/search?q=%3Cscript%3Ealert(1)%3C/script%3E\"   # XSS",
        "grep \"SECURITY ALERT\" logs/secpipeline.log | tail -n 5"],
  where: "logs/secpipeline.log 의 SECURITY ALERT 라인들",
  shot: "sqli, xss 등 라벨과 conf(신뢰도)가 찍힌 경보 로그 여러 줄",
  why: "ML 모델의 예측(탐지) 요청이 운영 로그로 남아 사후 분석이 가능함을 증빙",
  score: "배포·운영(5), 추가점수(운영 로그 분석)",
  expect: ["... SECURITY ALERT [sqli] conf=0.875 mode=shadow GET /search?q=' OR 1=1-- from=127.0.0.1",
    "... SECURITY ALERT [xss] conf=0.938 mode=shadow GET /search?q=<script>alert(1)</script> from=127.0.0.1"],
}));
C(...fig({
  caption: "대시보드 ‘보안 이벤트’ 위젯(탐지 결과의 서비스 반영)",
  cmd: ["# 1) python run.py 실행 상태에서 브라우저로 http://localhost:5000 접속",
        "# 2) 회원가입 후 로그인",
        "# 3) 주소창에 http://localhost:5000/search?q=' OR 1=1-- 입력해 공격 요청 발생",
        "# 4) http://localhost:5000/dashboard 로 이동(새로고침)"],
  where: "대시보드 하단 ‘🛡️ 보안 이벤트’ 위젯",
  shot: "누적 탐지 건수, 카테고리별 카운트, 최근 이벤트 목록이 보이는 위젯",
  why: "탐지 결과가 운영 화면(대시보드)에 실시간 반영됨을 증빙",
  score: "애플리케이션·ML 기능(10), 운영(5), 추가점수",
}));
C(P("일부러 발생시킨 문제(실제 경험):", { bold: true }));
C(bullet("문제: MLflow 3.13에서 파일 백엔드가 기본 차단되어 학습이 MlflowException으로 중단됨."));
C(bullet("원인: MLflow 3.x가 file store를 maintenance mode로 막음.", 1));
C(bullet("해결: train.py에서 mlflow import 전에 MLFLOW_ALLOW_FILE_STORE=true를 설정해 로컬 mlruns/ 유지.", 1));
C(score("배포·운영(5), 추가점수(운영 로그 분석)"));

// ════════════ 13. 롤백 및 이전 모델 관리 ════════════
C(H1("13. 롤백 및 이전 모델 관리"));
C(bullet("이전 모델 보관: Git 이력에 모델 파일이 버전별로 남는다(Step 4 커밋=v1 최초, Step 10 커밋=v2). CI는 ml-model artifact로도 모델을 보관."));
C(bullet("버전 관리: MLflow의 data_version 태그 + scripts/compare_versions.py로 버전을 비교·식별."));
C(bullet("되돌리는 방법: git checkout <v1-커밋> -- models/… 로 직전 모델 파일 복원 후 커밋·푸시 → CI 재배포(docs/rollback.md)."));
C(bullet("즉시 완화: 모델 교체 없이 DETECTOR_MODE를 shadow/enforce로 전환하는 운영 스위치도 제공."));
C(...fig({
  caption: "모델 파일의 버전 이력(이전 모델 보관 증빙)",
  cmd: ["git log --oneline -- models/attack_clf.pkl"],
  where: "터미널 출력",
  shot: "v2(Step 10)와 v1(Step 4) 두 커밋이 모델 변경 이력으로 보이는 목록",
  why: "이전 모델이 버전별로 보관되어 되돌릴 수 있음을 증빙",
  score: "추가점수(모델 롤백·버전 관리)",
  expect: ["8a46431 feat(ml): Step 10 - 재학습 v2 + MLflow 버전비교 + 롤백",
    "f34d30c feat(ml): Step 4 - 학습 스크립트 + MLflow 로깅 (MLSecOps 핵심)"],
}));
C(...fig({
  caption: "롤백 절차 실행(직전 v1 모델로 복원)",
  cmd: ["# 위 그림에서 확인한 v1 커밋(f34d30c)으로 모델 파일만 복원",
        "git checkout f34d30c -- models/attack_clf.pkl models/metrics.json",
        "python -c \"import json;print(json.load(open('models/metrics.json'))['data_version'])\""],
  where: "터미널 출력",
  shot: "복원 명령 실행 후 data_version이 v1으로 출력되는 화면",
  why: "이전 모델로 되돌리는 롤백이 실제로 동작함을 증빙",
  score: "추가점수(모델 롤백 기능)",
  expect: ["v1"],
}));
C(P("※ 캡처 후 다시 최신(v2)으로 되돌리려면: git checkout HEAD -- models/attack_clf.pkl models/metrics.json", { size: 20, italics: true, color: "808080" }));
C(score("추가점수(모델 롤백 기능)"));

// ════════════ 14. 전체 파이프라인 동작 흐름 ════════════
C(H1("14. 전체 파이프라인 동작 흐름"));
C(P("세 가지 시나리오로 전체 흐름이 끊김 없이 이어짐을 보인다. 각 시나리오는 앞 절의 그림들로 증빙된다.", {}));
C(bullet("① 코드 수정 → 서비스 반영: 코드 commit·push → Actions(5-Gate + ml-train) 통과 → build → deploy(Render) → 운영. [그림 3·5·6 + 그림 17]"));
C(bullet("② 데이터 변경 → 재학습: seed_attacks --version v2 → train → eval_gate → compare. [그림 18~21]"));
C(bullet("③ 모델 변경 → 운영 반영: 우승 .pkl 커밋 → 이미지 COPY → 배포 → before_request가 새 모델로 탐지. [그림 7·8 + 그림 17]"));
C(P("전체 흐름을 한 장으로 증빙하려면, main 병합 후 deploy 잡이 성공한 화면을 캡처한다(아래).", {}));
C(...fig({
  caption: "main 병합 후 전체 파이프라인 종단 실행(deploy 성공)",
  cmd: ["# " + PR + " 를 main에 Merge 한 뒤",
        "브라우저에서 " + REPO + "/actions 의 main push 실행을 연다"],
  where: "main push로 트리거된 Actions 실행의 잡 그래프",
  shot: "ml-train·build-and-scan에 이어 deploy 잡까지 초록으로 성공한 전체 그래프(Render 배포까지 이어진 모습)",
  why: "코드/모델 변경이 배포·운영까지 자동으로 이어지는 종단 흐름을 한 화면으로 증빙",
  score: "MLOps 파이프라인 완성도(35)",
}));
C(score("MLOps 파이프라인 완성도(35)"));

// ════════════ 15. 문제 해결 경험 ════════════
C(H1("15. 문제 해결 경험"));
C(P("① MLflow 파일스토어 차단(12절) — import 전 MLFLOW_ALLOW_FILE_STORE 설정으로 해결.", {}));
C(P("② 학습/추론 전처리 불일치 위험 — normalize_request를 app/ml/data.py 단일 함수로 두고 학습과 미들웨어가 공유하도록 설계해 분포 어긋남을 방지.", {}));
C(P("③ 의존성 재현성 — CI가 매번 최신 버전을 설치해 검증 버전과 달라질 위험 → requirements를 정확 버전으로 핀(특히 모델 pickle 호환을 위해 scikit-learn 고정).", {}));
C(P("④ MLflow UI 빈 화면 — 상대경로(file:./mlruns)로는 실험이 안 보여, 절대경로(file://$(pwd)/mlruns)로 실행하도록 정리.", {}));
C(score("추가점수(애플리케이션 복잡도·문제해결)"));

// ════════════ 16. 느낀 점 ════════════
C(H1("16. 느낀 점 및 개선 방향"));
C(bullet("MLOps 관점: 모델 성능보다 ‘데이터→학습→게이트→배포→재학습→롤백’이 자동으로 이어지는 운영 사이클 설계가 핵심임을 체감."));
C(bullet("개선하고 싶은 부분: 합성 데이터 대신 실제 트래픽/공격 로그로 재학습, MLflow Model Registry 도입, 임계값·오탐률 튜닝, 탐지 지표의 운영 모니터링."));
C(bullet("수업 피드백: (자유 작성)"));

// ════════════ 참고 자료 ════════════
C(H1("참고 자료"));
C(bullet("Fu et al. (2024), “AI for DevSecOps” — 파이프라인 5단계 프레임워크 근거"));
C(bullet("MLflow Documentation — https://mlflow.org/docs/latest/"));
C(bullet("scikit-learn Documentation — https://scikit-learn.org/stable/"));
C(bullet("프로젝트 저장소 — " + REPO));

// ── 부록: 캡처 순서 체크리스트 ──
C(new Paragraph({ children: [new PageBreak()] }));
C(H1("부록 A. 캡처 순서 체크리스트"));
C(P("아래 순서로 캡처하면 효율적이다. (그림 번호 = 본문 순서)", {}));
C(table([900, 4600, 3806], [[{ t: "그림" }, { t: "캡처 내용" }, { t: "한 줄 방법" }],
  ["1", "Render 배포 서비스", "secpipeline.onrender.com 접속"],
  ["2", "GitHub public 저장소", "저장소 메인"],
  ["3", "Actions 잡 그래프", "/actions → 실행 클릭"],
  ["4", "Actions 전체 초록", "같은 실행 상세"],
  ["5", "ml-train 로그(gate PASS)", "ml-train 잡 펼치기"],
  ["6", "커밋/PR 이력", "/commits 또는 PR Commits"],
  ["7", "docker build 성공", "docker build -t studylog ."],
  ["8", "컨테이너 SECURITY ALERT", "docker run + curl + docker logs"],
  ["9", "데이터 분포", "python scripts/seed_attacks.py"],
  ["10", "학습/우승 선정", "python -m app.ml.train"],
  ["11", "혼동행렬", "cm_*.png 또는 MLflow Artifacts"],
  ["12~16", "MLflow UI(목록·param·metric·artifact·compare)", "mlflow ui 실행 후 localhost:5001"],
  ["17", "모델 파일/metrics.json", "ls models/ ; cat metrics.json"],
  ["18", "앱 기동·탐지", "python run.py + curl"],
  ["19~23", "재학습 전/데이터변경/재학습/비교/수동트리거", "compare_versions, seed v2, train v2, Run workflow"],
  ["24~26", "운영 로그·경보·대시보드 위젯", "tail log, curl, /dashboard"],
  ["27~28", "모델 버전 이력·롤백", "git log -- models, git checkout"],
  ["29", "main 병합 후 deploy 성공", "PR merge 후 Actions"],
]));
C(P("MLflow UI 실행(12~16, 11): export MLFLOW_ALLOW_FILE_STORE=true 후 mlflow ui --backend-store-uri \"file://$(pwd)/mlruns\" --port 5001 → http://localhost:5001", { size: 19, italics: true }));

// ════════════ 문서 ════════════
const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 22 } } } },
  numbering: { config: [{ reference: "b", levels: [
    { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 520, hanging: 260 } } } },
    { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1040, hanging: 260 } } } },
  ] }] },
  sections: [{
    properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1300, right: 1300, bottom: 1300, left: 1300 } } },
    footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "SecPipeline 기말 보고서  -  ", size: 16, font: FONT, color: "808080" }), new TextRun({ children: [PageNumber.CURRENT], size: 16, font: FONT, color: "808080" })] })] }) },
    children,
  }],
});
Packer.toBuffer(doc).then((buf) => { fs.writeFileSync(path.join(ROOT, "docs", "final-report-figure.docx"), buf); console.log("OK → docs/final-report-figure.docx (" + buf.length + " bytes), 그림 수=" + FIG); });

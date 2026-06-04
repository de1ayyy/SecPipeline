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
C(mono("$ pip install -r requirements.txt  # 최초 1회 의존성 설치", { after: 40 }));
C(P("※ 포트 주의(macOS): `python run.py`나 도커 실행 시 5000 포트가 ‘address already in use’로 막히면, AirPlay 수신 기능이 5000을 쓰는 것이다. 시스템 설정 > 일반 > AirDrop 및 Handoff에서 ‘AirPlay 수신기’를 끄거나, 도커는 -p 5055:5000으로 띄워 http://localhost:5055 로 접속하면 된다.", { size: 19, color: "7A5600" }));

// ════════════ 1. 프로젝트 개요 ════════════
C(H1("1. 프로젝트 개요"));
C(P("중간 프로젝트에서 구축한 SecPipeline은 Flask 기반 학습기록 웹 애플리케이션에 DevSecOps 5-Gate 보안 파이프라인(시크릿 탐지·의존성 취약점·정적분석(SAST)·컨테이너 취약점·Dockerfile 린트)을 결합하여, 코드를 push하면 보안 검사가 자동으로 수행되고 통과해야만 배포되는 CI/CD를 완성한 프로젝트였다. 기말 프로젝트에서는 이 기반 위에 ML을 ‘추가’하는 데서 멈추지 않고, 모델의 전 생애주기 — 데이터 준비 → 학습 → 평가(품질 게이트) → 배포 → 재학습 → 롤백 — 를 자동화하고 추적·관리하는 MLflow 기반 MLOps 파이프라인을 직접 설계·구축하는 것을 목표로 삼았다."));
C(P("ML 주제로는 프로젝트의 정체성(DevSecOps)과 일관되도록 ‘보안 목적의 ML’, 즉 악성 HTTP 요청 탐지를 선택했다. 학습기록 분류와 같이 도메인과 무관한 ML을 붙이는 대신, 들어오는 요청을 정상/공격(SQL 인젝션·XSS·경로순회·명령주입)으로 분류하는 모델을 서비스에 결합함으로써 기존 DevSecOps를 MLSecOps(AI for DevSecOps)로 자연스럽게 확장했다. 이 방향은 CI 워크플로 주석에 인용한 Fu et al.(2024) ‘AI for DevSecOps’의 문제의식과도 부합한다."));
C(P("따라서 본 보고서는 ‘기능이 동작한다’를 넘어 과제가 강조하는 세 가지 — ① 지속적인 개발 과정(SPEC 선설계 후 11단계 원자적 커밋), ② 모델 및 데이터 관리(MLflow 실험·버전 추적, 합성 데이터 v1→v2 관리), ③ 자동화된 운영 파이프라인(CI에 학습·품질 게이트·배포를 통합) — 을 어떻게 설계하고 운영했는지를 중심으로 서술한다.", { after: 140 }));
C(bullet("프로젝트 이름: SecPipeline (DevSecOps + MLSecOps 통합)"));
C(bullet("프로젝트 목적: 중간 프로젝트의 Flask 학습기록 앱 + DevSecOps 5-Gate 보안 파이프라인 위에, 보안 목적의 ML 기능(악성 HTTP 요청 탐지)과 MLflow 기반 MLOps(실험관리·버전관리·재학습·배포·운영)를 직접 설계·구축한다. 단순 모델 학습이 아니라 Git→CI/CD→Docker→MLflow→Deploy 전 과정을 자동으로 연결하고 운영하는 것이 목표다."));
C(bullet("GitHub 주소(public): " + REPO + "   (Pull Request: " + PR + ")"));
C(bullet("배포 주소: https://secpipeline.onrender.com"));
C(bullet("MLflow Tracking 화면: 로컬 파일 백엔드(mlruns/). 아래 그림 2의 명령으로 UI 실행."));
C(...fig({
  caption: "Render에 배포되어 외부에서 접속되는 SecPipeline 서비스(로그인 페이지)",
  cmd: ["브라우저 주소창에 https://secpipeline.onrender.com/login 입력",
        "# 참고: 루트(/)는 라우트가 없어 404가 정상. /login 또는 /health(JSON)로 접속"],
  where: "배포된 서비스의 로그인 페이지(/login)",
  shot: "로그인 화면 전체 + 브라우저 주소창(secpipeline.onrender.com/login 이 보이도록). " +
        "추가로 https://secpipeline.onrender.com/health 의 {\"status\":\"ok\"} 화면을 한 장 더 찍으면 ‘서비스 상태 확인’ 증빙으로 좋다.",
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
C(P("소프트웨어는 ‘사용자에게 제공하는 서비스’와 ‘보안 ML 기능’ 두 축으로 구성되며, 두 축은 책임이 분리되어 있되 요청 처리 경로의 한 지점(미들웨어)에서 결합된다. 이렇게 분리하면 ML 모델을 교체하거나 끄더라도 서비스 로직에는 영향이 없어 운영 안정성이 높다.", {}));
C(H2("1) 사용자 핵심 기능 (서비스)"));
C(bullet("회원가입/로그인(세션 기반)"));
C(bullet("학습기록 CRUD: 제목·내용·학습시간·과목으로 기록 생성/조회/수정/삭제"));
C(bullet("과목 관리, 검색, 내보내기(export), 대시보드(통계 + 보안 이벤트 위젯)"));
C(H2("2) ML 모델이 사용되는 위치"));
C(P("ML 모델은 Flask의 @before_request 훅(app/__init__.py)에 연결되어 있다. 모든 HTTP 요청이 각 라우트(뷰 함수)에 도달하기 전에 단일 지점에서 모델로 스코어링되므로, 라우트마다 보안 코드를 중복 삽입할 필요 없이 애플리케이션 표면 전체를 한 번에 보호할 수 있다. 이는 ‘선택지점(choke point)에서의 방어’라는 보안 설계 원칙을 따른 것이다.", {}));
C(bullet("기본 동작은 shadow 모드: 악성으로 판정해도 차단하지 않고 탐지·로깅·집계만 수행한다(데모/운영 안정성 확보)."));
C(bullet("환경변수 DETECTOR_MODE=enforce로 전환하면 악성 요청을 HTTP 403으로 즉시 차단한다. 모델 교체 없이 운영 정책만 바꿀 수 있는 ‘운영 스위치’ 역할을 한다."));
C(bullet("탐지 결과는 운영 로그(logs/secpipeline.log)에 경보로 남고, 대시보드 ‘보안 이벤트’ 위젯에 누적·카테고리·최근 이벤트로 집계되어 사람이 모니터링할 수 있다."));
C(H2("3) 입력 데이터와 출력 결과"));
C(P("입력은 HTTP 요청의 method·path·query·body를 하나의 문자열로 합친 뒤 정규화한다. 정규화 단계에서 URL 인코딩(%2f, %3c 등)을 2회까지 디코드하여 인코딩으로 우회하려는 페이로드를 드러내고, 소문자화로 대소문자 변형을 흡수한다. 이 정규화 함수(app/ml/data.py의 normalize_request)는 학습과 실시간 추론이 동일하게 사용하여 학습-서빙 간 전처리 불일치(training-serving skew)를 원천 차단한다.", {}));
C(bullet("출력: 라벨(benign / sqli / xss / path_traversal / cmdi) + 신뢰도(0~1, predict_proba의 최댓값). 라벨이 공격이고 신뢰도가 임계값 이상이면 경보로 처리한다."));
C(score("애플리케이션 및 ML 기능 구성(10) — ML이 실제 서비스(요청 처리 경로)와 연결되어 동작"));

// ════════════ 3. 실행 환경 ════════════
C(H1("3. 실행 환경"));
C(P("개발은 macOS에서, 실행은 컨테이너(Linux) 기준으로 통일했고, 배포는 Render의 Linux 환경을 사용한다. 어느 환경에서도 동일하게 재현되도록 ML 의존성(scikit-learn·pandas·matplotlib·joblib)을 정확한 버전으로 고정(pin)했다. 특히 학습된 모델(.pkl)은 scikit-learn 버전에 민감하므로, CI가 매번 최신 버전을 설치해 모델 로딩이 깨지는 일이 없도록 scikit-learn==1.9.0으로 고정한 점이 재현성의 핵심이다.", {}));
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
C(P("핵심 설계 원칙은 ‘기존 DevSecOps 5-Gate는 손대지 않고, ML 단계(MLSecOps)를 같은 워크플로에 추가하여 하나의 파이프라인으로 통합한다’는 것이다. 그 결과 보안 검증과 모델 운영이 분리된 두 시스템이 아니라, Git→CI/CD→Docker→MLflow→Deploy로 이어지는 단일 흐름 안에서 함께 동작한다. 코드 한 줄 또는 모델 데이터를 바꿔 push하면, 보안 5-Gate와 모델 학습·품질 게이트가 모두 자동으로 수행되고, 통과한 모델이 이미지에 담겨 배포되며, 운영 중에는 그 모델이 실시간으로 요청을 탐지한다. 아래 네 가지 흐름으로 나누어 설명한다.", {}));
C(bullet("코드 변경 흐름: 개발자가 git commit → push(또는 PR) → GitHub Actions가 자동 트리거되어 보안 5-Gate + 단위테스트 + 모델 학습이 병렬 실행된다."));
C(bullet("모델 학습 흐름: seed_attacks.py로 학습 데이터를 생성 → train.py가 두 모델을 학습하며 MLflow에 기록 → eval_gate.py가 우승 모델의 macro-F1이 0.80 미만이면 파이프라인을 중단(fail-fast)한다. 즉 ‘품질이 보장된 모델만’ 다음 단계로 넘어간다."));
C(bullet("모델 등록/반영 흐름: 게이트를 통과한 우승 모델(models/attack_clf.pkl)이 artifact로 업로드되고, build 잡이 이를 내려받아 Docker 이미지에 COPY한다. 이미지가 곧 ‘모델이 포함된 배포 단위’가 된다."));
C(bullet("서비스 운영 흐름: 배포된 컨테이너에서 before_request 미들웨어가 모델을 로드해 매 요청을 탐지하고, 결과를 로그·대시보드로 노출한다. 운영 중 새 공격 패턴이 보이면 재학습(v2)→비교→반영 또는 롤백으로 사이클이 순환한다."));
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
C(P("무계획적으로 코드를 쌓지 않고, 먼저 SPEC.md에 전체 작업을 11단계로 분해한 설계 문서를 작성한 뒤(설계 우선), 각 단계를 ‘구현 → 로컬 검증 → 커밋’ 순서로 진행했다. 이렇게 하면 개발 과정 자체가 Git 이력에 단계별로 또렷하게 남아, 어떤 의도로 무엇을 어떤 순서로 만들었는지가 커밋만 봐도 드러난다.", {}));
C(bullet("커밋 전략: ‘한 커밋 = 한 단계(원자적)’ 원칙. 메시지는 Conventional Commits 형식(feat/test/ci/build/docs 등 type(scope): 요약)으로 작성하고, 본문에 변경 내용과 검증 결과를 함께 적어 추적성을 높였다."));
C(bullet("브랜치 전략: main을 안정 브랜치로 두고, 모든 작업은 feature/mlops-security 브랜치에서 진행한 뒤 Pull Request(#5)로 리뷰·병합한다. 덕분에 main은 항상 배포 가능한 상태를 유지한다."));
C(bullet("모델 변경 이력 관리: 모델 파일(models/attack_clf.pkl)도 Git으로 추적하여, 어느 커밋에서 모델이 바뀌었는지(예: Step 4=v1 최초, Step 10=v2)가 git log로 남아 롤백의 근거가 된다."));
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
C(P("CI/CD는 GitHub Actions(.github/workflows/devsecops.yml) 하나로 운영한다. push와 PR에서 자동 실행되며, 모델 재학습을 사람이 직접 트리거할 수 있도록 workflow_dispatch(수동 실행, 입력값 data_version 포함)도 추가했다. 워크플로는 기존 보안 5-Gate를 그대로 유지한 채 ML 단계만 얹는 방식으로 확장하여, 보안 검증과 모델 운영이 같은 자동화 안에서 함께 수행된다.", {}));
C(bullet("기존 5-Gate(보안, 수정 없음): Gitleaks(시크릿)·pip-audit(의존성 취약점)·Semgrep+Bandit(SAST)·Trivy(컨테이너 취약점)·Hadolint(Dockerfile 린트) + pytest 단위테스트."));
C(bullet("신설 ml-train 잡: 의존성 설치 → seed_attacks.py(데이터 생성) → app.ml.train(학습 + MLflow 로깅) → eval_gate.py(품질 게이트) → 모델·metrics·mlruns를 artifact로 업로드. 즉 ‘학습 자동화 + 모델 품질 자동 검증’을 CI 안에서 수행한다."));
C(bullet("품질 게이트(fail-fast): 우승 모델의 macro-F1이 0.80 미만이면 ml-train 잡이 실패하여 이후 빌드·배포가 진행되지 않는다. DevSecOps의 보안 게이트와 동일한 원칙을 모델 품질에 적용한 것으로, 성능이 나쁜 모델이 배포되는 것을 자동으로 막는다."));
C(bullet("의존성 연결: build-and-scan 잡이 ml-train을 needs로 받아 게이트를 통과한 모델 artifact를 내려받아 Docker 이미지에 포함한 뒤, Trivy 스캔 → deploy(Render Deploy Hook) → DAST(OWASP ZAP) 순으로 이어진다."));
C(bullet("PR 안전성: deploy·dast 잡은 ‘main 브랜치 push’ 조건이 걸려 있어 PR에서는 자동으로 skip된다. 따라서 PR 단계에서는 배포 없이 보안·학습·빌드 검증만 수행되어 CI가 불필요하게 실패하지 않는다."));
C(H2("주요 잡(Job)별 단계 설명"));
C(P("워크플로는 9개의 잡(job)으로 구성되며, 각 잡은 actions/checkout으로 코드를 받은 뒤 자신의 검사를 수행한다. 잡 간 실행 순서는 needs(의존)로 보장되고, 앞 단계가 실패하면 뒤 단계는 실행되지 않는다(fail-fast). 각 잡의 역할과 핵심 단계는 다음과 같다.", {}));
C(bullet("secret-scan (Gitleaks): 전체 커밋 히스토리를 스캔해 하드코딩된 시크릿이 있으면 실패. 비밀 유출을 커밋 단계에서 차단."));
C(bullet("dependency-scan (pip-audit): requirements.txt 의존성의 알려진 취약점(CVE)을 검사하고 결과(JSON)를 artifact로 업로드."));
C(bullet("sast (Semgrep + Bandit): app/ 소스를 정적 분석해 SQLi·취약 패턴을 탐지하고 결과 업로드."));
C(bullet("unit-test (pytest) — 테스트 자동화: 의존성 설치 후 pytest tests/ 실행(JUnit XML). 단위 테스트 15개가 통과해야 다음 단계 진행."));
C(bullet("ml-train — 학습 자동화 + 품질 검증: 의존성 설치 → seed_attacks.py → app.ml.train(MLflow 기록) → eval_gate.py(macro-F1 게이트) → 모델·metrics·mlruns artifact 업로드."));
C(bullet("build-and-scan — 빌드 자동화: 앞 잡 통과를 needs로 받아 게이트 통과 모델 artifact를 내려받아 docker build로 이미지 생성 후 Trivy 스캔. 품질 검증된 모델이 포함된 이미지만 생성."));
C(bullet("dockerfile-lint (Hadolint): Dockerfile 베스트프랙티스·보안 규칙 린트."));
C(bullet("deploy — 배포 자동화: main push에서만 실행. Render GitHub 자동배포가 주 경로, Deploy Hook은 보조(훅 실패에도 잡 통과 가드)."));
C(bullet("dast (OWASP ZAP): 배포 후 운영 URL을 동적 점검(Baseline Scan)해 런타임 취약점을 보완."));
C(H2("테스트·빌드·배포 자동화 여부 및 방식"));
C(P("세 자동화가 모두 ‘push 한 번’으로 사람 개입 없이 수행된다. (1) 테스트 자동화 — unit-test 잡이 매 push/PR마다 pytest를 실행해 회귀를 막는다. (2) 빌드 자동화 — build-and-scan 잡이 Dockerfile로 이미지를 생성하고 Trivy 스캔까지 한다. (3) 배포 자동화 — deploy 잡과 Render GitHub 연동으로 main 반영 시 자동 배포된다. 여기에 더해 일반 CI/CD(테스트·빌드·배포)를 넘어 모델 ‘학습 자동화’와 ‘재학습(workflow_dispatch)’까지 같은 파이프라인에 포함해 MLOps를 자동화한 점이 특징이다.", {}));
C(H2("실행 결과"));
C(P("main 병합 후 트리거된 워크플로에서 9개 잡(secret-scan·dependency-scan·sast·unit-test·ml-train·build-and-scan·dockerfile-lint·deploy·dast)이 모두 성공(초록)했다. ml-train 로그에는 두 모델의 macro_f1과 게이트 ‘PASS’가 출력되고, build-and-scan은 게이트 통과 모델을 포함해 이미지를 빌드하며, deploy·dast까지 정상 종료되어 배포·동적점검이 자동으로 이어졌다. 즉 push만으로 보안검사→테스트→학습·품질검증→빌드→배포→동적점검이 끊김 없이 자동 수행됨을 확인했다(아래 그림 5·6 및 17절 종단 그림).", {}));
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
C(P("애플리케이션과 실행 환경(파이썬 런타임·의존성·학습된 모델)을 하나의 컨테이너 이미지로 묶어, 어느 호스트에서도 동일하게 실행되도록 구성했다. 미들텀에서 적용한 보안 하드닝을 그대로 유지하면서, 기말에서는 ML 모델을 이미지에 포함하는 단계를 추가했다.", {}));
C(bullet("베이스 이미지 python:3.12-slim, WORKDIR /app, 의존성은 캐시 없이 설치(--no-cache-dir)하여 이미지를 가볍게 유지."));
C(bullet("보안 하드닝: 비특권 사용자 appuser로 실행하여 컨테이너 탈취 시 권한 상승을 막고(CWE-250 방어), HEALTHCHECK로 /health를 주기 점검해 비정상 컨테이너를 감지한다. 운영 서버는 개발용 서버 대신 gunicorn을 사용한다."));
C(bullet("ML 연동: 게이트를 통과한 models/attack_clf.pkl을 이미지에 COPY하고, MODEL_PATH(모델 경로)·DETECTOR_MODE(shadow/enforce)를 환경변수로 분리해 코드 수정 없이 운영 정책을 바꿀 수 있게 했다. 모델 파일이 없으면 앱이 탐지를 끄고 정상 기동(graceful fallback)하므로 컨테이너가 죽지 않는다."));
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
  cmd: ["docker rm -f sp 2>/dev/null; docker run -d --name sp -p 5055:5000 studylog",
        "# (호스트 포트 5055 사용 — macOS는 5000을 AirPlay가 점유할 수 있음)",
        "curl \"http://localhost:5055/search?q=%27%20OR%201%3D1--\"",
        "docker logs sp | grep \"SECURITY ALERT\""],
  where: "터미널 출력",
  shot: "SECURITY ALERT [sqli] … 로그 라인",
  why: "이미지에 포함된 ML 모델이 컨테이너 런타임에서 실제로 동작함을 증빙",
  score: "Docker(5), 애플리케이션·ML 기능(10)",
  expect: ["... WARNING in __init__: SECURITY ALERT [sqli] conf=0.875 mode=shadow GET /search?q=' OR 1=1-- from=..."],
}));

// ════════════ 8. ML 모델 구성 ════════════
C(H1("8. ML 모델 구성"));
C(P("사용 데이터: 실서비스의 study_logs에는 공격 트래픽이 없으므로, 학습 데이터는 scripts/seed_attacks.py로 합성한다. 정상 요청(앱의 실제 경로와 평범한 파라미터)과 4개 공격 카테고리(SQL 인젝션·XSS·경로순회·명령주입)를 각 200건씩, 총 1,000건을 균형 있게 생성한다. 균형 분포로 만든 이유는 특정 클래스에 치우치지 않게 하여 macro-F1(클래스별 F1의 평균) 평가가 의미를 갖도록 하기 위함이다.", {}));
C(P("모델 종류와 피처: 입력이 짧은 요청 문자열이고 공격 페이로드는 토큰 경계가 불분명(예: ' OR 1=1--, ../../, <script>)하므로, 단어 단위 대신 문자 n-gram TF-IDF(char_wb, 2~4-gram)를 피처로 사용한다. 분류기는 LogisticRegression과 MultinomialNB 두 가지를 학습해 비교했다 — 서로 특성이 다른 두 알고리즘을 두고 더 나은 쪽을 데이터로 고르기 위함이다(MLflow 비교, 9절).", {}));
C(P("학습 코드(app/ml/train.py)는 두 모델을 각각 MLflow run으로 기록하고, 테스트셋 macro-F1이 가장 높은 모델을 우승 모델로 선정해 models/attack_clf.pkl로 export하며, 요약 지표를 models/metrics.json에 저장한다. 평가 지표는 주지표 macro-F1, 보조로 accuracy와 카테고리별 F1을 사용한다.", {}));
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
C(P("모델을 ‘한 번 학습하고 끝’이 아니라 실험으로 관리하기 위해 MLflow Tracking을 도입했다. 백엔드는 과제 규모에 맞게 로컬 파일(mlruns/)로 단순화했고, 실험명은 secpipeline-attack-detection이다. 학습을 실행할 때마다(알고리즘별로, 그리고 데이터 버전별로) 별도의 run이 생성되며, 각 run에는 다음을 기록한다.", {}));
C(bullet("parameter: model_type(logreg/nb), analyzer(char_wb), ngram_range(2~4), max_features, n_train/n_test — 어떤 설정으로 학습했는지 재현 가능하게 남긴다."));
C(bullet("metric: macro_f1, accuracy, 그리고 카테고리별 f1_benign/f1_sqli/f1_xss/f1_path_traversal/f1_cmdi — 어느 공격 유형에서 약한지까지 추적한다."));
C(bullet("artifact: 혼동행렬 이미지(cm_*.png), 분류 리포트(classification_report.txt), 학습된 모델(.pkl) — 실험 결과물을 그대로 보관한다."));
C(bullet("tag: data_version(v1/v2), model_type — 알고리즘 비교(같은 데이터, 다른 모델)와 시간축 버전 비교(같은 모델, 다른 데이터)를 모두 가능하게 하는 핵심 메타데이터다."));
C(P("우승 모델 선정 기준은 ‘테스트셋 macro-F1 최댓값’으로 명시적으로 정의했고, train.py가 이 기준으로 자동 선정한다. 모델 비교는 두 가지 축으로 이뤄진다 — (1) 같은 데이터에서 LogReg vs NB(알고리즘 비교), (2) v1 vs v2(데이터 변경에 따른 시간축 버전 비교, 11절). 아래 그림들의 캡처는 모두 같은 MLflow UI를 띄운 상태에서 진행한다.", {}));
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
C(P("MLOps의 핵심은 ‘한 번 만든 모델을 고정’하는 것이 아니라, 환경 변화에 따라 모델을 다시 학습하고 더 나은 버전으로 교체하거나, 문제가 생기면 되돌리는 사이클을 운영하는 것이다. 본 절에서는 ‘왜 재학습했는가 → 무엇을 바꿨는가 → 전후 성능이 어떻게 달라졌는가 → 어떻게 반영했는가’를 v1→v2 사례로 구체적으로 보인다.", {}));
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
C(P("모델 교체 결과 및 해석: 신규 변형을 추가한 v2로 재학습한 결과, 가벼운 모델인 NB의 macro-F1이 0.9798→0.9899로 향상되어 새 패턴에 대한 일반화가 개선됨을 확인했다. LogReg는 두 버전 모두 최상위(1.0000)를 유지해 우승 모델 자리를 지켰고, 이 v2 우승 모델을 models/attack_clf.pkl로 갱신·커밋하여 배포에 반영했다. 데이터만 바꾸고 모델 구조·피처는 고정했기 때문에, 성능 변화의 원인을 ‘데이터 변경’으로 명확히 귀속할 수 있다(통제된 비교). 만약 v2가 회귀했다면 13절의 절차로 v1으로 롤백했을 것이다.", {}));
C(score("재학습/개선 (MLflow 15, 추가점수 10)"));

// ════════════ 12. 운영 로그 및 문제 대응 ════════════
C(H1("12. 운영 로그 및 문제 대응"));
C(P("운영 상태를 사후에 추적할 수 있도록, 애플리케이션은 RotatingFileHandler 기반 로깅 체계를 갖추고 있다(app/logger.py). 평상시에는 기동·요청·에러를 기록하고, ML 미들웨어가 악성 요청을 탐지하면 별도의 보안 경보를 남긴다. 이를 통해 ‘요청 → 모델 예측(탐지) → 로그/대시보드 반영’이라는 운영 흐름을 로그와 화면 양쪽에서 확인할 수 있다.", {}));
C(bullet("서비스 로그: logs/secpipeline.log (RotatingFileHandler, 1MB×3 롤오버). 앱 기동/요청/에러를 기록."));
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
C(P("일부러 발생시킨 문제 + 실제 겪은 문제(원인·해결):", { bold: true }));
C(P("(가) 의도적 공격 주입 — 정상 서비스에 SQLi/XSS/경로순회 페이로드를 직접 요청해 탐지가 동작하는지 검증했다. 결과적으로 세 유형 모두 즉시 탐지되어 경보 로그(라벨·신뢰도 포함)와 대시보드 집계에 반영됐다(위 그림). 이는 모델이 실제 운영 경로에서 작동함을 보여준다.", {}));
C(P("(나) 실제 장애 — MLflow 3.13으로 학습 시 ‘파일 백엔드(mlruns/)가 maintenance mode로 차단됨’ 예외(MlflowException)로 학습이 중단됐다. 원인은 MLflow 3.x가 파일 스토어를 기본 비활성화했기 때문이다. 해결은 train.py에서 mlflow를 import하기 전에 환경변수 MLFLOW_ALLOW_FILE_STORE=true를 설정하여 로컬 파일 백엔드를 유지하도록 한 것이다. 이 경험은 의존성 버전 변화가 파이프라인을 깨뜨릴 수 있음을 보여주며, 이후 의존성 버전 핀(3절)의 동기가 되었다.", {}));
C(score("배포·운영(5), 추가점수(운영 로그 분석)"));

// ════════════ 13. 롤백 및 이전 모델 관리 ════════════
C(H1("13. 롤백 및 이전 모델 관리"));
C(P("새 모델이 항상 더 좋다는 보장은 없으므로, 운영에서는 ‘이전 모델로 즉시 되돌릴 수 있는 능력’이 중요하다. 본 프로젝트는 모델 파일을 Git으로 추적하고 CI artifact로도 보관하므로, 모델 교체를 ‘파일을 바꾼 커밋을 배포’하는 일로 단순화했고, 롤백 역시 ‘이전 커밋의 모델 파일로 되돌려 재배포’하는 일로 일관되게 처리된다.", {}));
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
C(P("개발·운영 과정에서 실제로 부딪힌 문제와 해결을 정리한다. 모두 단순 버그가 아니라 ‘파이프라인을 견고하게 만드는 설계 결정’으로 이어진 사례다.", {}));
C(P("① MLflow 파일스토어 차단(12절 상세): MLflow 3.x가 파일 백엔드를 막아 학습이 중단됨 → import 전 MLFLOW_ALLOW_FILE_STORE=true 설정으로 로컬 mlruns/ 유지. 의존성 메이저 변화가 파이프라인을 깨뜨릴 수 있음을 학습.", {}));
C(P("② 학습/추론 전처리 불일치(training-serving skew) 위험: 학습 때와 실시간 탐지 때 요청을 다르게 전처리하면 정확도가 무너진다. 이를 막기 위해 정규화 로직을 app/ml/data.py의 normalize_request 단일 함수로 두고, 학습(train.py)과 미들웨어(detector.py)가 같은 함수를 공유하도록 설계했다.", {}));
C(P("③ 의존성 재현성: CI가 실행 시점의 최신 패키지를 설치하면 내가 검증한 버전과 달라져, 특히 scikit-learn 버전 차이로 모델 pickle 로딩이 깨질 수 있다. requirements.txt를 정확한 버전으로 핀(scikit-learn==1.9.0 등)하여 로컬·CI·배포가 동일하게 재현되도록 했다.", {}));
C(P("④ MLflow UI 빈 화면: --backend-store-uri file:./mlruns(상대경로)로는 실험이 보이지 않는 문제가 있었다. 절대경로 file://$(pwd)/mlruns로 실행해야 정상 표시됨을 확인하고 문서·명령을 그에 맞게 정리했다.", {}));
C(P("⑤ 포트 충돌: macOS의 AirPlay가 5000번 포트를 점유해 Docker 컨테이너 실행이 실패했다. 호스트 포트를 5055로 바꿔(-p 5055:5000) 해결했다(환경 의존적 문제의 전형).", {}));
C(score("추가점수(애플리케이션 복잡도·문제해결)"));

// ════════════ 16. 느낀 점 ════════════
C(H1("16. 느낀 점 및 개선 방향"));
C(P("MLOps 관점에서 배운 점: 이번 과제를 통해 ‘좋은 모델을 만드는 것’과 ‘모델을 운영 가능하게 만드는 것’이 별개의 역량임을 체감했다. 실제로 가장 어려운 부분은 모델 알고리즘이 아니라, 데이터→학습→품질 게이트→배포→재학습→롤백이 끊김 없이 자동으로 이어지도록 파이프라인을 설계하고, 학습-서빙 일치·재현성·버전 관리 같은 ‘운영의 함정’을 막는 일이었다. 기존 DevSecOps(보안 게이트) 사고방식을 모델 품질 게이트에 그대로 적용할 수 있었던 점이 특히 인상적이었다.", {}));
C(P("개선하고 싶은 부분: ① 합성 데이터의 한계를 넘어 실제 트래픽·공격 로그로 재학습하고 임계값·오탐률을 튜닝, ② MLflow Model Registry를 도입해 모델 stage(Staging/Production) 전환으로 반영·롤백을 더 체계화, ③ 탐지 지표(탐지율·오탐율)를 운영 대시보드에서 지속 모니터링, ④ 데이터/모델 드리프트 감지를 추가해 재학습 트리거를 자동화하는 것이다.", {}));
C(P("수업 피드백: (자유 작성)", { color: "808080" }));

// ════════════ 17. 보충: 최종 배포 메커니즘 및 검증 ════════════
C(H1("17. 보충: 최종 배포 메커니즘 및 파이프라인 검증 결과"));
C(P("본 절은 보고서 작성 이후 수행한 최종 통합·배포·검증 작업을 정리한다. feature 브랜치의 모든 변경을 Pull Request로 main에 병합하였고, main push로 트리거된 GitHub Actions에서 보안 5-Gate(secret-scan·dependency-scan·sast·dockerfile-lint)·unit-test·ml-train·build-and-scan에 이어 deploy·dast까지 전(全) 잡이 성공(초록)함을 확인하였다. 즉 코드 또는 모델 변경이 자동 학습→품질 게이트→빌드→배포→동적 점검(DAST)으로 끊김 없이 이어지는 전체 MLOps 흐름이 실제로 동작함을 종단 검증하였다.", {}));
C(P("배포 메커니즘: 배포는 Render의 GitHub 연동 자동배포가 주(主) 경로다. main에 push되면 Render가 저장소 변경을 감지해 새 이미지를 빌드·배포한다. CI의 deploy 잡은 보조 트리거로 Render Deploy Hook을 호출하지만, 훅이 없거나 실패해도 자동배포가 동작하므로 파이프라인을 실패시키지 않도록 가드(--max-time 30, 실패 무시)를 두었다.", {}));
C(P("겪은 문제와 해결: 초기 main 배포 시 deploy 잡이 실패(빨간불)했는데, 원인은 RENDER_DEPLOY_HOOK 시크릿 값이 올바른 URL이 아니어서 curl이 타임아웃된 것이었다. 실제 배포는 GitHub 자동배포가 담당함을 확인하고 deploy 스텝을 위와 같이 견고화하여 전 잡을 초록으로 만들었다(외부 웹훅 실패가 파이프라인을 막지 않도록 한 운영 개선).", {}));
C(P("라이브 검증: 배포된 서비스(https://secpipeline.onrender.com)에서 /health가 200을 반환하고, 로그인 후 악성 요청(XSS·경로순회)을 보내자 대시보드 ‘보안 이벤트’ 위젯의 누적 탐지가 증가하여 배포된 ML 모델이 운영 환경에서 실제 탐지·집계함을 확인했다.", {}));
C(...fig({
  caption: "main 병합 후 전체 파이프라인 종단 성공(deploy·dast 포함 전 잡 초록)",
  cmd: ["브라우저에서 " + REPO + "/actions → 최근 main push 실행 클릭"],
  where: "main push로 트리거된 Actions 실행의 잡 그래프",
  shot: "secret~build에 이어 deploy·dast까지 모두 초록 체크인 잡 그래프 전체",
  why: "코드/모델 변경이 배포·동적점검까지 자동으로 이어지는 종단 흐름이 실제로 성공함을 증빙",
  score: "MLOps 파이프라인 완성도(35), 배포 및 운영(5), 추가점수",
}));
C(score("MLOps 파이프라인 완성도(35), 배포 및 운영(5), 추가점수(파이프라인 확장·문제해결)"));

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

// 기말 보고서 docx 생성 (report-template.docx 양식 15섹션 준수)
// 실행: node scripts/build_report.js  → docs/final-report.docx
const fs = require("fs");
const path = require("path");
const M = "/usr/local/lib/node_modules/docx";
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  AlignmentType, LevelFormat, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, Header, Footer, PageBreak, TableOfContents,
} = require(M);

const ROOT = path.join(__dirname, "..");
const REPO = "https://github.com/de1ayyy/SecPipeline";
const PR = REPO + "/pull/5";

// ── 헬퍼 ──────────────────────────────────────────────
const FONT = "맑은 고딕";
function P(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, line: 276 },
    alignment: opts.align,
    pageBreakBefore: opts.pageBreakBefore,
    children: [new TextRun({ text, bold: opts.bold, italics: opts.italics, size: opts.size ?? 22, color: opts.color, font: FONT })],
  });
}
function H1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, size: 30, font: FONT, color: "1F3864" })] });
}
function H2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 25, font: FONT, color: "2E5496" })] });
}
function bullet(text, level = 0) {
  return new Paragraph({ numbering: { reference: "b", level }, spacing: { after: 60, line: 268 },
    children: [new TextRun({ text, size: 22, font: FONT })] });
}
// 배점 충족 표시 (강조 박스 느낌)
function score(text) {
  return new Paragraph({
    spacing: { before: 60, after: 140 },
    shading: { fill: "EAF1FB", type: ShadingType.CLEAR },
    children: [new TextRun({ text: "▶ 충족 배점: " + text, bold: true, italics: true, size: 20, font: FONT, color: "1F3864" })],
  });
}
function cap(text) {
  return new Paragraph({
    spacing: { before: 80, after: 160 },
    alignment: AlignmentType.CENTER,
    shading: { fill: "FFF3CD", type: ShadingType.CLEAR },
    children: [new TextRun({ text: "🖼 " + text + "  ← 여기에 캡쳐 삽입", bold: true, size: 20, font: FONT, color: "7A5600" })],
  });
}
const BD = { style: BorderStyle.SINGLE, size: 1, color: "AAB4C4" };
const BORDERS = { top: BD, left: BD, bottom: BD, right: BD };
function cell(text, w, opts = {}) {
  return new TableCell({
    borders: BORDERS, width: { size: w, type: WidthType.DXA },
    shading: opts.head ? { fill: "2E5496", type: ShadingType.CLEAR } : (opts.fill ? { fill: opts.fill, type: ShadingType.CLEAR } : undefined),
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ alignment: opts.align, children: [new TextRun({ text, bold: opts.head || opts.bold, color: opts.head ? "FFFFFF" : undefined, size: 20, font: FONT })] })],
  });
}
function table(widths, rows) {
  return new Table({
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    columnWidths: widths,
    rows: rows.map((r, i) => new TableRow({
      tableHeader: i === 0,
      children: r.map((c, j) => {
        const obj = (c !== null && typeof c === "object");
        return cell(obj ? c.t : c, widths[j], { head: i === 0, fill: obj ? c.fill : undefined, bold: obj ? c.bold : false, align: obj ? c.align : undefined });
      }),
    })),
  });
}

// 실제 데이터
const metrics = JSON.parse(fs.readFileSync(path.join(ROOT, "models", "metrics.json"), "utf8"));
const commits = [
  ["Step 1", "SPEC·의존성·ML 패키지 골격"], ["Step 2", "합성 공격/정상 데이터 생성기"],
  ["Step 3", "데이터 로더 + 공유 정규화"], ["Step 4", "학습 + MLflow 로깅(핵심)"],
  ["Step 5", "탐지기 + before_request + 대시보드"], ["Step 6", "탐지기 테스트(15 pass)"],
  ["Step 7", "model-eval 품질 게이트"], ["Step 8", "CI MLSecOps 통합"],
  ["Step 9", "Dockerfile 모델 COPY"], ["Step 10", "재학습 v2 + 버전비교 + 롤백"],
  ["Step 11", "README 운영 문서화"], ["pin", "ML 의존성 버전 핀(재현성)"],
];

const children = [];

// ── 표지 ──
children.push(new Paragraph({ spacing: { before: 1200, after: 200 }, alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "프로젝트 보고서 - 기말", bold: true, size: 44, font: FONT, color: "1F3864" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 },
  children: [new TextRun({ text: "SecPipeline : DevSecOps → MLSecOps 통합", size: 28, font: FONT, color: "2E5496" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 },
  children: [new TextRun({ text: "보안 ML(악성 HTTP 요청 탐지) + MLflow 기반 MLOps 파이프라인", size: 22, font: FONT })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 600, after: 80 },
  children: [new TextRun({ text: "날짜: 2026-06-__   |   학번: ____________   |   이름: ____________", size: 22, font: FONT, color: "C00000" })] }));
children.push(new Paragraph({ alignment: AlignmentType.CENTER,
  children: [new TextRun({ text: "(표지의 학번·이름·날짜는 제출 전 본인 정보로 교체)", size: 18, italics: true, font: FONT, color: "808080" })] }));
children.push(new Paragraph({ children: [new PageBreak()] }));

// ── 안내(채점자/본인용 범례) ──
children.push(H1("[작성 안내 — 제출 전 삭제 가능]"));
children.push(P("본 보고서는 report-template.docx의 15개 섹션을 그대로 따른다. 가독성을 위해 두 가지 표식을 사용한다:", {}));
children.push(P("• 🖼 노란 점선 박스 = 본인이 직접 캡쳐를 찍어 넣어야 하는 자리(스크린샷).", { color: "7A5600" }));
children.push(P("• ▶ 파란 박스 = 해당 내용이 충족하는 교수님 평가 배점 항목.", { color: "1F3864" }));
children.push(P("캡쳐 목록(우선순위)은 마지막 부록에 체크리스트로 정리했다.", {}));

// ── 1. 프로젝트 개요 ──
children.push(H1("1. 프로젝트 개요"));
children.push(bullet("프로젝트 이름: SecPipeline (DevSecOps + MLSecOps 통합)"));
children.push(bullet("프로젝트 목적: 중간 프로젝트의 Flask 학습기록 앱 + DevSecOps 5-Gate 보안 파이프라인 위에, 보안 목적의 ML 기능(악성 HTTP 요청 탐지)과 MLflow 기반 MLOps(실험관리·버전관리·재학습·배포·운영)를 통합한다. 단순 모델 학습이 아니라 Git→CI/CD→Docker→MLflow→Deploy 전 과정을 자동으로 연결하는 것이 목표다."));
children.push(bullet("GitHub 주소(public): " + REPO + "   (Pull Request: " + PR + ")"));
children.push(bullet("배포 주소: https://secpipeline.onrender.com"));
children.push(bullet("MLflow Tracking 화면: 로컬 파일 백엔드(mlruns/) — `mlflow ui --backend-store-uri file:./mlruns` 실행 시 http://localhost:5000"));
children.push(cap("[캡쳐 ①] Render 배포된 서비스 메인/대시보드 화면 (배포 주소가 보이도록)"));
children.push(cap("[캡쳐 ②] MLflow UI 실험 목록 화면 (http://localhost:5000, 주소창 포함)"));
children.push(score("배포·운영(5), MLOps 파이프라인 완성도(35) 일부"));

// ── 2. 소프트웨어 주요 기능 ──
children.push(H1("2. 소프트웨어 주요 기능"));
children.push(H2("1) 사용자 핵심 기능 (서비스)"));
children.push(bullet("회원가입/로그인(세션 기반)"));
children.push(bullet("학습기록 CRUD: 제목·내용·학습시간·과목으로 기록 생성/조회/수정/삭제"));
children.push(bullet("과목 관리, 검색, 내보내기(export)"));
children.push(bullet("대시보드: 총 기록/학습시간/주간추이/과목분포 + 보안 이벤트 위젯"));
children.push(H2("2) ML 모델이 사용되는 위치"));
children.push(bullet("Flask @before_request 미들웨어: 모든 HTTP 요청이 라우트에 닿기 전에 ML 모델로 악성 여부를 스코어링한다(app/__init__.py)."));
children.push(bullet("기본 shadow 모드는 탐지·로깅만 하고, DETECTOR_MODE=enforce면 악성 요청을 403으로 차단한다."));
children.push(bullet("탐지 결과는 운영 로그(logs/secpipeline.log)와 대시보드 '보안 이벤트' 위젯에 반영된다."));
children.push(H2("3) 입력 데이터와 출력 결과"));
children.push(bullet("입력: HTTP 요청의 method + path + query + body 를 하나의 문자열로 정규화(URL 디코드, 소문자화)"));
children.push(bullet("출력: 라벨(benign / sqli / xss / path_traversal / cmdi) + 신뢰도(0~1)"));
children.push(P("→ 서비스(학습기록 앱)와 ML 기능(요청 보안 분류)은 책임이 분리되어 있으며, 미들웨어 한 지점에서 안전하게 결합된다.", {}));
children.push(score("애플리케이션 및 ML 기능 구성(10)"));

// ── 3. 실행 환경 ──
children.push(H1("3. 실행 환경"));
children.push(table([2600, 6760], [
  [{ t: "구분" }, { t: "내용" }],
  ["개발/실행 OS", "macOS (Darwin) / 컨테이너는 Linux(python:3.12-slim). 배포는 Render Linux"],
  ["Python", "3.12"],
  ["Git/GitHub", REPO + " (public), feature 브랜치 + Pull Request 기반"],
  ["Docker", "python:3.12-slim 베이스, 비특권 appuser, HEALTHCHECK, gunicorn 실행"],
  ["MLflow", "3.13.0, 로컬 파일 백엔드(mlruns/)"],
  ["주요 라이브러리", "scikit-learn 1.9.0, pandas 2.3.3, matplotlib 3.10.9, joblib 1.5.3 (전부 버전 핀)"],
  ["배포 환경", "Render (GitHub Actions deploy 잡이 Deploy Hook 호출)"],
]));
children.push(score("Docker 및 실행 환경 구성(5) — 버전 핀으로 재현성 확보"));

// ── 4. 전체 MLOps 파이프라인 구조 ──
children.push(H1("4. 전체 MLOps 파이프라인 구조"));
children.push(P("기존 DevSecOps 5-Gate는 그대로 두고, ML 단계(MLSecOps)를 추가해 한 파이프라인으로 통합했다.", {}));
children.push(P("[ASCII 구조도]", { bold: true }));
[
  "코드 변경 흐름:  git commit → push/PR → GitHub Actions 트리거",
  "모델 학습 흐름:  seed_attacks(데이터) → train(MLflow 로깅) → eval_gate(macro-F1≥0.80)",
  "모델 등록/반영:  우승 모델 models/attack_clf.pkl 저장 → Docker 이미지에 COPY",
  "서비스 운영 흐름: before_request 탐지 → 로그/대시보드 → (enforce 시 403 차단)",
  "",
  "[CI 잡 그래프]",
  "secret-scan·dependency-scan·sast·unit-test·ml-train",
  "        └─(모두 통과)→ build-and-scan(모델 포함) → deploy(Render) → dast(ZAP)",
].forEach((l) => children.push(new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: l, font: "Consolas", size: 18 })] })));
children.push(cap("[캡쳐 ③] GitHub Actions 워크플로 잡 그래프 (5-Gate + ml-train + build → deploy → dast)"));
children.push(score("MLOps 파이프라인 완성도(35) — 전 흐름 연결"));

// ── 5. Git 기반 개발 과정 ──
children.push(H1("5. Git 기반 개발 과정"));
children.push(bullet("개발 흐름: SPEC.md에 11단계 계획을 먼저 수립하고, 단계별로 구현→로컬 검증→커밋을 반복했다."));
children.push(bullet("커밋 전략: 한 커밋 = 한 단계(원자적). 메시지는 type(scope): 요약 + 본문(변경/검증) 규칙(Conventional Commits)."));
children.push(bullet("브랜치: main 보호, 작업은 feature/mlops-security 브랜치에서 진행 후 Pull Request(" + PR + ")로 병합."));
children.push(P("실제 커밋 이력(12건):", { bold: true }));
children.push(table([1600, 7760], [[{ t: "단계" }, { t: "내용" }], ...commits.map((c) => [c[0], c[1]])]));
children.push(cap("[캡쳐 ④] GitHub 커밋 목록 또는 PR " + "#5 화면 (지속적 커밋 이력이 보이도록)"));
children.push(score("Git 이력 및 개발 과정(10)"));

// ── 6. CI/CD 구성 ──
children.push(H1("6. CI/CD 구성"));
children.push(bullet("GitHub Actions(.github/workflows/devsecops.yml): push/PR 시 자동 실행, 수동 재학습용 workflow_dispatch 포함."));
children.push(bullet("기존 5-Gate(보안): Gitleaks(시크릿)·pip-audit(의존성)·Semgrep+Bandit(SAST)·Trivy(컨테이너)·Hadolint(Dockerfile lint) + pytest 단위테스트."));
children.push(bullet("추가된 ml-train 잡: 데이터 생성 → 학습(MLflow) → 품질 게이트(eval_gate) → 모델/메트릭/mlruns artifact 업로드."));
children.push(bullet("build-and-scan: ml-train을 needs로 받아 게이트 통과 모델을 내려받아 이미지에 포함 → deploy(Render) → DAST(ZAP)."));
children.push(bullet("PR 단계에서는 deploy/dast가 skip되어 CI가 깨지지 않고, main push에서만 배포가 동작한다."));
children.push(cap("[캡쳐 ⑤] Actions 실행 결과 — 모든 잡 초록(통과) 화면. 특히 ml-train 잡 로그(macro-F1, gate PASS)"));
children.push(score("자동화 수준(10), MLOps 파이프라인 완성도(35)"));

// ── 7. Docker 기반 환경 구성 ──
children.push(H1("7. Docker 기반 환경 구성"));
children.push(bullet("베이스: python:3.12-slim. WORKDIR /app, requirements 설치(--no-cache-dir)."));
children.push(bullet("보안 하드닝: 비특권 사용자 appuser로 실행(CWE-250 방어), HEALTHCHECK로 /health 모니터링."));
children.push(bullet("ML 연동: 학습된 models/attack_clf.pkl을 이미지에 COPY, MODEL_PATH·DETECTOR_MODE 환경변수 설정."));
children.push(bullet("실행: docker build -t studylog . 후 docker run -p 5000:5000 studylog. 차단 모드는 -e DETECTOR_MODE=enforce."));
children.push(cap("[캡쳐 ⑥] docker build 성공 + docker run 후 컨테이너 로그의 SECURITY ALERT 라인"));
children.push(score("Docker 및 실행 환경 구성(5)"));

// ── 8. ML 모델 구성 ──
children.push(H1("8. ML 모델 구성"));
children.push(bullet("사용 데이터: 합성 HTTP 요청 데이터(scripts/seed_attacks.py). 정상 + 4개 공격 카테고리를 균형(카테고리당 200건, 총 1000건)으로 생성."));
children.push(bullet("모델 종류: TF-IDF(char n-gram) + ① LogisticRegression, ② MultinomialNB 두 가지를 학습해 비교."));
children.push(bullet("학습 코드: app/ml/train.py — 두 모델을 각각 MLflow run으로 기록하고, macro-F1 기준 우승 모델을 attack_clf.pkl로 export."));
children.push(bullet("평가 지표: 주지표 macro-F1, 보조 accuracy, 카테고리별 F1."));
children.push(P("초기(v1) vs 신규(v2) 및 모델 간 비교:", { bold: true }));
children.push(table([2400, 2400, 2280, 2280], [
  [{ t: "버전" }, { t: "모델" }, { t: "macro-F1" }, { t: "accuracy" }],
  ["v1", "LogReg", "1.0000", "1.00"],
  ["v1", "NB", "0.9798", "0.98"],
  ["v2", "LogReg", "1.0000", "1.00"],
  [{ t: "v2", bold: true }, { t: "NB", bold: true }, { t: "0.9899", bold: true }, { t: "0.99", bold: true }],
]));
children.push(P("→ 우승 모델: LogReg (현재 배포 버전 " + metrics.data_version + ", macro-F1 " + metrics.macro_f1 + "). v2에서 NB가 0.98→0.99로 개선됨.", { italics: true }));
children.push(P("※ 한계(정직): 합성 데이터라 분리도가 높아 macro-F1이 매우 높게 나온다. 본 과제의 핵심은 탐지 성능 자체가 아니라 MLOps 흐름 자동화의 시연이다.", { color: "C00000", size: 20 }));
children.push(cap("[캡쳐 ⑦] 혼동행렬(confusion matrix) 이미지 — MLflow artifact 또는 mlruns의 cm_*.png"));
children.push(score("애플리케이션 및 ML 기능 구성(10), MLflow 활용(15) 일부"));

// ── 8(중복번호). MLflow 기반 실험 관리 ──
children.push(H1("9. MLflow 기반 실험 관리"));
children.push(bullet("MLflow Tracking 사용: 로컬 파일 백엔드(mlruns/). 실험명 secpipeline-attack-detection."));
children.push(bullet("기록 항목 — parameter: model_type, analyzer(char_wb), ngram_range, max_features, n_train/n_test."));
children.push(bullet("기록 항목 — metric: macro_f1, accuracy, 카테고리별 f1_*."));
children.push(bullet("기록 항목 — artifact: 혼동행렬 PNG, classification_report.txt, 모델 .pkl."));
children.push(bullet("기록 항목 — tag: data_version(v1/v2), model_type (시간축 버전 비교용)."));
children.push(bullet("우승 모델 선정 기준: 테스트셋 macro-F1 최댓값. (scripts/compare_versions.py로 v1 vs v2를 표로 비교)"));
children.push(cap("[캡쳐 ⑧] MLflow UI에서 run 2개(LogReg vs NB) metric 비교 화면"));
children.push(cap("[캡쳐 ⑨] MLflow UI에서 v1 vs v2 비교 또는 compare_versions.py 출력"));
children.push(score("MLflow 활용 및 모델 관리(15)"));

// ── 9(번호). 모델 등록 및 서비스 반영 ──
children.push(H1("10. 모델 등록 및 서비스 반영"));
children.push(bullet("모델 저장 방식: 우승 모델을 joblib로 models/attack_clf.pkl 저장 + models/metrics.json 요약."));
children.push(bullet("서비스 로딩 방식: 앱 기동 시 detector.load_model()이 1회 로드(싱글톤). 모델이 없으면 graceful fallback(탐지 비활성, 앱은 정상)."));
children.push(bullet("신규 모델 반영: 재학습 결과로 갱신된 .pkl을 커밋·푸시 → CI가 이미지를 빌드해 Render로 배포 → 운영 반영."));
children.push(bullet("자동/수동 선택: 정기 push는 v1 자동 학습, 모델 교체가 필요한 재학습은 workflow_dispatch 수동 트리거를 사용. 모델 교체는 영향이 크므로 사람이 비교·승인 후 반영하도록 수동을 택했다."));
children.push(score("MLOps 파이프라인 완성도(35) 일부, 추가점수(모델 자동/수동 반영)"));

// ── 10. 재학습/개선 과정 ──
children.push(H1("11. 재학습 또는 모델 개선 과정"));
children.push(bullet("재학습 이유: 신규 공격 변형(예: 인코딩 회피, 추가 cmdi 페이로드)에 대응하기 위해."));
children.push(bullet("무엇이 바뀌었나: 데이터(seed_attacks --version v2가 신규 변형 추가) + 실험 tag. 모델 구조/피처는 동일하게 두고 데이터를 변경."));
children.push(bullet("재학습 전후 성능: NB macro-F1 0.9798(v1) → 0.9899(v2)로 개선. LogReg는 1.0 유지."));
children.push(bullet("모델 교체 결과: v2 우승(LogReg)을 배포 모델로 반영."));
children.push(cap("[캡쳐 ⑩] workflow_dispatch 수동 재학습 실행 화면 (Run workflow, data_version=v2)"));
children.push(score("MLflow 활용(15)·재학습 반영, 추가점수(재학습)"));

// ── 11. 운영 로그 및 문제 대응 ──
children.push(H1("12. 운영 로그 및 문제 대응"));
children.push(bullet("서비스 로그: logs/secpipeline.log (RotatingFileHandler). 앱 기동/요청/에러 기록."));
children.push(bullet("예측(탐지) 요청 로그: 악성 판정 시 'SECURITY ALERT [라벨] conf=… mode=… METHOD path from=IP' 형태로 기록."));
children.push(bullet("모델 정보 확인: models/metrics.json(버전·우승모델·지표), 대시보드 '보안 이벤트' 위젯(누적/카테고리/최근)."));
children.push(P("일부러 발생시킨 문제 1 (실제 경험): MLflow 3.13에서 파일 백엔드가 기본 차단되어 학습이 예외로 중단됨.", { bold: true }));
children.push(bullet("원인: MLflow 3.x가 file store를 maintenance mode로 막고 MlflowException을 던짐.", 1));
children.push(bullet("해결: train.py에서 import 전에 MLFLOW_ALLOW_FILE_STORE=true 설정해 로컬 mlruns/ 유지.", 1));
children.push(P("문제 2 (시연용): 정상 요청에 SQLi 페이로드를 넣어 탐지 동작 확인.", { bold: true }));
children.push(bullet("입력 예: /search?q=' OR 1=1--  → 탐지 라벨 sqli(conf≈0.88), 로그 경보 + 대시보드 집계.", 1));
children.push(cap("[캡쳐 ⑪] logs/secpipeline.log의 SECURITY ALERT 로그 + 대시보드 보안 이벤트 위젯"));
children.push(score("배포·운영(5), 추가점수(운영 로그 분석)"));

// ── 12. 롤백 및 이전 모델 관리 ──
children.push(H1("13. 롤백 및 이전 모델 관리"));
children.push(bullet("이전 모델 보관: Git 이력에 모델 파일이 버전별로 남음(Step 4 커밋=v1 최초). CI는 ml-model artifact로도 모델 보관."));
children.push(bullet("되돌리는 방법: git checkout <v1-커밋> -- models/attack_clf.pkl models/metrics.json → 커밋·푸시 → CI 재배포(docs/rollback.md)."));
children.push(bullet("버전 관리 화면/코드: MLflow의 data_version 태그 + scripts/compare_versions.py 출력으로 버전 비교."));
children.push(bullet("즉시 완화: 모델 교체 없이 DETECTOR_MODE를 shadow/enforce로 전환하는 운영 스위치도 제공."));
children.push(cap("[캡쳐 ⑫] docs/rollback.md 또는 compare_versions.py 출력(버전 이력) 화면 (선택)"));
children.push(score("추가점수(모델 롤백 기능)"));

// ── 13. 전체 파이프라인 동작 흐름 ──
children.push(H1("14. 전체 파이프라인 동작 흐름"));
children.push(bullet("코드 수정 → 서비스 반영: 코드 commit→push→Actions(5-Gate+ml-train)→build→deploy(Render)→운영."));
children.push(bullet("데이터 변경 → 재학습: seed_attacks --version v2(또는 workflow_dispatch)→train(MLflow)→eval_gate→artifact."));
children.push(bullet("모델 변경 → 운영 반영: 우승 .pkl 커밋→이미지 COPY→배포→before_request가 새 모델로 탐지."));
children.push(score("MLOps 파이프라인 완성도(35)"));

// ── 14. 문제 해결 경험 ──
children.push(H1("15. 문제 해결 경험"));
children.push(P("① MLflow 파일스토어 차단(위 12절) — 플래그 설정으로 해결.", {}));
children.push(P("② 학습/추론 전처리 불일치 위험 — normalize_request를 app/ml/data.py 단일 함수로 두고 학습과 미들웨어가 공유하도록 설계해 분포 어긋남을 방지.", {}));
children.push(P("③ 의존성 재현성 — CI가 매번 최신 버전을 설치해 검증 버전과 달라질 위험 → requirements를 정확 버전으로 핀(특히 모델 pickle 호환을 위해 scikit-learn 고정).", {}));
children.push(score("추가점수(애플리케이션 복잡도·문제해결)"));

// ── 15. 느낀 점 ──
children.push(H1("16. 느낀 점 및 개선 방향"));
children.push(bullet("MLOps 관점: 모델 성능보다 '데이터→학습→게이트→배포→재학습→롤백'이 자동으로 이어지는 운영 사이클 설계가 핵심임을 체감."));
children.push(bullet("개선하고 싶은 부분: 합성 데이터 대신 실제 트래픽/공격 로그로 재학습, MLflow Model Registry 도입, 임계값·오탐률 튜닝, 탐지 지표의 운영 모니터링."));
children.push(bullet("수업 피드백: (자유 작성)"));

// ── 참고 자료 ──
children.push(H1("참고 자료"));
children.push(bullet("Fu et al. (2024), \"AI for DevSecOps\" — 파이프라인 5단계 프레임워크 근거"));
children.push(bullet("MLflow Documentation — https://mlflow.org/docs/latest/"));
children.push(bullet("scikit-learn Documentation — https://scikit-learn.org/stable/"));
children.push(bullet("프로젝트 저장소 — " + REPO));

// ── 부록: 캡쳐 체크리스트 ──
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("부록 A. 캡쳐 체크리스트 (본인이 찍어 넣을 것)"));
const caps = [
  ["①", "Render 배포 서비스 화면(주소 포함)", "배포·운영(5)"],
  ["②", "MLflow UI 실험 목록(주소창 포함)", "MLflow(15)"],
  ["③", "Actions 워크플로 잡 그래프", "파이프라인(35)"],
  ["④", "GitHub 커밋 목록 / PR #5", "Git 이력(10)"],
  ["⑤", "Actions 전체 초록 + ml-train 로그(gate PASS)", "자동화(10)·파이프라인(35)"],
  ["⑥", "docker build 성공 + 컨테이너 SECURITY ALERT 로그", "Docker(5)"],
  ["⑦", "혼동행렬 이미지(cm_*.png)", "ML 구성(10)"],
  ["⑧", "MLflow run 2개(LogReg vs NB) 비교", "MLflow(15)"],
  ["⑨", "v1 vs v2 비교(UI 또는 compare_versions.py)", "MLflow(15)"],
  ["⑩", "workflow_dispatch 수동 재학습 실행", "추가점수(재학습)"],
  ["⑪", "보안 경보 로그 + 대시보드 보안 위젯", "운영(5)·추가점수"],
  ["⑫", "rollback.md / 버전 이력(선택)", "추가점수(롤백)"],
];
children.push(table([1000, 5360, 3000], [[{ t: "번호" }, { t: "캡쳐 내용" }, { t: "관련 배점" }], ...caps]));
children.push(P("팁: ②⑧⑨는 `mlflow ui --backend-store-uri file:./mlruns` 실행 후 http://localhost:5000 에서, ⑥은 `docker run -p 5000:5000 studylog` 후 공격 요청을 보내고 `docker logs`에서, ⑪은 로컬 앱 실행 후 /search?q=' OR 1=1-- 요청 뒤 /dashboard 에서 캡쳐.", { size: 20, italics: true }));

// ── 문서 생성 ──
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
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(path.join(ROOT, "docs", "final-report.docx"), buf);
  console.log("OK → docs/final-report.docx (" + buf.length + " bytes)");
});

# SecPipeline — 보안 ML(악성 요청 탐지) + MLflow MLOps 통합 계획 (SPEC)

## Context

중간 프로젝트 SecPipeline(Flask 학습기록 앱 + DevSecOps 5-Gate 파이프라인)에 기말 과제로
**보안 ML 기능 1개 + MLflow 기반 MLOps**(실험관리→버전관리→재학습→배포→운영)를 얹는다.

기존 프로젝트의 정체성이 **DevSecOps(보안 게이트)** 이므로, ML도 보안 목적으로 붙여
**MLSecOps / AI-for-DevSecOps** 로 확장한다(워크플로 주석에 인용된 *Fu et al. 2024 "AI for DevSecOps"* 와 동일 방향).
과목분류 같은 도메인 무관 ML은 폐기.

- **ML 기능:** **악성 HTTP 요청 탐지** — 들어오는 요청 문자열(method+path+query+body)을
  `benign / sqli / xss / path_traversal / cmdi` 등으로 분류.
- **실서비스 연결:** Flask `@app.before_request` 미들웨어가 매 요청을 모델로 스코어링 →
  의심 요청을 `app/logger.py`로 보안 경보 로깅 → 대시보드 "보안 이벤트" 위젯에 노출.
  (기본 **shadow 모드**: 탐지·로깅만. env로 **enforce 모드**(403 차단) 전환 가능.)
- **방향:** 기존 5-Gate 보안 잡은 **그대로 두고**, CI에 ML(MLSecOps) 단계만 추가.
- **배점 핵심:** 파이프라인 연결성(35) + MLflow(15) + 자동화(10) = 60점에 집중.
  모델 성능보다 **Git→CI/CD→Docker→MLflow→Deploy 전 흐름 자동 연결**이 최우선.

### 확정된 설계 결정 (사용자 인터뷰)
| 항목 | 결정 |
|---|---|
| ML 주제 | **악성 HTTP 요청 탐지** (보안 ML) |
| 학습 데이터 | 합성 시드 **균형 분포** (정상 + 공격 카테고리 SQLi/XSS/경로순회/명령주입, 카테고리당 ~동일 건수) |
| 모델 | **LogReg + MultinomialNB 둘 다 학습** → MLflow metric 비교 → 우승 모델 채택 |
| 피처/지표 | **TF-IDF (문자 n-gram, 페이로드 탐지에 강함)**, 주지표 **macro-F1**, 보조 accuracy |
| 합격 게이트 | **고정 기준치 macro-F1 ≥ 0.80** (우승 모델 기준) |
| MLflow | 로컬 파일 `mlruns/` tracking |
| 모델 배포 로딩 | 최종 모델 `.pkl`을 **Docker 이미지에 COPY** → 런타임 로드 |
| 재학습 트리거 | **workflow_dispatch (수동)** |
| 롤백 | **직전 artifact/커밋 재배포** |

### 기존 자산 (재사용)
- Service-layer 패턴: `app/services/stats.py` (라우트 얇게, 로직은 서비스로)
- 앱 팩토리: `app/__init__.py` (여기에 `@app.before_request` 보안 미들웨어 등록)
- 운영 로깅: `app/logger.py:setup_logger` (보안 경보를 `app.logger.warning`으로 기록 → `logs/secpipeline.log`)
- 설정 env 분리: `app/config.py` (`DATABASE_PATH` 패턴 → `MODEL_PATH`, `DETECTOR_MODE` 동일 적용)
- CI 잡 패턴: `.github/workflows/devsecops.yml` (checkout→setup-python→run→upload-artifact)
- 대시보드 연결: `app/routes/dashboard.py` (stats dict에 보안 위젯 추가)

---

## 구현 단계 (커밋 단위로 분할)

각 단계 = 독립 커밋 1개. 단계마다 **산출물 / 검증 / 보고서 후보**를 명시하고 배점에 매핑.

### Step 1 — SPEC + 의존성 + 보안 ML 패키지 골격  〔배점: Git이력 10〕
- **산출물:**
  - `SPEC.md` (이 계획 내용 그대로 커밋 — 개발 과정 문서화)
  - `requirements.txt`에 `scikit-learn`, `mlflow`, `pandas`, `joblib` 추가
  - `app/ml/__init__.py` + `app/ml/config.py` (`MODEL_PATH`, `MLFLOW_TRACKING_URI`,
    공격 라벨 상수 `LABELS = [benign, sqli, xss, path_traversal, cmdi]`, `DETECTOR_MODE` shadow/enforce)
  - `.gitignore`에 `mlruns/` 추가 — mlruns는 커밋 금지(artifact/이미지로 전달), 최종 `.pkl`만 `models/`
- **검증:** `pip install -r requirements.txt` 성공, `python -c "import sklearn, mlflow"` OK
- **보고서 후보:** 설계 결정 표, MLSecOps 아키텍처 개요, 의존성 diff
- **주의(보안 파이프라인 영향):** scikit-learn/mlflow 추가 → **Gate2 pip-audit / Gate4 Trivy** 가
  새 의존성 CVE 스캔. 현재 워크플로는 `|| true` 비차단이나, Step 1에서 로컬 `pip-audit -r requirements.txt`
  1회 실행해 알려진 고위험 CVE 없는 버전으로 핀 고정.

### Step 2 — 합성 공격/정상 요청 데이터 생성기  〔배점: 앱·ML구성 10, 추가점수(복잡도)〕
- **산출물:** `scripts/seed_attacks.py` — 정상 요청(앱 실제 경로 `/logs`,`/dashboard`,`/search` 등 + 평범한 파라미터)과
  공격 페이로드(SQLi `' OR 1=1--`, XSS `<script>`, 경로순회 `../../etc/passwd`, 명령주입 `; cat /etc/passwd`)를
  템플릿+조합으로 합성. 카테고리 균형, 라벨 포함 CSV(`data/requests.csv`)로 출력. 멱등 실행.
- **검증:** 실행 후 라벨별 건수 분포 출력 → 균형 확인, 샘플 몇 줄 육안 점검
- **보고서 후보:** 라벨별 분포 막대그래프, 공격 카테고리별 페이로드 예시 표

### Step 3 — 데이터 로더 + 피처화  〔배점: MLflow 15(준비)〕
- **산출물:** `app/ml/data.py` — `data/requests.csv` → `(X_text, y_label)`, train/test split,
  요청 정규화 함수(`normalize_request(method, path, query, body)` — 미들웨어와 학습이 **동일 전처리** 공유)
- **검증:** `python -c "from app.ml.data import load_dataset; ..."` shape/클래스 분포 출력
- **보고서 후보:** 데이터 파이프라인 흐름도, 전처리 규칙

### Step 4 — 학습 스크립트 + MLflow 로깅 (핵심)  〔배점: MLflow 15, 자동화 10〕
- **산출물:** `app/ml/train.py`
  - LogReg, MultinomialNB 각각 **TF-IDF(char n-gram) 파이프라인**으로 학습
  - run마다 MLflow에 **param**(모델종류, analyzer=char, ngram_range, max_features),
    **metric**(macro-F1, accuracy, 카테고리별 F1), **artifact**(혼동행렬, classification_report, 모델.pkl) 로깅
  - macro-F1 기준 **우승 모델 선정** → `models/attack_clf.pkl` export + `models/metrics.json` 저장
- **검증:** `python -m app.ml.train` → `mlflow ui`에서 2 run 비교, `metrics.json` 생성 확인
- **보고서 후보:** ⭐ MLflow UI run 비교(LogReg vs NB), 혼동행렬, 카테고리별 F1 표

### Step 5 — 탐지기 + before_request 미들웨어 (실서비스 연결)  〔배점: 앱·ML구성 10, 추가점수(운영로그)〕
- **산출물:**
  - `app/ml/detector.py` — `.pkl` 로드(앱 기동 1회), `classify_request(...) → (label, score)`
  - `app/__init__.py` — `@app.before_request` 등록: 요청 정규화→분류→공격이면 `app.logger.warning`으로
    보안 경보 로깅 + 메모리 카운터 집계. `DETECTOR_MODE=enforce`면 403 반환, 기본 shadow는 통과만.
  - `app/routes/dashboard.py` + `dashboard.html` — 최근 보안 이벤트/카테고리별 카운트 위젯
  - 모델 미존재 시 graceful fallback(탐지 비활성, 정상 동작), `MODEL_PATH`/`DETECTOR_MODE` env(config 패턴 재사용)
- **검증:** 로컬 `flask run` → 정상 페이지 정상 동작 + `/search?q=' OR 1=1--` 류 요청 시 로그에 경보,
  대시보드 위젯에 집계 노출. enforce 모드에서 403 확인.
- **보고서 후보:** ⭐ 공격 요청→경보 로그 스크린샷, 대시보드 보안 이벤트 위젯, shadow/enforce 동작

### Step 6 — 테스트 추가  〔배점: 자동화 10, 추가점수(테스트 강화)〕
- **산출물:** `tests/test_ml_detector.py` — 정규화 함수, classify 출력 형식/라벨 범위,
  대표 공격 페이로드 탐지(SQLi/XSS 등) 양성, 정상 요청 음성, 모델 없을 때 fallback.
  `tests/conftest.py` 픽스처 재사용.
- **검증:** `pytest tests/ -v` 전체 통과(기존 + 신규)
- **보고서 후보:** pytest 통과 출력(보안 ML 테스트 포함)

### Step 7 — model-eval(품질) 게이트 스크립트  〔배점: 파이프라인 35, 추가점수(파이프라인 확장)〕
- **산출물:** `scripts/eval_gate.py` — `models/metrics.json` 우승 macro-F1 < **0.80**이면 `exit 1`.
  임계값은 `app/ml/config.py` 상수. (고정 기준치 방식)
- **검증:** 정상 모델 → exit 0, 임계값 인위 상향 → exit 1 재현
- **보고서 후보:** 품질 게이트 통과/실패 로그, 게이트 개념도

### Step 8 — CI에 MLSecOps 단계 통합 (핵심)  〔배점: 파이프라인 35, 자동화 10〕
- **산출물:** `.github/workflows/devsecops.yml` 수정 (기존 5-Gate 잡은 **수정 없이 유지**)
  - `ml-train` 잡 신설: `seed_attacks.py` → `python -m app.ml.train` → `eval_gate.py` 게이트 →
    `models/attack_clf.pkl` upload-artifact (기존 잡 패턴 복제)
  - `build-and-scan`의 `needs:`에 `ml-train` 추가 → 게이트 통과 모델이 빌드에 포함
  - build 잡에서 모델 artifact download → 이미지에 포함
- **검증:** push 후 Actions에서 ml-train→eval-gate→build→deploy 전 흐름 그린, 잡 그래프 확인
- **보고서 후보:** ⭐ CI 잡 그래프(5-Gate + MLSecOps), Actions 성공 로그, 통합 아키텍처 다이어그램

### Step 9 — Dockerfile에 모델 COPY  〔배점: Docker 5, 파이프라인 35〕
- **산출물:** `Dockerfile` — `models/attack_clf.pkl` COPY, `MODEL_PATH`/`DETECTOR_MODE` env.
  하드닝(appuser/HEALTHCHECK) 유지, 이미지 크기 영향 점검.
- **검증:** `docker build` 성공 → 컨테이너 `/health` OK + 공격 요청 탐지 동작, Trivy 로컬 스캔 확인
- **보고서 후보:** docker build/run 로그, 컨테이너 내 탐지 동작

### Step 10 — 재학습(v2 생성) + MLflow 시간축 버전 비교 + 롤백  〔배점: MLflow 15(버전비교), 추가점수 10〕
- **핵심:** 단순 재실행이 아니라, **데이터 추가(또는 피처 변경)로 v2 모델을 만들고
  MLflow에서 v1 vs v2를 metric으로 비교**한다. 이렇게 하면 배점의 'MLflow 모델 버전 관리·비교(15)'가
  알고리즘 비교(LogReg vs NB)뿐 아니라 **시간축 버전 비교(v1→v2)** 로도 드러난다.
- **산출물:**
  - 데이터/피처 변경: `seed_attacks.py`에 신규 공격 변형/카테고리 추가(또는 ngram_range·max_features 조정)
    → 변경 사실을 MLflow run **tag/param**(`data_version=v2`, `change="added cmdi variants"` 등)으로 명시
  - `devsecops.yml`의 `on:`에 `workflow_dispatch:` 추가(수동 재학습 트리거)
  - 재학습 실행 → v2 run 생성, **MLflow에서 v1 vs v2 macro-F1/카테고리별 F1 비교** → 우승 버전 채택·반영
  - `docs/rollback.md` — v2가 회귀 시 직전 artifact/커밋(v1)으로 되돌려 재배포하는 절차 문서화
- **검증:** Actions에서 수동 실행 → v2 run 생성, MLflow UI에서 v1/v2 나란히 비교,
  롤백 절차 1회 시연(이전 SHA/artifact 재배포)
- **보고서 후보:** ⭐ MLflow v1 vs v2 metric 비교 스크린샷(시간축 버전 관리), 수동 재학습 트리거,
  롤백 전후 비교, 모델 버전 이력 표

### Step 11 — 운영 확인 + 보고서 마감  〔배점: 배포·운영 5, 파이프라인 35〕
- **산출물:** Render 배포 확인(`https://secpipeline.onrender.com`에서 탐지·경보 동작),
  운영 로그(`logs/secpipeline.log`) 보안 경보 분석, README/보고서 정리
- **검증:** 외부 URL에서 공격 요청 탐지/로깅 확인, 로그에서 경보 집계
- **보고서 후보:** 운영 화면, 보안 경보 로그 분석, 전체 MLSecOps 흐름 요약

---

## 배점 ↔ 단계 매핑 요약
| 배점 항목 | 점수 | 담당 단계 |
|---|---|---|
| MLOps 파이프라인 완성도 | 35 | Step 7,8,9,11 (전 흐름 연결) |
| MLflow 활용·모델관리 | 15 | Step 3,4 (LogReg vs NB) + Step 10 (v1 vs v2 시간축 버전 비교) |
| Git 이력 | 10 | Step 1 + 단계별 커밋 |
| 자동화 수준 | 10 | Step 4,6,8 |
| 앱·ML 기능 구성 | 10 | Step 2,5 (실서비스 연결: 실시간 탐지) |
| Docker | 5 | Step 9 |
| 배포·운영 | 5 | Step 11 |
| 추가점수 | +10 | Step 2,6,7,10 (롤백·재학습·게이트·운영로그·복잡도) |

## End-to-end 검증 (최종)
1. `python scripts/seed_attacks.py` → 균형 라벨 데이터(`data/requests.csv`)
2. `python -m app.ml.train` → MLflow 2 run + `models/attack_clf.pkl` + `models/metrics.json`
3. `python scripts/eval_gate.py` → exit 0 (macro-F1 ≥ 0.80)
4. `pytest tests/ -v` → 전체 통과
5. `docker build` → 컨테이너 `/health` OK + 공격 요청 탐지 동작
6. push → Actions: secret/dep/sast/unit + **ml-train→eval-gate** → build(모델포함) → deploy → dast 전부 그린
7. Render URL에서 정상 동작 + 공격 요청 탐지·경보 확인
8. workflow_dispatch 수동 재학습 1회 + 롤백 시연

## 리스크 / 주의
- **새 의존성 CVE:** scikit-learn/mlflow가 Gate2/Gate4에 잡힐 수 있음 → 버전 핀 + 로컬 사전 스캔(Step 1).
- **전처리 일치:** 학습(`data.py`)과 런타임 미들웨어(`detector.py`)가 **동일 정규화 함수** 사용해야 정확도 보장.
- **mlruns/ 용량:** 레포 커밋 금지, artifact로만 전달.
- **모델 미존재 런타임:** before_request는 graceful fallback 필수(탐지 꺼져도 앱 정상)(Step 5).
- **enforce 모드 오탐:** 기본은 shadow(로깅만), 차단은 env로 옵트인 — 데모 안정성 확보.
- **기존 5-Gate 불변:** ML 잡 추가만, 기존 잡 로직 수정 금지.

---

## 보고서 프레이밍 메모 (정직한 한계 명시)

> 본 보안 ML 탐지기는 **합성 데이터(synthetic payloads)** 기반으로 학습되었다. 따라서 탐지기 자체의
> **실전 탐지력(real-world detection)을 주장하지 않으며**, 본 과제의 핵심은 모델 성능이 아니라
> **MLOps 파이프라인의 흐름 자동화를 시연하는 것**이다 — 즉 데이터→학습(MLflow 실험·버전 관리)→
> 품질 게이트→Docker 패키징→배포→재학습(v1 vs v2)→롤백까지 **Git→CI/CD→MLflow→Deploy 전 과정이
> 자동으로 이어지는지**를 보여주는 데 목적이 있다. 실전 적용 시에는 실제 트래픽/공격 로그로 재학습하고
> 임계값·오탐률을 재튜닝해야 하며, 본 구현은 그 운영 사이클을 그대로 재현할 수 있는 **틀(harness)** 을 제공한다.
> 이 프레이밍은 보고서 서두와 결론에 동일하게 명시해, 과장 없이 파이프라인 완성도로 평가받는다.

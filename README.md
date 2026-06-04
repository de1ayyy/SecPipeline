# SecPipeline

Flask 기반 학습기록 앱 + **DevSecOps 5-Gate 파이프라인** + **보안 ML(MLSecOps) / MLflow MLOps**.

중간 프로젝트의 DevSecOps 보안 파이프라인 위에, 기말 과제로 **악성 HTTP 요청 탐지** ML 기능과
MLflow 기반 MLOps(실험관리·버전관리·재학습·배포·운영)를 통합했다.
→ `Git → CI/CD → Docker → MLflow → Deploy` 전 흐름 자동화.

## 아키텍처

```
요청 ──▶ @before_request (보안 ML 탐지)
          │  shadow: 로깅만 / enforce: 403 차단
          ▼
        Flask 앱 (학습기록 CRUD + 대시보드[보안 위젯])
          │
        logs/secpipeline.log  (운영 보안 경보)

[CI/CD: .github/workflows/devsecops.yml]
  5-Gate(Gitleaks·pip-audit·Semgrep+Bandit·Trivy·Hadolint) + unit-test
  + ml-train(seed → train[MLflow] → eval_gate[macro-F1≥0.80] → artifact)
  ─▶ build-and-scan(모델 포함) ─▶ deploy(Render) ─▶ DAST(ZAP)
```

## 보안 ML 기능 (악성 요청 탐지)

- 요청 문자열(method+path+query+body)을 `benign / sqli / xss / path_traversal / cmdi` 로 분류
- TF-IDF(char n-gram) + LogisticRegression / MultinomialNB → MLflow에서 비교 후 우승 모델 채택
- `@before_request` 미들웨어가 실시간 탐지 → 경보 로깅 → 대시보드 "보안 이벤트" 위젯 표시

> ⚠️ **한계 명시:** 탐지기는 **합성 데이터** 기반으로, 실전 탐지력이 아니라 **MLOps 파이프라인
> 흐름 자동화 시연**이 목적이다. 자세한 내용은 [SPEC.md](SPEC.md) 하단 프레이밍 메모 참조.

## 로컬 실행

```bash
pip install -r requirements.txt

# 1) 데이터 생성 → 학습(MLflow) → 품질 게이트
python scripts/seed_attacks.py
python -m app.ml.train
python scripts/eval_gate.py

# 2) 앱 실행
python run.py                      # http://localhost:5000

# 3) MLflow UI / 버전 비교
mlflow ui --backend-store-uri file:./mlruns
python scripts/compare_versions.py

# 4) 테스트
python -m pytest tests/ -v
```

## Docker

```bash
docker build -t studylog .
docker run -p 5000:5000 studylog        # /health, 탐지 동작
# 차단 모드: docker run -e DETECTOR_MODE=enforce -p 5000:5000 studylog
```

## MLOps 운영 (재학습·롤백)

수동 재학습(v2), v1 vs v2 비교, 모델 반영/롤백 절차는 [docs/rollback.md](docs/rollback.md) 참조.
CI 수동 트리거: `Actions → SecPipeline DevSecOps → Run workflow (data_version=v2)`.

## 주요 파일

| 경로 | 역할 |
|---|---|
| `app/ml/{config,data,train,detector}.py` | 설정 / 데이터·전처리 / 학습+MLflow / 런타임 탐지 |
| `scripts/{seed_attacks,eval_gate,compare_versions}.py` | 데이터 생성 / 품질 게이트 / 버전 비교 |
| `app/__init__.py` | `@before_request` 보안 ML 미들웨어 |
| `.github/workflows/devsecops.yml` | 5-Gate + MLSecOps CI/CD |
| `models/attack_clf.pkl` | 배포 모델(이미지 COPY 대상) |
| `SPEC.md` | 전체 설계·단계 계획 |

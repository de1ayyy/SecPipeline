# 모델 재학습(v2) · 버전 비교 · 롤백 절차 (MLOps 운영)

본 문서는 악성 요청 탐지 모델의 **재학습 → 버전 비교 → 반영 → 롤백** 운영 사이클을 정리한다.
모델 파일(`models/attack_clf.pkl`)은 Docker 이미지에 COPY되어 배포되므로, 모델 교체/롤백은
**해당 파일을 바꾼 커밋을 배포**하는 것으로 이뤄진다.

## 1. 재학습 (v2 생성)

데이터/피처를 바꾼 뒤 새 버전을 학습한다.

```bash
# 신규 공격 변형을 포함한 v2 데이터 생성
python scripts/seed_attacks.py --version v2
# v2 학습 (MLflow에 data_version=v2 태그로 기록)
python -m app.ml.train --version v2
# 품질 게이트 (macro-F1 >= 0.80)
python scripts/eval_gate.py
```

CI에서는 **수동 트리거**로 동일하게 수행한다:
`Actions → SecPipeline DevSecOps → Run workflow → data_version=v2` (`workflow_dispatch`).

## 2. 버전 비교 (v1 vs v2)

```bash
python scripts/compare_versions.py
```

```
=== MLflow 버전 비교 (data_version × model) ===
version  model  macro_f1  accuracy
     v1 logreg  1.000000      1.00
     v1     nb  0.979776      0.98
     v2 logreg  1.000000      1.00
     v2     nb  0.989934      0.99
```

MLflow UI(`mlflow ui --backend-store-uri file:./mlruns`)에서도 run을 나란히 비교할 수 있다.
v2가 v1보다 같거나 나으면 반영, 회귀(metric 하락)하면 롤백한다.

## 3. 반영 (신규 모델 서비스 적용)

v2 학습 결과로 `models/attack_clf.pkl` 와 `models/metrics.json` 이 갱신된다.
이를 커밋·푸시하면 CI가 이미지를 빌드해 Render로 배포 → 운영에 v2 모델이 반영된다.

## 4. 롤백 (직전 버전으로 복귀)

v2가 운영에서 문제가 되면 **직전 버전(v1) 모델 파일로 되돌려 재배포**한다.

```bash
# v1 모델이 커밋된 시점(Step 4 커밋)에서 모델 파일만 복원
git checkout <v1-commit-sha> -- models/attack_clf.pkl models/metrics.json
git commit -m "rollback: 모델을 v1으로 복구"
git push            # CI 재실행 → 이미지 재빌드 → Render 재배포
```

- `<v1-commit-sha>` 는 `git log --oneline -- models/attack_clf.pkl` 로 확인한다
  (Step 4 "학습 스크립트 + MLflow 로깅" 커밋이 최초 v1 모델 시점).
- CI artifact(`ml-model`)로도 직전 모델을 내려받아 복원할 수 있다.
- 즉시 완화가 필요하면 배포 환경변수 `DETECTOR_MODE=shadow` 로 두어 오탐 차단을 끄거나,
  반대로 `enforce` 로 강화할 수 있다(모델 교체 없이 운영 정책만 전환).

## 요약

| 단계 | 명령/동작 | 산출물 |
|---|---|---|
| 재학습 | `seed_attacks --version v2` → `train --version v2` | v2 run(MLflow), 갱신된 .pkl |
| 게이트 | `eval_gate.py` | macro-F1 ≥ 0.80 통과 |
| 비교 | `compare_versions.py` / MLflow UI | v1 vs v2 metric 표 |
| 반영 | 모델 파일 커밋·푸시 | CI 빌드→배포 |
| 롤백 | `git checkout <v1-sha> -- models/...` | v1 모델 재배포 |

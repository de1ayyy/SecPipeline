"""보안 ML 설정.

기존 app/config.py의 'env 우선, 없으면 기본값' 패턴을 그대로 따른다.
(DATABASE_PATH 분리 방식과 동일)
"""
import os

# 프로젝트 루트 기준 경로 (app/ml/config.py → 루트는 두 단계 위)
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# ── 모델 / 데이터 / MLflow 경로 ──────────────────────────────
# 최종 우승 모델(.pkl). Docker 이미지에 COPY되어 런타임에 로드된다.
MODEL_PATH = os.environ.get("MODEL_PATH", os.path.join(_ROOT, "models", "attack_clf.pkl"))
# 학습 평가 지표 요약. eval_gate.py가 이 파일을 읽어 품질 게이트를 판단한다.
METRICS_PATH = os.environ.get("METRICS_PATH", os.path.join(_ROOT, "models", "metrics.json"))
# 합성 학습 데이터 CSV (scripts/seed_attacks.py 출력)
DATA_PATH = os.environ.get("ML_DATA_PATH", os.path.join(_ROOT, "data", "requests.csv"))
# MLflow tracking (로컬 파일 기반으로 단순화)
MLFLOW_TRACKING_URI = os.environ.get("MLFLOW_TRACKING_URI", "file:" + os.path.join(_ROOT, "mlruns"))
MLFLOW_EXPERIMENT = os.environ.get("MLFLOW_EXPERIMENT", "secpipeline-attack-detection")

# ── 라벨 (정상 + 공격 카테고리) ──────────────────────────────
BENIGN = "benign"
LABELS = [BENIGN, "sqli", "xss", "path_traversal", "cmdi"]

# ── 품질 게이트 기준치 (고정) ─────────────────────────────────
# 우승 모델의 macro-F1이 이 값 미만이면 CI 게이트(eval_gate.py)가 실패한다.
MACRO_F1_THRESHOLD = float(os.environ.get("MACRO_F1_THRESHOLD", "0.80"))

# ── 런타임 탐지 모드 ──────────────────────────────────────────
# shadow : 탐지·로깅만 (기본, 데모 안정성)
# enforce: 공격 판정 시 403 차단
DETECTOR_MODE = os.environ.get("DETECTOR_MODE", "shadow").lower()

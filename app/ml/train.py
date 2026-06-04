"""학습 스크립트 + MLflow 로깅 (MLSecOps 핵심).

LogReg / MultinomialNB 두 모델을 TF-IDF(char n-gram) 파이프라인으로 학습하고,
각각을 MLflow run으로 기록(param/metric/artifact)한다. macro-F1 기준 우승 모델을
models/attack_clf.pkl 로 export 하고, models/metrics.json 에 요약을 남긴다.

실행:
  python -m app.ml.train                  # v1
  python -m app.ml.train --version v2     # 재학습(시간축 버전 비교, Step 10)
"""
import argparse
import json
import os
import tempfile

# MLflow 3.x는 파일 스토어를 기본 차단(maintenance mode)한다. 본 과제는 로컬
# mlruns/ 파일 백엔드로 단순화하므로 opt-out 플래그를 켠다. (mlflow import 전에 설정)
os.environ.setdefault("MLFLOW_ALLOW_FILE_STORE", "true")

import joblib
import matplotlib
matplotlib.use("Agg")  # headless(CI/서버)에서 GUI 백엔드 없이 렌더
import matplotlib.pyplot as plt
import mlflow
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (ConfusionMatrixDisplay, accuracy_score,
                             classification_report, f1_score)
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

from app.ml.config import (LABELS, METRICS_PATH, MLFLOW_EXPERIMENT,
                           MLFLOW_TRACKING_URI, MODEL_PATH)
from app.ml.data import load_dataset

# 공통 TF-IDF 설정 (char n-gram: 페이로드 토큰 경계가 불분명해도 잘 잡힘)
TFIDF_PARAMS = dict(analyzer="char_wb", ngram_range=(2, 4), max_features=5000)

MODELS = {
    "logreg": lambda: LogisticRegression(max_iter=1000, class_weight="balanced"),
    "nb": lambda: MultinomialNB(),
}


def _build_pipeline(model_key):
    return Pipeline([
        ("tfidf", TfidfVectorizer(**TFIDF_PARAMS)),
        ("clf", MODELS[model_key]()),
    ])


def _log_confusion_matrix(y_true, y_pred, title):
    """혼동행렬 PNG를 임시파일로 그려 경로 반환 (MLflow artifact용)."""
    fig, ax = plt.subplots(figsize=(6, 5))
    ConfusionMatrixDisplay.from_predictions(
        y_true, y_pred, labels=LABELS, xticks_rotation=45, ax=ax, colorbar=False)
    ax.set_title(title)
    fig.tight_layout()
    path = os.path.join(tempfile.gettempdir(), f"cm_{title}.png")
    fig.savefig(path, dpi=120)
    plt.close(fig)
    return path


def train_one(model_key, data_version, Xtr, Xte, ytr, yte):
    """단일 모델 학습 + MLflow run 기록. 평가 지표 dict 반환."""
    with mlflow.start_run(run_name=f"{model_key}-{data_version}"):
        mlflow.set_tag("data_version", data_version)
        mlflow.set_tag("model_type", model_key)
        mlflow.log_params({
            "model_type": model_key,
            "analyzer": TFIDF_PARAMS["analyzer"],
            "ngram_range": str(TFIDF_PARAMS["ngram_range"]),
            "max_features": TFIDF_PARAMS["max_features"],
            "n_train": len(Xtr),
            "n_test": len(Xte),
        })

        pipe = _build_pipeline(model_key)
        pipe.fit(Xtr, ytr)
        y_pred = pipe.predict(Xte)

        macro_f1 = f1_score(yte, y_pred, average="macro")
        acc = accuracy_score(yte, y_pred)
        per_class = f1_score(yte, y_pred, average=None, labels=LABELS)

        mlflow.log_metric("macro_f1", macro_f1)
        mlflow.log_metric("accuracy", acc)
        for label, score in zip(LABELS, per_class):
            mlflow.log_metric(f"f1_{label}", score)

        # artifact: 분류 리포트 + 혼동행렬
        report = classification_report(yte, y_pred, labels=LABELS)
        report_path = os.path.join(tempfile.gettempdir(), f"report_{model_key}.txt")
        with open(report_path, "w") as f:
            f.write(report)
        mlflow.log_artifact(report_path)
        mlflow.log_artifact(_log_confusion_matrix(yte, y_pred, f"{model_key}-{data_version}"))

        # 모델 pkl 자체도 run artifact로 보관
        pkl_path = os.path.join(tempfile.gettempdir(), f"{model_key}.pkl")
        joblib.dump(pipe, pkl_path)
        mlflow.log_artifact(pkl_path)

        print(f"[train] {model_key:<7} macro_f1={macro_f1:.4f} acc={acc:.4f}")
        return {
            "model_type": model_key,
            "macro_f1": macro_f1,
            "accuracy": acc,
            "per_class_f1": {l: float(s) for l, s in zip(LABELS, per_class)},
            "pipeline": pipe,
        }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", default="v1", help="데이터/실험 버전 태그 (v1, v2 ...)")
    args = ap.parse_args()

    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(MLFLOW_EXPERIMENT)

    Xtr, Xte, ytr, yte = load_dataset()

    results = [train_one(key, args.version, Xtr, Xte, ytr, yte) for key in MODELS]

    # macro-F1 기준 우승 모델 선정
    winner = max(results, key=lambda r: r["macro_f1"])
    print(f"[train] winner = {winner['model_type']} (macro_f1={winner['macro_f1']:.4f})")

    # 우승 모델 export (Docker COPY 대상)
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(winner["pipeline"], MODEL_PATH)

    # 게이트/보고서용 metrics.json (pipeline 객체는 직렬화 제외)
    summary = {
        "data_version": args.version,
        "winner": winner["model_type"],
        "macro_f1": winner["macro_f1"],
        "accuracy": winner["accuracy"],
        "per_class_f1": winner["per_class_f1"],
        "candidates": [
            {k: r[k] for k in ("model_type", "macro_f1", "accuracy")} for r in results
        ],
    }
    with open(METRICS_PATH, "w") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    print(f"[train] saved model → {MODEL_PATH}")
    print(f"[train] saved metrics → {METRICS_PATH}")


if __name__ == "__main__":
    main()

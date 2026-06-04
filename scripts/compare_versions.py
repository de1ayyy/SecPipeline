#!/usr/bin/env python3
"""MLflow 시간축 버전 비교 (v1 vs v2 ...).

mlruns/ 의 모든 run을 data_version 태그별로 묶어 macro-F1/accuracy를 표로 출력한다.
재학습(Step 10) 후 v1 대비 v2 성능 변화를 한눈에 보여주는 보고서용 도구.
MLflow UI 없이도 비교 결과를 재현 가능하게 한다.

사용:
  python scripts/compare_versions.py
"""
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ.setdefault("MLFLOW_ALLOW_FILE_STORE", "true")
import mlflow

from app.ml.config import MLFLOW_EXPERIMENT, MLFLOW_TRACKING_URI


def main():
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    exp = mlflow.get_experiment_by_name(MLFLOW_EXPERIMENT)
    if exp is None:
        print("실험이 없습니다. 먼저 `python -m app.ml.train` 실행.")
        return

    runs = mlflow.search_runs(experiment_ids=[exp.experiment_id])
    if runs.empty:
        print("기록된 run이 없습니다.")
        return

    cols = {
        "tags.data_version": "version",
        "tags.model_type": "model",
        "metrics.macro_f1": "macro_f1",
        "metrics.accuracy": "accuracy",
    }
    view = runs[[c for c in cols if c in runs.columns]].rename(columns=cols)
    view = view.sort_values(["version", "model"]).reset_index(drop=True)

    print("=== MLflow 버전 비교 (data_version × model) ===")
    print(view.to_string(index=False))

    # 버전별 우승(최고 macro_f1) 요약
    print("\n=== 버전별 우승 모델 ===")
    for version, grp in view.groupby("version"):
        best = grp.loc[grp["macro_f1"].idxmax()]
        print(f"  {version}: {best['model']} (macro_f1={best['macro_f1']:.4f})")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""모델 품질 게이트 (MLSecOps).

models/metrics.json 의 우승 모델 macro-F1 이 고정 기준치(MACRO_F1_THRESHOLD,
기본 0.80) 미만이면 비정상 종료(exit 1)하여 CI 파이프라인을 차단한다.
DevSecOps의 보안 게이트와 동일한 'fail-fast' 원칙을 모델 품질에 적용.

사용:
  python scripts/eval_gate.py
"""
import json
import os
import sys

# scripts/ 에서 직접 실행되어도 app 패키지를 import할 수 있도록 루트 추가
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.ml.config import MACRO_F1_THRESHOLD, METRICS_PATH


def main():
    try:
        with open(METRICS_PATH, encoding="utf-8") as f:
            metrics = json.load(f)
    except FileNotFoundError:
        print(f"[gate] FAIL: metrics 파일 없음 → {METRICS_PATH}")
        print("[gate] 먼저 `python -m app.ml.train` 를 실행하세요.")
        sys.exit(1)

    macro_f1 = metrics.get("macro_f1", 0.0)
    winner = metrics.get("winner", "?")
    version = metrics.get("data_version", "?")

    print(f"[gate] data_version={version} winner={winner} macro_f1={macro_f1:.4f} "
          f"threshold={MACRO_F1_THRESHOLD:.2f}")

    if macro_f1 < MACRO_F1_THRESHOLD:
        print(f"[gate] FAIL: macro_f1 {macro_f1:.4f} < {MACRO_F1_THRESHOLD:.2f} → 배포 차단")
        sys.exit(1)

    print("[gate] PASS: 품질 기준 충족 → 다음 단계 진행")
    sys.exit(0)


if __name__ == "__main__":
    main()

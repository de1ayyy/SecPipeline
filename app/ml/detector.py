"""런타임 악성 요청 탐지기 + 경량 보안 모니터.

- 앱 기동 시 우승 모델(.pkl)을 1회 로드한다(없으면 graceful fallback: 탐지 비활성).
- classify_request(): 학습과 동일한 normalize_request 전처리를 거쳐 라벨/신뢰도 반환.
- 최근 보안 이벤트를 메모리(deque)에 보관 → 대시보드 위젯에서 집계 표시.

전처리는 app.ml.data.normalize_request 단일 함수를 공유한다(학습/추론 일치).
"""
import os
import threading
from collections import Counter, deque

import joblib

from app.ml.config import BENIGN, MODEL_PATH
from app.ml.data import normalize_request

# 공격으로 판정할 최소 신뢰도 (predict_proba 최대값)
CONFIDENCE_THRESHOLD = float(os.environ.get("DETECT_CONFIDENCE", "0.5"))
_MAX_EVENTS = 50

_model = None
_loaded = False
_lock = threading.Lock()

# 메모리 보안 모니터 (프로세스 로컬)
_events = deque(maxlen=_MAX_EVENTS)
_counter = Counter()


def load_model(path: str = None):
    """모델을 1회 로드(idempotent). 실패 시 None 유지(탐지 비활성)."""
    global _model, _loaded
    if _loaded:
        return _model
    with _lock:
        if _loaded:
            return _model
        path = path or MODEL_PATH
        try:
            _model = joblib.load(path)
        except Exception:
            _model = None  # 모델 없음 → fallback
        _loaded = True
    return _model


def is_ready() -> bool:
    return load_model() is not None


def classify_request(method, path, query="", body=""):
    """요청을 분류해 (label, confidence) 반환. 모델 없으면 (benign, 0.0)."""
    model = load_model()
    if model is None:
        return BENIGN, 0.0
    text = normalize_request(method, path, query, body)
    if not text:
        return BENIGN, 0.0
    label = str(model.predict([text])[0])
    confidence = 0.0
    if hasattr(model, "predict_proba"):
        confidence = float(max(model.predict_proba([text])[0]))
    return label, confidence


def is_attack(label, confidence) -> bool:
    return label != BENIGN and confidence >= CONFIDENCE_THRESHOLD


def record_event(label, confidence, method, path):
    """탐지된 공격을 메모리 모니터에 적재."""
    _counter[label] += 1
    _events.appendleft({
        "label": label,
        "confidence": round(confidence, 3),
        "method": method,
        "path": path[:120],
    })


def get_security_stats(recent: int = 5):
    """대시보드 위젯용 요약 반환."""
    return {
        "enabled": is_ready(),
        "total_alerts": sum(_counter.values()),
        "by_category": dict(_counter),
        "recent": list(_events)[:recent],
    }


def reset_monitor():
    """테스트용: 모니터 상태 초기화."""
    _events.clear()
    _counter.clear()

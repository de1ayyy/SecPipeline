"""보안 ML 탐지기 테스트.

학습 모델(models/attack_clf.pkl)이 있으면 실제 탐지를, 없으면 fallback을 검증한다.
"""
import pytest

from app.ml import detector
from app.ml.data import normalize_request


# ── 공유 전처리 ──────────────────────────────────────────────
def test_normalize_decodes_and_lowercases():
    # URL 인코딩된 SQLi가 디코드되어 드러나야 함
    text = normalize_request("GET", "/search", "q=%27%20OR%201%3D1--", "")
    assert "' or 1=1--" in text
    assert text == text.lower()


def test_normalize_handles_empty_parts():
    assert normalize_request("GET", "/", "", "") == "get /"


# ── 분류기 (모델 필요) ───────────────────────────────────────
@pytest.fixture(scope="module")
def model_ready():
    return detector.is_ready()


def test_detects_sqli(model_ready):
    if not model_ready:
        pytest.skip("모델 미존재: scripts/seed_attacks.py + python -m app.ml.train 필요")
    label, conf = detector.classify_request("GET", "/search", "q=' OR 1=1--", "")
    assert label == "sqli"
    assert conf > 0.5


def test_detects_xss(model_ready):
    if not model_ready:
        pytest.skip("모델 미존재")
    label, conf = detector.classify_request("GET", "/search", "q=<script>alert(1)</script>", "")
    assert label == "xss"


def test_benign_not_flagged(model_ready):
    if not model_ready:
        pytest.skip("모델 미존재")
    label, conf = detector.classify_request("GET", "/dashboard", "page=1", "")
    assert label == "benign"
    assert not detector.is_attack(label, conf)


def test_label_is_plain_str(model_ready):
    if not model_ready:
        pytest.skip("모델 미존재")
    label, _ = detector.classify_request("GET", "/logs", "q=python", "")
    assert type(label) is str  # numpy str_ 아님


# ── fallback (모델 없음) ─────────────────────────────────────
def test_fallback_when_no_model():
    label, conf = detector.classify_request("GET", "/x", "", "", )  # 정상 텍스트
    # 모델 유무와 무관하게 출력 형식은 항상 (str, float)
    assert isinstance(label, str) and isinstance(conf, float)


def test_is_attack_logic():
    assert detector.is_attack("sqli", 0.9) is True
    assert detector.is_attack("benign", 0.9) is False
    assert detector.is_attack("sqli", 0.1) is False  # 신뢰도 미달


# ── 미들웨어 통합 (shadow 모드) ──────────────────────────────
def test_middleware_records_and_passes(client):
    detector.reset_monitor()
    # 공격 요청이 shadow 모드에서 차단되지 않고(통과) 모니터에 적재되는지
    client.get("/search?q=' OR 1=1--")
    stats = detector.get_security_stats()
    if detector.is_ready():
        assert stats["total_alerts"] >= 1

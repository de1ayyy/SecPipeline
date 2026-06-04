"""데이터 로더 + 공유 전처리.

핵심: normalize_request() 는 학습(train.py)과 런타임 미들웨어(detector.py)가
**동일하게** 사용하는 단일 전처리 함수다. 둘이 갈라지면 학습/추론 분포가 어긋나
정확도가 무너지므로, 전처리는 반드시 이 한 곳에만 둔다.
"""
import os
from urllib.parse import unquote_plus

import pandas as pd
from sklearn.model_selection import train_test_split

from app.ml.config import DATA_PATH


def normalize_request(method: str, path: str, query: str = "", body: str = "") -> str:
    """요청 구성요소를 단일 텍스트로 정규화.

    - URL 인코딩(%2f, %3c ...)을 디코드해 인코딩 회피 페이로드를 드러낸다.
    - 소문자화하여 대소문자 변형을 흡수한다.
    - method/path/query/body를 한 문자열로 결합 → TF-IDF(char n-gram) 입력.
    """
    parts = [method or "", path or "", query or "", body or ""]
    text = " ".join(p for p in parts if p)
    # 이중 인코딩 대비 2회 디코드
    text = unquote_plus(unquote_plus(text))
    return text.lower().strip()


def load_dataframe(path: str = None) -> pd.DataFrame:
    """requests.csv 를 DataFrame으로 로드하고 normalized 텍스트 컬럼을 추가."""
    path = path or DATA_PATH
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"학습 데이터가 없습니다: {path}\n먼저 `python scripts/seed_attacks.py` 를 실행하세요."
        )
    df = pd.read_csv(path, keep_default_na=False, dtype=str)
    df["text"] = df.apply(
        lambda r: normalize_request(r["method"], r["path"], r["query"], r["body"]), axis=1
    )
    return df


def load_dataset(path: str = None, test_size: float = 0.2, random_state: int = 42):
    """학습용 (X_train, X_test, y_train, y_test) 반환."""
    df = load_dataframe(path)
    X = df["text"].tolist()
    y = df["label"].tolist()
    return train_test_split(X, y, test_size=test_size, random_state=random_state, stratify=y)

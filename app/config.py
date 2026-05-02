import os
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-fallback-secret-key-1234")   # ✅ Fix-01: 환경변수 분리
# 환경변수에서 DATABASE_PATH를 우선 읽고, 없으면 로컬 경로 사용 (Docker 쓰기 권한 이슈 방지)
DATABASE_PATH = os.environ.get("DATABASE_PATH", os.path.join(os.path.dirname(__file__), '..', 'studylog.db'))
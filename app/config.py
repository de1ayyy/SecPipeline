import os
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-fallback-secret-key-1234")   # ✅ Fix-01: 환경변수 분리
DATABASE_PATH = os.path.join(os.path.dirname(__file__), '..', 'studylog.db')
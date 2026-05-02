# ✅ Fix-04: 최신 보안 패치가 적용된 Python 3.12 사용
FROM python:3.12-slim

# ✅ Fix-05: 작업 디렉토리(WORKDIR) 명시
WORKDIR /app

# ✅ Fix-05: Non-root 권한 분리용 사용자 생성 및 curl 설치 (Healthcheck 용도)
# hadolint ignore=DL3008
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && adduser --disabled-password --gecos "" appuser

COPY requirements.txt requirements.txt
# ✅ Fix-05: 패키지 다운로드 캐시 제거(--no-cache-dir)
RUN pip install --no-cache-dir -r requirements.txt

# ✅ Fix-05: 코드 복사 시 소유권(chown) 지정
COPY --chown=appuser:appuser . .

# ✅ Fix-05: 애플리케이션 실행 권한 전환 (CWE-250 방어)
USER appuser

EXPOSE 5000

# ✅ Fix-05: 컨테이너 내에서 DB 파일을 누구나 쓰기 가능한 /tmp 경로에 생성하도록 환경변수 설정
ENV DATABASE_PATH=/tmp/studylog.db

# ✅ Fix-05: 컨테이너 상태 모니터링을 위한 HEALTHCHECK
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5000/health || exit 1

# ✅ Fix-05: exec form 배열 사용 및 운영용 서버 gunicorn으로 실행
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "run:app"]
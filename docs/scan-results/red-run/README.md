# Red Run (의도적 취약점 탐지) 스캔 결과 요약

본 디렉토리(`docs/scan-results/red-run/`)는 애플리케이션 내에 사전에 기획하여 삽입해 둔 5가지 의도적 보안 취약점(VULN-01 ~ VULN-05)이 CI 파이프라인의 각 보안 게이트에서 정상적으로 탐지되는지 확인한 'Red Run' 증빙 자료를 보관합니다.

## 📊 Gate별 탐지 요약표

| Gate 단계 | 스캔 도구 | 주요 탐지 내역 (의도적 취약점) | 심각도(Severity) | 연관 VULN |
| :--- | :--- | :--- | :--- | :--- |
| **Gate 1** | Gitleaks (Secret) | `app/config.py` 내 하드코딩된 `SECRET_KEY` 탐지 | High | VULN-01 |
| **Gate 2** | pip-audit (SCA) | 구버전 의존성(flask, jinja2, werkzeug, gunicorn)에서 총 16건의 CVE 탐지 | High / Critical | VULN-02 |
| **Gate 3** | Semgrep / Bandit (SAST) | `search.py`의 SQL Injection, `dashboard.py`의 XSS/SSTI 안티패턴 탐지 | High | VULN-03a, 03b |
| **Gate 4** | Trivy (Container) | (Gate 1, 2, 5 실패로 인해 Job Skipped 처리됨) | - | - |
| **Gate 5** | hadolint (Dockerfile) | `python:3.8-slim` 사용 및 `WORKDIR`, `USER` 지시어 누락 탐지 | Warning / Error | VULN-04, 05 |

## 📁 증빙 자료 파일 목록
*(사용자가 GitHub Actions 화면에서 다운로드한 JSON 파일들을 이곳에 저장합니다)*
- `gitleaks-results.sarif` (Gate 1 증빙)
- `dependency-scan.json` (Gate 2 증빙)
- `sast-results.zip` (`semgrep.json`, `bandit.json` 포함 - Gate 3 증빙)
- `test-results.xml` (단위 테스트 100% 통과 증빙)

## 📌 분석 결과 및 향후 조치 방향
- **분석:** 애플리케이션의 핵심 비즈니스 로직(단위 테스트 6건)은 모두 PASS 하여 정상 동작함이 확인되었습니다. 하지만 소스코드 내부에 심어진 치명적인 보안 취약점들로 인해 CI 파이프라인의 보안 게이트에서 빌드가 **의도적으로 차단(Failure)** 되었습니다.
- **조치 방향:** 식별된 VULN-01~05 취약점들을 모두 안전한 코드로 리팩토링하고, 의존성을 최신 버전으로 업데이트한 뒤 파이프라인을 100% 통과하는 'Green Run'을 달성해야 합니다.

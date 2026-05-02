# Fix-01: Gitleaks 탐지 시크릿 하드코딩 제거 (CWE-798)

## 1. 발생 원인 및 증상 (Red Run)
- `app/config.py` 파일 내에 `SECRET_KEY` 값이 평문(Plaintext) 문자열로 직접 소스 코드에 하드코딩되어 있었습니다.
- CI 과정의 Gate 1 (Gitleaks) 단계에서 "generic-api-key" 탐지 규칙에 걸려 파이프라인 빌드가 실패(Failure)했습니다.

## 2. 보안 취약점 영향 (CWE-798)
- 하드코딩된 시크릿이 GitHub 저장소에 푸시되면, 소스 코드 열람 권한이 있는 누구든 세션(Session) 데이터를 변조하거나 복호화할 수 있어 치명적인 세션 하이재킹 피해를 유발할 수 있습니다.

## 3. 조치 내역 (Fix)
- 기존: `SECRET_KEY = "fl4sk_s3cr3t_..."`
- 변경: `SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-fallback")`
- 시크릿 값을 코드에서 분리하고, 환경변수(Environment Variables)에서 동적으로 읽어오도록 리팩토링했습니다. 실제 배포 환경(Render)에서는 관리자 대시보드에서 환경변수를 안전하게 주입할 예정입니다.

## 4. 재검증 (Green Run)
- [ ] 조치 후 CI 파이프라인을 다시 실행했을 때 Gitleaks 스캔을 통과(PASS)함을 확인했습니다. (추후 캡처 첨부)

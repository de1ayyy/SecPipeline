# Fix-04 & 05: 안전하지 않은 Dockerfile 하드닝

## 1. 발생 원인 및 증상 (Red Run)
- `Dockerfile`이 `python:3.8-slim`이라는 단종(EOL)된 베이스 이미지를 사용하고 있었으며, `WORKDIR` 누락, 패키지 캐시 미제거, 그리고 `USER` 지시어 누락으로 인해 컨테이너가 기본적으로 `root` 권한으로 실행되게 짜여 있었습니다.
- CI 파이프라인의 Gate 5 (hadolint) 단계에서 다수의 권장사항(DL3045, DL3042 등) 위반 경고가 발생했습니다.

## 2. 보안 취약점 영향
- 오래된 베이스 이미지에는 패치되지 않은 수십 개의 OS 레벨 취약점이 존재합니다(Trivy 탐지 대상).
- 컨테이너 내부 애플리케이션이 `root` 계정으로 실행되면, 만약 앱(Flask)이 해킹당했을 때 공격자가 컨테이너의 루트 권한을 획득하여 호스트 탈출(Container Breakout)을 시도하기 매우 쉬워집니다.

## 3. 조치 내역 (Fix)
*(본 문서는 P0-5 단계에서 Dockerfile을 하드닝한 이후 상세 내용을 추가 작성할 예정입니다.)*
- 베이스 이미지 최신화 (`python:3.12-slim`)
- `WORKDIR /app` 명시
- `USER appuser` 추가를 통한 Non-root 권한 분리
- `HEALTHCHECK` 추가 및 패키지 다운로드 캐시 제거(`--no-cache-dir`) 적용

## 4. 재검증 (Green Run)
- [ ] Dockerfile 하드닝 후 hadolint 검사가 통과하고, Trivy 스캔 시 치명적(Critical/High) 취약점이 대폭 감소함을 확인했습니다. (추후 캡처 첨부)

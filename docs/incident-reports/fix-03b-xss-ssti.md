# Fix-03b: Cross-Site Scripting (XSS) / SSTI 취약점 대응 (CWE-79 / CWE-1336)

## 1. 발생 원인 및 증상 (Red Run)
- `app/routes/dashboard.py` 파일 내에서 세션의 `username` 값을 f-string을 통해 HTML 문자열에 직접 삽입한 뒤, `render_template_string()` 함수에 그대로 전달하고 있었습니다.
- CI 과정의 Gate 3 (Semgrep / Bandit)에서 사용자 통제값이 템플릿 엔진으로 바로 주입되는 잠재적 XSS 및 SSTI(Server-Side Template Injection) 취약점으로 탐지되었습니다.

## 2. 보안 취약점 영향
- 악성 스크립트가 포함된 사용자명이 템플릿에 삽입되어 렌더링될 경우, 다른 사용자의 브라우저에서 스크립트가 실행되어 세션 탈취나 피싱(XSS)이 일어날 수 있습니다. 나아가 Jinja2 컨텍스트를 악용하면 서버에서 임의 코드가 실행(SSTI)될 위험이 있습니다.

## 3. 조치 내역 (Fix)
- f-string으로 HTML 문자열에 값을 섞는 안티패턴을 제거했습니다.
- 대신 Jinja2의 템플릿 문법인 `{{ username }}` 텍스트를 HTML 문자열에 넣고, 변수는 `render_template_string(..., username=username)` 형태로 템플릿 엔진에 매개변수로 안전하게 전달하도록 리팩토링했습니다.
- 이를 통해 Jinja2가 제공하는 **자동 이스케이프(Auto-escaping)** 기능이 작동하여 XSS 공격이 무력화됩니다.

## 4. 재검증 (Green Run)
- [ ] 수정한 코드로 CI 파이프라인 재실행 결과 SAST 스캔을 무사히 통과했음을 확인했습니다. (추후 캡처 첨부)

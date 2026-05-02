# Fix-03a: SQL Injection 취약점 대응 (CWE-89)

## 1. 발생 원인 및 증상 (Red Run)
- `app/routes/search.py` 모듈에서 사용자가 입력한 검색어(`keyword`)를 SQL 쿼리 문자열에 f-string으로 직접 연결(Concatenation)하고 있었습니다.
- CI 과정의 Gate 3 (Semgrep / Bandit)에서 `B608 hardcoded_sql_expressions` 룰과 `formatted-sql-query` 룰에 의해 발견되었습니다.

## 2. 보안 취약점 영향 (CWE-89)
- 악의적인 사용자가 검색창에 `test' OR '1'='1` 같은 SQL 페이로드를 입력할 경우, 기존 쿼리의 조건을 무력화하고 타 사용자의 데이터까지 무단으로 조회하거나 테이블 데이터를 변조, 삭제할 수 있습니다.

## 3. 조치 내역 (Fix)
- 데이터베이스 쿼리를 실행할 때, 문자열 포매팅 방식을 제거하고 DB 드라이버에서 제공하는 **파라미터 바인딩 (Parameter Binding / Prepared Statement)** 방식인 `?` placeholder로 교체했습니다.
- 이로써 사용자 입력값은 SQL 문법의 일부가 아니라 순수한 '값(Value)'으로만 취급되어 SQL Injection이 원천 차단됩니다.

## 4. 재검증 (Green Run)
- [ ] 수정한 코드로 CI 파이프라인을 재실행한 결과, SAST 스캔(Semgrep/Bandit) 단계에서 SQL Injection 경고가 완벽히 사라진 것을 확인했습니다. (추후 캡처 첨부)

# SecPipeline 중간 보고서 요약

> **프로젝트명**: SecPipeline — Flask 기반 학습 기록 애플리케이션의 DevSecOps 파이프라인 구축 프로젝트
> **작성자**: 윤지연 (학번 243135) / 작성일 2026-05-03
> **저장소**: https://github.com/de1ayyy/SecPipeline
> **배포 URL**: https://secpipeline.onrender.com/login

## 0. 프로젝트 개요

단순 웹 앱 구현을 넘어, **개발(Dev) → 보안(Sec) → 운영(Ops)** 전 과정을 하나의 자동화 파이프라인으로 직접 설계·구축하는 것이 목표다. 핵심 방법론은 Schuckert et al.(2023)의 *Insecurity Refactoring* 기법을 응용한 검증 사이클이다.

- **Red Run**: 5가지 보안 취약점(VULN-01~05)을 의도적으로 주입한 뒤, 각 보안 게이트가 이를 정확히 탐지·차단하는지 확인.
- **Green Run**: 시큐어 코딩으로 리팩토링하여 모든 게이트를 통과시키고, Render 배포 + DAST까지 자동으로 흐르는지 확인.

즉 ① 취약점이 있을 때 정확히 배포를 차단하고, ② 안전한 코드는 자동 배포까지 끊김 없이 흐르는 **양방향 동작**을 모두 검증했다.

---

## 1. 앱 구조 (Application Architecture)

### 1.1 기능
Flask 기반 **학습 로그 관리 웹 서비스(StudyLog)** 로, 파이프라인 검증을 위해 구성했다.

- **회원가입 / 로그인 / 로그아웃** — 비밀번호는 `werkzeug.security.generate_password_hash()`로 해시 저장
- **학습 기록 CRUD** — 사용자별 학습 시간·과목·내용 생성/조회/수정/삭제
- **과목 관리** — 학습 카테고리 등록 및 분류 (subjects ↔ study_logs 1:N)
- **대시보드** — 누적 학습 시간 및 과목별 분포 통계 시각화
- **검색** — 키워드 기반 학습 기록 검색
- **CSV 내보내기** — 학습 데이터를 외부 파일로 추출 (표준 라이브러리 `csv`, `io`만 사용)
- **헬스체크** — `GET /health` → `{"status": "ok"}` (200)

### 1.2 아키텍처 패턴
- **Application Factory 패턴**: `create_app()` 팩토리 함수로 독립된 앱 인스턴스 생성 → 테스트 용이, 모듈 분리
- **Blueprints 구조**: 라우트를 기능별로 분리해, SAST 결과를 기능 단위로 정확히 매핑(예: "search.py에서 SQLi 발견")

### 1.3 Blueprint / 라우트 구성 (6개 모듈)

| Blueprint | 파일 | 역할 | 비고 |
|---|---|---|---|
| `auth_bp` | `routes/auth.py` | 회원가입, 로그인, 로그아웃 | `?` 파라미터 바인딩 사용(안전 기준선) |
| `studylog_bp` | `routes/studylog.py` | 학습 기록 CRUD | `?` 바인딩 + `session['user_id']` 격리 |
| `subjects_bp` | `routes/subjects.py` | 과목 관리 (`GET /subjects`, `POST /subjects/create`, `POST /subjects/<id>/delete`) | 취약점 없음(True Negative 기준) |
| `search_bp` | `routes/search.py` | 검색 | **VULN-03a (SQL Injection) 위치** |
| `dashboard_bp` | `routes/dashboard.py` | 대시보드 | **VULN-03b (XSS/SSTI) 위치** |
| `export_bp` | `routes/export.py` | CSV 내보내기 | 외부 의존성 없음 |

### 1.4 데이터 모델
- **DB**: SQLite (`studylog.db`), `app/models.py`에 스키마 정의 + `get_db()` 헬퍼
- **테이블**: `user`(회원 정보), `subjects`(학습 과목), `study_logs`(학습 기록 핵심 테이블)
- `models.py` 자체에는 취약점이 없으나, `get_db()`를 `search.py`에서 잘못 사용할 때 SQL Injection이 발생하도록 설계

### 1.5 진입점 / 템플릿
- `run.py`: `app = create_app()`를 모듈 최상위에 바인딩 → 개발(`python run.py`)과 운영(`gunicorn run:app`)에서 동일 진입점 사용
- `app/templates/`, `app/static/`: 화면 템플릿 및 정적 자원

---

## 2. 기존 5-Gate 파이프라인 + 사용 도구

전체 파이프라인은 Fu et al.(2024)의 DevSecOps 5단계 프레임워크(**Code Commit → Build → Test → Deploy → Monitor**)를 따르며, GitHub Actions(`.github/workflows/devsecops.yml`)로 구현했다. 트리거는 `main` 브랜치 대상 `push` / `pull_request`.

전체 흐름: `git push` → **CI(5-Gate + Unit Test)** → **Build(Docker)** → **Deploy(Render)** → **Monitor(DAST)**. 게이트 중 하나라도 실패하면 Build/Deploy가 차단된다(Red Run).

### 2.1 5개 보안 게이트

| Gate | 단계 | 도구 (GitHub Actions) | 검사 대상 / 내용 |
|---|---|---|---|
| **Gate 1** | Secret Scan | **Gitleaks** (`gitleaks/gitleaks-action@v2`, `fetch-depth: 0`) | Git 히스토리 전체에서 하드코딩된 시크릿 탐지 |
| **Gate 2** | Dependency Scan (SCA) | **pip-audit** | `requirements.txt`를 PyPI Advisory DB와 대조해 CVE 탐지 |
| **Gate 3** | SAST | **Semgrep** (`--config auto` + 커스텀 `.semgrep/`) + **Bandit** (병렬) | 정적 코드 분석: SQLi, XSS/SSTI 등 |
| **Gate 4** | Container Scan | **Trivy** (`aquasecurity/trivy-action@v0.35.0`) | 빌드된 Docker 이미지의 OS/언어 패키지 CVE 스캔. `needs: [secret-scan, dependency-scan, sast]` |
| **Gate 5** | Dockerfile Lint | **Hadolint** (`hadolint/hadolint-action@v3.3.0`) | Dockerfile 모범 사례 위반(USER 누락, HEALTHCHECK 누락, shell-form CMD 등) |

- **Unit Test**: `pytest`로 6개 테스트(인증 흐름, 헬스체크, 검색, CRUD) → `test-results.xml` 아티팩트. 실패 시 `build-and-scan`으로 진행 차단(품질 게이트).
- **DAST(Monitor)**: 배포 직후 **OWASP ZAP Baseline Scan**으로 라이브 서비스(Render URL) 대상 런타임 취약점 검사.
- 모든 게이트 결과는 `actions/upload-artifact`로 JSON 보존 → Red/Green Run 비교 분석에 활용.
- **공급망 보안 메모**: Trivy 액션은 2026년 3월 19일 공급망 공격으로 일부 버전 태그가 오염되어, 반드시 `v0.35.0`을 고정 사용.

### 2.2 의도적 취약점(VULN) ↔ 게이트 매핑

| ID | 취약점 | 위치 | 탐지 Gate | 도구 |
|---|---|---|---|---|
| VULN-01 | 하드코딩 시크릿 (CWE-798) | `app/config.py` | Gate 1 | Gitleaks |
| VULN-02 | 취약 종속성 (CVE-2023-30861 등) | `requirements.txt` | Gate 2 | pip-audit |
| VULN-03a | SQL Injection — f-string (CWE-89) | `app/routes/search.py` | Gate 3 | Semgrep + Bandit |
| VULN-03b | XSS/SSTI — `render_template_string` (CWE-79/1336) | `app/routes/dashboard.py` | Gate 3 | Semgrep(커스텀) + Bandit |
| VULN-04 | 구버전 베이스 이미지 + root 실행 (CWE-250) | `Dockerfile` | Gate 4 | Trivy |
| VULN-05 | Dockerfile 베스트프랙티스 위반 | `Dockerfile` | Gate 5 | Hadolint |

### 2.3 Red Run → Green Run 핵심 결과
- **Gate 1**: 처음에는 `"super-secret-key-12345"`가 엔트로피 부족으로 미탐(False Negative). 고엔트로피 문자열(`fl4sk_s3cr3t_8Kx9Qm2vPwLnR7jY5tZa`)로 바꾸자 True Positive 탐지 → 최종적으로 `os.environ.get("SECRET_KEY")` 환경변수 분리.
- **Gate 2**: flask 2.2.5, jinja2 3.1.2, werkzeug 2.2.3, gunicorn 21.2.0 등 4개 패키지에서 **16건 CVE** 탐지(False Positive 0건). flask≥3.1.0, jinja2≥3.1.4, werkzeug≥3.1.0, gunicorn≥22.0.0 업그레이드 시 0건으로 감소.
- **Gate 3**: Semgrep 16건(ERROR 3 / WARNING 13), Bandit 2건 탐지. SQLi는 `?` 파라미터 바인딩으로, XSS/SSTI는 Jinja2 `{{ }}` 자동 이스케이프로 수정.
- **Gate 5 검증 포인트**: VULN-01~03만 먼저 고치고 Dockerfile 하드닝을 Push하지 않았을 때, dockerfile-lint 게이트가 계속 실패 → "결함이 하나라도 남으면 끝까지 배포를 막는" 동작 확인.

---

## 3. Docker / Render 배포

### 3.1 컨테이너화 (Dockerfile)
- **베이스 이미지**: `python:3.12-slim` (취약 버전은 `python:3.8-slim`, EOL → Green Run에서 교체)
- **보안 하드닝(VULN-04/05 방어)**:
  - `WORKDIR /app` 추가 (취약 버전은 누락 → hadolint DL3045)
  - 최소 권한 원칙: `RUN adduser --disabled-password --gecos "" appuser` + `USER appuser`로 비특권 사용자 실행 (root 실행 방지, CWE-250)
  - `CMD ["gunicorn", "--bind", "0.0.0.0:5000", "run:app"]` exec form 사용 (취약 버전은 `CMD python run.py` shell form → DL3025)
  - `HEALTHCHECK CMD curl -f http://localhost:5000/health || exit 1` 추가
  - 레이어 캐시 최적화: `requirements.txt` 먼저 복사 후 `pip install`, 이어서 전체 코드 복사
- **로컬 실행**:
  - 빌드: `docker build -t secpipeline:latest .`
  - 실행: `docker run -d -p 5000:5000 --name secpipeline_server secpipeline:latest`

### 3.2 배포 (Render)
- **방식**: GitHub Actions 마지막 `deploy` Job에서 Render **Deploy Hook URL**로 `curl -X POST` 호출 → Render가 새 이미지를 pull 후 자동 배포(무중단).
- **조건**: 단위 테스트와 모든 보안 게이트가 통과(Green Run)한 경우에만 실행(`needs`).
- **시크릿 관리**: Deploy Hook URL 등 모든 시크릿은 GitHub Secrets + 환경 변수로 주입(12-Factor App Config 원칙).
- **서비스 정보**: 서비스명 StudyLog, URL `https://secpipeline.onrender.com/login`, `GET /health`로 상태 확인.

### 3.3 완성된 전체 아키텍처
`Git push → CI 테스트 → SCA/SAST 정적 스캔 → 컨테이너 빌드 및 하드닝 검사 → Render 배포 → OWASP ZAP DAST 동적 스캔`

---

## 4. 핵심 파일 (Key Files)

```
SecPipeline/
├── .github/workflows/devsecops.yml   # 5-Gate + unit-test + deploy + DAST 워크플로우
├── .semgrep/custom-rules.yml         # Gate 3 커스텀 규칙 (render_template_string 동적 인자 탐지)
├── .gitleaks.toml                    # Gate 1 설정 (오탐 제외 allowlist)
├── app/
│   ├── __init__.py                   # create_app() 팩토리, Blueprint 등록, /health
│   ├── config.py                     # 설정 / SECRET_KEY (VULN-01)
│   ├── models.py                     # SQLite 스키마 + get_db() 헬퍼
│   └── routes/
│       ├── auth.py / studylog.py / subjects.py   # 안전 구현 기준선
│       ├── search.py                 # 검색 (VULN-03a, SQLi)
│       ├── dashboard.py              # 대시보드 (VULN-03b, XSS/SSTI)
│       └── export.py                 # CSV 내보내기
│   ├── templates/ , static/
├── tests/                            # pytest 6개 (auth, health, search, studylog)
├── scripts/parse_results.py          # 스캔 결과 파싱
├── Dockerfile                        # 컨테이너 정의 (VULN-04, VULN-05)
├── .dockerignore
├── requirements.txt                  # 의존성 (VULN-02)
├── run.py                            # 진입점: app = create_app()
└── README.md
```

| 파일 | 역할 |
|---|---|
| `.github/workflows/devsecops.yml` | 파이프라인 정의의 중심. Job별 5-Gate + unit-test + deploy(Render) + dast(ZAP) |
| `.semgrep/custom-rules.yml` | 리터럴 인자는 통과, 변수 포함 동적 문자열만 경고하도록 SSTI 탐지 정밀화 |
| `.gitleaks.toml` | 가상환경/더미키/문서 예시 등 오탐 경로 제외 allowlist |
| `app/config.py` | `SECRET_KEY`, `DATABASE_PATH` 등 설정 일원화 (VULN-01 주입/수정 지점) |
| `app/__init__.py` | Application Factory, Blueprint 등록, 헬스체크 엔드포인트 |
| `app/models.py` | DB 스키마 정의 + `get_db()` 연결 헬퍼 |
| `Dockerfile` | 베이스 이미지·실행 사용자·HEALTHCHECK 등 컨테이너 하드닝 (VULN-04/05) |
| `requirements.txt` | 의존성 핀(pin). Red Run용 구버전 ↔ Green Run용 최신 버전 (VULN-02) |
| `run.py` | dev/운영 공통 진입점 (`gunicorn run:app`) |

---

## 5. 느낀 점 및 개선 방향
- **Shift-Left Security** 가치를 직접 검증: Gate 1~5를 통과하지 못한 코드는 빌드조차 되지 않는 환경을 경험.
- **개선 계획**: Prometheus/Grafana 또는 Sentry 연동으로 런타임 모니터링·알림 추가, ZAP Baseline Scan을 Full Scan / Authenticated Scan으로 확장하여 로그인 후 화면까지 점검.

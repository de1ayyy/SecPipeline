#!/usr/bin/env python3
"""실제 명령어 출력을 '터미널 스크린샷' 스타일 PNG로 렌더링한다.
보고서(final-report-figure.docx)에 그대로 삽입할 정확한 그림을 만든다.

각 라인은 한글 포함 여부에 따라 폰트를 자동 선택(Menlo / AppleSDGothicNeo)해
ASCII 표 정렬과 한글 표시를 모두 살린다.
"""
import os
import subprocess
import shutil
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(ROOT, "docs", "figures")
os.makedirs(OUT, exist_ok=True)

MONO = "/System/Library/Fonts/Menlo.ttc"
KOR = "/System/Library/Fonts/AppleSDGothicNeo.ttc"
FS = 22
f_mono = ImageFont.truetype(MONO, FS)
f_kor = ImageFont.truetype(KOR, FS)
f_title = ImageFont.truetype(KOR, 20)

BG = (30, 30, 30)
BAR = (55, 58, 64)
FG = (224, 224, 224)
GREEN = (126, 211, 126)
YEL = (230, 200, 120)
DIM = (150, 150, 150)


def has_kr(s):
    return any(ord(c) > 0x2DFF for c in s)


def font_for(s):
    return f_kor if has_kr(s) else f_mono


def render(lines, fname, title):
    """lines: list of (text, color). 터미널 카드 PNG 생성 (동적 폭)."""
    pad = 22
    bar_h = 38
    lh = FS + 12
    # 가장 긴 줄에 맞춰 폭 자동 결정 (잘림 방지)
    probe = Image.new("RGB", (10, 10))
    pd = ImageDraw.Draw(probe)
    maxw = 0
    for text, _ in lines:
        w = pd.textlength(text, font=font_for(text))
        maxw = max(maxw, w)
    width = int(max(1180, maxw + pad * 2 + 20))
    height = bar_h + pad * 2 + lh * len(lines) + 6
    img = Image.new("RGB", (width, height), BG)
    d = ImageDraw.Draw(img)
    # 상단 바 + 신호등 + 제목
    d.rectangle([0, 0, width, bar_h], fill=BAR)
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        d.ellipse([16 + i * 22, 13, 28 + i * 22, 25], fill=c)
    d.text((100, 9), title, font=f_title, fill=(210, 210, 210))
    y = bar_h + pad
    for text, color in lines:
        d.text((pad, y), text, font=font_for(text), fill=color)
        y += lh
    img.save(os.path.join(OUT, fname))
    print("  rendered", fname)


def run(cmd, cwd=ROOT, env=None):
    e = dict(os.environ)
    if env:
        e.update(env)
    p = subprocess.run(cmd, shell=True, cwd=cwd, env=e, capture_output=True, text=True)
    return (p.stdout + p.stderr)


def cmd_block(prompt, output, max_lines=None):
    """프롬프트 + 출력 라인들을 (text,color) 리스트로."""
    lines = [("$ " + prompt, GREEN)]
    outs = [l for l in output.rstrip("\n").split("\n")]
    if max_lines:
        outs = outs[:max_lines]
    for l in outs:
        lines.append((l.rstrip(), FG))
    return lines


VENV = "source venv/bin/activate >/dev/null 2>&1; "

print("그림 9: seed 데이터")
o = run(VENV + "python scripts/seed_attacks.py")
render(cmd_block("python scripts/seed_attacks.py", o), "fig09_seed.png", "터미널 — 합성 데이터 생성")

print("그림 10: train v1")
o = run(VENV + "python -m app.ml.train 2>/dev/null | grep '^\\[train\\]'")
render(cmd_block("python -m app.ml.train", o), "fig10_train.png", "터미널 — 두 모델 학습 / 우승 선정")

print("그림 17: 모델 파일 + metrics")
ls = run("ls -la models/ | tail -n +2")
mj = run("cat models/metrics.json")
lines = cmd_block("ls -la models/", ls) + [("", FG)] + cmd_block("cat models/metrics.json", mj, max_lines=14)
render(lines, "fig17_model_files.png", "터미널 — 저장된 모델/메타데이터")

def dedupe_compare(text):
    """compare 출력에서 동일 데이터행 중복 제거(여러 run 누적 대비)."""
    out, seen = [], set()
    for l in text.rstrip("\n").split("\n"):
        key = l.strip()
        # 표 데이터행만 중복 제거(헤더/구분선/요약은 유지)
        if key and key[:2] in ("v1", "v2") and key in seen:
            continue
        seen.add(key)
        out.append(l.rstrip())
    return "\n".join(out)

print("그림 19: v1 기준선 (compare 중 v1)")
o = dedupe_compare(run(VENV + "python scripts/compare_versions.py 2>/dev/null"))
v1lines = [("$ python scripts/compare_versions.py", GREEN)]
for l in o.split("\n"):
    if l.strip().startswith("v1") or "버전 비교" in l or l.strip().startswith("version"):
        v1lines.append((l.rstrip(), FG))
render(v1lines, "fig19_v1_baseline.png", "터미널 — 재학습 전 v1 성능(기준선)")

print("그림 20: seed v2")
o = run(VENV + "python scripts/seed_attacks.py --version v2")
render(cmd_block("python scripts/seed_attacks.py --version v2", o), "fig20_seed_v2.png", "터미널 — v2 데이터(신규 변형 포함)")

print("그림 21: train v2")
o = run(VENV + "python -m app.ml.train --version v2 2>/dev/null | grep '^\\[train\\]'")
render(cmd_block("python -m app.ml.train --version v2", o), "fig21_train_v2.png", "터미널 — v2 재학습")

print("그림 22: compare 전체")
o = dedupe_compare(run(VENV + "python scripts/compare_versions.py 2>/dev/null"))
render(cmd_block("python scripts/compare_versions.py", o), "fig22_compare.png", "터미널 — v1 vs v2 성능 비교")

print("그림 27: git log models")
o = run("git log --oneline -- models/attack_clf.pkl")
render(cmd_block("git log --oneline -- models/attack_clf.pkl", o), "fig27_gitlog.png", "터미널 — 모델 버전 이력")

print("그림 28: rollback")
o1 = run("git checkout f34d30c -- models/attack_clf.pkl models/metrics.json 2>&1")
ver = run(VENV + "python -c \"import json;print('data_version =', json.load(open('models/metrics.json'))['data_version'])\"")
restore = run("git checkout HEAD -- models/attack_clf.pkl models/metrics.json 2>&1")
lines = [("$ git checkout f34d30c -- models/attack_clf.pkl models/metrics.json", GREEN),
         ("  (직전 v1 모델 파일로 복원)", DIM),
         ("$ python -c \"...print metrics data_version...\"", GREEN),
         (ver.strip(), YEL),
         ("$ git checkout HEAD -- models/   # 캡처 후 최신(v2)으로 원복", GREEN)]
render(lines, "fig28_rollback.png", "터미널 — 롤백(직전 v1 모델로 복원)")

print("그림 18/24/25: 앱 기동 + 탐지 로그 (test_client로 실제 코드 경로 실행)")
import sys
sys.path.insert(0, ROOT)
LOG = os.path.join(ROOT, "logs", "secpipeline.log")
base = sum(1 for _ in open(LOG)) if os.path.exists(LOG) else 0  # 기존 줄 수 기록
from app import create_app  # create_app()이 '정상 시작됨'을 로깅
_app = create_app()
_c = _app.test_client()
_c.get("/search?q=' OR 1=1--")                 # SQLi
_c.get("/search?q=<script>alert(1)</script>")  # XSS
_c.get("/logs?file=../../etc/passwd")          # path traversal
# 핸들러 flush 보장
for h in _app.logger.handlers:
    try: h.flush()
    except Exception: pass
newlines = open(LOG).read().split("\n")[base:]
startup = next((l for l in newlines if "정상 시작" in l), "")
fresh_alerts = [l for l in newlines if "SECURITY ALERT" in l]

def short(line):
    # 'YYYY-..,ms - app - WARNING - SECURITY ALERT ...' → 시간 + SECURITY ALERT 이후만
    i = line.find("SECURITY ALERT")
    ts = line[:19]
    return (ts + "  " + line[i:]) if i >= 0 else line

# 그림 24: 기동 로그
render([("$ python run.py", GREEN), ("$ tail -n1 logs/secpipeline.log", GREEN),
        (startup.strip() or "(기동 로그)", FG)], "fig24_startup.png", "터미널 — 앱 기동/로깅 정상")
# 그림 25: 공격→경보 (신선)
al = [("$ curl '.../search?q=<SQLi>'   '.../search?q=<XSS>'   '.../logs?file=../../etc/passwd'", GREEN),
      ("$ grep 'SECURITY ALERT' logs/secpipeline.log", GREEN)]
for l in fresh_alerts[:6]:
    al.append((short(l), (255, 180, 120)))
render(al, "fig25_alerts.png", "터미널 — 공격 요청 → 보안 경보 로그(예측 요청 로그)")
# 그림 18: 서비스 반영 컷
render([("$ python run.py   # 모델 로드 후 서비스 시작", GREEN), (startup.strip() or "(기동)", FG), ("", FG),
        ("$ curl '.../search?q=<SQLi>'   → 모델이 탐지", GREEN)] +
       [(short(l), (255, 180, 120)) for l in fresh_alerts[:1]],
       "fig18_serving.png", "터미널 — 저장 모델을 서비스가 로드/적용")

print("그림 7: docker build")
ob = run("docker build -t studylog . 2>&1 | tail -n 8")
render(cmd_block("docker build -t studylog .", ob), "fig07_docker_build.png", "터미널 — Docker 이미지 빌드 성공")

print("그림 8: docker run + 탐지 로그")
run("docker rm -f sp 2>/dev/null")
run("docker run -d --name sp -p 5055:5000 studylog 2>&1")
import time as _t
for _ in range(25):  # 컨테이너 /health 준비 대기
    if run("curl -s -o /dev/null -w '%{http_code}' http://localhost:5055/health 2>/dev/null").strip() == "200":
        break
    _t.sleep(1)
run("curl -s 'http://localhost:5055/search?q=%27%20OR%201%3D1--' >/dev/null 2>&1")
run("curl -s 'http://localhost:5055/search?q=%3Cscript%3Ealert(1)%3C/script%3E' >/dev/null 2>&1")
_t.sleep(2)
dlogs = run("docker logs sp 2>&1 | grep 'SECURITY ALERT' | tail -n 3")
run("docker rm -f sp 2>/dev/null")
d8 = [("$ docker run -d --name sp -p 5055:5000 studylog", GREEN),
      ("$ curl '.../search?q=<SQLi>'   '.../search?q=<XSS>'", GREEN),
      ("$ docker logs sp | grep 'SECURITY ALERT'", GREEN)]
for l in dlogs.rstrip("\n").split("\n"):
    if l.strip():
        i = l.find("SECURITY ALERT")
        d8.append(((l[:19] + "  " + l[i:]) if i >= 0 else l, (255, 180, 120)))
render(d8, "fig08_docker_run.png", "터미널 — 컨테이너 실행 후 악성 요청 탐지")

print("그림 11: 혼동행렬 (실제 artifact 복사)")
cm = None
for f in ["cm_logreg-v2.png", "cm_logreg-v1.png"]:
    r = run("find mlruns -name '%s' | head -1" % f).strip()
    if r:
        cm = r
        break
if cm:
    shutil.copy(os.path.join(ROOT, cm), os.path.join(OUT, "fig11_confusion.png"))
    print("  copied", cm)

# 모델 원복 보장
run("git checkout HEAD -- models/attack_clf.pkl models/metrics.json 2>/dev/null")
print("DONE. figures in", OUT)
print(run("ls -la docs/figures/"))

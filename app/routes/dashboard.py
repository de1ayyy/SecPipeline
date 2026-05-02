from flask import Blueprint, session, redirect, url_for, render_template_string
from app.models import get_db

dashboard_bp = Blueprint('dashboard', __name__)

# ── HTML 템플릿 본문 (헤더 제외) ──────────────────
DASHBOARD_BODY = '''
  <a href="{{ url_for('studylog.list_logs') }}">← 학습 기록</a>
  <hr>
  <table border="1" cellpadding="8" cellspacing="0">
    <tr><td>총 기록 수</td><td><strong>{{ total_logs }}건</strong></td></tr>
    <tr><td>총 학습 시간</td><td><strong>{{ total_hours }}시간</strong></td></tr>
    <tr><td>등록 과목 수</td><td><strong>{{ total_subjects }}개</strong></td></tr>
  </table>
</body></html>
'''


@dashboard_bp.route('/dashboard')
def dashboard():
    """
    사용자 대시보드: 학습 통계 표시.
    ──────────────────────────────────────────────────
    VULN-03b | CWE-79 XSS / CWE-1336 SSTI
    탐지: Semgrep (custom rule), Bandit (B701)
    수정: Sprint 4에서 {{ username }} Jinja2 변수로 교체
    ──────────────────────────────────────────────────
    """
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    db = get_db()
    user_id = session['user_id']
    username = session['username']

    total_logs = db.execute(
        'SELECT COUNT(*) as cnt FROM study_logs WHERE user_id = ?', (user_id,)
    ).fetchone()['cnt']

    total_hours = db.execute(
        'SELECT COALESCE(SUM(hours), 0) as total FROM study_logs WHERE user_id = ?', (user_id,)
    ).fetchone()['total']

    total_subjects = db.execute(
        'SELECT COUNT(*) as cnt FROM subjects WHERE user_id = ?', (user_id,)
    ).fetchone()['cnt']

    db.close()

    # ✅ Fix-03b: Jinja2 템플릿 변수를 사용하여 자동 이스케이프 적용
    header = '''<!DOCTYPE html>
<html><head><title>대시보드</title></head>
<body>
  <h2>{{ username }}님의 대시보드</h2>'''

    return render_template_string(
        header + DASHBOARD_BODY,
        username=username,
        total_logs=total_logs,
        total_hours=total_hours,
        total_subjects=total_subjects
    )
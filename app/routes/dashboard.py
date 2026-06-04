from flask import Blueprint, session, redirect, url_for, render_template
from app.models import get_db
from app.services.stats import get_summary, get_weekly_hours, get_subject_distribution, get_recent_logs
from app.ml import detector

dashboard_bp = Blueprint('dashboard', __name__)


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

    # 기존 통계 쿼리를 stats.py 서비스 계층으로 분리 (로직 보존)
    stats = {
        'summary': get_summary(user_id),
        'weekly': get_weekly_hours(user_id),
        'distribution': get_subject_distribution(user_id),
        'recent_logs': get_recent_logs(user_id),
        'security': detector.get_security_stats()  # 보안 ML 탐지 위젯 (MLSecOps)
    }

    # ✅ Fix-03b 패턴 보존 (HTML을 dashboard.html로 분리)
    return render_template(
        'dashboard.html',
        username=username,
        stats=stats
    )
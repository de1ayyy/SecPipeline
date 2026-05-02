from flask import Blueprint, request, session, redirect, url_for, render_template
from app.models import get_db

search_bp = Blueprint('search', __name__)


# ── 라우트 ────────────────────────────────────────
@search_bp.route('/search')
def search():
    """
    학습 기록 검색.
    ──────────────────────────────────────────────────
    VULN-03a | CWE-89 SQL Injection
    탐지: Semgrep (python.lang.security.audit.formatted-sql-query)
          Bandit  (B608 hardcoded_sql_expressions)
    수정: Sprint 4에서 ? 파라미터 바인딩으로 교체
    ──────────────────────────────────────────────────
    """
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    keyword = request.args.get('q', '')
    results = None

    if keyword:
        db = get_db()
        # ✅ Fix-03a: 파라미터 바인딩(?) 사용으로 SQL Injection 방어
        results = db.execute(
            "SELECT * FROM study_logs WHERE title LIKE ? AND user_id = ?",
            (f"%{keyword}%", session['user_id'])
        ).fetchall()
        db.close()

    return render_template('search.html', keyword=keyword, results=results)
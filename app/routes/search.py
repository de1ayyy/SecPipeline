from flask import Blueprint, request, session, redirect, url_for, render_template_string
from app.models import get_db

search_bp = Blueprint('search', __name__)

# ── HTML 템플릿 ───────────────────────────────────
SEARCH_HTML = '''
<!DOCTYPE html>
<html><head><title>검색</title></head>
<body>
  <h1>🔍 학습 기록 검색</h1>
  <a href="{{ url_for('studylog.list_logs') }}">← 학습 기록</a>
  <hr>
  <form method="get">
    <input name="q" placeholder="검색어 입력" value="{{ keyword or '' }}" required>
    <button type="submit">검색</button>
  </form>
  <hr>
  {% if results is not none %}
    <p>검색 결과: {{ results|length }}건</p>
    {% for log in results %}
    <div style="border:1px solid #ccc; padding:10px; margin:10px 0;">
      <h3>{{ log['title'] }}</h3>
      <p>{{ log['content'] or '' }}</p>
      <small>{{ log['hours'] }}시간 | {{ log['created_at'] }}</small>
    </div>
    {% else %}
    <p>검색 결과가 없습니다.</p>
    {% endfor %}
  {% endif %}
</body></html>
'''


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

    return render_template_string(SEARCH_HTML, keyword=keyword, results=results)
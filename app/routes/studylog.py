from flask import Blueprint, request, session, redirect, url_for, render_template_string
from app.models import get_db

studylog_bp = Blueprint('studylog', __name__)


# ── HTML 템플릿 ───────────────────────────────────
LIST_HTML = '''
<!DOCTYPE html>
<html><head><title>학습 기록</title></head>
<body>
  <h1>📚 내 학습 기록</h1>
  <p>{{ session.username }}님 환영합니다!
     <a href="{{ url_for('auth.logout') }}">로그아웃</a> |
     <a href="{{ url_for('subjects.list_subjects') }}">과목 관리</a> |
     <a href="{{ url_for('search.search') }}">검색</a> |
     <a href="{{ url_for('dashboard.dashboard') }}">대시보드</a> |
     <a href="{{ url_for('export.export_csv') }}">CSV 내보내기</a>
  </p>
  <a href="{{ url_for('studylog.create_log') }}">+ 새 기록</a>
  <hr>
  {% for log in logs %}
  <div style="border:1px solid #ccc; padding:10px; margin:10px 0;">
    <h3>{{ log['title'] }}</h3>
    <p>{{ log['content'] or '' }}</p>
    <small>{{ log['hours'] }}시간 | {{ log['created_at'] }}</small><br>
    <a href="{{ url_for('studylog.edit_log', log_id=log['id']) }}">수정</a>
    <form method="post" action="{{ url_for('studylog.delete_log', log_id=log['id']) }}" style="display:inline;">
      <button type="submit" onclick="return confirm('삭제하시겠습니까?')">삭제</button>
    </form>
  </div>
  {% else %}
  <p>아직 기록이 없습니다. 첫 기록을 작성해보세요!</p>
  {% endfor %}
</body></html>
'''

FORM_HTML = '''
<!DOCTYPE html>
<html><head><title>{{ '수정' if log else '새 기록' }}</title></head>
<body>
  <h1>{{ '수정' if log else '새 기록 작성' }}</h1>
  <form method="post">
    <input name="title" placeholder="제목" value="{{ log['title'] if log else '' }}" required><br><br>
    <textarea name="content" placeholder="내용" rows="5" cols="40">{{ log['content'] if log else '' }}</textarea><br><br>
    <input name="hours" type="number" step="0.5" placeholder="학습 시간" value="{{ log['hours'] if log else '' }}"><br><br>
    <select name="subject_id">
      <option value="">과목 선택 (선택사항)</option>
      {% for s in subjects %}
      <option value="{{ s['id'] }}" {{ 'selected' if log and log['subject_id'] == s['id'] else '' }}>{{ s['name'] }}</option>
      {% endfor %}
    </select><br><br>
    <button type="submit">저장</button>
  </form>
  <a href="{{ url_for('studylog.list_logs') }}">← 목록</a>
</body></html>
'''


# ── 라우트 ────────────────────────────────────────
@studylog_bp.route('/logs')
def list_logs():
    """학습 기록 목록 조회 (로그인 필수)."""
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    db = get_db()
    logs = db.execute(
        'SELECT * FROM study_logs WHERE user_id = ? ORDER BY created_at DESC',
        (session['user_id'],)
    ).fetchall()
    db.close()
    return render_template_string(LIST_HTML, logs=logs, session=session)


@studylog_bp.route('/logs/create', methods=['GET', 'POST'])
def create_log():
    """새 학습 기록 생성."""
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    db = get_db()
    if request.method == 'POST':
        db.execute(
            'INSERT INTO study_logs (title, content, hours, subject_id, user_id) VALUES (?, ?, ?, ?, ?)',
            (
                request.form['title'],
                request.form.get('content', ''),
                request.form.get('hours', 0) or 0,
                request.form.get('subject_id') or None,
                session['user_id']
            )
        )
        db.commit()
        db.close()
        return redirect(url_for('studylog.list_logs'))

    subjects = db.execute(
        'SELECT * FROM subjects WHERE user_id = ?', (session['user_id'],)
    ).fetchall()
    db.close()
    return render_template_string(FORM_HTML, log=None, subjects=subjects)


@studylog_bp.route('/logs/<int:log_id>/edit', methods=['GET', 'POST'])
def edit_log(log_id):
    """학습 기록 수정."""
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    db = get_db()
    if request.method == 'POST':
        db.execute(
            'UPDATE study_logs SET title=?, content=?, hours=?, subject_id=? WHERE id=? AND user_id=?',
            (
                request.form['title'],
                request.form.get('content', ''),
                request.form.get('hours', 0) or 0,
                request.form.get('subject_id') or None,
                log_id,
                session['user_id']
            )
        )
        db.commit()
        db.close()
        return redirect(url_for('studylog.list_logs'))

    log = db.execute(
        'SELECT * FROM study_logs WHERE id=? AND user_id=?',
        (log_id, session['user_id'])
    ).fetchone()
    subjects = db.execute(
        'SELECT * FROM subjects WHERE user_id = ?', (session['user_id'],)
    ).fetchall()
    db.close()

    if not log:
        return redirect(url_for('studylog.list_logs'))
    return render_template_string(FORM_HTML, log=log, subjects=subjects)


@studylog_bp.route('/logs/<int:log_id>/delete', methods=['POST'])
def delete_log(log_id):
    """학습 기록 삭제."""
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    db = get_db()
    db.execute(
        'DELETE FROM study_logs WHERE id=? AND user_id=?',
        (log_id, session['user_id'])
    )
    db.commit()
    db.close()
    return redirect(url_for('studylog.list_logs'))
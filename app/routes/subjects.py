from flask import Blueprint, request, session, redirect, url_for, render_template_string
from app.models import get_db

subjects_bp = Blueprint('subjects', __name__)

# ── HTML 템플릿 ───────────────────────────────────
SUBJECTS_HTML = '''
<!DOCTYPE html>
<html><head><title>과목 관리</title></head>
<body>
  <h1>📂 과목 관리</h1>
  <a href="{{ url_for('studylog.list_logs') }}">← 학습 기록</a>
  <hr>
  <form method="post" action="{{ url_for('subjects.create_subject') }}">
    <input name="name" placeholder="새 과목 이름" required>
    <button type="submit">추가</button>
  </form>
  <hr>
  {% for s in subjects %}
  <div style="margin:8px 0;">
    📁 <strong>{{ s['name'] }}</strong>
    <form method="post" action="{{ url_for('subjects.delete_subject', subject_id=s['id']) }}" style="display:inline;">
      <button type="submit" onclick="return confirm('삭제하시겠습니까?')">삭제</button>
    </form>
  </div>
  {% else %}
  <p>등록된 과목이 없습니다.</p>
  {% endfor %}
</body></html>
'''


# ── 라우트 ────────────────────────────────────────
@subjects_bp.route('/subjects')
def list_subjects():
    """과목 목록 조회."""
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    db = get_db()
    subjects = db.execute(
        'SELECT * FROM subjects WHERE user_id = ? ORDER BY name',
        (session['user_id'],)
    ).fetchall()
    db.close()
    return render_template_string(SUBJECTS_HTML, subjects=subjects)


@subjects_bp.route('/subjects/create', methods=['POST'])
def create_subject():
    """새 과목 추가."""
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    name = request.form['name'].strip()
    if name:
        db = get_db()
        db.execute(
            'INSERT INTO subjects (name, user_id) VALUES (?, ?)',
            (name, session['user_id'])
        )
        db.commit()
        db.close()
    return redirect(url_for('subjects.list_subjects'))


@subjects_bp.route('/subjects/<int:subject_id>/delete', methods=['POST'])
def delete_subject(subject_id):
    """과목 삭제."""
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    db = get_db()
    db.execute(
        'DELETE FROM subjects WHERE id = ? AND user_id = ?',
        (subject_id, session['user_id'])
    )
    db.commit()
    db.close()
    return redirect(url_for('subjects.list_subjects'))
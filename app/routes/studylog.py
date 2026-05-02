from flask import Blueprint, request, session, redirect, url_for, render_template
from app.models import get_db

studylog_bp = Blueprint('studylog', __name__)



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
    return render_template('studylog/list.html', logs=logs, session=session)


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
    return render_template('studylog/form.html', log=None, subjects=subjects)


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
    return render_template('studylog/form.html', log=log, subjects=subjects)


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
from flask import Blueprint, request, session, redirect, url_for, render_template
from app.models import get_db

subjects_bp = Blueprint('subjects', __name__)


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
    return render_template('subjects/list.html', subjects=subjects)


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
from flask import Blueprint, request, session, redirect, url_for, render_template
from werkzeug.security import generate_password_hash, check_password_hash
from app.models import get_db

auth_bp = Blueprint('auth', __name__)


# ── 라우트 ────────────────────────────────────────
@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    """회원가입: 사용자명 + 비밀번호 해시 저장."""
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        db = get_db()
        try:
            db.execute(
                'INSERT INTO users (username, password_hash) VALUES (?, ?)',
                (username, generate_password_hash(password))
            )
            db.commit()
            return redirect(url_for('auth.login'))
        except Exception:
            return render_template('auth/register.html', error='이미 존재하는 사용자명입니다.')
        finally:
            db.close()
    return render_template('auth/register.html', error=None)


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    """로그인: 비밀번호 해시 비교 후 세션 생성."""
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        db = get_db()
        user = db.execute(
            'SELECT * FROM users WHERE username = ?', (username,)
        ).fetchone()
        db.close()

        if user and check_password_hash(user['password_hash'], password):
            session['user_id'] = user['id']
            session['username'] = user['username']
            return redirect(url_for('studylog.list_logs'))
        return render_template('auth/login.html', error='사용자명 또는 비밀번호가 올바르지 않습니다.')
    return render_template('auth/login.html', error=None)


@auth_bp.route('/logout')
def logout():
    """로그아웃: 세션 초기화."""
    session.clear()
    return redirect(url_for('auth.login'))

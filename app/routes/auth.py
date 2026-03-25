from flask import Blueprint, request, session, redirect, url_for, render_template_string
from werkzeug.security import generate_password_hash, check_password_hash
from app.models import get_db

auth_bp = Blueprint('auth', __name__)

# ── HTML 템플릿 (간소화) ──────────────────────────
REGISTER_HTML = '''
<!DOCTYPE html>
<html><head><title>회원가입</title></head>
<body>
  <h1>회원가입</h1>
  {% if error %}<p style="color:red;">{{ error }}</p>{% endif %}
  <form method="post">
    <input name="username" placeholder="사용자명" required><br><br>
    <input name="password" type="password" placeholder="비밀번호" required><br><br>
    <button type="submit">가입</button>
  </form>
  <p><a href="{{ url_for('auth.login') }}">로그인</a></p>
</body></html>
'''

LOGIN_HTML = '''
<!DOCTYPE html>
<html><head><title>로그인</title></head>
<body>
  <h1>로그인</h1>
  {% if error %}<p style="color:red;">{{ error }}</p>{% endif %}
  <form method="post">
    <input name="username" placeholder="사용자명" required><br><br>
    <input name="password" type="password" placeholder="비밀번호" required><br><br>
    <button type="submit">로그인</button>
  </form>
  <p><a href="{{ url_for('auth.register') }}">회원가입</a></p>
</body></html>
'''


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
            return render_template_string(REGISTER_HTML, error='이미 존재하는 사용자명입니다.')
        finally:
            db.close()
    return render_template_string(REGISTER_HTML, error=None)


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
        return render_template_string(LOGIN_HTML, error='사용자명 또는 비밀번호가 올바르지 않습니다.')
    return render_template_string(LOGIN_HTML, error=None)


@auth_bp.route('/logout')
def logout():
    """로그아웃: 세션 초기화."""
    session.clear()
    return redirect(url_for('auth.login'))

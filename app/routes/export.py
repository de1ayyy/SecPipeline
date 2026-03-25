import csv
import io
from flask import Blueprint, session, redirect, url_for, Response
from app.models import get_db

export_bp = Blueprint('export', __name__)


@export_bp.route('/export')
def export_csv():
    """학습 기록을 CSV 파일로 다운로드."""
    if 'user_id' not in session:
        return redirect(url_for('auth.login'))

    db = get_db()
    logs = db.execute(
        'SELECT title, content, hours, created_at FROM study_logs WHERE user_id = ? ORDER BY created_at DESC',
        (session['user_id'],)
    ).fetchall()
    db.close()

    # 메모리 안에서 CSV 생성
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['제목', '내용', '학습시간', '작성일'])
    for log in logs:
        writer.writerow([log['title'], log['content'] or '', log['hours'], log['created_at']])

    # CSV 파일 다운로드 응답
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={'Content-Disposition': 'attachment; filename=studylog_export.csv'}
    )
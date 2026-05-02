from app.models import get_db

def get_summary(user_id):
    db = get_db()
    total_logs = db.execute('SELECT COUNT(*) as cnt FROM study_logs WHERE user_id = ?', (user_id,)).fetchone()['cnt']
    total_hours = db.execute('SELECT COALESCE(SUM(hours), 0) as total FROM study_logs WHERE user_id = ?', (user_id,)).fetchone()['total']
    total_subjects = db.execute('SELECT COUNT(*) as cnt FROM subjects WHERE user_id = ?', (user_id,)).fetchone()['cnt']
    
    # 최근 7일 학습 시간
    weekly_hours = db.execute("SELECT COALESCE(SUM(hours), 0) as total FROM study_logs WHERE user_id = ? AND created_at >= date('now', '-7 days')", (user_id,)).fetchone()['total']
    db.close()
    
    return {
        'total_logs': total_logs,
        'total_hours': total_hours,
        'total_subjects': total_subjects,
        'weekly_hours': weekly_hours
    }

def get_weekly_hours(user_id):
    db = get_db()
    logs = db.execute(
        "SELECT substr(created_at, 1, 10) as date, SUM(hours) as hours FROM study_logs WHERE user_id = ? GROUP BY date ORDER BY date DESC LIMIT 7", 
        (user_id,)
    ).fetchall()
    db.close()
    
    # 과거순으로 정렬
    dates = [log['date'] for log in logs][::-1]
    hours = [log['hours'] for log in logs][::-1]
    return {'labels': dates, 'data': hours}

def get_subject_distribution(user_id):
    db = get_db()
    logs = db.execute(
        "SELECT s.name, COUNT(l.id) as count FROM study_logs l LEFT JOIN subjects s ON l.subject_id = s.id WHERE l.user_id = ? GROUP BY l.subject_id", 
        (user_id,)
    ).fetchall()
    db.close()
    
    labels = [log['name'] if log['name'] else '미분류' for log in logs]
    counts = [log['count'] for log in logs]
    return {'labels': labels, 'data': counts}

def get_recent_logs(user_id, limit=5):
    db = get_db()
    logs = db.execute(
        'SELECT * FROM study_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
        (user_id, limit)
    ).fetchall()
    db.close()
    return logs

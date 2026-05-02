import pytest
from app import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config["TESTING"] = True
    
    # DB 초기화를 보장하여 테스트 독립성 확보
    with app.app_context():
        from app.models import get_db, init_db
        init_db()
        db = get_db()
        # 테스트 전/후 데이터 초기화
        db.execute('DELETE FROM study_logs')
        db.execute('DELETE FROM subjects')
        db.execute('DELETE FROM users')
        db.commit()
        db.close()
    
    with app.test_client() as c:
        yield c

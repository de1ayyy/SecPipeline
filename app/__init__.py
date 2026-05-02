from flask import Flask
from app.config import SECRET_KEY
from app.models import init_db
from app.logger import setup_logger


def create_app():
    """Flask 앱 팩토리: 설정 → DB 초기화 → Blueprint 등록 → 반환."""
    app = Flask(__name__)
    app.secret_key = SECRET_KEY

    # 앱 컨텍스트 안에서 DB 테이블 생성
    with app.app_context():
        init_db()

    # Blueprint 등록 (지연 임포트로 순환 참조 방지)
    from app.routes.auth import auth_bp
    from app.routes.studylog import studylog_bp
    from app.routes.subjects import subjects_bp
    from app.routes.search import search_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.export import export_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(studylog_bp)
    app.register_blueprint(subjects_bp)
    app.register_blueprint(search_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(export_bp)

    # 로깅 시스템 초기화
    setup_logger(app)

    # Docker HEALTHCHECK 및 Render 헬스체크용
    @app.route('/health')
    def health():
        return {"status": "ok"}, 200

    return app
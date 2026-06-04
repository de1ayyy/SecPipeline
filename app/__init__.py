from flask import Flask, abort, request
from app.config import SECRET_KEY
from app.models import init_db
from app.logger import setup_logger
from flask import render_template
from app.ml.config import DETECTOR_MODE
from app.ml import detector


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

    # ── 보안 ML 미들웨어: 매 요청을 악성 여부로 스코어링 (MLSecOps) ──
    # 기본 shadow 모드: 탐지·로깅만. DETECTOR_MODE=enforce면 403 차단.
    # 모델이 없으면 detector가 graceful fallback(탐지 비활성)하므로 앱은 정상 동작.
    @app.before_request
    def detect_malicious_request():
        query = request.query_string.decode("utf-8", "ignore")
        try:
            body = request.get_data(as_text=True)[:2000]
        except Exception:
            body = ""
        label, confidence = detector.classify_request(
            request.method, request.path, query, body)
        if detector.is_attack(label, confidence):
            detector.record_event(label, confidence, request.method, request.path)
            app.logger.warning(
                "SECURITY ALERT [%s] conf=%.3f mode=%s %s %s from=%s",
                label, confidence, DETECTOR_MODE, request.method,
                request.full_path, request.remote_addr)
            if DETECTOR_MODE == "enforce":
                abort(403)

    # 에러 핸들러 등록
    @app.errorhandler(404)
    def page_not_found(e):
        return render_template('errors/404.html'), 404

    @app.errorhandler(500)
    def internal_server_error(e):
        return render_template('errors/500.html'), 500

    # Docker HEALTHCHECK 및 Render 헬스체크용
    @app.route('/health')
    def health():
        return {"status": "ok"}, 200

    return app
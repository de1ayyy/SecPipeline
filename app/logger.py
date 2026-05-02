import logging
import os
from logging.handlers import RotatingFileHandler

def setup_logger(app):
    """애플리케이션 에러 및 운영 기록을 위한 로깅 체계 설정"""
    if not os.path.exists('logs'):
        os.mkdir('logs')

    # 로그 파일이 1MB를 넘으면 새 파일 생성 (최대 3개 백업 보관)
    file_handler = RotatingFileHandler('logs/secpipeline.log', maxBytes=1024000, backupCount=3)
    
    # 로그 포맷: [시간] [로그레벨] [모듈명] 메시지
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    file_handler.setFormatter(formatter)
    
    # INFO 레벨 이상의 모든 로그(INFO, WARNING, ERROR)를 기록
    file_handler.setLevel(logging.INFO)
    
    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('SecPipeline 애플리케이션 및 로깅 시스템 정상 시작됨')

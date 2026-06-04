"""SecPipeline 보안 ML 패키지.

악성 HTTP 요청 탐지(MLSecOps) 기능을 제공한다.
- config: 경로/라벨/모드 등 설정 (env 분리)
- data:   합성 데이터 로더 + 공유 전처리(normalize_request)
- train:  LogReg/NB 학습 + MLflow 로깅
- detector: 런타임 추론 (before_request 미들웨어에서 사용)
"""

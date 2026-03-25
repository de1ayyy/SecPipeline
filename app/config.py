import os
SECRET_KEY = "super-secret-key-12345"   # VULN-01: 하드코딩된 시크릿
DATABASE_PATH = os.path.join(os.path.dirname(__file__), '..', 'studylog.db')
import os
SECRET_KEY = "fl4sk_s3cr3t_8Kx9Qm2vPwLnR7jY5tZa"   # VULN-01: 하드코딩된 시크릿
DATABASE_PATH = os.path.join(os.path.dirname(__file__), '..', 'studylog.db')
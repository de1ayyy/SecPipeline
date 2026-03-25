#VULN-04 : EOL 버전 Python 3.8 사용 (Trivy가 다수의 CVE 탐지함)
FROM python:3.8-slim

# VULN-05 : WORKDIR 없이 COPY (hadolint DL3045)
COPY requirements.txt requirements.txt
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5000

# VULN-05: USER 지시어 없음 → root로 실행 (CWE-250)
# VULN-05: HEALTHCHECK 없음
# VULN-05: shell form CMD (hadolint DL3025)
CMD python run.py
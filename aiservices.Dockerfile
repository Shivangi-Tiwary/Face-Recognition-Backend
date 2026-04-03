FROM python:3.10-slim

WORKDIR /app

# Copy requirements first (better layer caching)
COPY ai-services/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

# Copy rest of FastAPI code
COPY ai-services/ .

EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
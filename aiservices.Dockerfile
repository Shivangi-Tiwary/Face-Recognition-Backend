# =============================================
# Dockerfile - Python AI Services (FastAPI)
# =============================================
FROM python:3.10-slim

RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY ai-services/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY ai-services/ .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
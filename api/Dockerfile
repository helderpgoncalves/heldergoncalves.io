# ─────────────────────────────────────────────────────────────
# A API da Bolsa: Python, FastAPI e yfinance. É um serviço à parte
# do site — o servidor Node fala com ele pela rede interna e é o
# único que o faz. No Coolify: uma aplicação nova, build pack
# Dockerfile, base directory `/api`, sem domínio público.
# ─────────────────────────────────────────────────────────────
FROM python:3.12-slim
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Corre como utilizador sem privilégios; o yfinance guarda uma cache de
# fusos horários na pasta do utilizador, por isso ela tem de ser dele.
RUN useradd --system --uid 1001 bolsa && mkdir -p /app/.cache && chown -R bolsa /app
USER bolsa

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2)" || exit 1

# Um processo chega: o trabalho é esperar pelo Yahoo, e a cache é por processo.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--no-access-log"]

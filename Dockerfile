FROM python:3.9-slim
WORKDIR /app
COPY ./app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY ./app /app
EXPOSE 5000
# gthread workers so a streaming /ask answer doesn't block other visitors
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--worker-class", "gthread", "--workers", "2", "--threads", "8", "--timeout", "120", "app:app"]

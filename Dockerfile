FROM node:22-bookworm-slim AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY index.html vite.config.js ./
COPY src ./src
COPY public ./public
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
RUN npm run build

FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY --from=frontend /app/dist ./dist
COPY backend ./backend
COPY ML ./ML
RUN useradd --create-home fmotos
USER fmotos
ENV OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1
EXPOSE 8000
HEALTHCHECK CMD python -c "from urllib.request import urlopen; urlopen('http://127.0.0.1:8000/api/health', timeout=3)"
CMD ["python","-m","uvicorn","backend.main:app","--host","0.0.0.0","--port","8000"]

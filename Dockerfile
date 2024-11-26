FROM python:3.13.0-bookworm

WORKDIR /app

COPY requirements.txt .
#COPY .env-admin .
COPY .env .


RUN pip install --upgrade pip
RUN pip install -r requirements.txt
RUN rm -f requirements.txt

# CMD ["python3"]

EXPOSE 3000

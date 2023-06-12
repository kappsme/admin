FROM python:3.8

WORKDIR /app

COPY requirements.txt .
#COPY .env-admin .
COPY .env .


RUN python -m pip install pip==22.3.1
RUN pip install -r requirements.txt
RUN rm -f requirements.txt

# CMD ["python3"]

EXPOSE 3000

FROM python:3.10-alpine

ENV PYTHinDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /code

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8000

RUN python manage.py migrate

ENV DJANGO_SETTINGS_MODULE=RandomChat.settings

CMD ["uvicorn", "RandomChat.asgi:application", "--host", "0.0.0.0", "--port", "8000"]

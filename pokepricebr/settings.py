from pathlib import Path

# =========================
# BASE
# =========================
BASE_DIR = Path(__file__).resolve().parent.parent


# =========================
# SEGURANÇA / DEV
# =========================
SECRET_KEY = 'django-insecure-dev-key'

DEBUG = True

ALLOWED_HOSTS = []


# =========================
# APPS
# =========================
INSTALLED_APPS = [
    'django.contrib.staticfiles',

    'cards',
]


# =========================
# MIDDLEWARE
# =========================
MIDDLEWARE = []


# =========================
# URLS / WSGI
# =========================
ROOT_URLCONF = 'pokepricebr.urls'

WSGI_APPLICATION = 'pokeprice.wsgi.application'


# =========================
# DATABASE
# =========================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# =========================
# INTERNACIONALIZAÇÃO
# =========================
LANGUAGE_CODE = 'pt-br'

TIME_ZONE = 'America/Sao_Paulo'

USE_I18N = True
USE_TZ = True


# =========================
# STATIC FILES
# =========================
STATIC_URL = 'static/'


# =========================
# DEFAULT PRIMARY KEY
# =========================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

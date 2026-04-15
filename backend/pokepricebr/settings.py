from pathlib import Path
import os

from dotenv import load_dotenv
from datetime import timedelta

# =========================
# BASE
# =========================
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
# =========================
# SEGURANÇA / DEV
# =========================
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("DJANGO_SECRET_KEY não definida")

DEBUG = os.getenv("DEBUG", "False") == "True"


def _split_env_list(raw_value: str | None, default: list[str]) -> list[str]:
    if not raw_value:
        return default

    values = [item.strip() for item in raw_value.split(",") if item.strip()]
    return values or default

ALLOWED_HOSTS = _split_env_list(
    os.getenv("ALLOWED_HOSTS"),
    [
        'localhost',
        '127.0.0.1',
        "pricedex.com.br",
        "www.pricedex.com.br",
        "api.pricedex.com.br",
    ],
)


# =========================
# APPS
# =========================
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_celery_results",

    "rest_framework",
    "cards",
    "billing",
    "accounts",
    "core_permissions",
    "corsheaders",

]

USE_SUPABASE_STORAGE = os.getenv("USE_SUPABASE_STORAGE", "False") == "True"

if USE_SUPABASE_STORAGE:
    INSTALLED_APPS.append("storages")


# =========================
# MIDDLEWARE
# =========================
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",

    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "core_permissions.middleware.SubscriptionStateMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]



# =========================
# URLS / WSGI
# =========================
ROOT_URLCONF = 'pokepricebr.urls'

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = 'pokepricebr.wsgi.application'


# =========================
# DATABASE
# =========================
#DATABASES = {
#    'default': {
#        'ENGINE': 'django.db.backends.postgresql',
#        'NAME': BASE_DIR / 'db.sqlite3',
#    }
#}

# =========================
# DATABASE (Supabase Postgres)
# =========================
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST"),
        "PORT": os.getenv("DB_PORT", "6453"),
        "CONN_MAX_AGE": 600,
        "OPTIONS": {
            "sslmode": "require",
        #"target_session_attrs": "read-write",
        },
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
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"


# =========================
# DEFAULT PRIMARY KEY
# =========================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


# =========================
# CELERY + REDIS
# =========================

REDIS_URL = os.getenv("REDIS_PUBLIC_URL")
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", REDIS_URL)
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", REDIS_URL)

CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = "America/Sao_Paulo"
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True


CORS_ALLOWED_ORIGINS = _split_env_list(
    os.getenv("CORS_ALLOWED_ORIGINS"),
    [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://pricedex.com.br",
        "https://www.pricedex.com.br",
    ],
)

CSRF_TRUSTED_ORIGINS = _split_env_list(
    os.getenv("CSRF_TRUSTED_ORIGINS"),
    [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://pricedex.com.br",
        "https://www.pricedex.com.br",
    ],
)


REST_FRAMEWORK = {
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=60),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
}

if USE_SUPABASE_STORAGE:
    SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
    SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "")

    AWS_ACCESS_KEY_ID = os.getenv("SUPABASE_S3_ACCESS_KEY", "")
    AWS_SECRET_ACCESS_KEY = os.getenv("SUPABASE_S3_SECRET_KEY", "")
    AWS_STORAGE_BUCKET_NAME = SUPABASE_STORAGE_BUCKET
    AWS_S3_REGION_NAME = os.getenv("SUPABASE_S3_REGION", "us-east-1")
    AWS_S3_ENDPOINT_URL = os.getenv("SUPABASE_S3_ENDPOINT_URL", f"{SUPABASE_URL}/storage/v1/s3")
    AWS_S3_ADDRESSING_STYLE = "path"
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    AWS_DEFAULT_ACL = None
    AWS_QUERYSTRING_AUTH = False
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "max-age=86400"}

    SUPABASE_STORAGE_PUBLIC_BASE_URL = os.getenv(
        "SUPABASE_STORAGE_PUBLIC_BASE_URL",
        f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_STORAGE_BUCKET}" if SUPABASE_URL and SUPABASE_STORAGE_BUCKET else "",
    ).rstrip("/")

    if SUPABASE_STORAGE_PUBLIC_BASE_URL:
        AWS_S3_CUSTOM_DOMAIN = SUPABASE_STORAGE_PUBLIC_BASE_URL.replace("https://", "").replace("http://", "")

    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3.S3Storage",
            "OPTIONS": {
                "location": "media",
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

    MEDIA_URL = f"{SUPABASE_STORAGE_PUBLIC_BASE_URL}/media/" if SUPABASE_STORAGE_PUBLIC_BASE_URL else "/media/"
else:
    MEDIA_URL = "/media/"
    MEDIA_ROOT = BASE_DIR / "media"

STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_PRO_PRICE_ID = os.getenv("STRIPE_PRO_PRICE_ID", "")
STRIPE_SUCCESS_URL = os.getenv("STRIPE_SUCCESS_URL", "http://localhost:5173/perfil?billing=success")
STRIPE_CANCEL_URL = os.getenv("STRIPE_CANCEL_URL", "http://localhost:5173/perfil?billing=cancel")

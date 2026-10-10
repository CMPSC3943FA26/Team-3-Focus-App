import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-secret-change-before-deploying")
    SQLALCHEMY_DATABASE_URI = os.environ.get("DATABASE_URL", "sqlite:///focusapp.db")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    ENV_NAME = "base"


class DevelopmentConfig(Config):
    DEBUG = True
    ENV_NAME = "development"


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    ENV_NAME = "testing"


class ProductionConfig(Config):
    DEBUG = False
    ENV_NAME = "production"


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}


def get_config(config_name=None):
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")
    return config_by_name.get(config_name, DevelopmentConfig)

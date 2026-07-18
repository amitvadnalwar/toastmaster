# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    guest_jwt_secret: str
    guest_token_expire_hours: int = 4

    # TLS certificate verification for outbound calls (Supabase, JWKS, SendGrid).
    # MUST stay True in production. Only set SSL_VERIFY=false locally if your dev
    # network does SSL inspection with a cert Python doesn't trust. Never set it
    # on Render — those endpoints all present valid, publicly-trusted certs.
    ssl_verify: bool = True

    # SendGrid email — https://app.sendgrid.com/settings/api_keys
    # from_address must exactly match a Single Sender verified in SendGrid
    # (Settings -> Sender Authentication -> Verify a Single Sender).
    email_api_key: str = ""
    email_from_address: str = ""
    email_from_name: str = "Toastmaster PSE"

    # Sentry error monitoring — https://sentry.io. Leave blank to disable
    # (SDK becomes a safe no-op). Separate project/DSN from the web frontend's
    # VITE_SENTRY_DSN — they're two different apps in the same Sentry account.
    sentry_dsn: str = ""
    sentry_environment: str = "production"

    @property
    def supabase_jwks_url(self) -> str:
        return f"{self.supabase_url}/auth/v1/.well-known/jwks.json"

    model_config = {"env_file": ".env"}


settings = Settings()

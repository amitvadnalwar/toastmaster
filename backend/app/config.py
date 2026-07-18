# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    guest_jwt_secret: str
    guest_token_expire_hours: int = 4

    # SendGrid email — https://app.sendgrid.com/settings/api_keys
    # from_address must exactly match a Single Sender verified in SendGrid
    # (Settings -> Sender Authentication -> Verify a Single Sender).
    email_api_key: str = ""
    email_from_address: str = ""
    email_from_name: str = "Toastmaster PSE"

    @property
    def supabase_jwks_url(self) -> str:
        return f"{self.supabase_url}/auth/v1/.well-known/jwks.json"

    model_config = {"env_file": ".env"}


settings = Settings()

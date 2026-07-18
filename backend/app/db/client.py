import httpx
from supabase import Client, ClientOptions, create_client

from app.config import settings

# TLS verification is on by default (settings.ssl_verify). It can be disabled
# only via SSL_VERIFY=false in the local .env, for dev networks that do SSL
# inspection with an untrusted cert. Production (Render) leaves it True.
_http = httpx.Client(verify=settings.ssl_verify)

supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
    options=ClientOptions(httpx_client=_http),
)
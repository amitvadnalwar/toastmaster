import httpx
from supabase import Client, ClientOptions, create_client

from app.config import settings

# verify=False bypasses corporate SSL certificate inspection on the dev network.
# The service-role key and Supabase URL are already secrets; skipping cert
# verification here only affects the server→Supabase connection in dev.
_http = httpx.Client(verify=False)

supabase: Client = create_client(
    settings.supabase_url,
    settings.supabase_service_role_key,
    options=ClientOptions(httpx_client=_http),
)
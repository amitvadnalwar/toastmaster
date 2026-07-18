import httpx

from app.config import settings

_TIMEOUT_SECONDS = 10.0


def send_temp_password_email(to_email: str, to_name: str, temp_password: str) -> None:
    # If not configured yet, print to console (dev mode)
    if not settings.email_api_key or not settings.email_from_address:
        print(f"[DEV EMAIL] To: {to_email} | Temp password: {temp_password}")
        return

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
      <h2 style="color:#8B1A1A">Welcome to Toastmasters!</h2>
      <p>Hi {to_name},</p>
      <p>Your club account has been created. Use the credentials below to log in to the app:</p>
      <table style="margin:20px 0;border-collapse:collapse">
        <tr>
          <td style="padding:8px 12px;color:#6b7280;font-size:13px">Email</td>
          <td style="padding:8px 12px;font-weight:600">{to_email}</td>
        </tr>
        <tr style="background:#f9fafb">
          <td style="padding:8px 12px;color:#6b7280;font-size:13px">Temporary Password</td>
          <td style="padding:8px 12px;font-weight:600;font-family:monospace;letter-spacing:1px">{temp_password}</td>
        </tr>
      </table>
      <p style="color:#6b7280;font-size:13px">
        You will be asked to create a new password when you first log in.
      </p>
    </div>
    """

    payload = {
        "personalizations": [{"to": [{"email": to_email}]}],
        "from": {"email": settings.email_from_address, "name": settings.email_from_name},
        "subject": "Your Toastmasters App Credentials",
        "content": [{"type": "text/html", "value": html}],
    }

    try:
        response = httpx.post(
            "https://api.sendgrid.com/v3/mail/send",
            headers={"Authorization": f"Bearer {settings.email_api_key}"},
            json=payload,
            timeout=_TIMEOUT_SECONDS,
            verify=settings.ssl_verify,
        )
        response.raise_for_status()
    except httpx.HTTPError as exc:
        # Never let an email provider outage/misconfig break member
        # creation — fall back to logging the temp password like dev mode.
        print(f"[EMAIL FAILED] To: {to_email} | Temp password: {temp_password} | Error: {exc}")

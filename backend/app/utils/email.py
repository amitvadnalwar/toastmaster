import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings


def send_temp_password_email(to_email: str, to_name: str, temp_password: str) -> None:
    # If credentials not configured yet, print to console (dev mode)
    if not settings.smtp_user or not settings.smtp_password:
        print(f"[DEV EMAIL] To: {to_email} | Temp password: {temp_password}")
        return

    host = settings.smtp_host

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

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Your Toastmasters App Credentials"
    msg["From"] = settings.smtp_from
    msg["To"] = to_email
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(host, settings.smtp_port) as server:
        server.ehlo()
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)
        server.sendmail(settings.smtp_from, to_email, msg.as_string())

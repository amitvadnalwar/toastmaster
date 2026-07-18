import smtplib
import socket
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

# Fail fast rather than hang if the SMTP host is unreachable (e.g. the
# host's egress silently drops the connection instead of refusing it).
_CONNECT_TIMEOUT_SECONDS = 10


class _IPv4SMTP(smtplib.SMTP):
    """smtplib.SMTP, but connects over IPv4 only.

    Many container hosts (Render included) advertise a non-functional IPv6
    stack. smtp.gmail.com resolves to both an IPv4 and IPv6 address, and
    smtplib's default connection logic can pick the IPv6 one and fail
    immediately with "[Errno 101] Network is unreachable". self._host stays
    the original hostname (only the low-level socket connect is overridden),
    so STARTTLS's certificate/SNI hostname check still works correctly.
    """

    def _get_socket(self, host, port, timeout):
        last_error: OSError | None = None
        for family, socktype, proto, _canonname, sockaddr in socket.getaddrinfo(
            host, port, socket.AF_INET, socket.SOCK_STREAM
        ):
            sock = socket.socket(family, socktype, proto)
            try:
                if timeout is not None:
                    sock.settimeout(timeout)
                sock.connect(sockaddr)
                return sock
            except OSError as exc:
                sock.close()
                last_error = exc
        raise last_error or OSError(f"No IPv4 address found for {host}:{port}")


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

    try:
        with _IPv4SMTP(host, settings.smtp_port, timeout=_CONNECT_TIMEOUT_SECONDS) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(settings.smtp_from, to_email, msg.as_string())
    except (smtplib.SMTPException, socket.error, OSError) as exc:
        # Never let a flaky/blocked SMTP connection break the caller — this
        # already runs as a background task, but stay defensive regardless.
        print(f"[EMAIL FAILED] To: {to_email} | Temp password: {temp_password} | Error: {exc}")

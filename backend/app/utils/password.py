import secrets
import string

_ALPHABET = string.ascii_letters + string.digits + "!@#$"


def generate_temp_password(length: int = 12) -> str:
    # Guarantee at least one uppercase, one digit, one symbol
    parts = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.digits),
        secrets.choice("!@#$"),
        *[secrets.choice(_ALPHABET) for _ in range(length - 3)],
    ]
    secrets.SystemRandom().shuffle(parts)
    return "".join(parts)

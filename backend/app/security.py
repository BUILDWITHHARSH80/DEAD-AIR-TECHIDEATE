
import os, jwt, hashlib, hmac, base64
from datetime import datetime, timedelta, timezone

SECRET = os.getenv("DEAD_AIR_SECRET", "change-this-secret-in-production")
ALGO = "HS256"

# PBKDF2 is used here instead of passlib/bcrypt so the backend works cleanly
# on Python 3.14 without passlib's bcrypt backend compatibility issue.
def hash_password(value: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", value.encode("utf-8"), salt, 310000)
    return "pbkdf2_sha256$310000$" + base64.b64encode(salt).decode() + "$" + base64.b64encode(digest).decode()

def verify_password(value: str, stored: str) -> bool:
    try:
        scheme, iterations, salt_b64, digest_b64 = stored.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        salt = base64.b64decode(salt_b64)
        expected = base64.b64decode(digest_b64)
        actual = hashlib.pbkdf2_hmac("sha256", value.encode("utf-8"), salt, int(iterations))
        return hmac.compare_digest(actual, expected)
    except Exception:
        return False

def make_token(subject, role):
    payload = {
        "sub": str(subject),
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=12)
    }
    return jwt.encode(payload, SECRET, algorithm=ALGO)

def decode_token(token):
    return jwt.decode(token, SECRET, algorithms=[ALGO])

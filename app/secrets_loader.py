"""
Anthropic API key lookup.

Order:
  1. ANTHROPIC_API_KEY env var (handy for local development)
  2. AWS Secrets Manager, from the ARN in ANTHROPIC_API_KEY_SECRET_ARN,
     using the EC2 instance role (no keys on disk)

The secret may be a plain string, or JSON such as {"ANTHROPIC_API_KEY": "sk-..."}.
The value is cached in memory for SECRET_CACHE_SECONDS (default 1 hour) so a
rotated key is picked up without a restart. A failed lookup is retried after
60 seconds; until then /ask falls back to the local model or keyword answers.
"""
import json
import os
import threading
import time

_CACHE_SECONDS = int(os.environ.get('SECRET_CACHE_SECONDS', 3600))
_RETRY_AFTER_FAILURE = 60

_lock = threading.Lock()
_state = {"value": None, "fetched_at": 0.0, "failed_at": 0.0}


def _region_from_arn(arn):
    # arn:aws:secretsmanager:<region>:<account>:secret:<name>
    parts = arn.split(':')
    return parts[3] if len(parts) > 3 and parts[3] else os.environ.get('AWS_REGION', 'us-east-1')


def _parse(secret_string):
    s = (secret_string or '').strip()
    if s.startswith('{'):
        data = json.loads(s)
        if 'ANTHROPIC_API_KEY' in data:
            return data['ANTHROPIC_API_KEY']
        if len(data) == 1:
            return next(iter(data.values()))
        raise ValueError("Secret JSON has no ANTHROPIC_API_KEY field")
    return s


def get_anthropic_api_key(logger=None):
    env_key = os.environ.get('ANTHROPIC_API_KEY')
    if env_key:
        return env_key

    arn = os.environ.get('ANTHROPIC_API_KEY_SECRET_ARN')
    if not arn:
        return None

    now = time.time()
    if _state["value"] and now - _state["fetched_at"] < _CACHE_SECONDS:
        return _state["value"]
    if now - _state["failed_at"] < _RETRY_AFTER_FAILURE:
        return _state["value"]  # recent failure: don't hit AWS on every request

    with _lock:
        if _state["value"] and time.time() - _state["fetched_at"] < _CACHE_SECONDS:
            return _state["value"]
        try:
            import boto3
            client = boto3.client('secretsmanager', region_name=_region_from_arn(arn))
            resp = client.get_secret_value(SecretId=arn)
            value = _parse(resp.get('SecretString'))
            if not value:
                raise ValueError("Secret is empty")
            _state.update(value=value, fetched_at=time.time(), failed_at=0.0)
            if logger:
                logger.info("Anthropic API key loaded from AWS Secrets Manager.")
            return value
        except Exception as e:
            _state["failed_at"] = time.time()
            if logger:
                logger.error(f"Could not read Anthropic API key from Secrets Manager: {type(e).__name__}: {e}")
            # Keep using a previously fetched key if a refresh fails.
            return _state["value"]

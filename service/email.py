"""Email helpers using Resend."""

import os
import logging

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.environ.get("RESEND_API_KEY")
OWNER_EMAIL = os.environ.get("OWNER_EMAIL", "workshop@softcat.ai")
FROM_EMAIL = os.environ.get("FROM_EMAIL", "agents@softcat.ai")


def notify_owner(name: str, email: str, description: str, request_id: str) -> None:
    """Email owner about a new agent request."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set, skipping owner notification")
        return

    import resend
    resend.api_key = RESEND_API_KEY

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": OWNER_EMAIL,
        "subject": f"New agent request: {description[:60]}",
        "html": (
            f"<p><b>{name}</b> ({email}) wants:</p>"
            f"<blockquote>{description}</blockquote>"
            f"<p>Request ID: <code>{request_id}</code></p>"
            f"<p>Review: <code>softcat requests list</code></p>"
        ),
    })
    logger.info(f"Owner notification sent for request {request_id}")


def send_download_link(name: str, email: str, agent_name: str, download_url: str) -> None:
    """Email visitor their download link."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set, skipping download email")
        return

    import resend
    resend.api_key = RESEND_API_KEY

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": email,
        "subject": "Your SOFT CAT agent is ready",
        "html": (
            f"<p>Hi {name},</p>"
            f"<p>Your agent <b>{agent_name}</b> is ready to download.</p>"
            f"<p><a href='{download_url}'>Download your agent</a></p>"
            f"<p>This link expires in 7 days.</p>"
            f"<p>The download includes a README with setup instructions.</p>"
            f"<p>-- SOFT CAT</p>"
        ),
    })
    logger.info(f"Download link sent to {email}")


def send_rejection(name: str, email: str, reason: str = "") -> None:
    """Email visitor if request was rejected."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set, skipping rejection email")
        return

    import resend
    resend.api_key = RESEND_API_KEY

    body = f"<p>Hi {name},</p><p>We reviewed your agent request but couldn't build it this time.</p>"
    if reason:
        body += f"<p>{reason}</p>"
    body += "<p>Feel free to submit another request with more detail.</p><p>-- SOFT CAT</p>"

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": email,
        "subject": "About your SOFT CAT agent request",
        "html": body,
    })
    logger.info(f"Rejection email sent to {email}")


def notify_access_request(name: str, email: str, user_id: str) -> None:
    """Email owner about a new access request."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set, skipping access notification")
        return

    import resend
    resend.api_key = RESEND_API_KEY

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": OWNER_EMAIL,
        "subject": f"New spawn access request: {name}",
        "html": (
            f"<p><b>{name}</b> ({email}) wants access to the agent builder.</p>"
            f"<p>User ID: <code>{user_id}</code></p>"
            f"<p>Approve:</p>"
            f"<pre>curl -X POST https://api.softcat.ai/api/spawn/admin/approve/{user_id} "
            f"-H 'Authorization: Bearer $ADMIN_TOKEN'</pre>"
        ),
    })
    logger.info(f"Access request notification sent for {email}")


def send_magic_link(name: str, email: str, magic_url: str) -> None:
    """Email a magic login link to an approved user."""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set, skipping magic link")
        return

    import resend
    resend.api_key = RESEND_API_KEY

    resend.Emails.send({
        "from": FROM_EMAIL,
        "to": email,
        "subject": "Your SOFT CAT login link",
        "html": (
            f"<p>Hi {name},</p>"
            f"<p>You've been approved to build agents on SOFT CAT.</p>"
            f"<p><a href='{magic_url}'>Click here to log in</a></p>"
            f"<p>This link expires in 24 hours and can only be used once.</p>"
            f"<p>-- SOFT CAT</p>"
        ),
    })
    logger.info(f"Magic link sent to {email}")

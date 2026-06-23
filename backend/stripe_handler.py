import os

import stripe
from dotenv import load_dotenv

load_dotenv()


def _get_stripe_secret_key() -> str:
    secret = os.getenv("STRIPE_SECRET_KEY")
    if not secret:
        raise ValueError("STRIPE_SECRET_KEY is not set")
    return secret


def _get_webhook_secret() -> str:
    secret = os.getenv("STRIPE_WEBHOOK_SECRET")
    if not secret:
        raise ValueError("STRIPE_WEBHOOK_SECRET is not set")
    return secret


def _get_donation_amount_cents() -> int:
    return int(os.getenv("DONATION_AMOUNT_CENTS", "500"))


def create_checkout_session(success_url: str, cancel_url: str) -> dict:
    stripe.api_key = _get_stripe_secret_key()
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="payment",
        line_items=[
            {
                "quantity": 1,
                "price_data": {
                    "currency": "usd",
                    "unit_amount": _get_donation_amount_cents(),
                    "product_data": {
                        "name": "CR-Lite Research Access — EM Foundation",
                        "description": "10 queries · 24-hour session",
                    },
                },
            }
        ],
        success_url=success_url,
        cancel_url=cancel_url,
    )
    return {"checkout_url": session.url, "session_id": session.id}


def get_payment_intent_from_session(session_id: str) -> str:
    stripe.api_key = _get_stripe_secret_key()
    session = stripe.checkout.Session.retrieve(session_id)
    payment_intent = session.payment_intent
    if isinstance(payment_intent, dict):
        payment_intent_id = payment_intent.get("id")
    else:
        payment_intent_id = payment_intent
    if not payment_intent_id:
        raise ValueError("Checkout session has no payment_intent")
    return payment_intent_id


def verify_webhook(payload: bytes, sig_header: str) -> dict:
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, _get_webhook_secret()
        )
    except stripe.error.SignatureVerificationError as exc:
        raise ValueError("Invalid webhook signature") from exc
    return dict(event)

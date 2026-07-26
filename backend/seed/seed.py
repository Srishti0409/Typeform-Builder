"""
Seed script: populate database with sample forms, questions, and responses.
Run from backend/ directory: python -m seed.seed
"""
import sys
import os
import json
import random
import uuid
from datetime import datetime, timedelta

# Fix Windows console encoding
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal, create_all_tables
from app.models.form import Form
from app.models.question import Question
from app.models.response import Response, ResponseAnswer

CREATOR_ID = "default-creator-001"

# ─────────────────────────────────────────────
#  Form definitions
# ─────────────────────────────────────────────

FORMS = [
    {
        "title": "Customer Satisfaction Survey",
        "description": "Help us improve by sharing your experience.",
        "slug": "customer-satisfaction-survey",
        "status": "published",
        "thank_you_title": "Thank you for your feedback!",
        "thank_you_message": "Your input helps us improve our service every day.",
        "theme_config": {
            "primaryColor": "#0445AF",
            "backgroundColor": "#FFFFFF",
            "fontFamily": "Inter",
        },
        "questions": [
            {
                "type": "short_text",
                "title": "What is your name?",
                "description": "We'd love to know who you are.",
                "required": False,
                "placeholder": "Jane Smith",
            },
            {
                "type": "email",
                "title": "What is your email address?",
                "description": "We'll only use this to follow up if needed.",
                "required": True,
                "placeholder": "jane@example.com",
            },
            {
                "type": "rating",
                "title": "Overall, how satisfied are you with our service?",
                "description": "1 = Very dissatisfied, 5 = Very satisfied",
                "required": True,
                "settings": {"max_rating": 5, "shape": "star"},
            },
            {
                "type": "multiple_choice",
                "title": "Which aspects of our service did you like most?",
                "description": "Select all that apply.",
                "required": False,
                "options": ["Speed", "Quality", "Support", "Pricing", "Ease of use"],
            },
            {
                "type": "yes_no",
                "title": "Would you recommend us to a friend or colleague?",
                "required": True,
            },
            {
                "type": "dropdown",
                "title": "How did you hear about us?",
                "required": False,
                "options": ["Google Search", "Social Media", "Friend/Referral", "Advertisement", "Blog/Article", "Other"],
            },
            {
                "type": "long_text",
                "title": "Any additional comments or suggestions?",
                "description": "Feel free to share anything on your mind.",
                "required": False,
                "placeholder": "Your thoughts...",
            },
        ],
    },
    {
        "title": "Product Feedback Form",
        "description": "Tell us what you think about our latest product release.",
        "slug": "product-feedback-form",
        "status": "published",
        "thank_you_title": "Thanks for the feedback!",
        "thank_you_message": "We'll use your input to make the product even better.",
        "theme_config": {
            "primaryColor": "#177767",
            "backgroundColor": "#F4FAF8",
            "fontFamily": "Inter",
        },
        "questions": [
            {
                "type": "short_text",
                "title": "What is your role?",
                "description": "e.g., Developer, Designer, Product Manager",
                "required": False,
                "placeholder": "Product Manager",
            },
            {
                "type": "rating",
                "title": "How would you rate the overall product quality?",
                "required": True,
                "settings": {"max_rating": 10, "shape": "number"},
            },
            {
                "type": "multiple_choice",
                "title": "Which features do you use most frequently?",
                "required": True,
                "options": ["Dashboard", "Analytics", "Integrations", "API", "Reporting", "Collaboration"],
            },
            {
                "type": "dropdown",
                "title": "How long have you been using our product?",
                "required": True,
                "options": ["Less than 1 month", "1-3 months", "3-6 months", "6-12 months", "More than 1 year"],
            },
            {
                "type": "number",
                "title": "On a scale of 0-10, how likely are you to recommend this product to others?",
                "description": "This is your Net Promoter Score (NPS).",
                "required": True,
                "settings": {"min": 0, "max": 10},
            },
            {
                "type": "yes_no",
                "title": "Have you experienced any bugs or issues in the last 30 days?",
                "required": True,
            },
            {
                "type": "long_text",
                "title": "What is the one thing we could do to improve your experience?",
                "required": False,
                "placeholder": "Be specific — we read every response!",
            },
        ],
    },
    {
        "title": "Tech Conference Registration",
        "description": "Register for TechForward 2025 — the premier developer conference.",
        "slug": "tech-conference-registration",
        "status": "published",
        "thank_you_title": "You're registered! See you there!",
        "thank_you_message": "We'll send your confirmation and event details to your email.",
        "theme_config": {
            "primaryColor": "#4B3F9E",
            "backgroundColor": "#F7F2FD",
            "fontFamily": "Inter",
        },
        "questions": [
            {
                "type": "short_text",
                "title": "Full Name",
                "required": True,
                "placeholder": "John Doe",
            },
            {
                "type": "email",
                "title": "Email Address",
                "description": "All event communications will be sent here.",
                "required": True,
                "placeholder": "john@company.com",
            },
            {
                "type": "short_text",
                "title": "Job Title",
                "required": False,
                "placeholder": "Senior Software Engineer",
            },
            {
                "type": "short_text",
                "title": "Company / Organization",
                "required": False,
                "placeholder": "Acme Corp",
            },
            {
                "type": "dropdown",
                "title": "Which ticket type are you registering for?",
                "required": True,
                "options": ["General Admission - $299", "VIP - $599", "Workshop Pass - $199", "Virtual Attendance - Free"],
            },
            {
                "type": "multiple_choice",
                "title": "Which tracks are you most interested in?",
                "description": "Select up to 3 tracks.",
                "required": True,
                "options": ["AI & Machine Learning", "Cloud Infrastructure", "Web Development", "Security", "Mobile", "Data Engineering", "Leadership & Strategy"],
            },
            {
                "type": "yes_no",
                "title": "Will you need dietary accommodations?",
                "required": False,
            },
            {
                "type": "number",
                "title": "How many times have you attended TechForward before?",
                "required": False,
                "settings": {"min": 0, "max": 20},
            },
        ],
    },
    {
        "title": "Team Weekly Check-in",
        "description": "A quick pulse check for our engineering team.",
        "slug": "team-weekly-checkin",
        "status": "draft",
        "thank_you_title": "Thanks for checking in!",
        "thank_you_message": "Your manager will review responses and follow up as needed.",
        "theme_config": {
            "primaryColor": "#C0562A",
            "backgroundColor": "#FDF5EF",
            "fontFamily": "Inter",
        },
        "questions": [
            {
                "type": "short_text",
                "title": "Your name",
                "required": True,
                "placeholder": "Alex Johnson",
            },
            {
                "type": "rating",
                "title": "How energized do you feel heading into this week?",
                "description": "1 = Exhausted, 5 = Fully charged",
                "required": True,
                "settings": {"max_rating": 5, "shape": "emoji"},
            },
            {
                "type": "long_text",
                "title": "What did you accomplish last week?",
                "required": True,
                "placeholder": "e.g., Shipped the auth refactor, reviewed 3 PRs...",
            },
            {
                "type": "long_text",
                "title": "What are your top priorities this week?",
                "required": True,
                "placeholder": "e.g., Fix the billing bug, write API docs...",
            },
            {
                "type": "yes_no",
                "title": "Do you have any blockers right now?",
                "required": True,
            },
            {
                "type": "long_text",
                "title": "If yes, what is blocking you?",
                "required": False,
                "placeholder": "Describe your blocker...",
            },
        ],
    },
]


# ─────────────────────────────────────────────
#  Sample answer generators
# ─────────────────────────────────────────────

SAMPLE_NAMES = [
    "Alice Chen", "Bob Martinez", "Carol Williams", "David Kim",
    "Emma Thompson", "Frank Lee", "Grace Patel", "Henry Brown",
    "Isabella Davis", "James Wilson", "Kira Johnson", "Liam Garcia",
    "Maya Rodriguez", "Noah Anderson", "Olivia Taylor", "Patrick White",
]

SAMPLE_EMAILS = [
    "alice.chen@techco.com", "bob.m@startup.io", "carol.w@enterprise.com",
    "david.k@agency.net", "emma.t@freelance.dev", "frank.lee@bigcorp.org",
    "grace.p@design.co", "henry.b@consulting.com", "isabella.d@media.io",
    "james.w@fintech.com", "kira.j@healthtech.org", "liam.g@edtech.co",
    "maya.r@retailtech.com", "noah.a@saas.io", "olivia.t@platform.dev",
    "patrick.w@ventures.com",
]

ROLES = ["Software Engineer", "Product Manager", "Designer", "Data Scientist", "DevOps Engineer", "Marketing Manager", "QA Engineer", "CTO", "Founder"]

LONG_TEXT_ANSWERS = [
    "The onboarding experience was smooth and intuitive. I particularly liked how everything was laid out clearly.",
    "I'd love to see better keyboard shortcuts and more customization options. Overall impressed though!",
    "The performance has improved significantly since the last update. Keep up the great work.",
    "Support team was incredibly responsive and helpful. Resolved my issue within 30 minutes.",
    "Would love to see more integrations with third-party tools like Slack and Jira.",
    "The mobile experience could use some polish, but the desktop experience is excellent.",
    "Been using this for 6 months now and it's become an essential part of our workflow.",
    "The new dashboard redesign is much cleaner and easier to navigate.",
    "Great product overall. My main feedback is to improve the export functionality.",
    "Absolutely love it. Can't imagine going back to our old process.",
    "Some minor bugs here and there but overall a solid product. Very promising direction.",
    "The API documentation is excellent. Easy to integrate with our existing systems.",
    "Would appreciate more granular permission controls for team management.",
    "The search functionality needs improvement — hard to find things sometimes.",
]

BLOCKERS = [
    "Waiting on design approval for the new feature.",
    "Need access to the production database for debugging.",
    "Dependency on the platform team's API changes.",
    "Waiting for PR review from Alice.",
]


def gen_answer_for_question(q_type: str, q_title: str, options: list, settings: dict, idx: int) -> any:
    """Generate a realistic sample answer based on question type."""
    settings = settings or {}
    rng = random.Random(idx)

    if q_type == "short_text":
        if "name" in q_title.lower():
            return rng.choice(SAMPLE_NAMES)
        if "role" in q_title.lower() or "title" in q_title.lower():
            return rng.choice(ROLES)
        if "company" in q_title.lower():
            return rng.choice(["Acme Corp", "TechFlow Inc", "Nexus Labs", "DataStream", "CloudPeak"])
        return rng.choice(["Sample response", "Test answer", "Great question!", "Here's my input"])

    elif q_type == "email":
        return rng.choice(SAMPLE_EMAILS)

    elif q_type == "long_text":
        return rng.choice(LONG_TEXT_ANSWERS)

    elif q_type == "rating":
        max_r = int(settings.get("max_rating", 5))
        # Skew towards higher ratings
        weights = [1] * max_r
        for i in range(max_r // 2, max_r):
            weights[i] = 3
        return rng.choices(range(1, max_r + 1), weights=weights)[0]

    elif q_type == "number":
        min_v = float(settings.get("min", 0))
        max_v = float(settings.get("max", 100))
        return round(rng.uniform(min_v, max_v), 1)

    elif q_type == "yes_no":
        return rng.choice(["yes", "yes", "yes", "no"])  # 75% yes bias

    elif q_type == "multiple_choice":
        if not options:
            return []
        k = rng.randint(1, min(3, len(options)))
        return rng.sample(options, k)

    elif q_type == "dropdown":
        if not options:
            return None
        return rng.choice(options)

    return None


# ─────────────────────────────────────────────
#  Main seed function
# ─────────────────────────────────────────────

def seed():
    create_all_tables()
    db = SessionLocal()

    try:
        # Check if already seeded
        existing = db.query(Form).filter(Form.creator_id == CREATOR_ID).count()
        if existing > 0:
            print(f"[OK] Database already seeded ({existing} forms found). Skipping.")
            return

        print("[*] Seeding database...")

        all_forms = []
        all_questions_by_form = {}

        for form_data in FORMS:
            form = Form(
                id=str(uuid.uuid4()),
                creator_id=CREATOR_ID,
                title=form_data["title"],
                description=form_data.get("description"),
                slug=form_data["slug"],
                status=form_data["status"],
                thank_you_title=form_data.get("thank_you_title", "Thank you!"),
                thank_you_message=form_data.get("thank_you_message"),
                theme_config=json.dumps(form_data.get("theme_config", {})),
                created_at=datetime.utcnow() - timedelta(days=random.randint(5, 30)),
                updated_at=datetime.utcnow() - timedelta(days=random.randint(0, 4)),
            )
            db.add(form)
            db.flush()
            all_forms.append(form)

            questions = []
            for idx, q_data in enumerate(form_data["questions"]):
                options = q_data.get("options")
                settings_dict = q_data.get("settings")
                question = Question(
                    id=str(uuid.uuid4()),
                    form_id=form.id,
                    order_index=idx,
                    question_type=q_data["type"],
                    title=q_data["title"],
                    description=q_data.get("description"),
                    is_required=q_data.get("required", False),
                    placeholder=q_data.get("placeholder"),
                    options=json.dumps(options) if options else None,
                    settings=json.dumps(settings_dict) if settings_dict else None,
                    created_at=form.created_at,
                )
                db.add(question)
                questions.append(question)

            db.flush()
            all_questions_by_form[form.id] = questions
            print(f"  [+] Created form: '{form.title}' ({len(questions)} questions, status={form.status})")

        # Seed responses for published forms
        published_forms = [f for f in all_forms if f.status == "published"]
        for form in published_forms:
            questions = all_questions_by_form[form.id]
            n_responses = random.randint(12, 22)

            for r_idx in range(n_responses):
                submitted_ago = timedelta(
                    days=random.randint(0, 20),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59),
                )
                comp_time = random.randint(45, 300)

                response = Response(
                    id=str(uuid.uuid4()),
                    form_id=form.id,
                    submitted_at=datetime.utcnow() - submitted_ago,
                    completion_time_seconds=comp_time,
                    user_agent="Mozilla/5.0 (Seeded Sample Data)",
                )
                db.add(response)
                db.flush()

                for q in questions:
                    # Randomly skip optional questions ~20% of the time
                    if not q.is_required and random.random() < 0.2:
                        continue

                    options = json.loads(q.options) if q.options else []
                    q_settings = json.loads(q.settings) if q.settings else {}
                    seed_idx = r_idx * len(questions) + q.order_index

                    answer_val = gen_answer_for_question(
                        q_type=q.question_type,
                        q_title=q.title,
                        options=options,
                        settings=q_settings,
                        idx=seed_idx,
                    )

                    if answer_val is not None and answer_val != "":
                        db.add(ResponseAnswer(
                            id=str(uuid.uuid4()),
                            response_id=response.id,
                            question_id=q.id,
                            answer_value=json.dumps(answer_val),
                        ))

            print(f"  [+] Seeded {n_responses} responses for '{form.title}'")

        db.commit()
        print("\n[OK] Database seeded successfully!")

        # Print summary
        form_count = db.query(Form).count()
        question_count = db.query(Question).count()
        response_count = db.query(Response).count()
        print(f"   Forms: {form_count} | Questions: {question_count} | Responses: {response_count}")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seeding failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()

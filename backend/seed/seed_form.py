"""
Seed responses into a form that already exists.

`seed.seed` builds the sample workspace from nothing and refuses to run once
there are forms in the database. This fills in a form you authored yourself, so
its Results and Responses views have something in them — using the same answer
generator, so the data reads like the rest of the samples.

Run from backend/:

    python -m seed.seed_form new-form-c2ef10             # by slug, or by form id
    python -m seed.seed_form new-form-c2ef10 --count 20  # how many responses
    python -m seed.seed_form new-form-c2ef10 --days 45   # spread them further back
    python -m seed.seed_form new-form-c2ef10 --clear     # replace what's there

Answers are written straight to the database, as the sample seeder does, rather
than posted through the public endpoint — that way a draft can be filled in too,
and no submission is recorded against a form that isn't live.
"""
import argparse
import json
import os
import random
import sys
import uuid
from datetime import datetime, timedelta

# Same as seed.seed: runnable as a module from backend/ without installing the app.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal  # noqa: E402
from app.models.form import Form  # noqa: E402
from app.models.question import Question  # noqa: E402
from app.models.response import Response, ResponseAnswer  # noqa: E402
from seed.seed import CREATOR_ID, gen_answer_for_question  # noqa: E402

# Marks the rows as sample data, so they can be told apart from real submissions.
SEEDED_AGENT = "Mozilla/5.0 (Seeded Sample Data)"
# How often an optional question is left blank, matching seed.seed.
SKIP_OPTIONAL = 0.2


def seed_form(identifier: str, count: int | None, days: int, clear: bool) -> int:
    db = SessionLocal()
    try:
        form = (
            db.query(Form)
            .filter(Form.creator_id == CREATOR_ID)
            .filter((Form.slug == identifier) | (Form.id == identifier))
            .first()
        )
        if not form:
            print(f"[ERROR] No form with slug or id '{identifier}'.")
            print("        Forms available:")
            for f in db.query(Form).filter(Form.creator_id == CREATOR_ID).all():
                print(f"          {f.slug:34} {f.status:10} {f.title}")
            return 1

        questions = sorted(form.questions, key=lambda q: q.order_index)
        if not questions:
            print(f"[ERROR] '{form.title}' has no questions to answer yet.")
            return 1

        if clear and form.responses:
            removed = len(form.responses)
            for response in list(form.responses):
                db.delete(response)
            db.flush()
            print(f"  [-] Removed {removed} existing response(s)")

        n_responses = count if count is not None else random.randint(12, 22)
        print(f"[*] Seeding '{form.title}' ({form.status}, {len(questions)} questions)")

        for r_idx in range(n_responses):
            response = Response(
                id=str(uuid.uuid4()),
                form_id=form.id,
                submitted_at=datetime.utcnow() - timedelta(
                    days=random.randint(0, max(days, 0)),
                    hours=random.randint(0, 23),
                    minutes=random.randint(0, 59),
                ),
                completion_time_seconds=random.randint(20, 180),
                user_agent=SEEDED_AGENT,
            )
            db.add(response)
            db.flush()

            answered = 0
            for q in questions:
                if not q.is_required and random.random() < SKIP_OPTIONAL:
                    continue
                value = gen_answer_for_question(
                    q_type=q.question_type,
                    q_title=q.title,
                    options=json.loads(q.options) if q.options else [],
                    settings=json.loads(q.settings) if q.settings else {},
                    idx=r_idx * len(questions) + q.order_index,
                )
                if value is None or value == "":
                    continue
                db.add(ResponseAnswer(
                    id=str(uuid.uuid4()),
                    response_id=response.id,
                    question_id=q.id,
                    answer_value=json.dumps(value),
                ))
                answered += 1

            # A response with nothing in it is what the submit endpoint refuses, so
            # don't seed one: answer the first question rather than leave a blank row.
            if answered == 0:
                first = questions[0]
                db.add(ResponseAnswer(
                    id=str(uuid.uuid4()),
                    response_id=response.id,
                    question_id=first.id,
                    answer_value=json.dumps(gen_answer_for_question(
                        q_type=first.question_type,
                        q_title=first.title,
                        options=json.loads(first.options) if first.options else [],
                        settings=json.loads(first.settings) if first.settings else {},
                        idx=r_idx,
                    )),
                ))

        form.updated_at = datetime.utcnow()
        db.commit()

        total_answers = sum(len(r.answers) for r in form.responses)
        print(f"  [+] {n_responses} responses, {total_answers} answers")
        print(f"      Results: http://localhost:3000/forms/{form.id}/results")
        return 0
    except Exception as exc:
        db.rollback()
        print(f"[ERROR] Seeding failed: {exc}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Seed sample responses into a form that already exists.")
    parser.add_argument("form", help="the form's slug or id")
    parser.add_argument("--count", type=int, default=None,
                        help="how many responses (default: 12-22)")
    parser.add_argument("--days", type=int, default=20,
                        help="spread submissions over this many days back (default: 20)")
    parser.add_argument("--clear", action="store_true",
                        help="delete the form's existing responses first")
    args = parser.parse_args()
    raise SystemExit(seed_form(args.form, args.count, args.days, args.clear))

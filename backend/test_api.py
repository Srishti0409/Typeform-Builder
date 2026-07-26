import urllib.request
import json

# Test /health
r = urllib.request.urlopen("http://127.0.0.1:8000/health")
print("Health:", json.loads(r.read()))

# Test forms list
r = urllib.request.urlopen("http://127.0.0.1:8000/api/v1/forms")
forms = json.loads(r.read())
print(f"\nForms found: {len(forms)}")
for f in forms:
    print(f"  - [{f['status'].upper()}] {f['title']} | {f['response_count']} responses | slug: {f['slug']}")

# Test public form
r = urllib.request.urlopen("http://127.0.0.1:8000/api/v1/f/customer-satisfaction-survey")
pub = json.loads(r.read())
print(f"\nPublic form: '{pub['title']}' — {len(pub['questions'])} questions")
for q in pub["questions"]:
    print(f"  [{q['order_index']+1}] ({q['question_type']}) {q['title'][:60]}")

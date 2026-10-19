"""
Local fallback model served by Ollama (no per-token cost).

Used by /api/ask when Claude is not configured, has failed, or today's Claude
budget is spent. Small CPU models are slow on a long prompt and unreliable at
tool calling, so this path is deliberately simple:
  - the keyword router (agent.route_intent) picks the UI cards, as before;
  - the local model only writes the short text answer;
  - it gets a compact slice of the profile for that intent (a few hundred
    tokens) instead of the whole profile, to keep CPU prompt time low.

Uses only the standard library, so no new dependency.
"""
import json
import os
import urllib.request

OLLAMA_URL = os.environ.get('OLLAMA_URL', '').rstrip('/')
OLLAMA_MODEL = os.environ.get('OLLAMA_MODEL', 'qwen2.5:1.5b')
OLLAMA_TIMEOUT = float(os.environ.get('OLLAMA_TIMEOUT_SECONDS', 90))

SYSTEM = (
    "You are the assistant on Lior Milliger's portfolio website. Answer the visitor's question about "
    "Lior using ONLY the FACTS below. Refer to Lior in the third person. Answer in at most 80 words, "
    "plain sentences, no lists, no markdown headings. If the FACTS don't contain the answer, say you "
    "don't have that information and suggest asking about his projects, stack, career or role fit. "
    "Never invent employers, dates, numbers or skills. Politely decline anything not about Lior's work. "
    "Speak as Lior's advocate: lead with his strengths and evidence, and don't dwell on what's missing."
)


def enabled():
    return bool(OLLAMA_URL)


def label():
    return f"ollama/{OLLAMA_MODEL}"


# Skill files most useful to the small local model, per intent (trimmed to keep CPU prompt time low).
INTENT_SKILLS = {'hiring': ['working-style'], 'unknown': ['working-style'], 'stack': ['kubernetes-and-edge'],
                 'projects': ['ai-systems'], 'site': [], 'story': ['working-style']}


def compact_facts(profile, intent, skills=None):
    """A small, intent-specific slice of the profile as plain text."""
    p = profile['person']
    lines = [f"Lior Milliger: {p['headline']}. {p['status']}.", p['summary']]
    if intent in ('hiring', 'unknown'):
        lines += ["Impact: " + "; ".join(f"{s['value']} {s['label']}" for s in profile['stats'])]
        lines += [f"{t['title']}: {t['text']}" for t in profile['timeline'][2:]]
    if intent == 'projects':
        lines += [f"Project {pr['name']}: {pr['summary']}" for pr in profile['projects'][:6]]
    if intent == 'stack':
        lines += [f"{s['category']}: {', '.join(s['items'])}" for s in profile['stack']]
    if intent == 'story':
        lines += [f"{t['title']} ({t['tag']}): {t['text']}" for t in profile['timeline']]
    if intent == 'certs':
        lines += ["Certifications: " + "; ".join(c['name'] for c in profile['certifications']),
                  "Degrees: " + "; ".join(profile['education']['degrees']),
                  "Courses: " + "; ".join(profile['education']['courses'])]
    if intent == 'site':
        lines += [profile['site_architecture']['summary']]
    if intent == 'contact':
        lines += [f"Email: {p['email']}. LinkedIn: {p['linkedin']}."]
    for name in INTENT_SKILLS.get(intent, []):
        if skills and name in skills:
            lines.append(skills[name][:1200])
    return "\n".join(lines)


def stream_answer(profile, intent, question, history=None, skills=None):
    """Yield text chunks from Ollama. At the end yields a dict with token counts.
    Raises on connection errors or timeouts so the caller can fall back."""
    messages = [{"role": "system", "content": SYSTEM + "\n\nFACTS:\n" + compact_facts(profile, intent, skills)}]
    for m in (history or [])[-4:]:
        messages.append({"role": m['role'], "content": m['content'][:600]})
    messages.append({"role": "user", "content": question})
    body = json.dumps({
        "model": OLLAMA_MODEL, "messages": messages, "stream": True,
        "keep_alive": os.environ.get('OLLAMA_KEEP_ALIVE', '15m'),
        "options": {"num_ctx": 2048, "num_predict": 200, "temperature": 0.3},
    }).encode()
    req = urllib.request.Request(f"{OLLAMA_URL}/api/chat", data=body,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=OLLAMA_TIMEOUT) as resp:
        for raw in resp:
            line = raw.strip()
            if not line:
                continue
            chunk = json.loads(line)
            if chunk.get('error'):
                raise RuntimeError(chunk['error'])
            text = (chunk.get('message') or {}).get('content')
            if text:
                yield text
            if chunk.get('done'):
                yield {"input_tokens": chunk.get('prompt_eval_count'), "output_tokens": chunk.get('eval_count')}
                return

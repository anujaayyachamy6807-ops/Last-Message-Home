#!/usr/bin/env python3
"""Check data/contacts.json against the saved NASA page text, without Node.

Run:  python3 scripts/check_data.py
Exit code 0 means every check passed.

This is a line-by-line port of validateContact() in engine.js, so the same rules apply:
  - every FACT quote is an exact piece of the saved page (after fixing spaces and curly quotes)
  - every number in a FACT line is also in its quote
  - STORY (voice) lines contain no number
  - SUM (calc) lines use dates whose years are in their quotes
  - every page link is a NASA page and has saved text
It also checks that every picture named in the data exists in img/.
Standard library only.
"""
import json
import os
import re
import sys
from datetime import date

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
NASA_URL = re.compile(r"^https://(science\.nasa\.gov|nssdc\.gsfc\.nasa\.gov)/")


def norm(s):
    s = re.sub("[‘’ʼ]", "'", str(s))
    s = re.sub("[“”]", '"', s)
    s = re.sub("[   ]", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def as_list(q):
    if isinstance(q, list):
        return q
    return [q] if q else []


def number_tokens(text):
    return [re.sub(r"[.,]+$", "", t) for t in re.findall(r"\d[\d.,]*", str(text))]


def parse_date(s):
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", s or "")
    if not m:
        raise ValueError("Bad date: " + str(s))
    y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
    date(y, mo, d)  # raises ValueError on 2000-02-30 and similar
    return y, mo, d


def js_num(n):
    """String(n) as JavaScript writes it (26.0 -> "26", 3.6333 -> "3.6333")."""
    return str(int(n)) if float(n) == int(n) else repr(float(n))


def validate_contact(c, sources):
    errors = []
    cid = c.get("id", "?")

    def err(m):
        errors.append(cid + ": " + m)

    keys = set()
    for p in c.get("pages", []):
        if not p.get("url") or not NASA_URL.match(p["url"]):
            err("page url is not a NASA page: " + str(p.get("key")))
        if not sources.get(p.get("key")):
            err("no saved text for page " + str(p.get("key")))
        keys.add(p.get("key"))

    def text(key):
        return norm(sources.get(key, ""))

    def check_quotes(where, page_key, quotes, claim=None):
        if page_key not in keys:
            err(where + ": page '" + str(page_key) + "' is not listed in pages")
            return
        if not quotes:
            err(where + ": no quote")
            return
        for q in quotes:
            if norm(q) not in text(page_key):
                err(where + ": quote not found on page: " + q)
        if claim is not None:
            claim = claim.replace(c.get("name", "\0"), "")
            joined = norm(" ".join(quotes))
            for n in number_tokens(claim):
                if n not in joined:
                    err(where + ": number " + n + " is not in its quote")

    for k in ["id", "name", "short", "kind", "place", "place_detail"]:
        if not c.get(k):
            err("missing " + k)
    if c.get("place") not in ["Moon", "Mars", "Deep space"]:
        err("unknown place " + str(c.get("place")))
    check_quotes("place", c["pages"][0]["key"], as_list(c.get("place_quote")))
    ls = c.get("last_seen", {})
    check_quotes("last_seen", ls.get("page"), as_list(ls.get("quote")), ls.get("text", ""))
    if c.get("coords"):
        k = c["coords"]
        check_quotes("coords", k.get("page"), as_list(k.get("quote")), js_num(k["lat"]).replace("-", "") + " " + js_num(k["lon"]))

    qs = c.get("questions") or []
    if len(qs) < 3:
        err("needs at least 3 questions")
    ids = set()
    for q in qs:
        w = "question '" + str(q.get("id")) + "'"
        if q.get("id") in ids:
            err(w + ": duplicate id")
        ids.add(q.get("id"))
        if not q.get("label"):
            err(w + ": no label")
        if not q.get("page"):
            err(w + ": no verified source (page)")
        facts = 0
        for i, l in enumerate(q.get("reply") or []):
            lw = w + " line " + str(i + 1)
            t = l.get("t")
            if t not in ["fact", "calc", "note", "voice"]:
                err(lw + ": bad type " + str(t))
                continue
            if t == "fact":
                facts += 1
                check_quotes(lw, q.get("page"), as_list(l.get("quote")), l.get("text", ""))
            if t == "calc":
                facts += 1
                check_quotes(lw, q.get("page"), as_list(l.get("quote")))
                joined = norm(" ".join(as_list(l.get("quote"))))
                try:
                    a, b = parse_date(l.get("from")), parse_date(l.get("to"))
                    if b < a:
                        err(lw + ": End is before start")
                    for y in (a[0], b[0]):
                        if str(y) not in joined:
                            err(lw + ": year " + str(y) + " is not in the quotes")
                except ValueError as e:
                    err(lw + ": " + str(e))
                if "{span}" not in l.get("text", ""):
                    err(lw + ": calc text has no {span}")
            if t == "voice":
                if re.search(r"\d", l.get("text", "").replace(c.get("name", "\0"), "")):
                    err(lw + ": voice line has a number")
                if l.get("quote"):
                    err(lw + ": voice line should not carry a quote")
        if not facts and not any(l.get("t") == "note" for l in q.get("reply") or []):
            err(w + ": no fact or note")

    card = c.get("card")
    if not card:
        err("no discovery card")
    else:
        check_quotes("card", card.get("page"), as_list(card.get("quote")), card.get("text", "").replace(c.get("name", "\0"), "", 1))
    quiz = c.get("quiz") or []
    if len(quiz) != 2:
        err("quiz needs exactly 2 questions")
    for i, z in enumerate(quiz):
        w = "quiz " + str(i + 1)
        opts = z.get("options")
        if not isinstance(opts, list) or len(opts) < 2:
            err(w + ": options")
        elif not (isinstance(z.get("answer"), int) and 0 <= z["answer"] < len(opts)):
            err(w + ": answer index out of range")
        else:
            check_quotes(w, z.get("page"), as_list(z.get("quote")), opts[z["answer"]])
    for i, l in enumerate(c.get("opening") or []):
        if l.get("t") == "voice" and re.search(r"\d", l.get("text", "").replace(c.get("name", "\0"), "")):
            err("opening " + str(i + 1) + ": voice line has a number")
    img = c.get("image")
    if img:
        for k in ["file", "alt", "caption", "credit"]:
            if not img.get(k):
                err("image missing " + k)
        if img.get("file") and not os.path.isfile(os.path.join(ROOT, img["file"])):
            err("image file not found: " + img["file"])
    return errors


def main():
    with open(os.path.join(ROOT, "data", "contacts.json"), encoding="utf-8") as f:
        data = json.load(f)
    src_dir = os.path.join(ROOT, "data", "sources")
    sources = {}
    for name in os.listdir(src_dir):
        if name.endswith(".txt") and name != "FETCHED.txt":
            with open(os.path.join(src_dir, name), encoding="utf-8") as f:
                sources[name[:-4]] = f.read()

    failed = 0
    ids = [c["id"] for c in data["contacts"]]
    if len(set(ids)) != len(ids):
        print("FAIL duplicate contact ids")
        failed += 1
    quotes = 0
    for c in data["contacts"]:
        errs = validate_contact(c, sources)
        for q in c["questions"]:
            quotes += sum(len(as_list(l.get("quote"))) for l in q["reply"])
        if errs:
            failed += 1
            print("FAIL " + c["id"])
            for e in errs:
                print("     " + e)
        else:
            print("ok   " + c["id"])
    print("\n%d contacts, %d reply quotes, %d saved pages. %s" % (len(ids), quotes, len(sources), "ALL PASSED" if not failed else str(failed) + " FAILED"))
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())

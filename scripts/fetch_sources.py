#!/usr/bin/env python3
"""Download the NASA pages that every fact in the app comes from and save their plain text.

Run:  python3 scripts/fetch_sources.py            (all pages)
      python3 scripts/fetch_sources.py lrv alsep  (only these keys)
Writes data/sources/<key>.txt (page text) and data/sources/FETCHED.txt (date).
test/chat.test.js (or scripts/check_data.py) then checks that every quote in data/contacts.json is an exact piece of these texts.
No login, no key. Standard library only.
"""
import html
import os
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import date

PAGES = {
    "viking-1": "https://science.nasa.gov/mission/viking-1/",
    "pathfinder": "https://science.nasa.gov/mission/mars-pathfinder/",
    "mer": "https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/",
    "phoenix": "https://science.nasa.gov/mission/phoenix/",
    "insight": "https://science.nasa.gov/mission/insight/",
    "ingenuity": "https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/",
    "surveyor-3": "https://science.nasa.gov/mission/surveyor-3/",
    "pioneer-10": "https://science.nasa.gov/mission/pioneer-10/",
    "alsep": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C",
    "apollo-15-lm": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C",
    "lrv": "https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html",
    "pathfinder-nssdca": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1996-068A",
    "spirit-nssdca": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2003-027A",
    "opportunity-nssdca": "https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2003-032A",
}


def page_text(raw):
    m = re.search(r"(?s)<main\b.*?</main>", raw)
    if m:
        raw = m.group(0)
    raw = re.sub(r"(?s)<(script|style|nav|header|footer)\b[^>]*>.*?</\1>", "", raw)
    raw = re.sub(r"(?s)<[^>]+>", "\n", raw)
    raw = html.unescape(raw)
    return re.sub(r"\n\s*\n+", "\n", raw).strip() + "\n"


def fetch(url, tries=3):
    """Download one page. NSSDCA is sometimes slow, so retry a few times."""
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (classroom project)"})
    for n in range(tries):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return r.read().decode("utf-8", "ignore")
        except (urllib.error.URLError, TimeoutError) as e:
            if n == tries - 1:
                raise
            print("retry", url, "(" + str(e) + ")")
            time.sleep(5 * (n + 1))


def main():
    out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data", "sources")
    os.makedirs(out, exist_ok=True)
    only = set(sys.argv[1:])  # optional: page keys to fetch, e.g. "lrv alsep"
    for key, url in PAGES.items():
        if only and key not in only:
            continue
        raw = fetch(url)
        with open(os.path.join(out, key + ".txt"), "w", encoding="utf-8") as f:
            f.write(page_text(raw))
        print("saved", key)
    if only:
        return
    with open(os.path.join(out, "FETCHED.txt"), "w") as f:
        f.write(date.today().isoformat() + "\n")


if __name__ == "__main__":
    sys.exit(main())

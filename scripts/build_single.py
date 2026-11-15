#!/usr/bin/env python3
"""Build ONE self-contained HTML file of the whole app.

Run:  python3 scripts/build_single.py
Writes dist/last-message-home.html. It holds the page, the styles, all scripts, the robot data
and every picture (as data: URIs). Double-click it: no server, no internet needed for the app.
(Source links still open the NASA pages online.) Standard library only.
"""
import base64
import json
import os
import re
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "dist", "last-message-home.html")


def read(rel, mode="r"):
    with open(os.path.join(ROOT, rel), mode, **({} if "b" in mode else {"encoding": "utf-8"})) as f:
        return f.read()


def data_uri(rel, mime):
    return "data:" + mime + ";base64," + base64.b64encode(read(rel, "rb")).decode("ascii")


def safe_script(js):
    # A literal "</script" inside a script block would end it early.
    return js.replace("</script", "<\\/script")


def main():
    html = read("index.html")
    data = json.loads(read("data/contacts.json"))

    # Pictures become data: URIs so the file works on its own.
    cache = {}
    for c in data["contacts"]:
        img = c.get("image")
        if img and img.get("file"):
            if img["file"] not in cache:
                cache[img["file"]] = data_uri(img["file"], "image/jpeg")
            img["file"] = cache[img["file"]]

    icon = data_uri("icon.svg", "image/svg+xml")
    html = re.sub(r'<link rel="icon"[^>]*>', '<link rel="icon" href="' + icon + '" type="image/svg+xml">', html)
    html = re.sub(r'<link rel="apple-touch-icon"[^>]*>\s*', "", html)
    html = re.sub(r'<link rel="manifest"[^>]*>\s*', "", html)

    css = read("style.css")
    html, n = re.subn(r'<link rel="stylesheet" href="style.css">', lambda m: "<style>\n" + css + "\n</style>", html)
    if n != 1:
        sys.exit("index.html: stylesheet link not found")

    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    scripts = ["<script>window.LMH_DATA = " + safe_script(payload) + ";</script>"]
    for name in ["engine.js", "i18n.js", "app.js"]:
        tag = '<script src="' + name + '"></script>'
        if tag not in html:
            sys.exit("index.html: " + tag + " not found")
        html = html.replace(tag, "", 1)
        scripts.append("<script>\n" + safe_script(read(name)) + "\n</script>")
    html = html.replace("</body>", "\n".join(scripts) + "\n</body>", 1)

    html = html.replace("<!doctype html>", "<!doctype html>\n<!-- Last Message Home: single-file build made by scripts/build_single.py. Edit the source files, not this one. -->", 1)

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(html)
    print("wrote", os.path.relpath(OUT, ROOT), "(%.1f MB, %d robots, %d pictures)" % (os.path.getsize(OUT) / 1e6, len(data["contacts"]), len(cache)))


if __name__ == "__main__":
    main()

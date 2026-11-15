# Last Message Home: chat with the robots we left behind

> Every line comes from a NASA page. Calculated lines and robot-voice lines are labelled.
> NASA Space Apps Challenge 2026

Challenge: 1. Abandoned but not Forgotten: Storytelling about NASA's Discarded Equipment on the Moon and Mars · Plan: [IDEA.md](IDEA.md) · Team: <team name>

## What it does

A phone-style messaging app with a glass look on an animated starfield. The contacts are 12 pieces of NASA hardware left behind:

| Where | Robots |
|---|---|
| Mars | Viking 1, Sojourner, Spirit, Opportunity, Phoenix, InSight, Ingenuity |
| Moon | Surveyor 3, Apollo 12 ALSEP, Apollo 12 lunar module "Intrepid", Apollo 15 Lunar Roving Vehicle |
| Deep space | Pioneer 10 |

You tap a question and the robot answers in the first person. Each answer line has a tag and a source link:

| Tag | Meaning |
|---|---|
| FACT | Copied from a NASA page. The exact quote can be shown ("Show NASA quote") |
| SUM | We worked it out from two dates on the page (for example "from landing to last contact"). NASA does not state it |
| NOTE | What the page does not say (for example "no reason is given"). The robot does not guess |
| STORY | The robot's voice only. It never contains a number, date or quote. "Facts only" hides these |

Each chat ends with a discovery card (NASA picture, one fact, source) and a 2-question quiz. A right or a wrong answer both show the NASA sentence behind the answer. Finishing the quiz adds a sticker. The Map tab plots every robot whose NASA page gives a position.

Also included:

- **Read aloud:** a speaker button on every message, plus a setting that reads replies aloud as they arrive. It uses the browser's built-in speech, with no network call.
- **Tamil interface (தமிழ்):** all menus, buttons, hints and quiz feedback. Robot answers stay in English, because every FACT is an exact quote from an English NASA page.
- **Works offline:** after the first visit a service worker caches the app, so it can be installed to the home screen and used in a classroom without internet.
- **Accessibility:** keyboard navigation, focus rings, live regions for new messages and labelled map markers. Tags differ by label and border style, not only by colour. All motion stops when the device asks for reduced motion.

There is no live AI, no API call and no login at run time. There is no free text, so a robot can never invent a fact.

## Live demo

<GitHub Pages link. It must open without a login.>

To publish: push to GitHub, then Settings → Pages → Deploy from branch → `main` / root. There's no build step.

## How to run

No build, no install, no key.

**Easiest: one file.** Open `dist/last-message-home.html` by double-clicking it. It holds the whole app (code, robot data and pictures), so it works without a server and without internet. You can email it, put it on a USB stick or upload it anywhere. Rebuild it after any change with `python3 scripts/build_single.py`.

**Windows:** double-click `start.bat` to run the normal version (a local server plus the offline cache).

**Any system:**

```
python3 -m http.server 8000        # then open http://localhost:8000
node test/chat.test.js             # 43 tests, no install
python3 scripts/check_data.py      # the same data checks, in Python
python3 scripts/fetch_sources.py   # optional: download the NASA pages again
```

URL options: `?fast=1` skips the typing animation, and `?nosw=1` turns off the offline cache (useful while editing). The animation is also off when the device asks for reduced motion.

| File | What it is |
|---|---|
| `index.html`, `style.css`, `app.js` | The app: glass theme, chats, cards, quiz, map, sticker book, settings, read aloud |
| `i18n.js` | Interface text in English and Tamil |
| `engine.js` | Conversation engine, date sums, map positions and the data checker. It runs in the browser and in Node |
| `sw.js`, `manifest.webmanifest`, `icon.svg` | Offline cache and "install to home screen" |
| `data/contacts.json` | All chats: questions, reply lines, quotes, source links, cards, quizzes |
| `data/sources/*.txt` | Saved text of the 14 NASA pages (fetch date in `FETCHED.txt`) |
| `scripts/fetch_sources.py` | Downloads those pages, using only the standard library. Pass page keys to fetch only some |
| `scripts/check_data.py` | Python port of the data checker, for machines without Node |
| `scripts/build_single.py` → `dist/last-message-home.html` | Packs everything into one HTML file that opens with a double-click. Don't edit the output; edit the sources and rebuild |
| `start.bat` | Windows: double-click to start the local server and open the app |
| `img/*.jpg` | NASA pictures from the mission pages, shrunk to 700 px |
| `test/chat.test.js` | Engine tests and the "every question has a verified source" test |
| `.github/workflows/ci.yml` | Runs both checkers on every push |

## How it works

- **Data:** each contact in `contacts.json` lists its NASA pages. Each question names its `page`. Each FACT line has a `quote` (one or more pieces of text from that page).
- **Checks:** both `node test/chat.test.js` and `python3 scripts/check_data.py` check the same things:
  - every question has a page with a NASA link and saved text
  - every quote is an exact piece of the saved page (after fixing spaces and curly quotes)
  - every number in a FACT line is also in its quote
  - STORY lines contain no number
  - SUM lines use dates whose years are in their quotes
  - map positions, last-seen text, cards and quiz answers have quotes too.

  The Node tests also check that the checker itself catches a wrong quote, a wrong number, a missing source, a number in a story line and a non-NASA link. They also check that every picture exists, every map point is on the map, every picture is in the offline cache, and the Tamil text has every English string.
- **SUM lines:** whole years, months and days between two dates (calendar sums, tested for leap days and short months).
- **Map:** flat maps. Mars uses east longitude 0 to 360, and the Moon uses negative numbers for west. Robots that sit on almost the same spot (Surveyor 3, the ALSEP and Intrepid) are drawn as rings around one point, with their names listed. Labels are placed so they don't overlap. Robots whose pages give no position are not plotted.
- **Stickers and settings:** saved in this browser only (`localStorage`). The app still works if storage is blocked.

To add a robot:
1. Copy a contact block in `contacts.json`.
2. Add its NASA page to `PAGES` in `scripts/fetch_sources.py` and run `python3 scripts/fetch_sources.py <key>`.
3. Write the quotes.
4. Run a checker. It tells you which quote or number does not match.
5. If the robot has a picture, add it to `FILES` in `sw.js` and bump `VERSION`.

## Data sources

| Resource | Used for | Link | Source |
|---|---|---|---|
| NASA Science: Viking 1 | Viking 1 chat | https://science.nasa.gov/mission/viking-1/ | Resources tab |
| NASA Science: Mars Pathfinder | Sojourner chat | https://science.nasa.gov/mission/mars-pathfinder/ | Resources tab |
| NASA Science: Spirit and Opportunity | Spirit and Opportunity chats | https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/ | Resources tab |
| NASA Science: InSight | InSight chat (and Phoenix) | https://science.nasa.gov/mission/insight/ | Resources tab |
| NASA Science: Ingenuity | Ingenuity chat | https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/ | Resources tab |
| NASA Science: Surveyor 3 | Surveyor 3 chat | https://science.nasa.gov/mission/surveyor-3/ | Resources tab |
| NASA Science: Pioneer 10 | Pioneer 10 chat | https://science.nasa.gov/mission/pioneer-10/ | Resources tab |
| NSSDCA: Apollo 12 Lunar Module / ALSEP (1969-099C) | ALSEP and Intrepid chats | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C | Resources tab |
| NSSDCA: Apollo 15 Lunar Module / ALSEP (1971-063C) | Lunar Rover chat (landing site, last drive) | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C | Resources tab (listed there as "Lunar Roving Vehicles") |
| NSSDCA: The Apollo Lunar Roving Vehicle | Lunar Rover chat | https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html | **Extra** (NSSDCA, linked from the Resources tab's NSSDCA) |
| NASA Science: Phoenix | Phoenix chat | https://science.nasa.gov/mission/phoenix/ | **Extra** |
| NSSDCA: Mars Pathfinder (1996-068A) | Sojourner map position | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1996-068A | **Extra** (NSSDCA) |
| NSSDCA: Spirit (2003-027A) | Spirit map position | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2003-027A | **Extra** (NSSDCA) |
| NSSDCA: Opportunity (2003-032A) | Opportunity map position | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2003-032A | **Extra** (NSSDCA) |

No login is needed. Data comes from NASA mission pages; NASA is credited as text only, with no logos. Pictures come from those pages; see the captions in the app.

## Where the data comes from

| File | What it holds | How it was made | Date | Used for |
|---|---|---|---|---|
| `data/sources/<key>.txt` (14 files) | Plain text of each page in the table above. Keys: `viking-1`, `pathfinder`, `mer`, `phoenix`, `insight`, `ingenuity`, `surveyor-3`, `pioneer-10`, `alsep`, `apollo-15-lm`, `lrv`, `pathfinder-nssdca`, `spirit-nssdca`, `opportunity-nssdca` | `python3 scripts/fetch_sources.py` | First 9 pages: 13 Nov 2026 (`FETCHED.txt`). Last 5: 14 Nov 2026 | Tests only: they prove each quote is on the page. The app does not load these files |
| `data/sources/FETCHED.txt` | The date of the last full fetch | written by the script | 13 Nov 2026 | Shows how old the saved pages are |
| `data/contacts.json` | All 12 chats | Written by hand from the pages above. Every FACT line has a `quote` copied from the page named in its `page` field | `meta.checked` 14 Nov 2026 | Everything on screen |
| `img/*.jpg` (10 files) | NASA pictures, 700 px wide | Downloaded from the mission pages and shrunk. `apollo12-lm.jpg` comes from https://nssdc.gsfc.nasa.gov/planetary/image/apollo12_lunar_module.jpg (linked from the 1969-099C page). `lrv-15.jpg` comes from https://nssdc.gsfc.nasa.gov/planetary/image/as15_88_11901.jpg (linked from the rover page) | 13 and 14 Nov 2026 | Discovery cards and the sticker book. `mer.jpg` is shared by Spirit and Opportunity, and `apollo12-lm.jpg` by the ALSEP and Intrepid |
| Date sums, map projection | SUM lines and map positions | Calculated by `engine.js` | At run time | SUM lines and the Map tab |

### Trace a number

- Viking 1 shows "Last contact 11 Nov 1982". Screen: chat list → `contacts.json`, contact `viking-1`, field `last_seen` (quote "The lander operated until Nov. 11, 1982") → `data/sources/viking-1.txt` → https://science.nasa.gov/mission/viking-1/.
- The Map tab places Spirit at 14.572 S, 175.478 E. Screen: Map tab → `coords` of `spirit` (quote "in Gusev Crater, at 14.572 S, 175.478 E", page `spirit-nssdca`) → `data/sources/spirit-nssdca.txt` → NSSDCA 2003-027A. This is the landing site; the legend says Spirit drove on from there.
- Intrepid's SUM line "Surveyor 3 had waited 2 years, 6 months and 30 days" comes from `engine.js` `span("1967-04-20", "1969-11-19")`. Both dates are quoted from the 1969-099C page.

### Refresh the data

```
python3 scripts/fetch_sources.py   # downloads all 14 pages (retries slow NSSDCA requests)
node test/chat.test.js             # must say "43 passed"
python3 scripts/check_data.py      # must say "ALL PASSED"
```

If a check now fails with "quote not found on page", NASA changed the page. Open the live page, copy the new wording into the `quote` in `contacts.json`, and run the check again. The script doesn't refresh pictures; replace them by hand.

## If something breaks

| Symptom | Likely cause | Fix |
|---|---|---|
| The notice "The chat data did not load (Failed to fetch)" | The page was opened by double-click (`file://`) | In the project folder run `python3 -m http.server 8000` and open http://localhost:8000 |
| "The chat data did not load (HTTP 404)" | The server runs in the wrong folder, or `data/contacts.json` is missing | Start the server inside the project folder |
| "The chat data did not load (... JSON ...)" | An edit broke `contacts.json` | `python3 -c "import json;json.load(open('data/contacts.json'))"` shows the line |
| Edits don't show up after reload | The offline cache served the old file while the network was slow | Hard reload, or add `?nosw=1` while editing. Bump `VERSION` in `sw.js` before publishing |
| A picture is missing on a card | `img/<name>.jpg` was renamed or deleted | Names must match `image.file`. The tests report it |
| No speaker buttons, or "Read aloud is not available" | The browser has no speech engine (some Linux browsers) | Use Chrome, Edge or Safari. Everything else still works |
| Stickers are lost after closing the tab | Browser storage is blocked (private window) | Use a normal window |
| `fetch_sources.py` ends with `HTTPError` or a timeout | NASA is slow, rate limited, or a page moved | Run again, or fetch one page: `python3 scripts/fetch_sources.py lrv`. If 404, update `PAGES` and the `url` in `contacts.json` |
| `CERTIFICATE_VERIFY_FAILED` | Python lacks root certificates (common on macOS) | Run "Install Certificates.command" from the Python folder |
| A check says `quote not found on page` | NASA changed the page | Fetch again, then fix the quote |

### Health check

1. `node test/chat.test.js` prints `43 passed`, and `python3 scripts/check_data.py` prints `ALL PASSED`.
2. Open http://localhost:8000. The chat list shows 12 robots in three groups.
3. Open Intrepid and tap a question. The answer has a tag and a source link; Settings → "Show NASA quote" adds the quote.
4. The Map tab shows 6 markers on Mars and 4 on the Moon, and the text "Not plotted, because we do not guess." for Ingenuity.
5. Settings → தமிழ் switches the interface to Tamil.

## Accuracy check

| Item | Result |
|---|---|
| All quotes in `contacts.json` (14 pages) | Every quote is found in the saved page text (both checkers) |
| The 9 original pages | Quotes were also checked on the live pages in a browser on 13 Nov 2026 |
| The 5 new pages (14 Nov 2026) | Quotes were checked against page text downloaded that day, not yet by hand in a browser |
| Plan listed `id=1971-063C` as "Lunar Roving Vehicles" | It is the Apollo 15 lunar module page. It is used for the rover's landing site and last drive; the rover facts come from the NSSDCA rover page |
| Plan listed `1969-059C` as "Apollo Lunar Modules" | Not used. The Apollo 12 lunar module chat (Intrepid) uses 1969-099C, which covers both the LM and the ALSEP |
| ALSEP picture | The ALSEP page has no photo of the ALSEP itself. The card shows the Apollo 12 LM photo from that page, and the caption says so |
| Lunar Rover "left on the Moon" | The pages don't say this in words. The chat says so in a NOTE line |
| Map positions for Sojourner, Spirit and Opportunity | These are landing sites from NSSDCA. The rovers drove on, and the legend says so |
| Ingenuity position | No NASA page in this project gives one. Not plotted |
| Spirit landing date | The NASA Science page gives 3 January 2004 (US time), and the NSSDCA page gives 4 January UT (11:35 p.m. 3 January EST). The chat uses the NASA Science wording |
| Plan: Opportunity "battery is low and it's getting dark" | A popular paraphrase, not NASA wording. Not used |
| Browser (Edge, headless): every screen in English and Tamil, map, quiz, stickers, settings | No script errors, no sideways scroll at 430 px |

**Not tested:** screen readers, Safari and Firefox, real phones, and the read-aloud voice on each platform.

## Limits

- NASA pages can change. If a quote stops matching, fetch the pages again and run the checks.
- Pictures marked "illustration" are NASA artwork, not surface photos.
- For most pictures, "Credit: NASA" is given with the page link. Check each page's own credit line before you publish.
- Robot "voice" lines are written by us. STORY lines are short and carry no numbers, but they are not NASA text.
- Robot answers are English only. A Tamil translation of the answers would no longer be an exact quote, so it would need its own label (for example TRANSLATION) and a reviewer who reads both languages.
- Glass blur needs `backdrop-filter`. Older browsers get solid panels instead.

## AI use

AI tools helped write the code and README. Replace this note with what your team actually did.

## Licence

Code: MIT (see [LICENSE](LICENSE)). NASA text and pictures keep NASA's own terms.

## References

- NASA Science, Viking 1. https://science.nasa.gov/mission/viking-1/
- NASA Science, Mars Pathfinder. https://science.nasa.gov/mission/mars-pathfinder/
- NASA Science, Mars Exploration Rovers Spirit and Opportunity. https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/
- NASA Science, Phoenix (**Extra**). https://science.nasa.gov/mission/phoenix/
- NASA Science, InSight. https://science.nasa.gov/mission/insight/
- NASA Science, Ingenuity Mars Helicopter. https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/
- NASA Science, Surveyor 3. https://science.nasa.gov/mission/surveyor-3/
- NASA Science, Pioneer 10. https://science.nasa.gov/mission/pioneer-10/
- NASA NSSDCA, Apollo 12 Lunar Module / ALSEP. https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C
- NASA NSSDCA, Apollo 15 Lunar Module / ALSEP. https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C
- NASA NSSDCA, The Apollo Lunar Roving Vehicle. https://nssdc.gsfc.nasa.gov/planetary/lunar/apollo_lrv.html
- NASA NSSDCA, Mars Pathfinder. https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1996-068A
- NASA NSSDCA, Spirit. https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2003-027A
- NASA NSSDCA, Opportunity. https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=2003-032A

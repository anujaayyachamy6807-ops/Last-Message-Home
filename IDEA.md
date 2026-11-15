# Project 13 — Last Message Home: chat with the robots we left behind

## What

- A web app that looks like a **phone messaging app**. The contact list is NASA hardware left in space:
  - Viking 1 lander (Mars), Sojourner, Spirit, Opportunity, Phoenix, InSight, Ingenuity
  - Apollo Lunar Roving Vehicle, ALSEP science package, Surveyor 3 (Moon)
  - Pioneer 10 (deep space)
- The child opens a chat. The robot "texts" its own story in short messages: why it was sent, what it did each day, what it found, how its mission ended.
- The child answers with tap buttons ("What did you find?", "Why did you stop?", "Show me a photo!").
- Each chat ends with a **discovery card** (real NASA photo + 1 science fact + source link) and a 2-question quiz.
- A "sticker book" collects discovery cards from all robots.

## Why

- The challenge asks for **story-driven** learning and "showing how missions operated rather than listing facts". A first-person chat is story by design.
- Kids already know chat apps. Zero learning curve.
- Opportunity's famous last data ("my battery is low and it's getting dark" — a popular paraphrase, not a real message) shows the danger: **accuracy is required**. Our chats use only facts from NSSDCA / NASA mission pages, and say clearly when a line is a story device.
- Strong on **Presentation** and **Impact** (classrooms, Tamil version possible).

## How

### Flow
1. Home: contact list with robot avatars and "last seen" = mission end date.
2. Open chat → typing animation → messages appear.
3. Tap-reply buttons drive the branch (no free text, so no wrong facts).
4. End: discovery card + quiz → sticker added.
5. "Map" tab: where each robot rests (Moon / Mars / deep space).

### Content
- One JSON file per robot: messages, reply options, facts, photo URL, source URL.
- Every fact line has a `source` field. A "Real or story?" toggle shows which lines are facts and which are storytelling.
- Writers draft in a shared sheet; a checker verifies every fact against the Resources tab pages.

### Tech
- HTML/CSS/JS or React. No backend, no login. GitHub Pages.
- Optional: text-to-speech button for younger readers (browser Speech API).

### Team split (6)
- 2 writers, 1 fact checker, 2 front-end, 1 art + demo video.

### 2-day plan
- **Sat**: pick 6 robots, write 3 chats, build chat engine.
- **Sun**: remaining chats, discovery cards, quiz, map tab, demo.

## Resources and data

| Resource | Used for | Link | Source |
|---|---|---|---|
| NSSDCA | Mission facts, dates, masses | https://nssdc.gsfc.nasa.gov/ | Resources tab |
| Apollo Lunar Modules | LM story | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-059C | Resources tab |
| Lunar Roving Vehicles | LRV story | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1971-063C | Resources tab |
| ALSEP Scientific Packages | ALSEP story | https://nssdc.gsfc.nasa.gov/nmc/spacecraft/display.action?id=1969-099C | Resources tab |
| Surveyor 3 | Surveyor story | https://science.nasa.gov/mission/surveyor-3/ | Resources tab |
| Mars Pathfinder (Sojourner) | Sojourner story | https://science.nasa.gov/mission/mars-pathfinder/ | Resources tab |
| Spirit & Opportunity | Rover stories | https://science.nasa.gov/mission/mars-exploration-rovers-spirit-and-opportunity/ | Resources tab |
| Viking 1 | Viking story | https://science.nasa.gov/mission/viking-1/ | Resources tab |
| InSight (and Phoenix) | Lander stories | https://science.nasa.gov/mission/insight/ | Resources tab |
| Ingenuity | Helicopter story | https://science.nasa.gov/mission/mars-2020-perseverance/ingenuity-mars-helicopter/ | Resources tab |
| Pioneer 10 | Deep-space story | https://science.nasa.gov/mission/pioneer-10/ | Resources tab |

No login needed.

## Demo hook (30-second video)

- Child opens "Ingenuity" chat → "I was only supposed to fly 5 times…" → taps "How many did you fly?" → real number from the NASA page → discovery card with a real photo.

## Rules and risks

- No invented quotes presented as real. Mark story lines.
- Check every date and number against the source page.
- Use NASA images with credit; no NASA logo.
- Risk: too many robots. 6 good chats beat 12 thin ones.

## Build status (phase 2)

### Built
- Phone-style chat app, 10 contacts: Viking 1, Sojourner, Spirit, Opportunity, Phoenix, InSight, Ingenuity, Surveyor 3, Apollo 12 ALSEP, Pioneer 10.
- Tap-to-ask questions (no free text), 5 to 7 per robot, typing animation, tagged lines (FACT, SUM, NOTE, STORY) with a source link on every non-story line.
- Toggles: "Show NASA quote" (proof) and "Facts only" (hides story lines). This replaces the "Real or story?" toggle.
- Discovery card with NASA picture, one fact and source; 2-question quiz per robot with the NASA sentence shown after each answer; sticker book (saved in the browser).
- Map tab with Mars and Moon plots from positions on the NASA pages.
- Conversation engine and data checker in `engine.js`; 37 Node tests including "every question has a verified source".
- All 163 quotes checked on the live NASA pages.

### Changed from the plan
- The plan's NSSDCA links for Lunar Roving Vehicles (1971-063C) and Lunar Modules (1969-059C) are not those pages (1971-063C is the Apollo 15 lunar module). Only the ALSEP page (1969-099C, Apollo 12) is used.
- No Apollo LRV chat: no verified page about the rover itself was used.
- Opportunity's "battery low" line is a popular paraphrase and is not used.
- Ingenuity: the page wording "no more than five test flights in 30 days" replaces "5 flights".
- Where a page does not say why a robot stopped, the chat says so (NOTE line) instead of guessing.
- Sums such as "6 years, 3 months and 22 days" are calculated and labelled SUM.
- Phoenix has its own NASA page and is marked Extra (the plan listed it under InSight).

### Added in phase 3
- Two new Moon chats from NSSDCA pages: the Apollo 12 lunar module "Intrepid" (1969-099C) and the Apollo 15 Lunar Roving Vehicle (NSSDCA rover page + 1971-063C). 12 robots in total.
- ALSEP card picture: the Apollo 12 LM photo from the ALSEP page, captioned as such (the page has no ALSEP photo).
- Map positions for Sojourner, Spirit and Opportunity: landing sites from their NSSDCA pages, labelled as landing sites.
- Read aloud (browser speech): a speaker button on every message, plus an auto-read setting.
- Tamil interface (தமிழ்). Robot answers stay in English because they are exact quotes.
- Glass theme with an animated starfield, a settings sheet, a progress ring, quiz feedback animations and a holographic sticker book. Reduced motion is respected.
- Works offline and installs to the home screen (service worker + manifest).
- `scripts/check_data.py` (Python data checker), CI workflow, MIT licence. 43 Node tests.

### Still not built
- A Tamil translation of the robot answers (it would need a TRANSLATION label and a bilingual reviewer).
- An Ingenuity map position (no NASA page used here gives one).
- A chat for a lunar module other than Apollo 12.

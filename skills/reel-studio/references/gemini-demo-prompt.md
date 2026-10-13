# Gemini demo prompt

`scripts/demo-brief.mjs` sends everything below the horizontal rule to
`gemini-3.8-flash` (or `GEMINI_MODEL`), together with every screenshot from the intake as an image,
substituting `{{STORY}}`, `{{PRODUCT}}`, `{{AUDIENCE}}`, `{{NOTES}}`, `{{PRESENTER}}`,
`{{SCREENS}}`, `{{BRAND}}`, `{{TRANSITIONS}}` and `{{POLISH}}`.

The job here is not the same as a reel's. In a reel Gemini writes the argument. In a demo
the person has already written what they want to say, and they will hear it in their own
cloned voice, so **the story is spoken word for word** unless `--polish` is passed. Gemini's
job is editorial staging: cut the story into scenes, decide when the presenter is on
screen, pair each sentence with the right screenshot, and find the exact region of the
screenshot each sentence is about.

Only the focus boxes depend on Gemini looking at the images. Everything else can be judged
from the text, so a bad box is fixed by editing `plan.json`, not by re-running.

---

You are a senior product-marketing video director. You stage short SaaS product demos that
feel like a founder walking a peer through the product: the presenter on camera for the
human moments, the real product filling the screen for the proof, and the camera finding
exactly the part of the UI each sentence is about.

**PRODUCT:** {{PRODUCT}}

**AUDIENCE:** {{AUDIENCE}}

**CONTEXT FROM THE PERSON:** {{NOTES}}

**PRESENTER:** {{PRESENTER}}

**BRAND SYSTEM:**
{{BRAND}}

## The story

This is what the presenter says, in order:

```
{{STORY}}
```

{{POLISH}}

## The screenshots

The images attached to this message are the real product, in this order. Each has an id, a
note from the person on what it shows, and a device:

{{SCREENS}}

These are the only product visuals in the video. They are shown exactly as captured —
nothing is redrawn — so every product claim in the story has to be shown on one of them, or
spoken over the presenter instead.

## How to stage it

**Scenes.** Split the story into 4 to 8 scenes. Each scene covers one or more *whole*
sentences, in order. Every sentence belongs to exactly one scene. Joined together, the
scenes' `voiceoverSentences` must reproduce the story exactly: same words, same order,
same punctuation.

**Scene types.**

| `type` | On screen | Use for |
|---|---|---|
| `avatar` | The presenter, full frame | The opening, a personal line, a problem statement with nothing to show |
| `screen` | A screenshot filling the frame, with an optional presenter bubble in a corner | A product claim — the default for anything the product does |
| `split` | Presenter and screenshot side by side | A moment where the presenter's reaction matters as much as the UI |
| `cta` | Logo, closing line, button and URL, with an optional presenter bubble | The final sentence or two |

Open on the presenter (`avatar`) unless the story opens on the product. End on `cta`. Use
`split` once at most. Do not put the presenter full frame for more than about 8 seconds at a
time; around 2.5 words a second, that is about 20 words.

**Presenter.** `avatar` is one of `full` (type `avatar` only), `split` (type `split` only),
`bubble` or `none`. Use `bubble` on most screen scenes so the presenter stays present, and
`none` when a screenshot needs the whole frame (a dense dashboard, a phone screen that
already fills the height).

**Focus.** For each `screen` or `split` scene, give 1 to 3 focus actions, each pinned to
words the presenter says in *that* scene:

- `zoom`: the camera moves in on the region. Use it for the main claim of the scene.
- `highlight`: dims everything except the region. Use it for "this panel", "this number".
- `click`: a cursor moves in and clicks. Only on a real button, link or control visible in
  the screenshot.

`onWords` is 1 to 4 consecutive words copied exactly from that scene's sentences. `box` is
`[x, y, width, height]` as fractions (0–1) of that screenshot's own width and height, from
its top-left corner. Look at the image carefully and draw the box tightly around the
element, plus a little breathing room. A box that misses the element is the worst error
you can make here, worse than having no focus at all. `label` is optional: a short
sentence-case callout of 2 to 4 words shown beside the box.

**Laptop scenes.** A screenshot whose device is `laptop` is shown on a 3D laptop that the
camera moves around, product-film style. Give each laptop scene a `motion`:

- `swingIn` for the first time the product appears: it swings in from the side and turns to face you.
- `tiltBack` for a beat that shows something off: it leans away and turns.
- `riseUp` when text needs the top of the frame: it rises from below and parks low.
- `float` for a calm hold, and `front` when a zoom or click must land precisely.

Do not give adjacent laptop scenes the same motion. A laptop scene may also cross-fade to a
second screenshot mid-scene with `nextScreen`, for example a recording becoming its note.
Focus boxes after the swap refer to the second image. It may also build a `list` of 2 to 4
short items, each landing on its own words; use it when the sentence names several things.
On laptop scenes, headlines are drawn as big glowing words, so they must be **2 to 5
words**: "Meet Waivs", "AI-drafted replies". A longer line will not fit. A scene with a
`list` needs no headline. `mark` is ignored there. An `avatar` scene may carry a short headline too; it
is drawn as glowing words above the presenter.

**Headlines.** A `screen` or `split` scene may carry a short on-screen headline: sentence
case, at most 6 words, drawn from what is said. Give `emphasis` (words taken from the
headline) and a `mark` (`highlight`, `underline`, `circle`, `box`, `strike` or `none`).
`cta` scenes have `headline: null`; an `avatar` scene may have one (see above). An `eyebrow` is an optional 1 to 3 word
kicker.

**Transitions.** One between each pair of adjacent scenes, from: {{TRANSITIONS}}. Prefer
`fade` and `slide` between screens of the same product, and save the louder ones for the
move from presenter to product and back.

**Sound.** Cuts, zooms, highlights, clicks and the closing button already get their sounds
automatically. Add 0 to 2 extra `sfx` cues from `whoosh`, `whip`, `page-turn`, `switch` and
`ding`, only for a spoken beat that deserves one (a number landing, a "done"), each on words
from the story. Do not add `mouse-click`.

**Privacy check.** This is healthcare software. Look at every screenshot for anything that
could be real patient information: a full name alongside a date of birth, health card or
MRN numbers, addresses, phone numbers, or clinical details tied to a name. List each one in
`phiCheck` with the screen id and what you saw. Placeholder names like "Demo Patient" or
"Jane Doe" do not count.

## Output

Return **only** a single JSON object, no markdown fence and no commentary:

```
{
  "mode": "demo",
  "title": "Short title",
  "slug": "kebab-case-slug",
  "logline": "One sentence on what this demo shows.",
  "voiceover": {
    "script": "The full story, exactly as it will be spoken.",
    "wordCount": 120,
    "toneNotes": "Delivery guidance: pace, warmth, emphasis."
  },
  "scenes": [
    {
      "id": "kebab-case-id",
      "type": "avatar | screen | split | cta",
      "avatar": "full | split | bubble | none",
      "screen": "screen id, or null",
      "motion": "laptop screens only: swingIn | tiltBack | riseUp | float | front",
      "nextScreen": { "screen": "screen id to cross-fade to mid-scene, or omit", "onWords": "exact words the swap lands on" },
      "list": [{ "text": "2–3 word item", "onWords": "exact words it lands on" }],
      "voiceoverSentences": ["Exact sentences from the story."],
      "purpose": "What this scene does for the viewer.",
      "headline": { "text": "Sentence case.", "emphasis": "words", "mark": "underline" },
      "eyebrow": "Optional kicker, or null",
      "focus": [
        { "onWords": "exact words", "action": "zoom | highlight | click", "box": [0.1, 0.2, 0.3, 0.2], "label": "Optional callout" }
      ]
    }
  ],
  "transitions": [{ "from": "scene-id", "to": "scene-id", "style": "fade", "why": "One clause." }],
  "sfx": [{ "onWords": "exact words", "file": "whoosh", "volume": 0.25 }],
  "cta": { "headline": "Sentence-case closing line.", "emphasis": "words", "button": "Button label", "url": "the product URL" },
  "suggestedEdits": ["Optional improvements to the story. Never applied automatically."],
  "risks": ["Claims in the story that no screenshot supports, or that could overreach."],
  "phiCheck": [{ "screen": "s1", "concern": "What looks like real patient data, and where." }]
}
```

Rules for the JSON: scene ids are unique; every `screen` names a screenshot id that
exists; every `box` value is between 0 and 1, with `x + width ≤ 1` and `y + height ≤ 1`;
`transitions` has exactly one entry per adjacent pair of scenes; the last scene is the
`cta`.

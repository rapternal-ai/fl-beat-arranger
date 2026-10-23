# FL Studio workflow — split by channel & clip placement

This app plans an arrangement from your **existing** 4-bar Channel Rack pattern. It never opens, parses, or writes your `.flp`. All FL Studio steps below are manual.

## 1. Prepare the project

1. Open your beat and **save a copy**: `File → Save as… → "Original Beat - Arranged.flp"`. Keep the original untouched.
2. Confirm the project is **4/4** and the source Pattern is **exactly 4 bars**. If step-sequencer or piano-roll events extend past bar 4, trim them first — the arranger assumes an exact 4-bar cycle.
3. In the **Channel Rack**, select the pattern, then use **Channel Rack menu → Split by channel**. FL Studio creates one new pattern per channel, each containing that channel's notes/events. All patterns still reference the original instruments, so plugin settings and Mixer routing are preserved.
   - If a single channel contains layered drums or a combined sample, it stays one pattern — the arranger cannot split it further.
   - Patterns containing **automation events** may need manual review after splitting to avoid duplicated/conflicting automation.

## 2. Build the manifest

- Note the exact names of the split patterns.
- In the app, click **Import Manifest** (JSON or CSV) or type the names in the Channels table and confirm each **role** (kick, snare, hihat, percussion, bass, melody, chords, pad, fx, other), **priority**, and **can drop** (protected sounds are never randomly removed).
- Duplicate pattern names trigger a warning — they are ambiguous when placing clips by hand.

## 3. Generate and edit

- Click **Generate Arrangement**. The grid shows seven 4-bar blocks: Intro (1–4), Verse A–D (5–20), Hook A–B (21–28).
- Toggle any instrument/block on or off; overrides are marked `*` and survive export.
- **Shuffle Seed** re-rolls bounded variation (it will ask whether to keep your overrides).
- The sidebar explains why each cell is on/off and lists **manual** transition suggestions (e.g. a drum fill in bar 20, a crash on bar 21). These are checklist items, not edits.

## 4. Export and place clips in FL Studio

Export all three files. In the `playlist-guide.md` you get:

- a suggested Playlist **track order** (recommendation only — not detected track IDs);
- per-track placement lines such as `Piano → bars 1, 5, 9, 13, 17, 21, 25 (4 bars each)`;
- an unchecked manual-transition checklist;
- safety reminders.

Then, in FL Studio:

1. Switch to **Song mode** and open the Playlist.
2. For each listed bar, drag the matching **pattern** onto its track as a **native Pattern Clip**, 4 bars long.
3. Edit MIDI inside clips as usual — they still reference your original channels.
4. Apply transition suggestions by hand if you want them (they were **not** applied for you).
5. Save as a **new `.flp` version**. Preview the whole song: long notes, release tails, sidechain and effect tails can cross clip boundaries.

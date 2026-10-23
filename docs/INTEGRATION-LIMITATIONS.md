# Integration limitations (v1)

What this app does **not** do, by design:

- **No `.flp` reading or writing.** Binary project files are never opened, parsed, or modified. Exporting a guide is not editing a project; the exporter never claims otherwise.
- **No automatic Playlist placement.** The exported `playlist-guide.md` and `arrangement.csv` describe exact clip placements for a human to perform. Playlist track indices are ordering recommendations, not detected FL Studio track IDs.
- **No MIDI scripting assumption.** FL Studio's Python MIDI scripting API targets controller interactions; there is no publicly documented method to create arbitrary Playlist Pattern Clips at requested bars. Any future use must live behind an adapter feature flag after verification.
- **No `.flp` binary patching** via third-party libraries — version/plugin compatibility and unsupported record types make it risky.
- **No plugin, Mixer, or routing changes.** Split-by-channel patterns keep referencing the original shared instruments; a split does **not** create a dedicated Mixer insert per Playlist lane.
- **No audio generation or MIDI note synthesis.** Transition entries (bar-20 fill, bar-21 crash, intro filter, pre-hook bass drop) are textual suggestions requiring manual edits.

## Musical caveats

- A channel containing layered drums/combined samples cannot be separated into individual drum roles automatically.
- Automation events inside a pattern may conflict after splitting; review manually.
- Long notes, arpeggiators, release tails, sidechains, and effect tails can cross 4-bar clip boundaries — always preview the assembled song.
- A whole 4-bar block dropout is not the same as a one-beat fill or one-bar pre-hook silence; the latter only exist as manual suggestions.
- Rejected inputs: non-4/4 time, source loops other than exactly 4 bars, tempo outside 40–240 BPM, duplicate channel IDs, more than 32 channels, zero enabled channels.

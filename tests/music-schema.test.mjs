import test from "node:test";
import assert from "node:assert/strict";

import { buildMusicGroupSchema, serializeJsonLd } from "../src/lib/musicSchema.mjs";

test("buildMusicGroupSchema includes the requested profile fields", () => {
    const schema = buildMusicGroupSchema([
        { title: "latest-track", url: "https://soundcloud.com/akinevz/latest-track" },
    ]);

    assert.deepEqual(schema, {
        "@context": "https://schema.org",
        "@type": "MusicGroup",
        name: "akinevz",
        alternateName: [
            "KINE",
            "KALE",
            "I lied my name isn't actually KINE",
            "I lied my name isn't actually KALE",
        ],
        url: "https://akinevz.com",
        genre: ["Electronic", "Experimental", "Industrial", "Drone", "Glitch"],
        description:
            "Independent sound designer, music creator, and electronic music artist.",
        sameAs: [
            "https://soundcloud.com/akinevz",
            "https://youtube.com/@akinevz",
            "https://x.com/akinevz",
            "https://github.com/akinevz2",
        ],
        track: [
            {
                "@type": "MusicRecording",
                name: "latest-track",
                url: "https://soundcloud.com/akinevz/latest-track",
                byArtist: {
                    "@type": "MusicGroup",
                    name: "KINE",
                },
            },
        ],
    });
});

test("buildMusicGroupSchema falls back to an empty track set", () => {
    const schema = buildMusicGroupSchema();

    assert.deepEqual(schema.track, []);
});

test("serializeJsonLd escapes closing angle brackets", () => {
    assert.equal(serializeJsonLd({ value: "<script>" }), '{"value":"\\u003cscript>"}');
});

/*
     Maintenance plan to avoid breakage:

     1. Define the schema contract before edits:
         List required `MusicGroup` fields and acceptable `sameAs` identities.

     2. Change source and expected output together:
         Update schema builder constants and this test in the same commit.

     3. Keep assertions strict:
         Use full object equality for top-level schema and focused assertions for edge behavior.

     4. Validate escaping and safety invariants:
         Preserve tests for JSON-LD escaping and empty-track fallback behavior.

     5. Run layered verification:
         Execute this file, then run full `npm test`, then verify rendered JSON-LD in built HTML.

     6. Document every contract change:
         Note why `sameAs` and identity fields changed so future updates stay intentional.
*/

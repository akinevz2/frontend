import test from "node:test";
import assert from "node:assert/strict";

import { buildMusicGroupSchema, serializeJsonLd } from "../scripts/music-schema.mjs";

test("buildMusicGroupSchema includes the requested profile fields", () => {
    const schema = buildMusicGroupSchema([
        { title: "latest-track", url: "https://soundcloud.com/akinevz/latest-track" },
    ]);

    assert.deepEqual(schema, {
        "@context": "https://schema.org",
        "@type": "MusicGroup",
        name: "akinevz",
        alternateName: ["KINE", "KALE", "I lied my name isn't actually"],
        url: "https://akinevz.com",
        genre: ["Electronic", "Experimental", "Industrial", "Drone", "Glitch"],
        description:
            "Independent sound designer, music creator, and electronic music artist.",
        sameAs: [
            "https://soundcloud.com/akinevz",
            "https://x.com/akinevz",
            "https://github.com/akinevz2",
        ],
        track: [
            {
                "@type": "MusicRecording",
                name: "latest-track",
                url: "https://soundcloud.com/akinevz/latest-track",
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

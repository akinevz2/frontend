# notes for post #9 (follow-up)

loose ends from post #8, roughly in order of reader-anger-prevention:

## corrections / honest footnotes
- ghost-text caveat: inline completions still ride on a real Copilot subscription. chat + agent mode are the parts that actually run local via BYOK. frame as "one feature still phones home"
- truth: it's a switch, not direct copper. fix the #8 diagram to match. hostnames still pinned in hosts file so traffic stays off wifi
- the XT mystery: system currently reports "RX 6800 16GB", suffix vanished after AMD driver install/remove + rollback to windows-provided stack. check the retail box. morning shortcut: GPU-Z or device manager hardware ids - revision C1 = XT, C3 = non-XT, no box required. parable drafted below

## hardware / accelerators section (replaces money section)
- no "buying" framing - this is about adapting existing gaming / multi-gaming-pc homes
- accelerator lineage: started 2x 3060 12GB, then swapped to 1x 4070 12GB + 1x 3060 12GB (verify whether the 3060s were Ti)
- so RARETOWER's "24GB VRAM" = 12+12 across two cards, not one big card - worth spelling out, ollama splits the model across both
- MINIFRIDGE: RX 6800 (XT?) 16GB, 64GB system RAM

## the tuning section (cut from #8)
- flash attention: server-wide flag, just turn it on
- kv cache q8_0: per-model via Modelfile, NOT global - global setting breaks gpt-oss sliding window attention. this is the footgun worth a paragraph
- together these buy back the memory for long context (128k)

## what it can / can't do (cut from #8)
- can: boilerplate, refactors, agent edits, tool calls, private-lan data, runs all night unmetered
- can't: frontier-level planning, long structured docs. competent junior, not senior
- honest workflow: cloud for the hard 20%, local for the easy 80%

## models that didn't make it
- qwen3 family: zero success communicating intent, 100% of attempts. everything except qwen2.5-coder ends in infinite reasoning/counter-reasoning loops unless terminated and hand-held through its own thinking output
- qwen2.5-coder is the exception - the one qwen that behaves
- fallback model on MINIFRIDGE is gpt-oss:20b. why fallback exists: hot-swapping models on the main box mid-task is bad

## post #10 (definitely happening)
- llm-gateway: routing between boxes, currently defaults to RARETOWER instead of load balancing (suspected missing concurrency threshold config). whole post on its own

## parable of the vanishing suffix (draft, for the XT bit)

there was a card that believed it was an XT. it had reason to - same die as its plainer sibling, a few more compute units lit. but its name never lived in the card. it lived in the driver: a lookup table that reads the device id, checks the revision byte, and pronounces the marketing name to the operating system.

then the vendor's driver was removed, and windows sent its own - a polite generalist that recognises families, not individuals. it read the id, found the family, and announced: RX 6800. the revision byte went unread. two letters fell off the end of the name.

nothing in the slot changed. every shader that existed still exists. it clocks the same, renders the same, hosts the same model. but ask the system who lives there and you get the sibling's name.

moral: the name was never in the silicon. it's in whoever's reading it. reinstall the reader that knows you, and the letters come back.

(check the box anyway.)

- Claude Sonnet 4.6
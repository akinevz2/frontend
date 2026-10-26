# twelfth post (#mixing, #phase, #technique, #audio, #music)
i found a mixing technique by accident and now i can't stop using it
* i usually build my final mixes from 3 "core" channels
* 1 is not enough
> one gets fully inverted
> one gets max-stereo-widened
> one gets narrowed
* sometimes the narrowed one is also inverted
* i never really planned that
* it just felt correct
* i clone that narrowed-inverted one again
* run it through a limiter
* feed it back in
* odd number of total inversions, always
> 3 minimum, sometimes 5
* even number ruins it
* this clone-feed is what causes the phase-artifact-cancellation
* not the widening
* i was wrong about that part for a while

* the weird part: it only fully reveals itself at the very end of a track
* my fades are never uniform
> one channel has tape-grain decay
> one has a slope to zero
> one just stops dead after the reverb tail
* while the track is at full volume, the cancellation holds
* everything sums clean
* once the three channels start fading at different rates, the limiter on the cloned channel can't keep up
* its release-time stops matching the actual decay-curve
* so the cancellation breaks
> just slightly
> just at the edges of the stereo field
* what's left over sounds like a alias
> a little ghost-image of the track, right as it dies out
> i didn't design this on purpose
> i reverse-engineered it after noticing it on my last upload
> now that i understand it, i think i can tune it
> push the alias earlier or later in the fade
> make it louder or more narrow
> just by adjusting the limiter's release-time against my fade-curves
* a sort-of fade-localized-deliberate-aliasing-tool, i guess
* **if you want to try this**: 3 channels, odd inversions:
> clone+limit the narrowed one
> feed it back into the sum
> give your channels mismatched fade shapes
> listen to what survives at the very end

> co-written with style-transfer by Claude Sonnet 4.6

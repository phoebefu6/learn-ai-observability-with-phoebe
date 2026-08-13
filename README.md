# learn-ai-observability-with-phoebe

**Evals tell you whether it works. Observability tells you what actually happened.**

Live: https://phoebefu6.github.io/learn-ai-observability-with-phoebe/

Part of [Learn with Phoebe](https://phoebefu6.github.io/learn-with-phoebe/) - by Phoebe Fu.

---

## The incident this course is built around

Tuesday, 09:14. An analytics bot starts sending executives stale revenue numbers, intermittently.
No error is raised. No alert fires. The p95 latency dashboard is green and the answers read as
confidently as ever.

The warehouse query timed out after 4.1 seconds and returned zero rows. A `try/except` swallowed the
timeout and fell back to a cache entry 19.4 hours old. The model faithfully summarised stale data.
Span status stayed OK throughout, which is why nothing alerted.

Two thirds of that run sat inside no span at all. The failing step was not slow, not broken and not
lying - it simply was not instrumented, so as far as the trace was concerned it could not fail.

## What this course is

Two tracks, 16 sessions of 45 minutes.

- **Leader track (6)** - for the people who own the on-call rota. Why a green dashboard held through a
  real incident, what to instrument before you know what you are looking for, dashboards that answer
  questions versus ones that merely glow, what AI actually costs once you count failed attempts, why
  static alert thresholds reproduce the fatigue that made alarm hazards the top health-technology
  hazard two years running, and whether to buy, build or stay OTel-native.
- **Builder track (10)** - for AI and platform engineers. Spans and traces from first principles, the
  current OpenTelemetry GenAI conventions including the names that changed under you, instrumenting an
  agent loop, per-span cost and latency attribution, a live root-cause hunt, the empirical failure
  taxonomy, sampling and what observability itself costs, burn-rate alerting, drift you did not
  deploy, and the privacy split that keeps you debuggable and compliant at once.

## The live trace explorer

`assets/trace-live.js` is an offline simulator that runs in the browser with no dependencies. Switch
instrumentation coverage on one lever at a time and watch what becomes visible.

| Coverage | Wall clock you can see | Questions answerable |
|---|---|---|
| Base (model calls only, free from the SDK) | 32.4% | 0 of 5 |
| + tool spans | 38.2% | 0 of 5 |
| + retriever span | **100%** | 1 of 5 |
| + retrieval attributes | 100% | 2 of 5 |
| + database and cache child spans | 100% | 3 of 5 |
| + error propagation | 100% | 4 of 5 |
| + session ids and token attributes | 100% | **5 of 5** |
| + full prompt and completion capture | 100% | **still 5 of 5** |

That last row is the trap, and it is the lever most teams pull first. The diagnosis does not move,
because the message content was never the problem - the model summarised the stale data perfectly
well. What does move is retention, from 4.6 GB to 48.1 GB, and the PII exposure flag.

**The arithmetic is real.** Unaccounted time, cost per run and retention volumes are computed live in
your browser from the span table and your lever settings. **The incident is constructed** - realistic,
using the real current OpenTelemetry GenAI attribute keys and span-naming templates, but not captured
from any live system. Every page that mounts the simulator says so.

## Sources

Every attribute name, number and threshold traces to a primary source listed with its URL in
[`materials/official-course-map.md`](materials/official-course-map.md), verified 2026-08-13. Secondary
and vendor-internal claims are labelled `[S]` on the pages themselves.

Three things worth knowing before you read anything else about this topic:

1. The GenAI semantic conventions **moved** to their own repository,
   `open-telemetry/semantic-conventions-genai`.
2. **`gen_ai.system` no longer exists** - it was replaced by `gen_ai.provider.name`, and appears zero
   times in the current registry.
3. **Nothing in the spec is stable.** Every span, metric, event and attribute is `Development`, and the
   repository has no tags and no releases. There is no version to pin, so re-verify before you rely on
   a name.

Prices and leaderboard figures move. Every price in this course carries a date.

## Neighbours, deliberately not duplicated

- [Learn Evals](https://phoebefu6.github.io/learn-ai-evals-with-phoebe/) - retrieval and generation metrics
- [Agent Launch](https://phoebefu6.github.io/learn-agent-launch-with-phoebe/) - the go/no-go decision
- [AI Agents](https://phoebefu6.github.io/learn-ai-agents-with-phoebe/) - what an agent is and how to build one
- [AI Infrastructure](https://phoebefu6.github.io/learn-ai-infra-with-phoebe/) - the platform layers underneath

This course owns the trace.

## Running locally

No build step. Static HTML, CSS and vanilla JS.

```bash
python3 -m http.server 8000
```

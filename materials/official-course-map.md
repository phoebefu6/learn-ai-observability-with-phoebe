# Official course map - learn-ai-observability-with-phoebe

**Course question:** evals tell you whether it works; this course tells you *what actually happened*.
Runtime telemetry and debugging. Owns THE TRACE.

**Verified 2026-08-13.** The GenAI semantic conventions are all `Development` status with **no tagged
releases**, so this is a fast-moving target. Re-verify attribute names before delivering.

## Positioning (state explicitly; do not re-teach)

| Sibling | Owns | We assume it |
|---|---|---|
| `learn-ai-evals` (ai d3) | Retrieval + generation metrics, RAGAS, LLM-judge, golden sets | yes |
| `learn-agent-launch` (ai d3) | The go/no-go decision, six-gate scorecard, Wilson intervals | yes |
| `learn-ai-agents` (ai d3) | What an agent is, tools, memory, planning, guardrails | yes |
| `learn-ai-infra` (deng d3) | The eight platform layers, MLOps, LLM gateway, cost bands | yes |
| `learn-dataops` (data d4) | DevOps, data CI/CD, MLOps for data teams | yes |

**Line on every page:** "Evals tell you whether it works. Observability tells you what actually happened."

## Running case: the Beacon incident

Same company as `learn-agent-launch` (deliberate continuity), different problem. **Tuesday 09:14**:
Beacon's **Insight Bot** starts sending executives stale revenue numbers, intermittently. No error
raised. No alert. p95 dashboard green. Answers read as confidently as ever.

Root cause, revealed only by instrumentation the team did not have: the warehouse query times out
after 4.1s and returns 0 rows; a `try/except` swallows the timeout and silently falls back to a
**19.4-hour-old cache entry**; the model faithfully summarises stale data. Span status stays OK
throughout, which is why nothing alerted.

**The simulator (`trace-live.js`) canon - VERIFIED LIVE, do not restate differently:**

| Rung | Coverage added | Wall clock visible | Diagnosis |
|---|---|---|---|
| 1 | base (2 LLM spans + root = 3 spans) | 32.4% (4.60s of 6.80s missing) | 0 of 5 |
| 2 | + tool spans | 38.2% | 0 of 5 |
| 3 | + retriever span | **100%** (the 4.2s step appears) | 1 of 5 |
| 4 | + retrieval attributes | 100% | 2 of 5 |
| 5 | + db/cache child spans | 100% | 3 of 5 |
| 6 | + error propagation | 100% | 4 of 5 |
| 7 | + session ids + token attrs | 100% | **5 of 5**, cost $0.0180/run knowable |
| 8 | + full content capture (ANTI-LEVER) | 100% | **still 5 of 5**, retention 4.6 GB -> 48.1 GB (**10.5x**), PII flag true |

The retrieval span alone is 4.2s of 6.8s = **62% of the wall clock**. Rung 8 is the trap: the
diagnosis score does not move because the message content was never the problem.

---

## Session map

### Leader track (6 x 45 min) - crumb string exactly `Leader session N of 6`

| # | File | Title | Spine |
|---|---|---|---|
| a1 | `a1-the-trace-is-the-receipt.html` | The trace is the receipt | "It works in evals" vs "it worked at 09:14"; the Beacon incident told as a story; why a green dashboard held through it |
| a2 | `a2-what-to-instrument.html` | What to instrument before you need it | Coverage as a decision made before you know what you are looking for; the auto-instrumentation asymmetry; the 62% you cannot see |
| a3 | `a3-dashboards-that-answer.html` | Dashboards that answer questions | The three questions; why aggregate p95 hid an intermittent bug; metrics vs traces vs logs and what each can and cannot tell you |
| a4 | `a4-what-ai-costs-you.html` | What AI actually costs you | Cost attribution by user/feature/tenant; the caching economics; cost per *successful* task; why an invoice is not attribution |
| a5 | `a5-on-call-for-ai.html` | On-call for AI | What to alert on, why static thresholds misfire, burn-rate alerting, alert fatigue, the runaway-loop metrics |
| a6 | `a6-buy-build-or-otel.html` | Buy, build, or stay OTel-native | Lock-in as an attribute-dialect problem; retention cost; the privacy decision on storing prompts; the platform landscape |

### Builder track (10 x 45 min) - crumb string exactly `Builder session N of 10`

| # | File | Title | Spine |
|---|---|---|---|
| b1 | `b1-spans-and-traces.html` | Spans and traces | **HAND-AUTHORED TEMPLATE.** Six words; logs vs traces; the agent tree; unaccounted time |
| b2 | `b2-otel-genai-conventions.html` | OTel GenAI conventions | The exact attribute table, requirement levels, deprecations, span naming |
| b3 | `b3-instrumenting-an-agent.html` | Instrumenting an agent | Nested spans, the plan/tool sibling rule, auto vs manual, framework landscape |
| b4 | `b4-cost-and-latency-per-span.html` | Cost and latency per span | Token attribution that survives an agent loop; the double-counting trap; TTFT |
| b5 | `b5-reading-a-broken-trace.html` | Reading a broken trace | **SIMULATOR SESSION.** `data-mode="ladder"` + free-play board + `data-mode="cost"` |
| b6 | `b6-the-failure-taxonomy.html` | The failure taxonomy | Failure mode -> telemetry signal -> fix; the swallowed-exception mechanism |
| b7 | `b7-sampling.html` | Sampling and its own cost | Head vs tail; the `decision_wait` trap; cardinality on metrics vs spans |
| b8 | `b8-alerting-and-slos.html` | Alerting and SLOs | Burn rate; the agent-loop metrics; what not to alert on |
| b9 | `b9-drift-and-silent-changes.html` | Drift and silent changes | Provider updates under you; sampled online scoring; `gen_ai.evaluation.*` |
| b10 | `b10-privacy-and-retention.html` | Privacy and retention | Opt-in by default; the three content patterns; redaction; the anti-lever proved |

---

## VERIFIED FACTS - use these exactly, do not paraphrase names

### THREE THINGS THAT INVALIDATE MOST BLOG POSTS (lead with these in b2)

1. **The GenAI conventions MOVED** to a dedicated repo: `open-telemetry/semantic-conventions-genai`.
   The opentelemetry.io gen-ai page is now a redirect notice.
   https://opentelemetry.io/docs/specs/semconv/gen-ai/ · https://github.com/open-telemetry/semantic-conventions-genai
2. **`gen_ai.system` NO LONGER EXISTS.** Deprecated in favour of **`gen_ai.provider.name`** (Required).
   It appears zero times in the current registry. Shipping `gen_ai.system` in a 2026 course is the
   exact error to avoid. https://github.com/open-telemetry/semantic-conventions/blob/main/model/gen-ai/deprecated/registry-deprecated.yaml
3. **Nothing is stable.** Every span, metric, event and attribute is `Development`, and the new repo
   has **no git tags and no releases** - there is no version to pin. Teach it as a moving target.

### Deprecated -> current (the trap table for b2)

| Old (wrong) | Current | Note |
|---|---|---|
| `gen_ai.system` | `gen_ai.provider.name` | Required |
| `gen_ai.usage.prompt_tokens` | `gen_ai.usage.input_tokens` | |
| `gen_ai.usage.completion_tokens` | `gen_ai.usage.output_tokens` | |
| `gen_ai.prompt` | *none* -> use `gen_ai.input.messages` | **obsoleted**, "no replacement at this time" |
| `gen_ai.completion` | *none* -> use `gen_ai.output.messages` | obsoleted |
| 5 per-role events (`gen_ai.user.message` etc) | one `gen_ai.client.inference.operation.details` event | deprecated |

If a blog shows five `gen_ai.*.message` events, it is describing the 2024/2025 spec.

### Span naming (exact)

| Span | Name template | Kind |
|---|---|---|
| Inference | `{gen_ai.operation.name} {gen_ai.request.model}` | CLIENT (MAY be INTERNAL in-process) |
| Tool | `execute_tool {gen_ai.tool.name}` | INTERNAL |
| Agent | `invoke_agent {gen_ai.agent.name}` | CLIENT or INTERNAL |
| Workflow | `invoke_workflow {gen_ai.workflow.name}` | INTERNAL |
| Plan | `plan {gen_ai.agent.name}` | INTERNAL |

One span covers the whole logical operation **including automatic retries**.
`gen_ai.operation.name` has 18 well-known values (chat, embeddings, execute_tool, invoke_agent,
invoke_workflow, plan, retrieval, text_completion, generate_content, fetch_response, and the
memory family). `gen_ai.provider.name` has 16 (anthropic, openai, aws.bedrock, gcp.vertex_ai,
azure.ai.openai, cohere, deepseek, groq, mistral_ai, x_ai, perplexity, ...).
Source: https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-spans.md

### Inference span attributes with REQUIREMENT LEVELS (b2's core table)

**Required:** `gen_ai.operation.name`, `gen_ai.provider.name`
**Conditionally Required:** `error.type` (if errored, and it is **Stable**), `gen_ai.conversation.id`,
`gen_ai.output.type`, `gen_ai.request.model` (if available), `gen_ai.request.stream` (iff streaming),
`gen_ai.request.seed`, `gen_ai.request.choice.count` (if != 1), `gen_ai.request.top_k`,
`gen_ai.prompt.name` / `.version`, `server.port` (if `server.address` set)
**Recommended:** `gen_ai.request.max_tokens`, `gen_ai.request.temperature`, `gen_ai.request.top_p`,
`gen_ai.request.frequency_penalty`, `gen_ai.request.presence_penalty`, `gen_ai.request.stop_sequences`,
`gen_ai.request.reasoning.level`, `gen_ai.response.finish_reasons` (array),
`gen_ai.response.id`, `gen_ai.response.model`, `gen_ai.response.time_to_first_chunk` (seconds, if
streaming), `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`,
**`gen_ai.usage.cache_read.input_tokens`** and **`gen_ai.usage.cache_creation.input_tokens`** (both
*included in* input_tokens - critical for b4 cost work), `gen_ai.usage.reasoning.output_tokens`,
`server.address`, `gen_ai.conversation.compacted` (positive indicator only, never set false)
**Opt-In (sensitive):** `gen_ai.input.messages`, `gen_ai.output.messages`, `gen_ai.system_instructions`,
`gen_ai.tool.definitions`, `gen_ai.prompt.variable.<key>`

Token guidance: report the **billed** count. `fetch_response` operations SHOULD NOT report token usage.

**Sampling-time attributes** (spec: SHOULD be provided at span creation): `gen_ai.operation.name`,
`gen_ai.provider.name`, `gen_ai.request.model`, `server.address`, `server.port`. This is the
low-cardinality set and it is what head samplers and `string_attribute` policies can act on (b7).

**Tool span:** `gen_ai.operation.name` (Required, value `execute_tool`), `gen_ai.tool.name`
(Required), `error.type` (Cond.), `gen_ai.agent.name` (Cond.), `gen_ai.tool.call.id` (Rec.),
`gen_ai.tool.type` (Rec.: `function` client-side / `extension` agent-side / `datastore`),
`gen_ai.tool.call.arguments` and `.result` (**Opt-In**).

### Content capture - the b10 spine

Carried by **three attributes**, all **Opt-In**: `gen_ai.system_instructions`, `gen_ai.input.messages`,
`gen_ai.output.messages`. Structured (`any` type) with mandatory JSON schemas. May ride on a span or
on the log event `gen_ai.client.inference.operation.details`.

**Spec default, verbatim:** "OpenTelemetry instrumentations SHOULD NOT capture them by default, but
SHOULD provide an option for users to opt in."

**Three usage patterns, in the spec's own order:**
1. **[Default] Do not record** instructions, inputs or outputs.
2. Record on the spans - "Best suited for situations where telemetry volume is manageable and either
   privacy regulations do not apply or the telemetry storage complies with them, for example, **in
   pre-production environments**."
3. **Store externally, record references on the spans** - "recommended in production environments
   where telemetry volume is a concern or sensitive data needs to be handled securely." Uses an
   upload hook that runs **regardless of the sampling decision**. How to record the reference URI is
   still literally `TODO` in the spec.

**The env var nuance (teach precisely):** `OTEL_INSTRUMENTATION_GENAI_CAPTURE_MESSAGE_CONTENT` is the
de-facto name, but the spec mentions it only as "**for example**" - the spec mandates the *gate*, not
the *name*. `Streaming chunks` handling is a bare `TODO`.

### Metrics (b8's raw material) - exact names, units, buckets

| Metric | Instrument | Unit | Buckets |
|---|---|---|---|
| `gen_ai.client.token.usage` | Histogram | `{token}` | powers of 4: 1, 4, 16, 64, 256, 1024, 4096, 16384, 65536, 262144, 1048576, 4194304, 16777216, 67108864 |
| `gen_ai.client.operation.duration` | Histogram | `s` | 0.01 ... 81.92 (14 doubling buckets) |
| `gen_ai.client.operation.time_to_first_chunk` | Histogram | `s` | same as duration |
| `gen_ai.client.operation.time_per_output_chunk` | Histogram | `s` | same as duration |
| `gen_ai.server.request.duration` | Histogram | `s` | 0.01 ... 81.92 |
| `gen_ai.server.time_to_first_token` | Histogram | `s` | 0.001 ... 10.0 |
| `gen_ai.server.time_per_output_token` | Histogram | `s` | 0.01 ... 2.5 |
| `gen_ai.invoke_workflow.duration` | Histogram | `s` | 1, 5, 10, 30, 60, 120, 300, 600, 1800, 3600, **7200** |
| `gen_ai.invoke_agent.duration` | Histogram | `s` | 0.1 ... 409.6 |
| **`gen_ai.invoke_agent.inference_calls`** | Histogram | `{inference_call}` | 1, 2, 4, 8, 16, 32, 64, 128 |
| **`gen_ai.invoke_agent.tool_calls`** | Histogram | `{tool_call}` | 1, 2, 4, 8, 16, 32, 64, 128 |
| `gen_ai.execute_tool.duration` | Histogram | `s` | 0.01 ... 81.92 |

`gen_ai.client.token.usage` requires **`gen_ai.token.type`** (values `input` / `output`).
The two agent-call-count metrics are how a **runaway loop** becomes visible without opening a trace -
buckets to 128 exist for exactly that. Workflow buckets reaching **2 hours** tell you what the spec
authors expect agent workflows to do.

**Every metric attribute set deliberately EXCLUDES unbounded ids** - no conversation id, no response
id, no user id, no tool call id. That is the cardinality guardrail (b7).

There is also an evaluation signal: event `gen_ai.evaluation.result` plus `gen_ai.evaluation.name`,
`.score.value`, `.score.label`, `.explanation`. Evals are becoming part of the telemetry spec (b9).
Source: https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-metrics.md

### Agent span structure - the nesting rules (b3's core)

From https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md :
- `invoke_workflow` SHOULD NOT be reported for standalone agent invocations, nor when the workflow is
  an internal implementation detail. Application-defined workflows SHOULD be reported even nested
  (a sub-graph invoked as a node).
- **`plan` is the ONLY span that owns its LLM call as a child.** The plan-generating LLM call is a
  child of the plan span; the tool/task spans from that plan are **siblings** under the same
  `invoke_agent` span.
- Agent conventions "extend and override" the base span conventions.
- Named framework entry points that map to `invoke_workflow`: ADK `Runner.run(...)`, CrewAI
  `Crew.kickoff()`, LangChain/LangGraph `*Graph*.invoke(...)`, Microsoft Agent Framework
  `Workflow*.run(...)`, OpenAI Agents `Runner.run(starting_agent=...)`.

**Three reading rules that fall out of the shape (teach these):**
1. **The agent loop is WIDTH, not depth.** Each iteration adds siblings under one `invoke_agent`. A
   40-child agent span is a runaway loop.
2. **Handoffs are SIBLING `invoke_agent` spans** under the workflow, not nested agents.
3. **Token attribution double-counts by design.** `invoke_agent` carries aggregate `gen_ai.usage.*`
   AND each child `chat` carries its own. Summing across depths inflates cost. **Sum at one level
   only.** This is b4's trap.

### Framework instrumentation reality (b3)

**Upstream OTel ships only FOUR GenAI instrumentations**: `google-genai`, `openai-v2`,
`openai-agents-v2`, `vertexai`. **There is no upstream instrumentation for Anthropic, LangChain,
LangGraph or LlamaIndex** - third parties fill that gap.
https://github.com/open-telemetry/opentelemetry-python-contrib/tree/main/instrumentation-genai

| Framework | Upstream OTel | OpenInference (37 pkgs) | OpenLLMetry (~33 pkgs) |
|---|---|---|---|
| OpenAI SDK / Agents SDK | yes | yes | yes |
| Anthropic SDK | **no** | yes | yes |
| Claude Agent SDK | **no** | yes | no |
| LangChain / LangGraph | **no** | yes | yes |
| LlamaIndex | **no** | yes | yes |
| CrewAI, AutoGen, DSPy, Haystack, Pydantic-AI, Google ADK | **no** | yes | partial |
| Vector stores (Pinecone, Chroma, Qdrant, Weaviate...) | no | no | **yes** |

**LangChain env vars - source beats docs here.** `OTEL_ENABLED` / `LANGSMITH_OTEL_ENABLED` are now
**legacy**, superseded by **`LANGSMITH_TRACING_MODE`**. Python precedence (verbatim from
`_resolve_tracing_mode`): explicit `tracing_mode` arg > deprecated `otel_enabled` arg >
`LANGSMITH_TRACING_MODE` env > legacy `OTEL_ENABLED`/`OTEL_ONLY` > default `"langsmith"`. Python has
**three** modes (`langsmith`/`otel`/`hybrid`); **JS has only two** (no `hybrid`). Legacy
`LANGSMITH_OTEL_ENABLED` truthy maps to **`hybrid`** in Python. The public docs still show only the
legacy vars - flag the docs lag.
https://github.com/langchain-ai/langsmith-sdk/blob/main/python/langsmith/client.py

**Vercel AI SDK also renamed its entry point.** Current: `registerTelemetry(new OpenTelemetry())`
from `@ai-sdk/otel`. `experimental_telemetry` is **no longer in the docs**. The old `ai.*` span names
(`ai.generateText`, `ai.streamText`, `ai.toolCall`) are now `LegacyOpenTelemetry`.
https://ai-sdk.dev/docs/ai-sdk-core/telemetry

### OpenInference vs OTel GenAI (b2/a6)

Both emit valid OTLP. "Every OpenInference trace is a valid OTLP trace."

| | OTel GenAI | OpenInference |
|---|---|---|
| Discriminator | `gen_ai.operation.name` + `gen_ai.provider.name` | **`openinference.span.kind`** (required on every span) |
| Token keys | `gen_ai.usage.input_tokens` / `output_tokens` | `llm.token_count.prompt` / `.completion` / `.total` |
| **Content default** | **Opt-in, OFF** | **ON by default**, hide via `OPENINFERENCE_HIDE_*` |
| Cost | not in spec | first-class `llm.cost.*` incl. cache_read / cache_write |
| Graph topology | not modelled | `graph.node.id` / `.name` / `.parent_id` |
| User id | **none** | **`user.id`** |
| Stability | Development, no releases | versioned, production-used |

**The single most consequential difference: the default privacy posture is INVERTED.** Great b10
teaching point. OpenInference redaction replaces values with the literal `"__REDACTED__"`;
`OPENINFERENCE_BASE64_IMAGE_MAX_LENGTH` defaults to 32,000 chars; `OPENINFERENCE_BLOB_UPLOADER`
offloads oversized media (OpenInference's analogue of OTel's upload hook, and actually implemented
rather than a TODO).

**OpenInference has 10 span kinds, not 8:** LLM, EMBEDDING, CHAIN, RETRIEVER, RERANKER, TOOL, AGENT,
GUARDRAIL, **EVALUATOR**, **PROMPT**.

**Interop happens at the BACKEND, not the producer.** Everyone emits OTLP; the platform normalises
the dialect. Langfuse documents reading OpenInference (`input.value`, `llm.token_count.*`), OTel
GenAI (`gen_ai.*`) AND MLflow (`mlflow.spanInputs`) keys.

### Platforms (a6)

| Platform | Ingest | Self-host | License | Notes |
|---|---|---|---|---|
| Langfuse | **OTLP-native**, HTTP JSON + protobuf, **no gRPC**, Basic auth | yes | **MIT except `ee/`, `web/src/ee/`, `worker/src/ee/`** | endpoint `/api/public/otel/v1/traces`; reads 3 dialects |
| Arize Phoenix | **OTLP-native** (OpenInference dialect) | yes | **Elastic License 2.0** (not plain OSS) | ports 6006 UI+HTTP, 4317 gRPC; "free to self-host with no feature limitations" |
| LangSmith | proprietary SDK + OTLP receiver | enterprise | proprietary | `/otel`, `x-api-key`, EU/APAC variants |
| Braintrust | OTLP-native | not verified | proprietary | needs `x-bt-parent: project_id:<id>` header |
| W&B Weave | OTLP-native | Dedicated/Self-Managed | repo Apache-2.0 | `wandb.project` as OTel **Resource** attribute |
| Datadog LLM Obs | **proprietary SDK only** (no documented OTLP path for LLM Obs) | no | proprietary | "billing is based on the volume of spans you send" |
| Grafana Cloud / Tempo | OTLP-native, generic | Tempo is OSS | - | AI Observability dashboards over `gen_ai.*` via OpenLIT |
| Honeycomb | OTLP-native, generic | no | proprietary | LLM-specific features not verified |

**The market splits THREE ways, not two:** OTLP-native LLM-specific (renders agent traces natively) /
OTLP-native general APM (ingests anything, no LLM-aware rendering) / proprietary-SDK (richest
product, weakest portability). That framing is a6's spine.

### Sampling (b7)

Head sampling "cannot sample based on complete trace data" - you cannot guarantee capturing error
traces. `OTEL_TRACES_SAMPLER` has 9 values, **default `parentbased_always_on`**.

Tail sampling decides after all spans complete, enabling the two decisions LLM apps actually need:
always sample traces containing an **error**, and sample on **overall latency**. Both depend on
information that exists only after the loop finishes.

**`tail_sampling` processor** (contrib, **beta**): "All spans for a given trace MUST be received by
the same collector instance." Groups by trace_id internally so `groupbytrace` is NOT needed. Must sit
**after** context processors like `k8sattributes`. 17 policies; the ones that matter for LLM apps are
`latency`, `status_code: ERROR`, **`span_count`** (catch a runaway loop by *shape*), and
`ottl_condition` (spec-aware rules, and "highly recommended... to avoid breaking changes").

**THE TEACHABLE TRAP:** `decision_wait` defaults to **30s**, but
`gen_ai.invoke_workflow.duration` buckets go to **7200s**. A 30s wait against a 20-minute agent
workflow is a silent correctness bug in your observability pipeline. Excellent exercise.
Other knobs: `num_traces` default **50000** in memory, `sampling_strategy` default `trace-complete`.

**Cardinality mechanism to teach:** metrics cost scales with distinct time series = the Cartesian
product of label values. `gen_ai.request.model` is bounded (tens); `gen_ai.conversation.id` is
unbounded. The spec's exclusion of ids from every metric attribute set IS the guardrail. Unbounded
attributes safe on spans, never as metric dimensions: `gen_ai.conversation.id`, `gen_ai.response.id`,
`gen_ai.tool.call.id`, `gen_ai.agent.id`, `gen_ai.request.previous_response.id`, the memory ids,
`gen_ai.data_source.id`.

### Sessions and users (a3/b9)

`gen_ai.conversation.id` is Conditionally Required, and the spec **FORBIDS FABRICATION**, verbatim:
"When no identifier for the conversation is available, instrumentations SHOULD NOT populate
conversation id. For example, a new UUID, a trace identifier, or a hash of request content SHOULD NOT
be used as a fallback value."

A conversation spans **many traces** (one per user turn). `trace_id` gives you one turn;
`gen_ai.conversation.id` is the join key that reassembles the thread. `gen_ai.conversation.compacted`
(positive indicator only) flags a compacted context - how you explain a quality regression that
correlates with nothing in the prompt.

**There is NO `gen_ai.user.id`.** User-level aggregation is not part of the GenAI conventions. The
general namespace offers `session.id` and `session.previous_id` (both Development). Platforms fill
the gap themselves: OpenInference has `user.id`; Langfuse has `langfuse.user.id` /
`langfuse.session.id`. Guidance: set conversation and user ids via a **custom span processor at the
app boundary** (the spec explicitly blesses this route), keep them on spans, out of metric labels.

---

## Honesty discipline (every page)

1. **The simulator is a constructed incident; the arithmetic is real.** Span names and attribute keys
   are the real spec keys, but the trace is not captured from any live system. The unaccounted-time
   percentage, cost per run and retention volumes are computed live in the browser. Say so.
2. **Everything in the GenAI spec is `Development` with no tagged release.** Never present an
   attribute name as permanent. Tell learners to check the repo.
3. **Source beats docs, twice over.** LangChain's public docs still show the legacy env vars while
   the source has moved on; Vercel's `experimental_telemetry` vanished from the docs. Teach the habit
   of reading the source.
4. **Retention and cost figures in the simulator are MODELLED** (4KB base, 38KB content, $0.28/GB-month)
   and labelled as such on screen. Substitute real prices.
5. Label the license nuances honestly: Phoenix is **Elastic License 2.0**, Langfuse is **MIT except
   `ee/`**. Neither is plain permissive OSS across the whole repo.

## Could not verify - do not fill from memory

- Dollar pricing for any platform except Datadog's "volume of spans" basis.
- Braintrust self-hosting; Honeycomb's LLM feature set and pricing; Grafana Tempo's license string.
- `OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT` default.
- Whether every library in the spec's conformance matrix has a shipping pip-installable
  instrumentation - the matrix validates reference implementations written for the test harness.
- Datadog OTLP ingestion for LLM Observability specifically (absence of a documented path is not
  proof one does not exist).

## Not covered by design

- Eval metrics and scoring -> `learn-ai-evals`, `learn-model-evaluation`
- The launch decision -> `learn-agent-launch`
- Agent architecture -> `learn-ai-agents`
- Platform layers, GPU economics -> `learn-ai-infra`
- Classic APM for non-AI services - assumed background

---

# PART 2 - PRODUCTION DEBUGGING, COST, ALERTING (verified 2026-08-13)

`[P]` = primary. `[S]` = secondary. Every number below was verified live. Re-verify prices per cohort.

## MAST - the one empirically grounded agent failure taxonomy (b6's spine)

`[P]` Cemri et al., *Why Do Multi-Agent LLM Systems Fail?*, arXiv:2503.13657, **NeurIPS 2025 Datasets
& Benchmarks**. 150 hand-annotated traces, inter-annotator **kappa 0.88**; MAST-Data has 1600+ traces
across 7 frameworks (ChatDev, MetaGPT, HyperAgent, AppWorld, AG2, Magentic-One, OpenManus); an LLM
annotator reproduces expert labels at 94% accuracy / kappa 0.77.
https://arxiv.org/abs/2503.13657 · https://arxiv.org/html/2503.13657v3

| Category | Failure mode | Freq |
|---|---|---|
| **FC1 Specification & system design - 44.4%** | Disobey task specification | 11.8% |
| | Disobey role specification | 1.5% |
| | **Step repetition** | **15.7%** |
| | Loss of conversation history | 2.80% |
| | **Unaware of termination conditions** | **12.4%** |
| **FC2 Inter-agent misalignment - 32.35%** | Conversation reset | 2.20% |
| | Fail to ask for clarification | 6.80% |
| | Task derailment | 7.40% |
| | Information withholding | 0.85% |
| | Ignored other agent's input | 1.90% |
| | **Reasoning-action mismatch** | **13.2%** |
| **FC3 Task verification - 23.5%** | Premature termination | 6.20% |
| | No or incomplete verification | 8.20% |
| | Incorrect verification | 9.10% |

**HEADLINE:** the largest bucket is NOT "the model was dumb" - it is specification and design (44.4%).
Step repetition (15.7%) + unaware-of-termination (12.4%) = **28% of failures are pure control-loop
bugs visible in telemetry**.

**VERSION CAVEAT - teach honestly:** widely circulated summaries quote 41.8/36.9/21.3 for the three
categories. Those are the v1/v2 figures over the original 150-trace corpus. **Cite v3 (44.4/32.35/23.5)
and name the version.** The per-mode numbers above sum to the v3 totals.

## Failure mode -> telemetry signal -> fix (b6's core table)

| Failure | Signal that reveals it | Fix |
|---|---|---|
| Wrong tool selection | `gen_ai.tool.name` distribution shift; tool result never referenced downstream | Shrink/disambiguate the tool set. `[P]` Anthropic: "If a human engineer can't definitively say which tool should be used in a given situation, an AI agent can't be expected to do better" |
| Tool argument errors | `execute_tool` span with `error.type`; `tool_result` with `is_error: true`; retry-same-tool-different-args pairs | `strict: true` on tool definitions; return machine-actionable error text, not a stack trace |
| Retrieval returns nothing useful | Retrieval span present but low max similarity; answer has no citation; downstream input length ~ no-context baseline | Log retrieved IDs **and scores** as span attributes so null-retrieval is visible |
| Context exhaustion / truncation | `[P]` `stop_reason: "max_tokens"` AND `"model_context_window_exceeded"` - docs say treat **both** as truncated; cumulative input tokens climbing across one conversation id | Compaction, structured note-taking outside the window, sub-agents. Alert on **approach** to the limit, not the error |
| **Context rot** (decay well before the limit) | Fixed canary eval score plotted against **input length**, not against the limit | `[P]` Chroma *Context Rot*, 18 models: "LLMs do not maintain consistent performance across input lengths"; distractors hurt even at n=1; models did **better on shuffled haystacks than logically structured ones**. `[P]` Anthropic's "attention budget": "Every new token introduced depletes this budget" |
| Runaway loops | Span count per trace > p99; same `(tool, args-hash)` repeating; duration rising with no new span *types*; `[P]` `stop_reason: "pause_turn"` (server-tool 10-iteration default) | Hard caps on steps/tokens/wall-clock; explicit machine-checkable termination conditions; dedupe identical calls |
| **Silent partial failure** (hardest) | `[P]` **empty 2-3 token response with `stop_reason: "end_turn"`** - HTTP 200, no error, no content, "typically occurs... particularly after tool results"; `tool_use` with no matching result block | Assert on **output**, never on status code. Post-conditions per step |
| Cascading retries | Retry-attempt counter as a span attribute (invisible if not emitted); cost per trace bimodal; parent duration ~ N x leaf duration | Idempotency keys, retry **budgets** not per-call retries, circuit breakers |
| Rate limits / 429 | `[P]` 429 + `retry-after` + the `anthropic-ratelimit-*` header family. **Alert on `*-remaining` trending to zero, not on the 429** | `[P]` Token-bucket enforcement: "a rate of 60 RPM might be enforced as 1 request per second" - bursts fail under quota. **Acceleration limits** 429 you for ramping too fast |
| Mid-trajectory timeout | Root span in error + a **dangling child span with no end timestamp**; p99 clipped exactly at your client timeout | Checkpoint state so a run resumes rather than restarts. `[P]` "A single 300k-token generation can take over an hour" |
| Run-to-run non-determinism | Same input, different output; divergence at a specific token index | See below |
| **Refusals** | `[P]` `stop_reason: "refusal"` with `stop_details`, returned as **HTTP 200, not an error** - invisible to error-rate alerting | Track refusal rate as a first-class SLI, segmented |

## Non-determinism - the killer detail (b6/b9)

`[P]` Thinking Machines Lab, *Defeating Nondeterminism in LLM Inference*, 10 Sep 2025:
Qwen3-235B, prompt "Tell me about Richard Feynman", **1000 completions at temperature 0 produced 80
unique completions**, most common occurring 78 times. **All 1000 identical through token 102**,
diverging at token 103 (992 said "Queens, New York", 8 said "New York City").
Root cause is **NOT GPU nondeterminism** - kernels are run-to-run deterministic but **not
batch-invariant**, and server batch size varies with other users' load: "the other concurrent users
are not an 'input' to the system but rather a nondeterministic property." With batch-invariant
kernels, all 1000 were identical. https://thinkingmachines.ai/blog/defeating-nondeterminism-in-llm-inference/

**COURSE-CRITICAL CONSEQUENCE: you cannot reproduce a production trace by replaying it, so you must
CAPTURE enough of it at the time.** That is the entire argument for tracing over reproduction.
Compounding it: `[P]` on Claude Opus 4.7+ `temperature`, `top_p`, `top_k` are **deprecated and return
400 on non-default values** - temperature=0 reproducibility is not even available as a lever.

## Cost (a4 + b4) - all `[P]`

**Anthropic caching mechanics** https://platform.claude.com/docs/en/build-with-claude/prompt-caching

| Operation | Multiplier vs base input |
|---|---|
| 5-minute cache write | **1.25x** |
| 1-hour cache write | **2x** |
| Cache read (hit) | **0.1x** |

Break-even, quoted: "caching pays off after **one** cache read for the 5-minute duration (1.25x
write), or after **two** cache reads for the 1-hour duration (2x write)."

**Four traps that show up as unexplained cost:**
1. **TTL runs from the start of the writing request, and streaming counts against it.** "If a response
   takes 4 minutes to stream, a follow-up request that reuses the same cached prefix must start
   within about 1 minute of that response completing." A latency problem causes a cost problem.
2. **Minimum cacheable prefix, silently enforced** - 512 to 4,096 tokens depending on model. Below it:
   "requests to cache fewer than this number of tokens will be processed without caching, **and no
   error is returned.**" A silent 10x cost regression with no error signal.
3. **Invalidation hierarchy `tools` -> `system` -> `messages`.** Changing **tool definitions
   invalidates the entire cache.** "We added one tool" can double your input bill.
4. **`input_tokens` counts only tokens AFTER the last cache breakpoint.** A 200k cached document plus
   a 50-token question reports `input_tokens: 50`. **A dashboard reading `input_tokens` under-reports
   by ~4000x on that request.** Log the quartet: `cache_creation_input_tokens`,
   `cache_read_input_tokens`, `input_tokens`, and their sum.

**Agent token multipliers** `[P]` https://www.anthropic.com/engineering/multi-agent-research-system
- **"agents typically use about 4x more tokens than chat interactions, and multi-agent systems use
  about 15x more tokens than chats."**
- "token usage by itself explains **80% of the variance**" on BrowseComp.
- Payoff side: multi-agent (Opus 4 lead + Sonnet 4 subagents) beat single-agent Opus 4 by **90.2%** on
  an internal research eval.
- On observability: **"Adding full production tracing let us diagnose why agents failed"** and "we
  monitor agent decision patterns and interaction structures - **all without monitoring the contents
  of individual conversations.**" That last clause is b10's design pattern, from a primary source.
- **Caveat to state:** 4x/15x describes Anthropic's own Research feature circa 2025, not a universal
  law. Present as a well-documented order-of-magnitude data point from one production system.

**The tokenizer trap - best real cost-drift example available** `[P]`: "Claude 4.7 and later models
use a newer tokenizer... **This tokenizer produces approximately 30% more tokens for the same text.**"
Migrating to a 4.7+ model at an identical posted price is a **~30% cost increase on identical
traffic**. Your dollars-per-token dashboard looks fine; your tokens-per-request chart is the one that
moves.

**Other real line items** `[P]` (pricing read live 2026-08-13, re-verify):
Batch API **50% off input and output, stacks with caching**, 24h expiry with expired requests unbilled,
batch cache hit rates 30-98%. Web search **$10 per 1,000 searches**, and results count as input tokens
again on subsequent turns. Web fetch: tokens only, but **~125,000 tokens for a 500 kB research PDF** -
one unbounded fetch eats a context window. Code execution 1,550 free container-hours/org/month then
$0.05/hour, **billed even if never called when files are attached**. `inference_geo: "us"` = **1.1x on
every token category**. Tool-use system-prompt overhead is invisible in your prompt: 286-804 tokens
per request depending on model and `tool_choice`.

**OpenAI caching** `[P]` https://developers.openai.com/api/docs/guides/prompt-caching
Cached input at **0.1x** uncached (matches Anthropic's read multiplier). **Automatic, not opt-in** -
"no code changes required". Min 1,024 tokens. **GPT-5.6+ has a fixed 30-minute lifetime that refreshes
on reuse**; earlier models 5-10 min inactivity up to 1 hour. `prompt_cache_key` improves hit rate and
doubles as a **tenant-affinity** mechanism. Fields: `usage.input_tokens_details.cached_tokens`.

**The contrast worth drawing:** Anthropic caching is **explicit and priced on the write**; OpenAI's is
**automatic with no write premium**. So on Anthropic a badly placed breakpoint costs money; on OpenAI
a prompt whose *prefix* varies (a timestamp at the top, a user name in the system prompt) silently
costs you the whole discount.
**DO NOT TEACH:** a 1.25x OpenAI cache-write charge - that appeared only in a secondary summary and
the primary doc describes no write premium.

**Cost per successful task - the arithmetic (label as derivation, not a published statistic):**
`E[cost per success] = c / p` where c = mean attempt cost, p = success rate.

| Success rate | Cost per success vs cost per attempt |
|---|---|
| 95% | 1.05x |
| 80% | 1.25x |
| 60% | 1.67x |
| 40% | 2.50x |
| 25% | 4.00x |

Compose with the verified 15x multi-agent multiplier: a multi-agent design at 60% success costs
**~25x per successful task** versus a chat baseline. And the failed 40% are the *most* expensive
attempts, because failures run long (loops, retries, timeouts) before giving up - so the real ratio is
worse than the table.

**Three consequences (a4's punchline):**
1. **Cost-per-call is the wrong denominator and moves the wrong way.** A fix that stops runaway loops
   *raises* average cost per call (short cheap failures leave the denominator) while *lowering* cost
   per successful task. Optimise cost-per-call and you will reject good fixes.
2. **Reliability work IS cost work.** 60% -> 80% success cuts cost per success by 25% with no pricing
   change.
3. Attribute at the **task** level, not the call level. A task is what the user asked for and what you
   charge for; a call is an implementation detail.

**Attribution has exactly three places to put the key:** provider-side isolation (`[P]` Anthropic
Workspaces with per-workspace spend/rate limits and the `anthropic-workspace-id` response header - the
only *enforced* boundary, but coarse); span attributes on your own telemetry (`tenant.id`, pseudonymous
`user.id`, `feature.id`, plus the token quartet and model name); and cache-key affinity as both an
efficiency and attribution lever.

**Metrics to emit:** `cost_per_task_attempt`, `task_success_rate`, `cost_per_successful_task`,
`cost_per_failed_task`, `tokens_per_task`, `cache_hit_rate`, `retries_per_task`, `steps_per_task` -
each sliced by tenant, feature, model.

## Latency decomposition (b4) - all `[P]`

`[P]` Anthropic's two definitions: **baseline latency** = "the time taken by the model to process the
prompt and generate the response, without considering the input and output tokens per second";
**TTFT** = "the time it takes for the model to generate the first token of the response, from when the
prompt was sent." **They move for different reasons and need separate SLOs** - TTFT is prefill and
input-length sensitive, total is decode and output-length sensitive.

Two derived quantities that do real diagnostic work:
- **`model_time_fraction` = sum(chat span durations) / root duration.** Low fraction means the problem
  is tools, network or orchestration - **a faster model will not help.**
- **`orchestration_overhead` = root duration - (sum sequential + max parallel children).** Large
  overhead means the un-instrumented glue is your bottleneck. **This is the coverage thesis restated
  as a metric: overhead is where your missing instrumentation lives.**

Diagnostic rule: high duration **with** high output tokens = a generation-length problem (fix the
prompt). High duration **with** low output tokens = a service problem (queueing, cold start, network,
tool backend). **You cannot make that distinction without per-span token counts** - the whole argument
for putting tokens on spans rather than only on a billing dashboard.

`[P]` Anthropic's three latency levers, in their deliberate order, with an explicit warning against
premature optimisation: model choice, token length both directions, streaming (which improves
*perceived* latency only and changes nothing about total).

## Alerting (a5 + b8)

**Why static thresholds misfire - five LLM-specific reasons** (beyond `[P]` Google SRE's four generic
ones: precision, recall, detection time, reset time):
1. **Success is not a status code.** A green 200 can be an empty response, a refusal, a truncation, or
   a confident fabrication.
2. **The metric is noisy at the unit level.** 1000 identical inputs gave 80 distinct outputs. Any
   per-request quality threshold flaps. Quality must be alerted as a **rate over a sample**, never per
   request.
3. **Latency and cost are legitimately multi-modal** - cache hit vs miss, 1-step vs 12-step. One p95
   threshold either fires constantly or hides a whole mode. Segment before you threshold.
4. **Ground truth moves without a deploy** (provider-side change, §drift). The ~30% tokenizer change
   breaks token thresholds for a reason that is not a bug.
5. **Bursts trip capacity limits under quota** - token-bucket enforcement plus acceleration limits, so
   an average-utilisation threshold shows headroom while you are being throttled.

`[P]` **Google SRE multi-window burn-rate table for a 99.9% SLO** https://sre.google/workbook/alerting-on-slos/

| Severity | Long window | Short window | Burn rate | Budget consumed |
|---|---|---|---|---|
| Page | 1 hour | 5 min | **14.4** | 2% |
| Page | 6 hours | 30 min | **6** | 5% |
| Ticket | 3 days | 6 hours | **1** | 10% |

Alerts fire only when **both** windows exceed threshold - that is what fixes reset time. SRE's own
arithmetic for why simple thresholds fail: a 0.1% error rate for 10 min consumes 0.02% of a monthly
budget yet pages you; "a series of 100% error spikes lasting 5 minutes every 10 minutes never triggers
an alert, despite consuming 35% of the error budget."

**What to alert on:** task success rate (assertion-verified, not HTTP status), error rate **with 429
split out**, decomposed p95 TTFT and total separately, cost per hour and cost per successful task,
**refusal rate** (HTTP 200 so invisible otherwise), guardrail trip rate, truncation rate, eval-score
drift on sampled traffic (**ticket, not page** - small noisy sample), loop/step-count distribution,
cache hit rate (step-change detection - a drop means a cache-invalidating change shipped),
**instrumentation coverage** (traces missing expected span types), and **`gen_ai.response.model` vs
requested model** to catch silent alias movement.

**ALERT FATIGUE - the evidence (a5's emotional core), both `[P]`:**
- **ECRI Institute Top 10 Health Technology Hazards: "Alarm hazards" was #1 in BOTH 2013 and 2015.**
  2013 verbatim: "With too many alarms sounding... staff may be more likely to experience alarm
  overload or 'alarm fatigue.' These conditions can lead to ineffective responses or prompt unsafe
  actions. For example, caregivers may turn down the volume of alarms to an inaudible level, or they
  may improperly adjust alarm limits outside the safe and appropriate range in an attempt to reduce
  the number of alarms." 2015 focused specifically on **inadequate alarm configuration policies**, and
  notes ECRI "investigated several alarm-related deaths and other cases of severe patient harm that
  could have been prevented had more effective alarm configuration policies been in place."
  https://www.ecri.org/Resources/Whitepapers_and_reports/2013_Health_Devices_Top_10_Hazards.pdf ·
  https://www.ecri.org/Resources/Whitepapers_and_reports/Top_Ten_Technology_Hazards_2015.pdf
- **Drew et al., PLOS ONE 2014** - the hard number. 31 days, 5 adult ICUs at UCSF, 77 beds, 461
  patients: **2,558,760 unique alarms**, of which 381,560 audible = **187 audible alarms per bed per
  day**. Of 12,671 annotated arrhythmia alarms, **88.8% were false positives** (kappa 0.86).
  https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0110274

**The transfer is exact:** 88.8% false positives is what a naive static threshold on a multi-modal,
non-deterministic LLM metric produces, and the documented human response - silence the channel, widen
the limits until it stops firing - is what engineers do to a noisy Slack channel. ECRI's fix is the
right fix here: **a written, reviewed alerting configuration policy per surface, assessed for
"completeness and clinical relevance."** State the analogy's limit out loud: LLM systems add a failure
mode hospital monitors do not have - the **silent** failure, the monitor reading normal because nobody
attached the lead.

## Drift (b9) - four distinct types

1. **Input distribution drift.** Signals: embedding-centroid shift vs rolling baseline, new-intent
   cluster share, **retrieval null-rate by query cluster** (a new topic your corpus lacks shows here
   first), tokens per request drifting with no code change.
2. **Output quality drift.** Signals: automated scorer on sampled traces, refusal rate, truncation
   rate, and **downstream behaviour** (retry rate, escalation-to-human, abandonment) which is often
   the earliest honest signal because it needs no scorer. `[P]` **Anthropic's postmortem is the case
   study: users reported degradation, standard evals did not reproduce it.** Teach as: user reports
   are a signal, and "our evals are green" is not a rebuttal.
3. **Silent provider-side change** - three concrete mechanisms, all `[P]`: **floating aliases** (
   `claude-opus-5` is "whatever that is today" vs pinned `claude-sonnet-4-5-20250929`) - mitigation is
   pin snapshots and **always log `gen_ai.response.model` alongside `gen_ai.request.model`**; **forced
   migration on a clock** (Active -> Legacy -> Deprecated -> Retired, "at least 60 days' notice", and
   "Requests to models past the retirement date will fail"); and **parameter/tokenizer semantics
   changing under a stable price**.
4. **Embedding drift for RAG** - two problems people conflate. *Index staleness*: documents change,
   embeddings do not; track index freshness as an SLI. *Embedding-space incompatibility*: vectors from
   different embedding models are not comparable, so a model change requires **full corpus
   re-embedding**. **Operational rule: version the embedding model in the index metadata and refuse
   queries whose query-embedding version does not match.** A silent mismatch degrades retrieval to
   near-random while every span stays green - the purest coverage failure in the course.
   *Honest gap: no primary vendor sentence says "you must re-embed"; it is mathematical necessity plus
   universal practice.*

**Sampling cadence:** prevailing vendor guidance is **1-10% of production traces (commonly 5-10%)**
scored asynchronously by an automated judge, filtered toward high-value traces. **All sources are
vendor docs `[S]` - I found no peer-reviewed or survey evidence for what cadence teams actually use or
what is sufficient. Present as prevailing guidance, not an empirical finding.** Two caveats: a sample
only works if **representative**, and judge scores need **human calibration** before you alert on them
or you are alerting on the judge's drift.

## Privacy and retention (b10 + a6)

**The core tension, stated by a vendor about itself** `[P]`: "Our internal privacy and security
controls limit how and when engineers can access user interactions with Claude... This protects user
privacy but **prevents engineers from examining the problematic interactions needed to identify or
reproduce bugs**." Paired with their agent pattern: "we monitor agent decision patterns and interaction
structures - **all without monitoring the contents of individual conversations**."

**That pair IS the section.** Default = **metadata-rich, content-poor**, with content capture as a
deliberate, scoped, time-boxed exception. State the cost of the default honestly: with content off you
can localise a failure to a step but often cannot explain *why* the model did what it did.

`[P]` OTel flags as sensitive: `gen_ai.input.messages`, `gen_ai.output.messages`,
`gen_ai.system_instructions`, `gen_ai.retrieval.query.text`, **`gen_ai.tool.call.arguments`**,
**`gen_ai.tool.call.result`**. Note (a): redacting only the prompt is insufficient - **the tool
arguments are frequently where the account number is**. Official guidance: "By default, no prompt
content or tool arguments are captured with GenAI telemetry, as these can contain sensitive data. Only
metadata like model names, token counts, and durations are included."

**Scrub before ingestion, not after.** Once content reaches a vendor endpoint you have made a
cross-border transfer and created a processor relationship, and deletion becomes a request rather than
a fact. Layering: deny-by-default; **allow-list fields rather than deny-list PII patterns** (deny-lists
fail on the case you did not imagine, which for free text is most cases); structural redaction (hash
identifiers, keep lengths, token counts, schema validity, retrieved doc IDs and scores - **most
diagnostic power survives redaction because most of it is metadata**); pseudonymous keys; sampled,
consented, time-boxed content capture in a separate store with tighter access control and an audit log.

**Retention, with real vendor numbers** `[P]` https://platform.claude.com/docs/en/manage-claude/api-and-data-retention
"Conversation content (your prompts and Claude's outputs) is **not retained by default**." Zero Data
Retention exists per organisation but **does not cover** code execution, Claude for Excel,
Teams/Enterprise interfaces, and **CORS is unsupported under ZDR** (forcing browser apps through a
backend proxy). **Model choice can override your policy:** Claude Fable 5 and Mythos 5 are "Covered
Models" requiring **30-day retention**, ZDR-ineligible, and a ZDR org calling them gets a
`400 invalid_request_error`. Compliance surfaces run much longer: Activity Feed and remote session
transcripts **6 years**. **Teaching point: your retention policy can be set by your model choice, not
by your policy document.**

**GDPR Art. 5(1)** `[P]` https://gdpr-info.eu/art-5-gdpr/ - (c) **data minimisation**: capturing full
prompt text on 100% of traffic "in case we need to debug" is the textbook violation, so sampling and
redaction are the *compliance* mechanism and not merely a cost mechanism; (e) **storage limitation**:
an unbounded trace-retention default is non-compliant by construction; (f) **integrity and
confidentiality**: traces hold prompts, tool arguments and retrieved documents in one place, usually
in third-party SaaS with broad internal read access - **trace stores deserve the access controls you
give production databases, and most do not have them.** Erasure and access requests must reach the
trace store: if you cannot delete one user's spans, you cannot comply.

**PDPA (Singapore) - IMPORTANT TRAP:** `[P]` PDPC's *Advisory Guidelines on the Use of Personal Data in
AI Recommendation and Decision Systems* (1 Mar 2024) are **not legally binding**, and `[S]` multiple
independent law-firm summaries state they **do not cover generative AI**. **Do NOT cite them as
authority for LLM prompt-trace retention.** For an LLM app in Singapore the operative obligations are
the PDPA's own Consent, Purpose Limitation, Notification, Protection and **Retention Limitation**
obligations. *Gap: the "excludes GenAI" scope statement is secondary; re-verify against the PDF.*

**The synthesis (b10's close):** poor coverage hides failures; rich content capture creates legal and
security exposure. **These pull in opposite directions and the resolution is not a compromise, it is a
split:** metadata at 100%, content on a small consented short-TTL sample. Anthropic's two published
positions are exactly that split.

## Real published incidents (a1's story material)

1. **`[P]` Anthropic postmortem of three issues (Sep 2025)** - the best teaching artifact available,
   because a vendor documents how hard its *own* degradation was to detect.
   https://www.anthropic.com/engineering/a-postmortem-of-three-recent-issues
   Context-window routing error: peak **16% of Sonnet 4 requests affected** in the worst hour;
   **"approximately 30% of Claude Code users who made requests during this period had at least one
   message routed to the wrong server type"**; Bedrock peak 0.18%, Vertex <0.0004% - **if you
   multi-home, one platform's telemetry does not represent the others**. Why detection failed:
   benchmarks "simply didn't capture the degradation users were reporting," partly **because Claude
   recovers from isolated errors**, and the bugs produced "different symptoms on different platforms
   at different rates."
2. **`[P]` Moffatt v. Air Canada, 2024 BCCRT 149 (14 Feb 2024)** - tribunal held the airline liable in
   **negligent misrepresentation** for what its chatbot said about bereavement fares; award **CAD
   $650.88**. Lesson: a hallucination contradicting your own documented policy is *legally actionable*
   silent failure, and the telemetry signal is "bot answer conflicts with source of truth" - which
   nobody instruments.
3. **`[S]` Cursor/Anysphere support bot (April 2025)** fabricated a single-device policy; users
   cancelled before the company could intervene. **No primary postmortem found - secondary only.**
   Note the compound cause: a *real* infra bug (session management) plus an agent confabulating an
   explanation. Your trace would show a healthy agent and a sick auth service.
4. **`[S]` Replit agent dropping a production database (July 2025)** - **no primary postmortem found.
   Do NOT put record counts in the course**; all circulating figures are unverified.

## Additional "could not verify - do not fill from memory"

- MAST v1/v2 category triplet (41.8/36.9/21.3) - could not extract v1's table.
- OpenAI cache-write premium for GPT-5.6+ - secondary only, primary doc describes none.
- Per-model OpenAI cached-input dollar figures - the 0.1x multiplier is primary; dollar figures are
  arithmetic (pricing pages returned 403/404).
- Replit incident record counts.
- **"Model drift causes 40% of production agent failures; survey of 1,200 production LLM deployments"**
  - circulating widely with **no traceable primary study. DO NOT USE.**
- LumiMAS detection precision/recall.
- Empirical evidence for any specific eval sampling cadence.

**Dating discipline:** the Anthropic pricing page's own footnote records that a planned Sonnet 5
increase to $3/$15 on 1 Sep 2026 "will not occur" - a live example of why **every price you teach
carries a date**.

---

## KNOWN SPEC-vs-VENDOR CONTRADICTION (caught during the b4 build - teach it, do not resolve it)

Two verified statements in this map disagree about the same field, and the disagreement is real
rather than a transcription error:

- **OTel GenAI conventions:** `gen_ai.usage.cache_read.input_tokens` and
  `gen_ai.usage.cache_creation.input_tokens` are **included in** `gen_ai.usage.input_tokens`.
- **Anthropic Messages API:** `input_tokens` counts **only the tokens after the last cache
  breakpoint**, so a 200k-token cached document plus a 50-token question reports `input_tokens: 50`.

Under the OTel reading, `input_tokens` is the total. Under the Anthropic reading, it is the
remainder. **Neither source says which wins when you map one onto the other**, and that is precisely
the hazard: an instrumentation that copies Anthropic's `input_tokens` straight into
`gen_ai.usage.input_tokens` produces a span that is spec-shaped and ~4000x wrong on a heavily
cached request.

**How the course handles it (b4):** teach the discrepancy explicitly as a mapping hazard, and have
the instrumentation emit the **reconciled sum** (`cache_read + cache_creation + input_tokens`) into
`gen_ai.usage.input_tokens` rather than trusting either field name to mean what it looks like. Do not
present either source as the winner. This is a live example of the course's own thesis: the number on
your dashboard is only as good as the mapping nobody reviewed.

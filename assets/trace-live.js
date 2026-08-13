/* trace-live.js - the trace explorer: one real production mystery, and the spans that solve it.
   Usage:
     <div class="tlbox"></div>                          full waterfall + instrumentation levers
     <div class="tlbox" data-levers="tools,retrieval"></div>
     <div class="tlbox" data-mode="ladder"></div>       scripted coverage rungs
     <div class="tlbox" data-mode="cost"></div>         what capturing content costs you

   data-levers = which instrumentation levers start ON (comma list, see LEVERS below).

   HONESTY RAIL (also printed on every page that mounts this): the trace below is a CONSTRUCTED
   incident - a realistic Tuesday-morning failure in a fictional analytics bot, with span names and
   attribute keys taken from the real OpenTelemetry GenAI semantic conventions. It is not a capture
   from any real system. What is REAL is the arithmetic: the unaccounted-time percentage, the cost
   per run, the retention volume and every duration total on screen are computed live in your
   browser from the span table below and your lever settings. Nothing is hard-coded per step. The
   lesson the arithmetic carries is the one that matters: an un-instrumented step is not a gap in
   your dashboard, it is 4.2 of 6.8 seconds - 62% of the wall clock - that you cannot see, in a trace that looks
   perfectly innocent while a stale number goes out to your executives. */
(function () {
  "use strict";

  /* ---------- the incident ---------- */
  var INCIDENT = {
    when: "Tuesday 09:14",
    what: "Beacon's Insight Bot is sending executives stale revenue numbers. Intermittently. No error is raised, no alert fires, the p95 latency dashboard is green, and the bot's answers read as confidently as ever.",
    ask: "One run is traced below. Find the failing step."
  };

  /* span table. dur/start in ms. `needs` = the lever that must be on for this span to EXIST in the
     trace at all. `attrs` are only rendered when their gating lever is on. */
  var SPANS = [
    { id: "root", depth: 0, name: "invoke_agent Insight Bot", kind: "AGENT", start: 0, dur: 6800, needs: null,
      attrs: [
        { k: "gen_ai.operation.name", v: "invoke_agent", needs: null },
        { k: "gen_ai.agent.name", v: "Insight Bot", needs: null },
        { k: "gen_ai.conversation.id", v: "conv_8814f2", needs: "session" }
      ] },
    { id: "plan", depth: 1, name: "chat claude-sonnet-4-5 (plan)", kind: "LLM", start: 0, dur: 1100, needs: null,
      attrs: [
        { k: "gen_ai.provider.name", v: "anthropic", needs: null },
        { k: "gen_ai.request.model", v: "claude-sonnet-4-5", needs: null },
        { k: "gen_ai.usage.input_tokens", v: "820", needs: "tokens" },
        { k: "gen_ai.usage.output_tokens", v: "140", needs: "tokens" }
      ] },
    { id: "resolve", depth: 1, name: "execute_tool resolve_metric_definition", kind: "TOOL", start: 1100, dur: 200, needs: "tools",
      attrs: [ { k: "gen_ai.tool.name", v: "resolve_metric_definition", needs: "tools" } ] },
    { id: "retrieve", depth: 1, name: "retrieval metrics_daily", kind: "RETRIEVER", start: 1300, dur: 4200, needs: "retrieval",
      slow: 1,
      attrs: [
        { k: "gen_ai.retrieval.documents.count", v: "0", needs: "retattrs", alarm: 1 },
        { k: "gen_ai.retrieval.cache_fallback", v: "true", needs: "retattrs", alarm: 1 }
      ] },
    { id: "dbq", depth: 2, name: "db.query warehouse.metrics_daily", kind: "DB", start: 1300, dur: 4100, needs: "db",
      slow: 1,
      attrs: [
        { k: "db.response.returned_rows", v: "0", needs: "db", alarm: 1 },
        { k: "error.type", v: "QueryTimeout (swallowed)", needs: "errors", alarm: 1 }
      ] },
    { id: "cache", depth: 2, name: "cache.get metrics_snapshot", kind: "CACHE", start: 5400, dur: 50, needs: "db",
      root: 1,
      attrs: [
        { k: "cache.hit", v: "true", needs: "db" },
        { k: "cache.entry_age_hours", v: "19.4", needs: "db", alarm: 1 }
      ] },
    { id: "compute", depth: 1, name: "execute_tool compute_growth", kind: "TOOL", start: 5500, dur: 100, needs: "tools",
      attrs: [ { k: "gen_ai.tool.name", v: "compute_growth", needs: "tools" } ] },
    { id: "answer", depth: 1, name: "chat claude-sonnet-4-5 (answer)", kind: "LLM", start: 5600, dur: 1100, needs: null,
      attrs: [
        { k: "gen_ai.provider.name", v: "anthropic", needs: null },
        { k: "gen_ai.request.model", v: "claude-sonnet-4-5", needs: null },
        { k: "gen_ai.usage.input_tokens", v: "2940", needs: "tokens" },
        { k: "gen_ai.usage.output_tokens", v: "310", needs: "tokens" },
        { k: "gen_ai.response.finish_reasons", v: "[\"end_turn\"]", needs: "tokens" }
      ] },
    { id: "render", depth: 1, name: "execute_tool render_chart", kind: "TOOL", start: 6700, dur: 100, needs: "tools",
      attrs: [ { k: "gen_ai.tool.name", v: "render_chart", needs: "tools" } ] }
  ];

  var LEVERS = [
    { key: "tools", label: "Tool spans", otel: "execute_tool {gen_ai.tool.name}",
      hint: "Without them every tool call collapses into the parent span. You lose 400ms here, which sounds trivial - the real loss is that you cannot tell WHICH tool ran, in what order, or whether one was skipped." },
    { key: "retrieval", label: "Retriever spans", otel: "gen_ai.operation.name=retrieval",
      hint: "The single highest-value lever on this page. Retrieval is where a RAG or analytics bot actually fails, and it is the step teams instrument last because it feels like plumbing rather than AI." },
    { key: "retattrs", label: "Retrieval attributes", otel: "gen_ai.retrieval.documents.count",
      hint: "A slow retrieval span tells you where the time went. The attributes tell you it returned ZERO documents and silently fell back to cache - which is the difference between 'retrieval is slow' and 'the answer is fiction'." },
    { key: "db", label: "Database and cache child spans", otel: "DB and CACHE spans",
      hint: "One level deeper: the query that timed out, and the 19-hour-old cache entry that got used instead. This is where the root cause physically lives." },
    { key: "tokens", label: "Token usage attributes", otel: "gen_ai.usage.input_tokens / output_tokens",
      hint: "Per-span token counts are what make cost attribution possible at all. Without them you have one number on your monthly invoice and no way to divide it by user, feature or tenant." },
    { key: "errors", label: "Error propagation", otel: "span status + error.type",
      hint: "The query DID fail. The code caught the timeout, fell back to cache, and returned success. If a swallowed exception never becomes a span status or an event, your trace says OK and your dashboard stays green while the failure ships." },
    { key: "session", label: "Session and conversation IDs", otel: "gen_ai.conversation.id",
      hint: "One trace shows you one bad run. Threading traces by conversation is how you learn the bot is wrong intermittently rather than constantly, which is a completely different bug." },
    { key: "content", label: "Capture full prompts and completions", otel: "gen_ai.input.messages (Opt-In)",
      anti: 1,
      hint: "Feels like the ultimate debugging tool. On THIS bug it changes nothing - the prompt and the answer both look perfectly reasonable, because the model faithfully summarised stale data. What it does change is your retention bill and your PII exposure. Watch both meters, and watch the diagnosis score refuse to move." }
  ];

  /* the five questions that constitute a diagnosis, and what each one needs */
  var QUESTIONS = [
    { q: "Which step is actually slow?", needs: ["retrieval"],
      yes: "retrieve_metrics, 4.2s of a 6.8s run.", no: "Unanswerable. 62% of the wall clock sits inside a span you are not emitting." },
    { q: "Did retrieval return anything?", needs: ["retrieval", "retattrs"],
      yes: "No. Zero documents, and cache_fallback was true.", no: "Unanswerable. You can see the step took time; you cannot see that it came back empty." },
    { q: "Where did the stale number come from?", needs: ["retrieval", "db"],
      yes: "A cache entry 19.4 hours old, used as a silent fallback.", no: "Unanswerable. The cache read is not in the trace." },
    { q: "Why did nothing alert?", needs: ["errors"],
      yes: "The warehouse query timed out and the exception was swallowed. Span status stayed OK.", no: "Unanswerable, and this is why the dashboard is green." },
    { q: "Is it intermittent or constant?", needs: ["session"],
      yes: "Intermittent - it only breaks when the warehouse query times out.", no: "Unanswerable from a single unthreaded trace." }
  ];

  /* retention model - modelled unit economics, labelled as such on screen */
  var RETENTION = { runsPerDay: 40000, days: 30, baseKB: 4, contentKB: 38, pricePerGBMonth: 0.28 };
  /* cost model - published-style rates per million tokens, modelled */
  var PRICE = { inPerM: 3.00, outPerM: 15.00 };

  /* ---------- computation ---------- */
  function visible(on) {
    return SPANS.filter(function (s) { return !s.needs || on[s.needs]; });
  }

  function compute(on) {
    var vis = visible(on);
    var total = SPANS[0].dur;
    /* accounted time = union of depth-1 visible spans (they tile the root exactly) */
    var accounted = vis.filter(function (s) { return s.depth === 1; })
                       .reduce(function (a, s) { return a + s.dur; }, 0);
    var unaccounted = total - accounted;

    /* diagnosis */
    var answered = QUESTIONS.map(function (q) {
      return q.needs.every(function (k) { return on[k]; });
    });
    var score = answered.filter(Boolean).length;

    /* cost per run - needs token attributes to be knowable at all */
    var inTok = 820 + 2940, outTok = 140 + 310;
    var cost = (inTok / 1e6) * PRICE.inPerM + (outTok / 1e6) * PRICE.outPerM;

    /* retention */
    var kb = RETENTION.baseKB + (on.content ? RETENTION.contentKB : 0);
    var gb = (kb * RETENTION.runsPerDay * RETENTION.days) / (1024 * 1024);
    var bill = gb * RETENTION.pricePerGBMonth;

    return { vis: vis, total: total, accounted: accounted, unaccounted: unaccounted,
             pctSeen: accounted / total, answered: answered, score: score,
             cost: cost, inTok: inTok, outTok: outTok, gb: gb, bill: bill,
             tokensKnown: !!on.tokens, piiRisk: !!on.content };
  }

  /* ---------- formatting ---------- */
  function ms(v) { return v >= 1000 ? (v / 1000).toFixed(2) + "s" : Math.round(v) + "ms"; }
  function pct(x) { return (x * 100).toFixed(1) + "%"; }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = txt;
    return e;
  }

  /* ---------- styles ---------- */
  var CSS = [
    ".tlbox{border:1px solid var(--hairline);border-radius:var(--radius);background:#fff;padding:1.25rem 1.25rem 1.4rem;margin:1.5rem 0;}",
    ".tl-inc{background:var(--indigo-50);border-left:3px solid var(--indigo);border-radius:0 10px 10px 0;padding:.7rem .9rem;margin-bottom:1rem;}",
    ".tl-inc b{display:block;font-size:.72rem;letter-spacing:.13em;text-transform:uppercase;color:var(--indigo);margin-bottom:.25rem;}",
    ".tl-inc p{font-size:.86rem;line-height:1.65;margin:0;}",
    ".tl-inc .ask{font-weight:700;color:var(--ink);margin-top:.35rem;}",
    ".tl-cols{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.3fr);gap:1.3rem;}",
    "@media(max-width:860px){.tl-cols{grid-template-columns:1fr;}}",
    ".tl-sub{font-size:.68rem;letter-spacing:.14em;text-transform:uppercase;font-weight:700;color:var(--muted);margin:.9rem 0 .5rem;}",
    ".tl-sub:first-child{margin-top:0;}",
    ".tl-lev{display:flex;gap:.55rem;align-items:flex-start;padding:.4rem .5rem;border-radius:9px;cursor:pointer;}",
    ".tl-lev:hover{background:var(--indigo-50);}",
    ".tl-lev input{margin-top:.3rem;accent-color:var(--indigo);flex:0 0 auto;width:15px;height:15px;cursor:pointer;}",
    ".tl-lev-t{font-size:.86rem;font-weight:650;line-height:1.4;}",
    ".tl-lev-o{font-size:.74rem;color:var(--muted);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;}",
    ".tl-lev-h{font-size:.79rem;color:var(--muted);line-height:1.6;margin-top:.15rem;display:none;}",
    ".tl-lev.open .tl-lev-h{display:block;}",
    ".tl-lev.anti .tl-lev-t::after{content:' ⚠';color:#991B1B;}",
    ".tl-wf{border:1px solid var(--hairline);border-radius:12px;overflow:hidden;}",
    ".tl-wfh{display:flex;justify-content:space-between;align-items:baseline;padding:.55rem .8rem;background:var(--indigo-50);border-bottom:1px solid var(--hairline);}",
    ".tl-wfh span{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:var(--indigo);}",
    ".tl-wfh em{font-style:normal;font-size:.78rem;color:var(--muted);font-variant-numeric:tabular-nums;}",
    ".tl-row{padding:.4rem .8rem;border-top:1px solid var(--hairline);}",
    ".tl-row:first-child{border-top:0;}",
    ".tl-row.slow{background:#FEF2F2;}",
    ".tl-rt{display:flex;align-items:center;gap:.5rem;}",
    ".tl-kind{flex:0 0 auto;font-size:.62rem;font-weight:800;letter-spacing:.06em;padding:.1rem .34rem;border-radius:4px;background:var(--indigo);color:#fff;}",
    ".tl-kind.LLM{background:var(--indigo);}.tl-kind.TOOL{background:var(--indigo-mid);}",
    ".tl-kind.RETRIEVER{background:var(--amber);}.tl-kind.DB{background:#991B1B;}",
    ".tl-kind.CACHE{background:#991B1B;}.tl-kind.AGENT{background:var(--indigo-deep);}",
    ".tl-nm{font-size:.82rem;font-weight:650;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}",
    ".tl-dur{font-size:.78rem;color:var(--muted);font-variant-numeric:tabular-nums;flex:0 0 auto;}",
    ".tl-bar{position:relative;height:8px;background:var(--indigo-50);border-radius:99px;margin:.28rem 0 0;overflow:hidden;}",
    ".tl-fill{position:absolute;top:0;bottom:0;background:var(--indigo-mid);border-radius:99px;}",
    ".tl-fill.slow{background:#991B1B;}",
    ".tl-attrs{margin:.3rem 0 0;display:flex;flex-wrap:wrap;gap:.3rem;}",
    ".tl-a{font-size:.72rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:var(--indigo-50);border-radius:5px;padding:.08rem .34rem;color:var(--muted);}",
    ".tl-a.alarm{background:#FEF2F2;color:#991B1B;font-weight:700;}",
    ".tl-gap{padding:.5rem .8rem;background:#FEF2F2;border-top:1px solid #FCA5A5;font-size:.8rem;color:#991B1B;font-weight:650;}",
    ".tl-meters{display:grid;grid-template-columns:1fr 1fr;gap:.7rem;margin-top:.9rem;}",
    "@media(max-width:560px){.tl-meters{grid-template-columns:1fr;}}",
    ".tl-m{border:1px solid var(--hairline);border-radius:11px;padding:.6rem .75rem;}",
    ".tl-m b{display:block;font-size:.66rem;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);}",
    ".tl-m i{font-style:normal;display:block;font-size:1.5rem;font-weight:800;line-height:1.15;letter-spacing:-.02em;font-variant-numeric:tabular-nums;color:var(--indigo);}",
    ".tl-m i.bad{color:#991B1B;}",
    ".tl-m u{text-decoration:none;display:block;font-size:.74rem;color:var(--muted);line-height:1.5;}",
    ".tl-qs{margin-top:.9rem;border:1px solid var(--hairline);border-radius:12px;overflow:hidden;}",
    ".tl-q{display:flex;gap:.6rem;align-items:flex-start;padding:.5rem .8rem;border-top:1px solid var(--hairline);}",
    ".tl-q:first-child{border-top:0;}",
    ".tl-q.no{background:#FEF2F2;}",
    ".tl-dot{flex:0 0 auto;width:9px;height:9px;border-radius:50%;margin-top:.4rem;background:#991B1B;}",
    ".tl-q.yes .tl-dot{background:#067647;}",
    ".tl-qt{font-size:.83rem;font-weight:700;}",
    ".tl-qa{font-size:.79rem;color:var(--muted);line-height:1.55;}",
    ".tl-rail{margin-top:.9rem;font-size:.77rem;color:var(--muted);line-height:1.65;border-top:1px dashed var(--hairline);padding-top:.7rem;}",
    ".tl-lad{display:flex;gap:.4rem;flex-wrap:wrap;margin-bottom:.9rem;}",
    ".tl-ladb{font:inherit;font-size:.8rem;font-weight:650;padding:.32rem .7rem;border-radius:999px;border:1px solid var(--hairline);background:#fff;color:var(--muted);cursor:pointer;}",
    ".tl-ladb.on{background:var(--amber);border-color:var(--amber);color:#fff;}",
    ".tl-ladsay{font-size:.88rem;line-height:1.7;background:var(--amber-50);border-left:3px solid var(--amber);padding:.6rem .85rem;border-radius:0 9px 9px 0;margin-bottom:.9rem;}",
    ".tl-ct{width:100%;border-collapse:collapse;font-size:.85rem;font-variant-numeric:tabular-nums;}",
    ".tl-ct th{text-align:left;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:.45rem .5rem;border-bottom:2px solid var(--hairline);}",
    ".tl-ct td{padding:.45rem .5rem;border-bottom:1px solid var(--hairline);}",
    ".tl-ct tr.hi td{background:#FEF2F2;font-weight:650;color:#991B1B;}"
  ].join("");

  function injectCss() {
    if (document.getElementById("tl-css")) return;
    var s = document.createElement("style");
    s.id = "tl-css"; s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- render: the trace explorer ---------- */
  function render(box, on, opts) {
    opts = opts || {};
    box.innerHTML = "";
    var r = compute(on);

    var inc = el("div", "tl-inc");
    inc.appendChild(el("b", "", "Incident · " + INCIDENT.when));
    inc.appendChild(el("p", "", INCIDENT.what));
    inc.appendChild(el("p", "ask", INCIDENT.ask));
    box.appendChild(inc);

    var cols = el("div", "tl-cols");

    /* left: levers */
    var left = el("div", "");
    left.appendChild(el("div", "tl-sub", "Instrumentation coverage"));
    LEVERS.forEach(function (l) {
      var row = el("label", "tl-lev" + (l.anti ? " anti" : ""));
      var cb = el("input", ""); cb.type = "checkbox"; cb.checked = !!on[l.key];
      if (opts.scripted) cb.disabled = true;
      else cb.onchange = function () { on[l.key] = cb.checked; render(box, on, opts); };
      row.appendChild(cb);
      var body = el("div", "");
      body.appendChild(el("div", "tl-lev-t", l.label));
      body.appendChild(el("div", "tl-lev-o", l.otel));
      body.appendChild(el("div", "tl-lev-h", l.hint));
      row.appendChild(body);
      row.onmouseenter = function () { row.classList.add("open"); };
      row.onmouseleave = function () { row.classList.remove("open"); };
      left.appendChild(row);
    });
    cols.appendChild(left);

    /* right: waterfall + meters + diagnosis */
    var right = el("div", "");
    var wf = el("div", "tl-wf");
    var wfh = el("div", "tl-wfh");
    wfh.appendChild(el("span", "", "Trace · one Insight Bot run"));
    wfh.appendChild(el("em", "", r.vis.length + " spans · " + ms(r.total) + " total"));
    wf.appendChild(wfh);

    r.vis.forEach(function (s) {
      var row = el("div", "tl-row" + (s.slow ? " slow" : ""));
      row.style.paddingLeft = (0.8 + s.depth * 0.9) + "rem";
      var rt = el("div", "tl-rt");
      rt.appendChild(el("span", "tl-kind " + s.kind, s.kind));
      rt.appendChild(el("span", "tl-nm", s.name));
      rt.appendChild(el("span", "tl-dur", ms(s.dur)));
      row.appendChild(rt);
      var bar = el("div", "tl-bar");
      var fill = el("div", "tl-fill" + (s.slow ? " slow" : ""));
      fill.style.left = (s.start / r.total * 100) + "%";
      fill.style.width = Math.max(0.6, s.dur / r.total * 100) + "%";
      bar.appendChild(fill);
      row.appendChild(bar);
      var at = s.attrs.filter(function (a) { return !a.needs || on[a.needs]; });
      if (at.length) {
        var ab = el("div", "tl-attrs");
        at.forEach(function (a) {
          ab.appendChild(el("span", "tl-a" + (a.alarm ? " alarm" : ""), a.k + "=" + a.v));
        });
        row.appendChild(ab);
      }
      wf.appendChild(row);
    });
    if (r.unaccounted > 0) {
      wf.appendChild(el("div", "tl-gap",
        "⚠ " + ms(r.unaccounted) + " of " + ms(r.total) + " (" + pct(r.unaccounted / r.total) +
        ") is inside no span you are emitting. The trace looks fast and clean because the slow part is invisible."));
    }
    right.appendChild(wf);

    var mets = el("div", "tl-meters");
    mets.appendChild(meter("Wall clock you can see", pct(r.pctSeen), r.pctSeen < 0.99,
      r.pctSeen < 0.99 ? "You are blind to " + ms(r.unaccounted) + "." : "Every millisecond is inside a span."));
    mets.appendChild(meter("Diagnosis", r.score + " of 5", r.score < 5,
      r.score === 5 ? "Root cause is provable from this trace alone." : (5 - r.score) + " question(s) still unanswerable."));
    mets.appendChild(meter("Cost per run", r.tokensKnown ? "$" + r.cost.toFixed(4) : "unknown", !r.tokensKnown,
      r.tokensKnown ? r.inTok.toLocaleString() + " in / " + r.outTok.toLocaleString() + " out, attributable per user"
                    : "No token attributes, so no per-run, per-user or per-feature cost. Only an invoice."));
    mets.appendChild(meter("Trace retention", r.gb.toFixed(1) + " GB", !!on.content,
      "$" + r.bill.toFixed(0) + "/mo at " + RETENTION.runsPerDay.toLocaleString() + " runs/day, " + RETENTION.days + "d" +
      (on.content ? " · contains raw customer prompts: PII exposure" : " · no message content stored")));
    right.appendChild(mets);

    var qs = el("div", "tl-qs");
    QUESTIONS.forEach(function (q, i) {
      var ok = r.answered[i];
      var row = el("div", "tl-q " + (ok ? "yes" : "no"));
      row.appendChild(el("span", "tl-dot"));
      var b = el("div", "");
      b.appendChild(el("div", "tl-qt", q.q));
      b.appendChild(el("div", "tl-qa", ok ? q.yes : q.no));
      row.appendChild(b);
      qs.appendChild(row);
    });
    right.appendChild(qs);
    cols.appendChild(right);
    box.appendChild(cols);

    box.appendChild(el("p", "tl-rail",
      "Honesty rail: the incident and its spans are constructed for this exercise - realistic, using real OpenTelemetry GenAI attribute keys, but not captured from any live system. The arithmetic IS real and runs in your browser: " +
      pct(r.pctSeen) + " of the wall clock is currently inside a span you emit, and the retention figure is computed from a modelled " +
      RETENTION.baseKB + "KB base plus " + RETENTION.contentKB + "KB of message content per trace at a modelled $" +
      RETENTION.pricePerGBMonth.toFixed(2) + " per GB-month. Storage prices are yours to substitute."));
    return r;
  }

  function meter(label, big, bad, note) {
    var m = el("div", "tl-m");
    m.appendChild(el("b", "", label));
    m.appendChild(el("i", bad ? "bad" : "", big));
    m.appendChild(el("u", "", note));
    return m;
  }

  /* ---------- render: the scripted coverage ladder ---------- */
  var LADDER = [
    { name: "What you shipped", on: {},
      say: "Base instrumentation: the two LLM calls, because the SDK gave you those for free. The trace has three spans - the root plus two model calls - all fast, all status OK. This is the trace your on-call engineer opened at 09:20 and closed at 09:21. Look at how much of the run is missing." },
    { name: "Add tool spans", on: { tools: 1 },
      say: "Now you can see which tools ran and in what order. Useful - and it barely moves the needle, because the missing time was never in a tool. Instrumenting the easy layer first is the normal mistake." },
    { name: "Add retriever spans", on: { tools: 1, retrieval: 1 },
      say: "There it is. 4.2 seconds of a 6.8 second run - 62% of the wall clock - in the one step nobody instrumented. The wall clock is fully accounted for now, and you have your first answer: retrieval is the slow step. You still do not know it is BROKEN." },
    { name: "Add retrieval attributes", on: { tools: 1, retrieval: 1, retattrs: 1 },
      say: "Zero documents returned, and cache_fallback true. The step is not slow, it is empty - and something quietly substituted cached data. Slow was never the bug; slow was the symptom that made the bug findable." },
    { name: "Go one level deeper", on: { tools: 1, retrieval: 1, retattrs: 1, db: 1 },
      say: "The warehouse query returned zero rows after 4.1 seconds, and a cache entry 19.4 hours old was served in its place. That is the stale number your CFO read at 09:14, and it has now been located precisely." },
    { name: "Propagate the error", on: { tools: 1, retrieval: 1, retattrs: 1, db: 1, errors: 1 },
      say: "The query TIMED OUT. Someone wrapped it in a try/except, fell back to cache, and returned success. That swallowed exception is why no alert fired and why the dashboard stayed green through the whole incident. Four of five questions answered." },
    { name: "Thread the sessions", on: { tools: 1, retrieval: 1, retattrs: 1, db: 1, errors: 1, session: 1, tokens: 1 },
      say: "Conversation IDs show it fails only when the warehouse is slow - intermittent, not constant, which is a different fix. Token attributes make the run cost attributable. Five of five: you can now write the postmortem from the trace." },
    { name: "Capture everything", on: { tools: 1, retrieval: 1, retattrs: 1, db: 1, errors: 1, session: 1, tokens: 1, content: 1 },
      say: "The tempting last step: store every prompt and completion. The diagnosis score does not move - it was already 5 of 5, and the message content was never the problem, because the model summarised the stale data perfectly well. What DOES move is retention, by more than ten times, and you have just put raw customer prompts in a log store. This lever is a trap, and it is the one most teams pull first." }
  ];

  function renderLadder(box) {
    box.innerHTML = "";
    var step = 0;
    var nav = el("div", "tl-lad"), say = el("p", "tl-ladsay"), host = el("div", "");
    LADDER.forEach(function (L, i) {
      var b = el("button", "tl-ladb", (i + 1) + ". " + L.name);
      b.type = "button";
      b.onclick = function () { step = i; draw(); };
      nav.appendChild(b);
    });
    box.appendChild(nav); box.appendChild(say); box.appendChild(host);
    function draw() {
      Array.prototype.forEach.call(nav.children, function (b, i) { b.className = "tl-ladb" + (i === step ? " on" : ""); });
      say.textContent = LADDER[step].say;
      host.innerHTML = "";
      var inner = el("div", "");
      host.appendChild(inner);
      render(inner, Object.assign({}, LADDER[step].on), { scripted: true });
    }
    draw();
  }

  /* ---------- render: the content-capture cost table ---------- */
  function renderCost(box) {
    box.innerHTML = "";
    box.appendChild(el("div", "tl-sub", "What capturing message content costs"));
    box.appendChild(el("p", "tl-ladsay",
      "Same traffic, same retention window, one lever. Every figure is computed live from a modelled " +
      RETENTION.baseKB + "KB base trace, " + RETENTION.contentKB + "KB of message content, and $" +
      RETENTION.pricePerGBMonth.toFixed(2) + " per GB-month. Substitute your own storage price and traffic."));
    var t = el("table", "tl-ct");
    var thead = el("thead", ""), hr = el("tr", "");
    ["Runs per day", "Content off", "Content on", "Multiple", "Extra per month"].forEach(function (h) { hr.appendChild(el("th", "", h)); });
    thead.appendChild(hr); t.appendChild(thead);
    var tb = el("tbody", "");
    [1000, 10000, 40000, 200000, 1000000].forEach(function (n) {
      var gbOff = (RETENTION.baseKB * n * RETENTION.days) / (1024 * 1024);
      var gbOn = ((RETENTION.baseKB + RETENTION.contentKB) * n * RETENTION.days) / (1024 * 1024);
      var tr = el("tr", n === RETENTION.runsPerDay ? "hi" : "");
      tr.appendChild(el("td", "", n.toLocaleString()));
      tr.appendChild(el("td", "", gbOff.toFixed(1) + " GB · $" + (gbOff * RETENTION.pricePerGBMonth).toFixed(0)));
      tr.appendChild(el("td", "", gbOn.toFixed(1) + " GB · $" + (gbOn * RETENTION.pricePerGBMonth).toFixed(0)));
      tr.appendChild(el("td", "", (gbOn / gbOff).toFixed(1) + "x"));
      tr.appendChild(el("td", "", "$" + ((gbOn - gbOff) * RETENTION.pricePerGBMonth).toFixed(0)));
      tb.appendChild(tr);
    });
    t.appendChild(tb); box.appendChild(t);
    box.appendChild(el("p", "tl-rail",
      "The multiple is constant because it is just a ratio of bytes - which is the point. Content capture does not cost you a little more at scale, it costs you the same order of magnitude more at every scale, and it converts your trace store into a system holding raw customer text. Sample it, redact it, or scope it to the traces you actually need it on. Never leave it on by default across all traffic."));
  }

  /* ---------- mount ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    injectCss();
    document.querySelectorAll(".tlbox").forEach(function (box) {
      var mode = box.getAttribute("data-mode") || "trace";
      if (mode === "ladder") { renderLadder(box); return; }
      if (mode === "cost") { renderCost(box); return; }
      var on = {};
      var pre = box.getAttribute("data-levers");
      if (pre !== null && pre !== "") pre.split(",").forEach(function (k) { if (k.trim()) on[k.trim()] = true; });
      render(box, on, { scripted: false });
    });
  });

  window.TRACE_LIVE = { compute: compute, SPANS: SPANS, LEVERS: LEVERS, QUESTIONS: QUESTIONS, LADDER: LADDER };
})();

/* Generates a printable Additional-Learning study sheet (HTML) from data-extra.js,
   so the document always matches the site's supplementary content.
   Usage: node build-study-sheet.js "June 26, 2026" */
const fs = require('fs');
const vm = require('vm');

const dateStr = process.argv[2] || '';
const code = fs.readFileSync(__dirname + '/data-extra.js', 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const CARDS = sandbox.STUDY_CARDS;     // [cat, term, def]
const QS = sandbox.STUDY_QUESTIONS;    // {cat,q,opts,a,why}

const esc = s => String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const KEYS = ['A','B','C','D','E'];

// group cards by category, preserving first-seen order
const catOrder = [];
const byCat = {};
CARDS.forEach(([cat, term, def]) => {
  if (!byCat[cat]) { byCat[cat] = []; catOrder.push(cat); }
  byCat[cat].push([term, def]);
});

// group questions by category too
const qCatOrder = [];
const qByCat = {};
QS.forEach(q => {
  if (!qByCat[q.cat]) { qByCat[q.cat] = []; qCatOrder.push(q.cat); }
  qByCat[q.cat].push(q);
});

let vocab = '';
catOrder.forEach(cat => {
  vocab += `<section class="cat"><h2>${esc(cat)} <span class="ct">${byCat[cat].length} terms</span></h2><dl>`;
  byCat[cat].forEach(([term, def]) => {
    vocab += `<div class="entry"><dt>${esc(term)}</dt><dd>${esc(def)}</dd></div>`;
  });
  vocab += `</dl></section>`;
});

let qnum = 0;
let quizzes = '';
qCatOrder.forEach(cat => {
  quizzes += `<section class="cat"><h2>${esc(cat)} <span class="ct">${qByCat[cat].length} questions</span></h2>`;
  qByCat[cat].forEach(q => {
    qnum++;
    quizzes += `<div class="q"><p class="qq"><span class="qn">${qnum}.</span> ${esc(q.q)}</p><ol class="opts">`;
    q.opts.forEach((o, i) => {
      const correct = i === q.a;
      quizzes += `<li class="${correct ? 'correct' : ''}">${esc(o)}${correct ? ' <span class="chk">✓ correct</span>' : ''}</li>`;
    });
    quizzes += `</ol><p class="why"><b>Why:</b> ${esc(q.why)}</p></div>`;
  });
  quizzes += `</section>`;
});

const totalTerms = CARDS.length;
const totalQs = QS.length;

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex, nofollow">
<title>Additional Learning — Study Sheet (Intro to Business Procedures)</title>
<style>
  :root{ --ink:#1a1f2b; --muted:#5c6678; --line:#dbe0ea; --accent:#5b3df5; --good:#0a7d4d; --shade:#f4f6fb; }
  *{box-sizing:border-box}
  html{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  body{ font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    color:var(--ink); line-height:1.5; margin:0; background:#fff; }
  .page{ max-width:760px; margin:0 auto; padding:48px 40px 60px; }
  .doc-head{ border-bottom:3px solid var(--accent); padding-bottom:16px; margin-bottom:8px; }
  .eyebrow{ font-size:12px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:var(--accent); }
  h1{ font-size:26px; margin:6px 0 4px; letter-spacing:-.3px; }
  .sub{ color:var(--muted); font-size:14px; margin:0; }
  .meta{ color:var(--muted); font-size:12px; margin-top:10px; }
  .disclaimer{ background:#f1ecff; border:1px solid #d8ccff; color:#3d2a8c; border-radius:8px;
    padding:11px 14px; font-size:12.5px; margin:18px 0 4px; line-height:1.45; }
  .toc{ font-size:12.5px; color:var(--muted); margin:14px 0 0; }
  .toc b{ color:var(--ink); }

  h2.part{ font-size:18px; margin:34px 0 4px; padding-top:18px; border-top:2px solid var(--line);
    color:var(--accent); }
  .part-note{ color:var(--muted); font-size:12.5px; margin:0 0 6px; }

  .cat{ margin-top:18px; break-inside:avoid; }
  .cat h2{ font-size:15px; margin:0 0 8px; padding:5px 10px; background:var(--shade);
    border-left:4px solid var(--accent); border-radius:0 5px 5px 0; }
  .cat h2 .ct{ font-weight:500; color:var(--muted); font-size:12px; }

  dl{ margin:0; }
  .entry{ padding:7px 0; border-bottom:1px solid var(--line); break-inside:avoid; }
  dt{ font-weight:700; font-size:14px; }
  dd{ margin:2px 0 0; font-size:13.5px; color:#2c3242; }

  .q{ padding:10px 0 12px; border-bottom:1px solid var(--line); break-inside:avoid; }
  .qq{ font-weight:600; margin:0 0 6px; font-size:14px; }
  .qn{ color:var(--accent); font-weight:800; }
  ol.opts{ margin:0 0 6px; padding-left:26px; }
  ol.opts li{ font-size:13.5px; margin:2px 0; color:#39414f; }
  ol.opts li.correct{ color:var(--good); font-weight:700; }
  .chk{ font-size:11px; font-weight:800; }
  .why{ font-size:12.5px; color:var(--muted); margin:4px 0 0; }

  .foot{ margin-top:30px; padding-top:14px; border-top:2px solid var(--line);
    color:var(--muted); font-size:11.5px; text-align:center; }
  .foot code{ font-family:ui-monospace,Menlo,Consolas,monospace; }

  @page{ margin:14mm; }
  @media print{
    .page{ padding:0; max-width:none; }
    a{ color:inherit; text-decoration:none; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="doc-head">
    <div class="eyebrow">➕ Additional Learning · Study Sheet</div>
    <h1>FBLA — Introduction to Business Procedures</h1>
    <p class="sub">Supplementary vocabulary &amp; practice questions for deeper review</p>
    <p class="meta">${dateStr ? 'Generated ' + esc(dateStr) + ' · ' : ''}${totalTerms} terms · ${totalQs} questions</p>
  </div>

  <div class="disclaimer">
    <b>Note:</b> This is <b>supplementary</b> material, researched from the FBLA Introduction to Business Procedures
    scope and standard business references. It is <b>NOT</b> taken from your original study document — it expands on the same topics.
  </div>

  <p class="toc"><b>Contents:</b> Part 1 — Vocabulary &amp; Concepts (${catOrder.length} topics, ${totalTerms} terms) · Part 2 — Practice Questions with answers (${totalQs} questions)</p>

  <h2 class="part">Part 1 · Vocabulary &amp; Concepts</h2>
  <p class="part-note">Term → definition, grouped by topic.</p>
  ${vocab}

  <h2 class="part">Part 2 · Practice Questions &amp; Answers</h2>
  <p class="part-note">The ✓ marks the correct choice; the “Why” line explains it.</p>
  ${quizzes}

  <div class="foot">
    Additional Learning study sheet · companion to the Intro to Business Procedures Study Lab.
    Supplementary — not from the original recorded document.
  </div>
</div>
</body>
</html>`;

fs.writeFileSync(__dirname + '/Additional-Learning-Study-Sheet.html', html);
console.log('Wrote Additional-Learning-Study-Sheet.html  (' + totalTerms + ' terms, ' + totalQs + ' questions)');

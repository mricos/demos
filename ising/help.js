// ── Context Help System ────────────────────────
// Convention: any element with data-help="topic" shows #help-{topic}
// on click/focus. Bubbles up from children. Highlights the source element.
// Reusable across demos — just define help-topic divs in HTML.

const $ = id => document.getElementById(id);

let activeHelpEl = null;
let helpHistory = [];
const helpTopics = document.querySelectorAll('.help-topic');
const helpCrumb = $('helpCrumb');
const helpBack = $('helpBack');

const crumbNames = {
  'overview':'Overview',
  'ctrl-temp':'Controls > Temperature', 'ctrl-size':'Controls > Grid Size',
  'ctrl-coupling':'Controls > Coupling J', 'ctrl-speed':'Controls > Speed',
  'ctrl-run':'Controls > Run', 'ctrl-step':'Controls > Step',
  'ctrl-reset':'Controls > Reset', 'ctrl-init':'Controls > Initial State',
  'ctrl-sweep':'Phase > Sweep',
  'stat-energy':'Stats > Energy', 'stat-mag':'Stats > Magnetization',
  'stat-temp':'Stats > Temperature', 'stat-sweep':'Stats > Sweeps',
  'tab-lattice':'Lattice', 'tab-energy':'Energy Charts',
  'tab-phase':'Phase Diagram', 'tab-hopfield':'Hopfield Network',
  'hop-draw':'Hopfield > Drawing', 'hop-store':'Hopfield > Store',
  'hop-noise':'Hopfield > Noise', 'hop-recall':'Hopfield > Recall',
  'hop-clear':'Hopfield > Clear'
};

let currentTopic = 'overview';

export function showHelp(topic, addToHistory = true) {
  if (!$('help-' + topic)) return;
  if (addToHistory && currentTopic !== topic) helpHistory.push(currentTopic);
  currentTopic = topic;
  helpTopics.forEach(t => t.classList.remove('on'));
  $('help-' + topic).classList.add('on');
  if (helpCrumb) helpCrumb.textContent = crumbNames[topic] || topic;
  if (helpBack) helpBack.style.visibility = helpHistory.length ? 'visible' : 'hidden';
  $('panelRight')?.scrollTo(0, 0);
}

export function goBack() {
  if (!helpHistory.length) return;
  showHelp(helpHistory.pop(), false);
}

// Click delegation
document.addEventListener('click', e => {
  const el = e.target.closest('[data-help]');
  if (!el) return;
  if (activeHelpEl) activeHelpEl.classList.remove('help-active');
  activeHelpEl = el;
  el.classList.add('help-active');
  showHelp(el.dataset.help);
});

// Slider focus
document.querySelectorAll('input[type="range"]').forEach(slider => {
  slider.addEventListener('focus', () => {
    const el = slider.closest('[data-help]');
    if (!el) return;
    if (activeHelpEl) activeHelpEl.classList.remove('help-active');
    activeHelpEl = el;
    el.classList.add('help-active');
    showHelp(el.dataset.help);
  });
});

// Back button
if (helpBack) helpBack.addEventListener('click', goBack);

// Collapse toggle (double-click right drag handle)
const dragRight = $('dragRight');
if (dragRight) {
  dragRight.addEventListener('dblclick', () => {
    $('panelRight')?.classList.toggle('collapsed');
  });
}

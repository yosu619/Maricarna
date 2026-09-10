/* Maricarna — vanilla JavaScript. No libraries or build step required. */
'use strict';

// Opening and scroll animations. Content stays visible if JavaScript is disabled.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!reducedMotion && 'IntersectionObserver' in window) {
  document.documentElement.classList.add('js-motion');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
}
window.setTimeout(() => document.querySelector('.site').classList.add('ready'), reducedMotion ? 0 : 1200);

// How-to tabs: mouse, touch, and keyboard.
const steps = [
  ['水を用意する', 'いつもの水道水やミネラルウォーターをグラスに。'],
  ['本体を入れる', 'マリカルナを水に入れます。使用方法は製品の説明書をご確認ください。'],
  ['ボタンを押す', 'スイッチをひと押し。シンプルな操作で生成が始まります。'],
  ['約30秒で完成', 'できたての水素水を、毎日のひと息に。']
];
const tabs = [...document.querySelectorAll('[role="tab"]')];
const panel = document.getElementById('step-panel');
let currentStep = 0;
function showStep(index, focus = false) {
  currentStep = (index + steps.length) % steps.length;
  tabs.forEach((tab, i) => {
    const active = i === currentStep;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
  });
  panel.setAttribute('aria-labelledby', tabs[currentStep].id);
  panel.querySelector('.giant-number').textContent = `0${currentStep + 1}`;
  panel.querySelector('h3').textContent = steps[currentStep][0];
  panel.querySelector('p').textContent = steps[currentStep][1];
  if (!reducedMotion && panel.animate) panel.animate([{opacity:0, transform:'translateY(12px)'},{opacity:1,transform:'translateY(0)'}], {duration:350});
  if (focus) tabs[currentStep].focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => showStep(index));
  tab.addEventListener('keydown', event => {
    const keys = {ArrowRight:currentStep+1, ArrowLeft:currentStep-1, Home:0, End:steps.length-1};
    if (Object.hasOwn(keys,event.key)) { event.preventDefault(); showStep(keys[event.key],true); }
  });
});
panel.querySelector('.text-button').addEventListener('click', () => showStep(currentStep + 1));

// Form endpoint is relative to this page. Deploy the optional server/worker.js
// with a D1 database to receive inquiries. A file-only preview cannot save them.
const form = document.getElementById('contact-form');
const submit = form.querySelector('[type="submit"]');
const error = document.getElementById('form-error');
const success = document.getElementById('form-success');
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!form.reportValidity() || submit.disabled) return;
  error.hidden = true;
  if (location.protocol === 'file:') {
    error.textContent = 'ファイルを直接開いているため送信できません。お問い合わせ受付サーバーを設定したサイトから送信してください。';
    error.hidden = false;
    return;
  }
  const originalLabel = submit.innerHTML;
  submit.disabled = true;
  submit.textContent = '送信しています…';
  try {
    const response = await fetch(form.action, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('お問い合わせの受付先が設定されていません。');
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || '送信できませんでした。時間をおいてお試しください。');
    if (typeof body.id !== 'string' || !body.id) throw new Error('受付番号を確認できませんでした。');
    document.getElementById('receipt-id').textContent = body.id;
    form.reset();
    form.hidden = true;
    success.hidden = false;
    success.focus();
  } catch (exception) {
    error.textContent = exception.name === 'TimeoutError' ? '通信がタイムアウトしました。受付状況をご確認ください。' : exception.message;
    error.hidden = false;
  } finally {
    submit.disabled = false;
    submit.innerHTML = originalLabel;
  }
});
document.getElementById('new-inquiry').addEventListener('click', () => {
  success.hidden = true;
  form.hidden = false;
  form.querySelector('select').focus();
});

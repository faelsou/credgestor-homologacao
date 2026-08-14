import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:5173';
const EMAIL = process.env.E2E_EMAIL || 'admin@alpha.com';
const PASSWORD = process.env.E2E_PASSWORD || 'AdminAlpha123!';
const OUT = path.resolve('artifacts/qa');
fs.mkdirSync(OUT, { recursive: true });

const findings = [];
const consoleErrors = [];
const networkFails = [];
const pageReports = [];

function addFinding(area, severity, title, detail) {
  findings.push({ area, severity, title, detail });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  locale: 'pt-BR',
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') {
    consoleErrors.push({ url: page.url(), text: msg.text() });
  }
});
page.on('pageerror', (err) => {
  consoleErrors.push({ url: page.url(), text: `PAGEERROR: ${err.message}` });
});
page.on('response', (res) => {
  const status = res.status();
  if (status >= 400) {
    networkFails.push({ url: res.url(), status, page: page.url() });
  }
});

async function shot(name) {
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
}

async function collectA11yBasics(area) {
  const issues = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('button').forEach((btn, i) => {
      const name = (btn.getAttribute('aria-label') || btn.textContent || '').trim();
      if (!name && btn.offsetParent !== null) {
        out.push(`Botão sem nome acessível #${i}`);
      }
    });
    document.querySelectorAll('input:not([type=hidden])').forEach((inp, i) => {
      const id = inp.id;
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const aria = inp.getAttribute('aria-label') || inp.getAttribute('placeholder');
      if (!hasLabel && !aria && inp.offsetParent !== null) {
        out.push(`Input sem label/placeholder #${i} type=${inp.type}`);
      }
    });
    document.querySelectorAll('img').forEach((img, i) => {
      if (!img.getAttribute('alt') && img.offsetParent !== null) {
        out.push(`Img sem alt #${i}`);
      }
    });
    if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 2) {
      out.push(
        `Overflow horizontal: scrollWidth=${document.documentElement.scrollWidth} clientWidth=${document.documentElement.clientWidth}`
      );
    }
    const bodyText = document.body.innerText || '';
    if (/Erro:|undefined|NaN|\[object Object\]/i.test(bodyText)) {
      const m = bodyText.match(/(Erro:[^\n]+|undefined|NaN|\[object Object\])/i);
      if (m) out.push(`Texto suspeito na UI: ${m[0].slice(0, 120)}`);
    }
    return out;
  });
  for (const issue of issues) {
    addFinding(area, 'medium', 'A11y/layout', issue);
  }
  return issues;
}

async function reportView(area, extra = {}) {
  const title = await page.title();
  const h2 = await page.locator('h2').first().textContent().catch(() => null);
  const buttons = await page.locator('button:visible').count();
  const tables = await page.locator('table:visible').count();
  const emptyHints = await page.getByText(/nenhum|sem registro|não encontrado|vazio/i).count().catch(() => 0);
  const issues = await collectA11yBasics(area);
  const report = { area, title, h2, buttons, tables, emptyHints, issues, ...extra };
  pageReports.push(report);
  return report;
}

await page.goto(BASE, { waitUntil: 'networkidle', timeout: 60000 });
await shot('01-lp-desktop');
await reportView('LP');

const cta = page.getByRole('button', { name: /Entrar agora|Entrar Agora/i });
if (!(await cta.count())) {
  addFinding('LP', 'high', 'CTA Entrar ausente', 'Botão de login não encontrado na LP');
} else {
  await cta.first().click();
  await page.waitForTimeout(500);
  await shot('02-lp-login-modal');
  const emailVisible = await page.getByPlaceholder('seu@email.com').isVisible();
  if (!emailVisible) {
    addFinding('LP', 'high', 'Modal de login', 'Campo email não apareceu após clicar Entrar');
  }
}

await page.getByPlaceholder('seu@email.com').fill('invalido@teste.com');
await page.locator('input[type="password"]').first().fill('senhaerrada123');
await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
await page.waitForTimeout(2500);
const hasError = await page.getByText(/Erro:|credenciais|inválid/i).isVisible().catch(() => false);
if (!hasError) {
  addFinding('LP', 'medium', 'Feedback de erro no login', 'Login inválido não mostrou mensagem clara de erro');
}
await shot('03-lp-login-error');

await page.getByPlaceholder('seu@email.com').fill(EMAIL);
await page.locator('input[type="password"]').first().fill(PASSWORD);
await page.getByRole('button', { name: 'Entrar no Sistema' }).click();
await page.getByText('Menu Principal').waitFor({ timeout: 45000 });
await shot('04-dashboard');
await reportView('Dashboard');

const navs = [
  { name: 'Dashboard', area: 'Dashboard', file: '04b-dashboard' },
  { name: 'Clientes', area: 'Clientes', file: '05-clientes' },
  { name: 'Empréstimos', area: 'Empréstimos', file: '06-emprestimos' },
  { name: 'Parcelas', area: 'Parcelas', file: '07-parcelas' },
  { name: 'Histórico de empréstimo', area: 'Histórico', file: '08-historico' },
];

for (const nav of navs) {
  const btn = page.getByRole('button', { name: nav.name }).first();
  if (!(await btn.count())) {
    addFinding(nav.area, 'high', 'Navegação', `Item de menu "${nav.name}" não encontrado`);
    continue;
  }
  await btn.click();
  await page.waitForTimeout(1500);
  await shot(nav.file);
  await reportView(nav.area);

  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(400);
  await shot(`${nav.file}-mobile`);
  const mobileIssues = await collectA11yBasics(`${nav.area} mobile`);
  if (mobileIssues.some((i) => i.includes('Overflow'))) {
    addFinding(nav.area, 'high', 'Responsividade mobile', 'Overflow horizontal em 375px');
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
}

await page.getByRole('button', { name: 'Clientes' }).first().click();
await page.waitForTimeout(800);
const novoCliente = page.getByRole('button', { name: /Novo Cliente/i });
if (await novoCliente.count()) {
  await novoCliente.first().click();
  await page.waitForTimeout(600);
  await shot('05b-novo-cliente-modal');
  await reportView('Clientes - modal novo');
  const salvar = page.getByRole('button', { name: /Salvar|Cadastrar|Criar/i }).first();
  if (await salvar.count()) {
    await salvar.click();
    await page.waitForTimeout(800);
    await shot('05c-novo-cliente-validacao');
    const validation = await page.getByText(/obrigat|preencha|inválid|erro/i).count();
    if (!validation) {
      addFinding('Clientes', 'medium', 'Validação de formulário', 'Submit vazio sem feedback de validação visível');
    }
  }
  const cancel = page.getByRole('button', { name: /Cancelar|Fechar|Voltar/i }).first();
  if (await cancel.isVisible().catch(() => false)) await cancel.click();
  else await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
}

await page.getByRole('button', { name: 'Empréstimos' }).first().click();
await page.waitForTimeout(800);
const novoEmp = page.getByRole('button', { name: /Novo Empr/i });
if (await novoEmp.count()) {
  await novoEmp.first().click();
  await page.waitForTimeout(800);
  await shot('06b-novo-emprestimo-modal');
  await reportView('Empréstimos - modal novo');
  const cancel2 = page.getByRole('button', { name: /Cancelar|Fechar|Voltar/i }).first();
  if (await cancel2.isVisible().catch(() => false)) await cancel2.click();
  else await page.keyboard.press('Escape');
}

await page.getByRole('button', { name: 'Parcelas' }).first().click();
await page.waitForTimeout(1000);
await shot('07b-parcelas-filtros');
const receber = page.getByRole('button', { name: /Receber/i });
const receberCount = await receber.count();
pageReports.push({ area: 'Parcelas', receberButtons: receberCount });
if (receberCount > 0) {
  await receber.first().click();
  await page.waitForTimeout(700);
  await shot('07c-receber-modal');
  await reportView('Parcelas - modal receber');
  const cancel3 = page.getByRole('button', { name: /Cancelar|Fechar/i }).first();
  if (await cancel3.isVisible().catch(() => false)) await cancel3.click();
  else await page.keyboard.press('Escape');
}

await page.getByRole('button', { name: 'Histórico de empréstimo' }).first().click();
await page.waitForTimeout(800);
const headerTitle = await page.locator('header').innerText().catch(() => '');
if (/loanhistory|LoanHistory/i.test(headerTitle)) {
  addFinding('Histórico', 'low', 'Título do header', `Header mostra id técnico: ${headerTitle.slice(0, 80)}`);
}

await page.getByRole('button', { name: 'Clientes' }).first().click();
await page.waitForTimeout(500);
const headerClients = await page.evaluate(() => {
  const h = document.querySelector('header');
  return h ? h.innerText : '';
});
if (/clients/i.test(headerClients) && !/Clientes/i.test(headerClients)) {
  addFinding('Layout', 'medium', 'Título do header', `Header usa id em inglês: ${headerClients.slice(0, 60)}`);
}

await browser.close();

const netCritical = networkFails.filter((n) => !/favicon|google-analytics|hotjar|sentry/i.test(n.url));

const summary = {
  base: BASE,
  timestamp: new Date().toISOString(),
  consoleErrors: consoleErrors.slice(0, 50),
  consoleErrorCount: consoleErrors.length,
  networkFails: netCritical.slice(0, 40),
  networkFailCount: netCritical.length,
  pageReports,
  findings,
};
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(summary, null, 2));
console.log(
  JSON.stringify(
    {
      findings: findings.length,
      consoleErrors: consoleErrors.length,
      networkFails: netCritical.length,
      pages: pageReports.map((p) => p.area),
      topFindings: findings.slice(0, 30),
    },
    null,
    2
  )
);

import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InstallmentsPage } from '../pages/InstallmentsPage';
import path from 'node:path';
import fs from 'node:fs';

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const ARTIFACTS = path.resolve('artifacts/e2e');

test.describe('Fluxo crítico: login → baixar pagamento', () => {
  test.beforeAll(() => {
    fs.mkdirSync(ARTIFACTS, { recursive: true });
  });

  test.skip(!EMAIL || !PASSWORD, 'Defina E2E_EMAIL e E2E_PASSWORD');

  test('deve autenticar, abrir Parcelas e confirmar recebimento', async ({ page }, testInfo) => {
    // Skip em produção — operação financeira real
    test.skip(
      (process.env.BASE_URL || '').includes('credgestor.app.br') &&
        !(process.env.BASE_URL || '').includes('staging'),
      'Não executar baixa real em produção'
    );

    const loginPage = new LoginPage(page);
    const installmentsPage = new InstallmentsPage(page);

    await test.step('Login', async () => {
      await loginPage.goto();
      await page.screenshot({ path: path.join(ARTIFACTS, '01-landing.png'), fullPage: true });
      await loginPage.login(EMAIL!, PASSWORD!);

      const authError = page.getByText(/Erro:|Invalid login credentials|credenciais/i);
      if (await authError.isVisible().catch(() => false)) {
        await page.screenshot({ path: path.join(ARTIFACTS, '02-login-failed.png'), fullPage: true });
        throw new Error(`Login rejeitado: ${(await authError.textContent())?.trim()}`);
      }

      await loginPage.expectDashboard();
      await page.screenshot({ path: path.join(ARTIFACTS, '02-after-login.png'), fullPage: true });
    });

    await test.step('Abrir Controle de Parcelas', async () => {
      await installmentsPage.open();
      await page.screenshot({ path: path.join(ARTIFACTS, '03-parcelas.png'), fullPage: true });
    });

    await test.step('Receber primeira parcela disponível', async () => {
      await installmentsPage.openFirstUnpaidReceive();
      await page.screenshot({ path: path.join(ARTIFACTS, '04-modal-receber.png') });

      const title = await installmentsPage.modalTitle.textContent();
      console.log(`Modal aberto: ${title}`);

      await installmentsPage.confirmReceipt();
      await installmentsPage.expectModalClosed();
      await page.screenshot({ path: path.join(ARTIFACTS, '05-apos-confirmar.png'), fullPage: true });
    });

    // Anexo no relatório Playwright
    for (const file of fs.readdirSync(ARTIFACTS).filter((f) => f.endsWith('.png'))) {
      await testInfo.attach(file, {
        path: path.join(ARTIFACTS, file),
        contentType: 'image/png',
      });
    }
  });
});

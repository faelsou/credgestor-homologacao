import { Page, Locator, expect } from '@playwright/test';

export class InstallmentsPage {
  readonly page: Page;
  readonly navParcelas: Locator;
  readonly heading: Locator;
  readonly receiveButtons: Locator;
  readonly modalTitle: Locator;
  readonly paymentAmountInput: Locator;
  readonly paymentDateInput: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.navParcelas = page.getByRole('button', { name: 'Parcelas' }).or(page.getByText('Parcelas', { exact: true })).first();
    this.heading = page.getByRole('heading', { name: 'Controle de Parcelas' });
    this.receiveButtons = page.getByRole('button', { name: /^(Receber|Baixar Pagamento)$/ });
    this.modalTitle = page.getByRole('heading', { name: /Receber parcela/i });
    this.paymentAmountInput = page.locator('input[inputmode="decimal"], input[type="number"]').first();
    this.paymentDateInput = page.locator('input[type="date"]').first();
    this.confirmButton = page.getByRole('button', { name: 'Confirmar Recebimento' });
    this.cancelButton = page.getByRole('button', { name: 'Cancelar' });
  }

  async open() {
    // Menu lateral — texto "Parcelas"
    const nav = this.page.locator('nav, aside, .sidebar').getByText('Parcelas', { exact: true }).first();
    if (await nav.isVisible().catch(() => false)) {
      await nav.click();
    } else {
      await this.page.getByText('Parcelas', { exact: true }).first().click();
    }
    await expect(this.heading).toBeVisible({ timeout: 30_000 });
    await this.page.waitForLoadState('networkidle');
  }

  async openFirstUnpaidReceive() {
    const count = await this.receiveButtons.count();
    expect(count, 'Nenhuma parcela disponível para receber').toBeGreaterThan(0);
    await this.receiveButtons.first().click();
    await expect(this.modalTitle).toBeVisible({ timeout: 15_000 });
  }

  async confirmReceipt() {
    // PRICE: valor vem disabled/preenchido. INTEREST_ONLY: campo editável.
    // Confirma com o valor já carregado no modal (fluxo operacional padrão).
    await expect(this.paymentDateInput).toBeVisible();
    await expect(this.confirmButton).toBeEnabled();
    await this.confirmButton.click();
  }

  async expectModalClosed() {
    await expect(this.modalTitle).toBeHidden({ timeout: 30_000 });
  }
}

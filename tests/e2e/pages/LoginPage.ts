import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly openLoginButton: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.openLoginButton = page.getByRole('button', { name: /Entrar agora|Entrar Agora/i }).first();
    this.emailInput = page.getByPlaceholder('seu@email.com');
    this.passwordInput = page.locator('input[type="password"]').first();
    this.submitButton = page.getByRole('button', { name: 'Entrar no Sistema' });
    this.errorBanner = page.locator('div').filter({ hasText: /^Erro:/ }).first();
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async login(email: string, password: string) {
    await this.openLoginButton.click();
    await expect(this.emailInput).toBeVisible();
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async expectDashboard() {
    // Sidebar do app autenticado — evita falso positivo na landing ("empréstimos")
    await expect(this.page.getByText('Menu Principal')).toBeVisible({ timeout: 45_000 });
    await expect(this.page.getByRole('button', { name: 'Parcelas' })).toBeVisible();
  }

  async expectAuthError() {
    await expect(this.page.getByText(/Erro:/i)).toBeVisible({ timeout: 15_000 });
  }
}

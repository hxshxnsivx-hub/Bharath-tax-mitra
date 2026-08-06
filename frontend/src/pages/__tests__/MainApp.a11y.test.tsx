/**
 * Accessibility contract for the app shell (task 4.12.3).
 *
 * Regression guard for a real bug: <html lang> stayed "en" after a language
 * switch, so a screen reader announced Devanagari/Tamil content with English
 * pronunciation rules.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n/config';
import { OfflineProvider } from '../../contexts/OfflineContext';
import { MainApp } from '../MainApp';

function renderApp() {
  return render(
    <I18nextProvider i18n={i18n}>
      <OfflineProvider>
        <BrowserRouter>
          <MainApp
            authState={{ isAuthenticated: true, userId: 'u1', preferredLanguage: 'en', preferredRegime: 'new' }}
            onLogout={() => {}}
          />
        </BrowserRouter>
      </OfflineProvider>
    </I18nextProvider>
  );
}

describe('MainApp — accessibility shell', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('exposes header, main and navigation landmarks', () => {
    renderApp();
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument();
  });

  it('offers a skip link that targets the main landmark', () => {
    renderApp();
    const skip = screen.getByRole('link', { name: /skip to main content/i });
    expect(skip).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });

  it('marks the active tab with aria-current', () => {
    renderApp();
    // Home is the default tab.
    const home = document.querySelector('#nav-home');
    expect(home).toHaveAttribute('aria-current', 'page');
    expect(document.querySelector('#nav-export')).not.toHaveAttribute('aria-current');
  });

  it('keeps <html lang> in step with the UI language', async () => {
    renderApp();
    expect(document.documentElement.lang).toBe('en');

    await i18n.changeLanguage('hi');
    expect(document.documentElement.lang).toBe('hi');

    await i18n.changeLanguage('ta');
    expect(document.documentElement.lang).toBe('ta');
  });
});

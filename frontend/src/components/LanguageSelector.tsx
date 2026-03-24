import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../i18n/config';
import { db } from '../lib/db';

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(
    i18n.language as LanguageCode
  );

  useEffect(() => {
    // Load saved language preference from IndexedDB
    loadLanguagePreference();
  }, []);

  const loadLanguagePreference = async () => {
    try {
      const savedLang = await db.getLanguagePreference();
      if (savedLang && SUPPORTED_LANGUAGES.some(l => l.code === savedLang)) {
        await changeLanguage(savedLang as LanguageCode);
      }
    } catch (error) {
      console.error('Failed to load language preference:', error);
    }
  };

  const changeLanguage = async (langCode: LanguageCode) => {
    try {
      await i18n.changeLanguage(langCode);
      setCurrentLanguage(langCode);
      
      // Save to IndexedDB for offline access
      await db.saveLanguagePreference(langCode);
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {t('app.name')}
        </h1>
        <p className="text-gray-600">{t('app.tagline')}</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {t('language.select')}
        </h2>

        <div className="grid grid-cols-1 gap-3">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`
                p-4 rounded-lg border-2 transition-all duration-200
                ${
                  currentLanguage === lang.code
                    ? 'border-blue-500 bg-blue-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="text-lg font-semibold text-gray-900">
                    {lang.nativeName}
                  </div>
                  <div className="text-sm text-gray-600">{lang.name}</div>
                </div>
                {currentLanguage === lang.code && (
                  <svg
                    className="w-6 h-6 text-blue-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          {t('language.current')}: {SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage)?.nativeName}
        </div>

        <button
          onClick={() => navigate('/auth')}
          className="mt-6 w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
        >
          {t('common.continue')}
        </button>
      </div>
    </div>
  );
}

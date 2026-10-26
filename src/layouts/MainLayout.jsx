import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import useLanguageStore from '../store/languageStore';

export default function MainLayout() {
  const language = useLanguageStore((s) => s.language);
  const isEn = language === 'en';

  return (
    <div
      key={language}
      dir={isEn ? 'ltr' : 'rtl'}
      lang={language}
      className="min-h-screen flex flex-col bg-surface"
    >
      <Header />
      <main className="w-full pt-20 flex-1 bg-surface">
        <Outlet />
      </main>
    </div>
  );
}

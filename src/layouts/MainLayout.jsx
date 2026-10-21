import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header />
      <main className="w-full pt-20 flex-1 bg-surface">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

import { BrowserRouter } from 'react-router-dom';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'react-hot-toast';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
    <Toaster
      position="bottom-center"
      toastOptions={{
        style: {
          background: '#262a35',
          color: '#dfe2f1',
          borderRadius: '0.75rem',
          border: '1px solid #434655',
          fontFamily: 'Rubik, sans-serif',
          fontSize: '14px',
          direction: 'rtl',
        },
        success: { iconTheme: { primary: '#4edea3', secondary: '#262a35' } },
        error: { iconTheme: { primary: '#ffb4ab', secondary: '#262a35' } },
      }}
    />
  </BrowserRouter>
);

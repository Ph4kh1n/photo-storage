import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Gallery from './components/Gallery';
import Analytics from './components/Analytics';
import './App.css';

function getCookie(name: string) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 86400000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

const initialTheme = getCookie('theme') === 'light' ? 'light' : 'dark';
if (typeof document !== 'undefined') {
  document.documentElement.className = initialTheme === 'light' ? 'light' : '';
}

function App() {
  const [activeTab, setActiveTab] = useState('gallery');
  const [theme, setTheme] = useState<'dark' | 'light'>(initialTheme);

  useEffect(() => {
    document.documentElement.className = theme === 'light' ? 'light' : '';
    setCookie('theme', theme, 365);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  return (
    <>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} theme={theme} onToggleTheme={toggleTheme} />
      <main className="main-content">
        {activeTab === 'gallery' ? <Gallery /> : <Analytics />}
      </main>
    </>
  );
}

export default App;

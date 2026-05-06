import { useState } from 'react';
import Navbar from './components/Navbar';
import Gallery from './components/Gallery';
import Analytics from './components/Analytics';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('gallery');

  return (
    <>
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="main-content">
        {activeTab === 'gallery' ? <Gallery /> : <Analytics />}
      </main>
    </>
  );
}

export default App;

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Home from './pages/Home'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import QueuePage from './pages/QueuePage'
import { RequireOwner } from './Guards/RequireOwner'
import ScanPage from './pages/ScanPage'

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    // Update document direction and language when i18n language changes
    const updateDirection = () => {
      const isRTL = i18n.language === 'ar';
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = i18n.language;
      document.documentElement.classList.toggle('rtl', isRTL);
    };

    updateDirection();
    i18n.on('languageChanged', updateDirection);

    return () => {
      i18n.off('languageChanged', updateDirection);
    };
  }, [i18n]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
   
        <Route path="/queue/:id" element={<QueuePage mode="public"/>}/>

        <Route element={<RequireOwner />}>
             <Route path="/owner/q/:id" element={<QueuePage mode="owner" />} />
         </Route>
        <Route path="/scan" element={<ScanPage/>}/>
    
      </Routes>
    </BrowserRouter>
  )
}

export default App

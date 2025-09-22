
import PublicQueue from './PublicQueue'
import Home from './Home'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './App.css'






function App() {
  

 
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/queue/:id" element={<PublicQueue />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

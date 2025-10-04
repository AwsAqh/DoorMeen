
import PublicQueue from './PublicQueue'
import Home from './Home'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import './App.css'
import QueuePage from './pages/QueuePage'
import { RequireOwner } from './Guards/RequireOwner'





function App() {
  

 
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
   
        <Route path="/queue/:id" element={<QueuePage mode="public"/>}/>

        <Route element={<RequireOwner />}>
             <Route path="/owner/q/:id" element={<QueuePage mode="owner" />} />
         </Route>

    
      </Routes>
    </BrowserRouter>
  )
}

export default App

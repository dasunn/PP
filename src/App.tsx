import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import PreProdChart from './pages/PreProdChart'
import Merchants from './pages/Merchants'
import TnaSetup from './pages/TnaSetup'
import TnaPlan from './pages/TnaPlan'
import HistoryPage from './pages/HistoryPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/tna-plan" element={<TnaPlan />} />
      <Route path="/preprod" element={<PreProdChart />} />
      <Route path="/tna-setup" element={<TnaSetup />} />
      <Route path="/merchants" element={<Merchants />} />
      <Route path="/history" element={<HistoryPage />} />
      <Route path="*" element={<Dashboard />} />
    </Routes>
  )
}

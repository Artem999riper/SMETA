import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Spravochniki from './pages/Spravochniki'
import ImportPage from './pages/Import'
import Koefficienty from './pages/Koefficienty'
import Proekty from './pages/Proekty'
import SmetaPage from './pages/Smeta'

export default function App() {
  return (
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/proekty" replace />} />
          <Route path="/proekty" element={<Proekty />} />
          <Route path="/smeta/:id" element={<SmetaPage />} />
          <Route path="/spravochniki" element={<Spravochniki />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/koefficienty" element={<Koefficienty />} />
        </Routes>
      </Layout>
    </HashRouter>
  )
}

import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Properties from './pages/Properties'
import PropertyDetail from './pages/PropertyDetail'
import PropertyForm from './pages/PropertyForm'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Matches from './pages/Matches'
import MapPage from './pages/MapPage'
import ZagazigMap from './pages/ZagazigMap'
import Settings from './pages/Settings'
import Market from './pages/Market'
import MaterialsPage from './pages/MaterialsPage'
import CalculatorsPage from './pages/CalculatorsPage'
import CommissionsPage from './pages/CommissionsPage'
import DemandPage from './pages/DemandPage'
import { ClientModeProvider } from './components/ClientModeContext'

export default function App() {
  return (
    <ClientModeProvider>
      <Routes>
        <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="properties" element={<Properties />} />
        <Route path="properties/new" element={<PropertyForm />} />
        <Route path="properties/:id" element={<PropertyDetail />} />
        <Route path="properties/:id/edit" element={<PropertyForm />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="matches" element={<Matches />} />
        <Route path="map" element={<MapPage />} />
        <Route path="zagazig" element={<ZagazigMap />} />
        <Route path="market" element={<Market />} />
        <Route path="materials" element={<MaterialsPage />} />
        <Route path="calc" element={<CalculatorsPage />} />
        <Route path="commissions" element={<CommissionsPage />} />
        <Route path="demand" element={<DemandPage />} />
        <Route path="settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ClientModeProvider>
  )
}

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AllPaymentsPage from './pages/AllPaymentsPage'
import PeopleGroupsPage from './pages/PeopleGroupsPage'
import EntryDetailPage from './pages/EntryDetailPage'
import CreateEntryPage from './pages/CreateEntryPage'
import PaymentHistoryPage from './pages/PaymentHistoryPage'
import Layout from './components/Layout'
import { UserProvider } from './contexts/UserContext'

function App() {
  return (
    <UserProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/entries" element={<AllPaymentsPage />} />
            <Route path="/entries/new" element={<CreateEntryPage />} />
            <Route path="/entries/:id" element={<EntryDetailPage />} />
            <Route path="/payments" element={<PaymentHistoryPage />} />
            <Route path="/people-groups" element={<PeopleGroupsPage />} />
          </Routes>
        </Layout>
      </Router>
    </UserProvider>
  )
}

export default App







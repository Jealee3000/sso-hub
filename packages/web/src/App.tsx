import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'

function LoginPage() {
  return <h1>Login</h1>
}

function AdminPage() {
  return <h1>Admin Console</h1>
}

function AppPage() {
  return <h1>Dashboard</h1>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/" element={<AppPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

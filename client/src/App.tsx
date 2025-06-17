import { Routes, Route } from "react-router-dom";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Expenses from "./pages/Expenses";
import ErrorBoundary from "./components/ErrorBoundary";
import Bills from "./pages/Bills";

import NotFound from "./pages/NotFound";
import PrivateRoute from "./components/PrivateRoute";
import { useAuth } from "./contexts/AuthContext";
import Profile from "./pages/Profile";
import LoginRegister from "./pages/LoginRegister";
import About from "./pages/About";
import Warranties from "./pages/Warranties";

function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<LoginRegister />} />
      <Route path="/register" element={<LoginRegister />} />
      {/* Dashboard Routes */}
      <Route
        path="/"
        element={
          <PrivateRoute>
            <DashboardLayout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        {/* Expense Routes */}
        <Route path="expenses" element={<Expenses />} />

        {/* Bill Routes */}
        <Route path="bills" element={<Bills />} />

        {/* Warranty Routes */}
         <Route path="/warranties" element={<Warranties />} />
        {/* Profile */}
        <Route path="profile" element={<Profile />} />
        <Route path="about" element={<About />} />
      </Route>
      {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </ErrorBoundary>
  );
}


export default App;

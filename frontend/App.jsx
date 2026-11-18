import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/login';
// import Registration from './Pages/registration';
import Dashboard from './pages/dashboard';
import NewDeal from './pages/newDeal';
import Transactions from './pages/transactions';
// import Analyzer from './pages/analyzer.jsx';
// import Sales from './pages/sales.jsx';
import Settings from './pages/settings';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        {/* <Route path="/register" element={<Registration />} /> */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/newDeal" element={<NewDeal />} />
        <Route path="/transactions" element={<Transactions />} />
        {/* <Route path="/analyzer" element={<Analyzer />} /> */}
        {/* <Route path="/sales" element={<Sales />} /> */}
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App;
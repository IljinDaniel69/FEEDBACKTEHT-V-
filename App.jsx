import { BrowserRouter as Router, Route, Routes, Link } from "react-router-dom";
import CustomersUsers from "./CustomersUsers";
import SupportTickets from "./SupportTickets";
import Feedback from "./Feedback";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-blue-200 p-4 flex space-x-4">
          <Link to="/" className="font-bold">
            Asiakkaat ja käyttäjät
          </Link>
          <Link to="/tickets" className="font-bold">
            Tukipyynnöt
          </Link>
          <Link to="/feedback" className="font-bold">
            Palaute
          </Link>
        </nav>
        <div className="p-6">
          <Routes>
            <Route path="/" element={<CustomersUsers />} />
            <Route path="/tickets" element={<SupportTickets />} />
            <Route path="/feedback" element={<Feedback />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-primary-700 mb-4">
                  Bharat Tax Mitra
                </h1>
                <p className="text-lg text-gray-600">
                  Offline-first Income Tax Filing Assistant
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Phase 1: Foundation & Core Tax Engine - In Progress
                </p>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

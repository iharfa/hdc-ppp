import { Suspense } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { Loading } from "./components/Loading";
import { MapPage } from "./pages/MapPage";
import { RecordsPage } from "./pages/RecordsPage";
import { RecordDetailPage } from "./pages/RecordDetailPage";
import { SurveyPage } from "./pages/SurveyPage";
import { ResultsPage } from "./pages/ResultsPage";
import { ResultDetailPage } from "./pages/ResultDetailPage";
import { AdminPage } from "./pages/AdminPage";
import { AboutPage } from "./pages/AboutPage";

function Shell() {
  // The map homepage uses a fixed viewport layout: map fills the screen,
  // footer stays visible, and only the sidebar list scrolls.
  const isMapPage = useLocation().pathname === "/";
  return (
    <div className={`app-shell ${isMapPage ? "shell-fixed" : ""}`}>
        <Header />
        <main className="app-main">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<MapPage />} />
              <Route path="/records" element={<RecordsPage />} />
              <Route path="/records/:recordId" element={<RecordDetailPage />} />
              <Route path="/records/:recordId/respond" element={<SurveyPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/results/:recordId" element={<ResultDetailPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<div className="page"><div className="empty-state">Page not found.</div></div>} />
            </Routes>
          </Suspense>
        </main>
        <Footer />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Shell />
    </BrowserRouter>
  );
}

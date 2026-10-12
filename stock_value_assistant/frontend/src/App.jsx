import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { getMarketStocks } from './services/api'
import Main from './pages/Main'
import StockDetail from './pages/StockDetail'
import './App.css'
import NewsPage from './pages/News'
import AiReportPage from './pages/AiReportPage'

function App() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetchAnalysis = async (useAI = false, date = null) => {
    console.log("DEBUG: [App] fetchAnalysis 시작 - AI 사용:", useAI, "날짜:", date);
    setLoading(true)
    setError(null)
    try {
      const result = await getMarketStocks(date)
      console.log("DEBUG: [App] API 수신 완료 - 아이템 수:", result.length);
      setData(result)
    } catch (err) {
      setError(err.message || '데이터를 가져오는 데 실패했습니다.')
      console.error("DEBUG: [App] fetchAnalysis 에러:", err);
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalysis()
  }, [])

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Main
              data={data}
              loading={loading}
              error={error}
              fetchAnalysis={fetchAnalysis}
            />
          }
        />
        <Route path="/stock/:ticker" element={<StockDetail />} />
        <Route path="/news/:ticker" element={<NewsPage />} />
        <Route path="/ai/:ticker" element={<AiReportPage />} />
      </Routes>
    </Router>
  )
}

export default App
import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useLocation, useNavigate } from 'react-router-dom';
import { getAiReport } from '../services/api.js';

function AiReportPage() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const stock = location.state || {}; 

  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState("");
  const [error, setError] = useState(null);

  const fetchAiReport = async () => {
    if (!stock.ticker || !stock.stock_name) {
      setError("종목 정보가 올바르지 않습니다. Detail 페이지에서 다시 진입해주세요.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 👇 네 번째 인자로 stock.analysisDate를 추가하여 백엔드로 전달합니다.
      const reportText = await getAiReport(
        stock.ticker, 
        stock.corp_code || "", 
        stock.stock_name,
        stock.analysisDate 
      );
      setReport(reportText);
    } catch (err) {
      setError(err.message || "AI 보고서를 생성하는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAiReport();
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      
      {/* 상단 네비게이션 및 타이틀 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button 
          onClick={() => navigate(-1)}
          style={{
            background: 'white', border: '1px solid #cbd5e1', padding: '8px 16px', 
            borderRadius: '12px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', color: '#334155'
          }}
        >
          ← 뒤로 가기 (Detail)
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
            {stock.analysisDate && (
              <span style={{ fontSize: '0.8rem', backgroundColor: '#e2e8f0', color: '#334155', padding: '2px 8px', borderRadius: '6px', fontWeight: '700' }}>
                기준일: {stock.analysisDate}
              </span>
            )}
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>AI 애널리스트 리포트</span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a', margin: '2px 0 0 0' }}>
            {stock.stock_name} <span style={{ color: '#2563eb', fontSize: '1rem' }}>({stock.ticker})</span>
          </h1>
        </div>
      </div>

      {/* 로딩 상태 화면 */}
      {loading && (
        <div style={{ backgroundColor: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', padding: '4rem 2rem', textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #2563eb', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 1rem auto' }}></div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#0f172a', marginBottom: '8px' }}>AI 애널리스트가 분석 중입니다...</h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
            KRX 시세, DART 재무공시, 최신 뉴스 본문을 취합하여 심층 리포트를 작성하고 있습니다. (약 10~15초 소요)
          </p>
        </div>
      )}

      {/* 에러 발생 시 화면 */}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: '800', fontSize: '1.1rem', marginBottom: '4px' }}>⚠️ 분석 실패</h3>
          <p style={{ fontSize: '0.95rem' }}>{error}</p>
          <button 
            onClick={fetchAiReport}
            style={{ marginTop: '12px', backgroundColor: '#dc2626', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }}
          >
            다시 시도하기
          </button>
        </div>
      )}

      {/* AI 보고서 출력 화면 (마크다운 렌더링) */}
      {report && !loading && (
        <div style={{ backgroundColor: 'white', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0', padding: '2.5rem', lineHeight: '1.6', color: '#1e293b' }}>
          <ReactMarkdown>{report}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}

export default AiReportPage;
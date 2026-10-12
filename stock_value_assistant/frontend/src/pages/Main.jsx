import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketStocks } from '../hooks/useStockQueries'; // 👈 커스텀 훅 임포트

const Main = () => {
  const navigate = useNavigate();
  const [includeAI, setIncludeAI] = useState(false);
  const [includeDate, setIncludeDate] = useState(new Date().toISOString().split('T')[0]);

  // 🚀 TanStack Query 훅 적용: 날짜(includeDate)가 바뀔 때마다 알아서 데이터를 가져오고 캐싱합니다!
  const { data = [], isLoading: loading, error: queryError, refetch } = useMarketStocks(includeDate);
  const errorMsg = queryError ? "데이터를 불러오는 중 오류가 발생했습니다." : null;

  useEffect(() => {
    console.log("백엔드에서 받아온 시장 분석 데이터 (data):", data);
  }, [data]);

  const formatPrice = (price) => {
    if (price === undefined || price === null) return '0원';
    return new Intl.NumberFormat('ko-KR').format(price) + '원';
  };

  const formatPercent = (rate) => {
    const num = Number(rate);
    if (isNaN(num)) return "0.00%";
    return (num > 0 ? '+' : '') + num.toFixed(2) + '%';
  };

  // 새로고침(분석 실행) 버튼 클릭 시 수동으로 최신 데이터를 다시 불러옴 (refetch)
  const handleRefresh = () => {
    // 만약 includeAI 옵션에 따라 별도 동작이 필요하다면 여기에 추가 로직 작성
    refetch();
  };

  return (
    <div className="dashboard-container">
      <header className="header">
        <div>
          <h1>Stock Value Assistant</h1>
          <p>상한가 및 거래량 급등 종목 실시간 분석</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>분석 날짜:</span>
            <input
              type="date"
              value={includeDate}
              onChange={(e) => setIncludeDate(e.target.value)} // 💡 날짜를 바꾸면 훅이 자동으로 해당 날짜 데이터를 요청!
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
            fontWeight: '600'
          }}>
            <input
              type="checkbox"
              checked={includeAI}
              onChange={(e) => setIncludeAI(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            AI 리포트 생성 (토큰 소모)
          </label>
          <button className="refresh-button" onClick={handleRefresh} disabled={loading}>
            {loading ? '분석 중...' : '시장 데이터 분석 실행'}
          </button>
        </div>
      </header>

      {errorMsg && (
        <div style={{ color: 'var(--danger)', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>데이터를 불러오는 중입니다...</p>
        </div>
      ) : data.length > 0 ? (
        <div className="analysis-grid">
          {data.map((stock, index) => (
            <div
              key={index}
              className="stock-card"
              onClick={() => navigate(`/stock/${stock.ticker}`, { state: { stock, analysisDate: includeDate } })}
              style={{ cursor: 'pointer' }}
            >
              <div className="stock-header">
                <span className="stock-name">{stock.name}</span>
                <div style={{ textAlign: 'right' }}>
                  <div className="stock-price">{formatPrice(stock.close)}</div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: stock.change_rate > 0 ? 'var(--danger)' : 'var(--accent-blue)'
                  }}>
                    {formatPercent(stock.change_rate)}
                  </div>
                </div>
              </div>
              <div className="reason-badge">{stock.reason}</div>
              <div className="investment-preview">
                기업 리서치 리포트 보기 →
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>아직 분석된 데이터가 없습니다. 버튼을 눌러 분석을 시작하세요.</p>
        </div>
      )}
    </div>
  );
};

export default Main;
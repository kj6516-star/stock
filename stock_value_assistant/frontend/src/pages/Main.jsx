import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMarketStocks } from '../hooks/useStockQueries';

const Main = () => {
  const navigate = useNavigate();
  const [includeDate, setIncludeDate] = useState(new Date().toISOString().split('T')[0]);

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

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="dashboard-container">
      {/* 헤더 영역 */}
      <header className="header" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        alignItems: 'stretch'
      }}>
        <div className="header-titles">
          <h1>Stock Value Assistant</h1>
          <p>상한가 및 거래량 급등 종목 실시간 분석</p>
        </div>

        {/* 컨트롤 영역 (날짜 선택기 및 분석 실행 버튼) */}
        <div className="header-controls" style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>분석 날짜:</span>
            <input
              type="date"
              value={includeDate}
              onChange={(e) => setIncludeDate(e.target.value)}
              style={{
                padding: '8px',
                borderRadius: '8px',
                border: '1px solid #ddd',
                fontSize: '0.9rem',
                outline: 'none',
                backgroundColor: 'var(--bg-input, #fff)'
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1', justifyContent: 'flex-end' }}>
            <button 
              className="refresh-button" 
              onClick={handleRefresh} 
              disabled={loading}
              style={{
                flex: '1 1 auto',
                maxWidth: '200px',
                minWidth: '130px'
              }}
            >
              {loading ? '분석 중...' : '시장 데이터 분석 실행'}
            </button>
          </div>
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
        <div className="analysis-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '16px'
        }}>
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
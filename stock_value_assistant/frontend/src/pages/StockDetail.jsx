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
    <div className="dashboard-container" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f1f5f9', minHeight: '100vh' }}>
      {/* 헤더 영역 */}
      <header className="header" style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        alignItems: 'stretch',
        backgroundColor: '#ffffff',
        padding: '1.5rem',
        borderRadius: '20px',
        marginBottom: '2rem',
        border: '1px solid #cbd5e1',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)'
      }}>
        <div className="header-titles">
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', fontWeight: '900', color: '#0f172a', margin: '0 0 4px 0' }}>
            Stock Value Assistant
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            상한가 및 거래량 급등 종목 실시간 분석
          </p>
        </div>

        {/* 컨트롤 영역 */}
        <div className="header-controls" style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 220px' }}>
            <span style={{ fontSize: '0.9rem', color: '#475569', fontWeight: '700', whiteSpace: 'nowrap' }}>분석 날짜:</span>
            <input
              type="date"
              value={includeDate}
              onChange={(e) => setIncludeDate(e.target.value)}
              style={{
                flex: '1',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.9rem',
                outline: 'none',
                backgroundColor: '#fff'
              }}
            />
          </div>

          <div style={{ display: 'flex', flex: '1 1 220px' }}>
            <button 
              className="refresh-button" 
              onClick={handleRefresh} 
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '10px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                fontWeight: '700',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {loading ? '분석 중...' : '시장 데이터 분석 실행'}
            </button>
          </div>
        </div>
      </header>

      {errorMsg && (
        <div style={{ color: '#dc2626', textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="loading-container" style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner"></div>
          <p style={{ color: '#64748b', fontWeight: '600', marginTop: '1rem' }}>데이터를 불러오는 중입니다...</p>
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
              style={{ 
                cursor: 'pointer', 
                /* 💡 눈이 편안하도록 부드러운 아이보리/미색 계열 (#f8fafc)로 확실하게 변경 */
                backgroundColor: '#b91a1a', 
                padding: '1.5rem', 
                borderRadius: '16px', 
                border: '1px solid #cbd5e1', 
                boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
            >
              <div className="stock-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <span className="stock-name" style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>{stock.name}</span>
                <div style={{ textAlign: 'right' }}>
                  <div className="stock-price" style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>{formatPrice(stock.close)}</div>
                  <div style={{
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    color: stock.change_rate > 0 ? '#ef4444' : '#2563eb',
                    marginTop: '2px'
                  }}>
                    {formatPercent(stock.change_rate)}
                  </div>
                </div>
              </div>

              {/* 사유 뱃지 배경색도 명확한 연회색(#f1f5f9)으로 지정 */}
              <div className="reason-badge" style={{ fontSize: '0.85rem', color: '#334155', fontWeight: '600', marginBottom: '1rem', backgroundColor: '#f1f5f9', padding: '6px 10px', borderRadius: '8px', display: 'inline-block' }}>
                {stock.reason}
              </div>

              <div className="investment-preview" style={{ fontSize: '0.85rem', fontWeight: '700', color: '#2563eb' }}>
                기업 리서치 리포트 보기 →
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state" style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', background: '#ffffff', borderRadius: '20px', border: '1px solid #cbd5e1' }}>
          <p>아직 분석된 데이터가 없습니다. 버튼을 눌러 분석을 시작하세요.</p>
        </div>
      )}
    </div>
  );
};

export default Main;
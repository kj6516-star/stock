import React, { useState, useEffect } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2, Users, Wallet, FileText, Info, PieChart, Layers, Sparkles } from 'lucide-react';
// 작성하신 커스텀 훅을 import 합니다. (경로에 맞게 수정해주세요)
import { useStockDetail } from '../hooks/useStockQueries'; 

const StockDetail = () => {
  const { ticker } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const initialStock = location.state?.stock || {};
  const analysisDate = location.state?.analysisDate;

  // 1. TanStack Query 커스텀 훅 사용 (로딩, 에러, 데이터 자동 관리)
  const { data: apiResponse, isLoading: loadingDetail, error } = useStockDetail(ticker);

  const [stock, setStock] = useState(initialStock);
  
  // 탭 및 보기 모드 상태
  const [viewMode, setViewMode] = useState('annual'); // 'annual': 연간, 'quarterly': 분기
  const [activeFsTab, setActiveFsTab] = useState('CFS'); // 'CFS': 연결, 'OFS': 개별(별도)
  const [showFullFinancials, setShowFullFinancials] = useState(false); // 전체 계정 보기 토글

  // 2. API 데이터가 들어오거나 변경될 때 stock 상태를 가공 및 동기화
  useEffect(() => {
    if (!apiResponse) return;
    
    console.log("API 전체 응답 데이터:", apiResponse);
    
    const dart = apiResponse?.dart_info || {};
    const company = dart.company_info || {};

    // 1. 기업 기본 정보 매핑
    const mappedCompanyInfo = {
      ceo: company.ceo_nm || company.ceo || '-',
      est_dt: company.est_dt || '-',
      industry: company.induty_code || company.industry || '-',
      url: company.hm_url || company.url || '-'
    };

    // 2. 연간 재무 데이터 파싱
    let annualPerformance = {};
    const annualObj = dart.financials?.annual || dart.삼개년실적;
    if (annualObj && typeof annualObj === 'object') {
      Object.keys(annualObj).forEach(yearKey => {
        const items = annualObj[yearKey];
        if (Array.isArray(items)) {
          annualPerformance[yearKey] = items;
        }
      });
    }

    // 3. 분기 재무 데이터 파싱
    let quarterlyPerformance = {};
    const quarterlyObj = dart.financials?.quarterly || dart.분기실적;
    if (quarterlyObj && typeof quarterlyObj === 'object') {
      Object.keys(quarterlyObj).forEach(qKey => {
        const items = quarterlyObj[qKey];
        if (Array.isArray(items)) {
          quarterlyPerformance[qKey] = items;
        }
      });
    }

    // 4. 공시, 지분, 인력 정보 파싱
    const disclosures = dart.최근공시 || dart.disclosures || dart.reports || [];
    const shares = dart.지분구조 || dart.shareholders || dart.major_shareholders || [];
    const employeeDividend = dart.인력및배당 || dart.employee_dividend || {};

    setStock(prev => ({
      ...prev,
      ...dart,
      company_info: mappedCompanyInfo,
      삼개년실적맵: annualPerformance,
      분기실적맵: quarterlyPerformance,
      최근공시: disclosures,
      지분구조: shares,
      인력및배당: employeeDividend,
      
      종목명: prev.name || prev.종목명 || company.corp_name || ticker,
      현재가: prev.close || dart.close || prev.현재가 || 0,
      등락률: prev.change_rate ?? dart.change_rate ?? prev.등락률 ?? 0,
      시가총액: prev.market_cap || dart.market_cap || prev.시가총액 || 0,
      PER: prev.per ?? dart.per ?? prev.PER ?? 'N/A',
      PBR: prev.pbr ?? dart.pbr ?? prev.PBR ?? '0.0',
      EPS: prev.eps ?? dart.eps ?? prev.EPS ?? 'N/A',
      BPS: prev.bps ?? dart.bps ?? prev.BPS ?? 'N/A',
      배당수익률: prev.dividend_yield || dart.dividend_yield || prev.배당수익률 || 0,
      거래량: prev.volume || dart.volume || prev.거래량 || 0
    }));
  }, [apiResponse, ticker]);

  // 금액 포맷팅 함수 (조/억 단위)
  const formatAmount = (val) => {
    if (val === undefined || val === null) return '-';
    let num = Number(String(val).replace(/,/g, ''));
    if (isNaN(num)) return '-';
    if (num === 0) return '0원';

    const isNegative = num < 0;
    const absNum = Math.abs(num);
    const sign = isNegative ? '-' : '';

    if (absNum >= 1000000000000) {
      const jo = Math.floor(absNum / 1000000000000);
      const eok = Math.floor((absNum % 1000000000000) / 100000000);
      return `${sign}${jo}조${eok > 0 ? ` ${eok.toLocaleString()}억` : ''}`;
    }
    if (absNum >= 100000000) {
      return `${sign}${Math.floor(absNum / 100000000).toLocaleString()}억`;
    }
    return `${sign}${absNum.toLocaleString()}원`;
  };

  const formatPrice = (val) => new Intl.NumberFormat('ko-KR').format(val || 0);

  const companyInfo = stock.company_info || {};
  const stockName = stock.종목명 || ticker; 
  const currentPrice = stock.현재가 || 0;
  const changeRate = stock.등락률 || 0;
  const marketType = stock.market || 'KOSPI';
  
  const annualMap = stock['삼개년실적맵'] || {};
  const quarterlyMap = stock['분기실적맵'] || {};
  const currentMap = viewMode === 'annual' ? annualMap : quarterlyMap;

  const disclosuresList = stock['최근공시'] || [];
  const sharesList = stock['지분구조'] || [];
  const employeeData = stock['인력및배당'] || {};

  // 요약 트렌드 데이터 추출
  const getSummaryList = () => {
    const keys = Object.keys(currentMap).sort();
    return keys.map(key => {
      const items = currentMap[key];
      if (!Array.isArray(items)) return null;

      const findVal = (names) => {
        const found = items.find(i => {
          const fsDiv = i.fs_div || i.SJ_DIV || '';
          const acName = i.account_nm || i.account_name || i.계정과목명 || '';
          return (!fsDiv || fsDiv === activeFsTab || fsDiv.includes(activeFsTab)) && names.includes(acName);
        });
        if (!found) return 0;
        const rawVal = found.thstrm_amount ?? found.thstrm_add_amount ?? found.amount ?? found.cur_amount ?? found.val ?? 0;
        return parseFloat(String(rawVal).replace(/,/g, '')) || 0;
      };

      return {
        period: key,
        revenue: findVal(['매출액', '수익(매출액)']),
        op_profit: findVal(['영업이익', '영업이익(손실)']),
        net_income: findVal(['당기순이익', '당기순이익(손실)']),
        equity: findVal(['자본총계']),
        liabilities: findVal(['부채총계'])
      };
    }).filter(Boolean);
  };

  const summaryList = getSummaryList();

  const getFullAccountListForPeriod = (periodKey) => {
    const items = currentMap[periodKey];
    if (!Array.isArray(items)) return [];
    return items.filter(i => {
      const fsDiv = i.fs_div || i.SJ_DIV || '';
      return !fsDiv || fsDiv === activeFsTab || fsDiv.includes(activeFsTab);
    });
  };

  const getAccountAmount = (acc) => {
    const rawVal = acc.thstrm_amount ?? acc.thstrm_add_amount ?? acc.amount ?? acc.cur_amount ?? acc.val ?? acc.당기금액 ?? 0;
    return formatAmount(rawVal);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto', backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      
      {/* 상단 네비게이션 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white', border: '1px solid #e2e8f0',
            padding: '8px 16px', borderRadius: '12px', color: '#64748b', cursor: 'pointer', fontWeight: '600'
          }}
        >
          <ArrowLeft size={18} /> 목록으로
        </button>
        {analysisDate && (
          <div style={{ color: '#64748b', fontWeight: '700', fontSize: '0.9rem', backgroundColor: 'white', padding: '8px 16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            기준일: {analysisDate}
          </div>
        )}
      </div>

      {/* 상단 헤더 */}
      <header style={{ marginBottom: '2rem', backgroundColor: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            {/* 뉴스 모아보기 버튼 */}
            <button
              onClick={() => navigate(`/news/${encodeURIComponent(stockName)}`, { 
                state: { stockName: stockName, ticker: ticker, analysisDate: analysisDate } 
              })}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                padding: '10px 18px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer',
                marginBottom: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}
            >
              📰 {stockName} 관련 뉴스 모아보기
            </button>

            {/* ✨ 실시간 AI 분석 리포트 버튼 추가 */}
            <button
  onClick={() => navigate(`/ai/${ticker}`, { 
    state: { 
      ticker: ticker, 
      corp_code: stock.corp_code || stock.corpCode || '', 
      stock_name: stockName,
      analysisDate: analysisDate // 👈 이 부분을 추가해주세요!
    } 
  })}
  style={{
    display: 'flex', alignItems: 'center', gap: '6px',
    backgroundColor: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe',
    padding: '10px 18px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer',
    marginBottom: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
  }}
>
  <Sparkles size={16} /> ✨ 실시간 AI 분석 리포트 보기
</button>

            <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '800' }}>
                {marketType}
              </span>
              <span style={{ color: '#94a3b8', fontSize: '1rem', letterSpacing: '1px' }}>{ticker}</span>
            </div>
            <h1 style={{ fontSize: '3rem', fontWeight: '900', margin: 0, color: '#0f172a', letterSpacing: '-1px' }}>{stockName}</h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: '#0f172a' }}>{formatPrice(currentPrice)}원</div>
            <div style={{
              color: 'white',
              background: changeRate > 0 ? '#ef4444' : '#3b82f6',
              padding: '6px 14px',
              borderRadius: '10px',
              display: 'inline-block',
              fontWeight: '800',
              fontSize: '1.1rem',
              marginTop: '8px'
            }}>
              {changeRate > 0 ? '▲' : '▼'} {changeRate}%
            </div>
          </div>
        </div>

        {/* 기업 기본 정보 요약 바 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', padding: '1.5rem', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
          {[
            { label: '대표자', value: companyInfo.ceo, icon: <Users size={16} /> },
            { label: '설립일', value: companyInfo.est_dt, icon: <Info size={16} /> },
            { label: '업종코드', value: companyInfo.industry, icon: <PieChart size={16} /> },
            { label: '홈페이지', value: companyInfo.url, isLink: true, icon: <FileText size={16} /> }
          ].map((item, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {item.icon} {item.label}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#334155', wordBreak: 'break-all' }}>
                {item.isLink && item.value && item.value !== '-' ? (
                  <a href={item.value.startsWith('http') ? item.value : `http://${item.value}`} target="_blank" rel="noreferrer" style={{ color: '#2563eb', textDecoration: 'none' }}>
                    {item.value}
                  </a>
                ) : (item.value || '-')}
              </div>
            </div>
          ))}
        </div>
      </header>

      {loadingDetail && (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#2563eb', fontWeight: '600', marginBottom: '1rem' }}>
          🔄 기업의 모든 상세 정보를 불러오는 중입니다...
        </div>
      )}

      {error && (
        <div style={{ textAlign: 'center', padding: '1rem', color: '#ef4444', fontWeight: '600', marginBottom: '1rem' }}>
          ⚠️ 상세 정보를 불러오는 중 오류가 발생했습니다.
        </div>
      )}

      {/* 본문 콘텐츠 레이아웃 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2rem' }}>
        
        {/* 왼쪽 섹션: 재무 트렌드 및 공시 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <section style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.5rem', fontWeight: '800', margin: 0, color: '#0f172a' }}>
                📊 실적 트렌드 요약
              </h2>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                  <button
                    onClick={() => setViewMode('annual')}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                      background: viewMode === 'annual' ? '#2563eb' : 'transparent',
                      color: viewMode === 'annual' ? 'white' : '#64748b'
                    }}
                  >
                    연간
                  </button>
                  <button
                    onClick={() => setViewMode('quarterly')}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                      background: viewMode === 'quarterly' ? '#2563eb' : 'transparent',
                      color: viewMode === 'quarterly' ? 'white' : '#64748b'
                    }}
                  >
                    분기
                  </button>
                </div>

                <div style={{ display: 'flex', background: '#f1f5f9', padding: '4px', borderRadius: '12px', gap: '4px' }}>
                  <button
                    onClick={() => setActiveFsTab('CFS')}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                      background: activeFsTab === 'CFS' ? 'white' : 'transparent',
                      color: activeFsTab === 'CFS' ? '#2563eb' : '#64748b',
                      boxShadow: activeFsTab === 'CFS' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    연결(CFS)
                  </button>
                  <button
                    onClick={() => setActiveFsTab('OFS')}
                    style={{
                      padding: '6px 12px', borderRadius: '8px', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer',
                      background: activeFsTab === 'OFS' ? 'white' : 'transparent',
                      color: activeFsTab === 'OFS' ? '#2563eb' : '#64748b',
                      boxShadow: activeFsTab === 'OFS' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                    }}
                  >
                    개별(OFS)
                  </button>
                </div>
              </div>
            </div>

            <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
              {summaryList.length > 0 ? (
                <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0', textAlign: 'right' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '16px', textAlign: 'left', borderBottom: '2px solid #f1f5f9', color: '#64748b', fontWeight: '600' }}>항목</th>
                      {summaryList.slice().reverse().map(f => (
                        <th key={f.period} style={{ padding: '16px', borderBottom: '2px solid #f1f5f9', color: '#0f172a', fontWeight: '800' }}>{f.period}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: '매출액', key: 'revenue' },
                      { label: '영업이익', key: 'op_profit' },
                      { label: '당기순이익', key: 'net_income' },
                      { label: '자본총계', key: 'equity' },
                      { label: '부채총계', key: 'liabilities' }
                    ].map((item, idx) => (
                      <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                        <td style={{ padding: '16px', textAlign: 'left', fontWeight: '700', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>{item.label}</td>
                        {summaryList.slice().reverse().map(f => (
                          <td key={f.period} style={{ padding: '16px', borderBottom: '1px solid #f1f5f9', fontWeight: '600', color: '#1e293b' }}>
                            {formatAmount(f[item.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                    
                    <tr style={{ backgroundColor: '#fff7ed' }}>
                      <td style={{ padding: '16px', textAlign: 'left', fontWeight: '800', color: '#c2410c' }}>영업이익률 (%)</td>
                      {summaryList.slice().reverse().map(f => {
                        const margin = (f.revenue && f.revenue !== 0) ? (f.op_profit / f.revenue * 100).toFixed(2) : '-';
                        return (
                          <td key={f.period} style={{ padding: '16px', fontWeight: '800', color: margin < 0 ? '#ef4444' : '#c2410c' }}>
                            {margin !== '-' ? margin + '%' : '-'}
                          </td>
                        );
                      })}
                    </tr>

                    <tr style={{ backgroundColor: '#eff6ff' }}>
                      <td style={{ padding: '16px', textAlign: 'left', fontWeight: '800', color: '#1d4ed8' }}>부채비율 (%)</td>
                      {summaryList.slice().reverse().map(f => (
                        <td key={f.period} style={{ padding: '16px', fontWeight: '800', color: (f.liabilities / f.equity * 100) > 200 ? '#ef4444' : '#1d4ed8' }}>
                          {f.equity ? (f.liabilities / f.equity * 100).toFixed(1) + '%' : '-'}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontWeight: '600' }}>
                  표시할 재무 데이터가 없습니다. ({viewMode === 'quarterly' ? '분기 데이터 없음' : '연간 데이터 없음'})
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', textAlign: 'center' }}>
              <button
                onClick={() => setShowFullFinancials(!showFullFinancials)}
                style={{
                  background: '#f8fafc', border: '1px solid #cbd5e1', padding: '10px 20px', borderRadius: '12px',
                  color: '#334155', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}
              >
                <Layers size={16} color="#2563eb" />
                {showFullFinancials ? '▲ 상세 계정 전체 보기 닫기' : '▼ DART 원본 상세 계정 전체 보기 (모든 항목 펼치기)'}
              </button>
            </div>

            {showFullFinancials && (
              <div style={{ marginTop: '1.5rem', backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <h4 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', marginBottom: '1rem' }}>
                  📋 전체 계정과목 상세 내역 ({viewMode === 'annual' ? '연간' : '분기'}) / ({activeFsTab === 'CFS' ? '연결' : '개별'})
                </h4>
                {Object.keys(currentMap).sort().reverse().map(periodKey => {
                  const fullItems = getFullAccountListForPeriod(periodKey);
                  return (
                    <div key={periodKey} style={{ marginBottom: '1.5rem' }}>
                      <div style={{ fontWeight: '800', color: '#2563eb', marginBottom: '8px', fontSize: '1rem' }}>[{periodKey}]</div>
                      {fullItems.length > 0 ? (
                        <div style={{ maxHeight: '250px', overflowY: 'auto', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '8px' }}>
                          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
                            <tbody>
                              {fullItems.map((acc, idx) => {
                                const accountName = acc.account_nm || acc.account_name || acc.계정과목명 || '기타계정';
                                const formattedVal = getAccountAmount(acc);
                                return (
                                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '6px 8px', color: '#475569', fontWeight: '600' }}>{accountName}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: '700', color: '#1e293b' }}>
                                      {formattedVal}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>해당 기간 데이터가 없습니다.</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* 최근 주요 공시 */}
          <section style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={22} color="#2563eb" /> 최근 주요 공시
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {disclosuresList.length > 0 ? disclosuresList.map((d, i) => (
                <div key={i} style={{ padding: '12px', borderLeft: '4px solid #3b82f6', background: '#f8fafc', borderRadius: '4px 12px 12px 4px' }}>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b', marginBottom: '4px', lineHeight: '1.4' }}>{d.title || d.report_nm}</div>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{d.date || d.rcept_dt}</div>
                </div>
              )) : <div style={{ color: '#94a3b8', textAlign: 'center', padding: '1rem' }}>최근 공시 없음</div>}
            </div>
          </section>
        </div>

        {/* 오른쪽 섹션: 마켓 지표, 주주, 내성 지표 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <section style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart2 size={22} color="#2563eb" /> 마켓 핵심 지표
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
              {[
                { label: '시가총액', value: formatAmount(stock.시가총액), color: '#0f172a' },
                { label: 'PER / PBR', value: `${stock.PER || 'N/A'} / ${stock.PBR || '0.0'}`, color: '#2563eb' },
                { label: 'EPS (주당순이익)', value: stock.EPS !== 'N/A' ? `${Number(stock.EPS).toLocaleString()}원` : 'N/A', color: '#0f172a' },
                { label: 'BPS (주당순자산)', value: stock.BPS !== 'N/A' ? `${Number(stock.BPS).toLocaleString()}원` : 'N/A', color: '#0f172a' },
                { label: '배당수익률', value: stock.배당수익률 ? stock.배당수익률 + '%' : '-', color: '#059669' },
                { label: '거래량', value: (stock.거래량 || 0).toLocaleString() + ' 주', color: '#0f172a' }
              ].map((item, idx, arr) => (
                <div key={idx} style={{ borderBottom: idx < arr.length - 1 ? '1px solid #f1f5f9' : 'none', paddingBottom: idx < arr.length - 1 ? '1rem' : '0' }}>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontWeight: '600', marginBottom: '4px' }}>{item.label}</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
          </section>

          <section style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1.5rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={22} color="#2563eb" /> 주요 주주 현황 (대량보유)
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {sharesList.length > 0 ? sharesList.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                  <div>
                    <div style={{ fontWeight: '700', color: '#334155', fontSize: '1rem' }}>{s.repror || s.name || s.nm || '기타주주'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'pre-line', marginTop: '2px' }}>
                      {s.report_tp ? `유형: ${s.report_tp}` : ''} {s.rcept_dt ? `(공시일: ${s.rcept_dt})` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '800', color: '#2563eb', fontSize: '1.1rem' }}>
                      {s.stkrt ? `${s.stkrt}%` : (s.rate ? `${s.rate}%` : '-')}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {s.stkqy ? `${s.stkqy}주` : ''}
                    </div>
                  </div>
                </div>
              )) : <div style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>지분 정보 없음</div>}
            </div>
          </section>

          <section style={{ backgroundColor: '#1e293b', color: 'white', padding: '2rem', borderRadius: '24px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Wallet size={20} color="#60a5fa" /> 기업 내성 지표
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '4px' }}>인당 평균 급여</div>
                <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>
                  {formatAmount(employeeData.avg_salary || employeeData.sal)}
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '4px' }}>평균 근속연수</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800' }}>{employeeData.avg_service || employeeData.cox || '-'} 년</div>
                </div>
                <div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginBottom: '4px' }}>주당 배당금</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#4ade80' }}>
                    {formatAmount(employeeData.div_per_share || employeeData.dps)}
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
};

export default StockDetail;
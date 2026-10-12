from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from .session import Base

class Stock(Base):
    __tablename__ = "stocks"

    ticker = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    market = Column(String)  # KOSPI/KOSDAQ
    market_cap = Column(Float)
    major_shareholders = Column(String)
    summary = Column(String)  # AI 생성 리포트 (Markdown)
    investment_points = Column(String)
    chart_image_path = Column(String)

    financials = relationship("Financial", back_populates="stock")
    prices = relationship("DailyPrice", back_populates="stock")

class Financial(Base):
    __tablename__ = "financials"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, ForeignKey("stocks.ticker"))
    year = Column(Integer)
    revenue = Column(Float)
    operating_profit = Column(Float)
    net_income = Column(Float)
    per = Column(Float)
    pbr = Column(Float)
    dividend_yield = Column(Float)

    stock = relationship("Stock", back_populates="financials")

class DailyPrice(Base):
    __tablename__ = "daily_prices"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, ForeignKey("stocks.ticker"))
    date = Column(Date)
    close = Column(Float)
    volume = Column(Integer)
    change_rate = Column(Float)

    stock = relationship("Stock", back_populates="prices")

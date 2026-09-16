import axiosInstance from "./axios-instance";

export interface Investment {
  id: string;
  portfolioId: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  currentValue: number;
  totalInvested: number;
  pnl: number;
  pnlPercentage: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Portfolio {
  id: string;
  userId: string;
  currency: string;
  investments: Investment[];
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  portfolioId: string;
  investmentId: string;
  type: "BUY" | "SELL";
  quantity: number;
  pricePerShare: number;
  totalAmount: number;
  transactionDate: string;
  createdAt: string;
}

// Portfolio APIs
export async function createPortfolio(currency: string = "USD") {
  const response = await axiosInstance.post<Portfolio>("/portfolio", {
    currency,
  });
  return response.data;
}

export async function getCurrentPortfolio() {
  const response = await axiosInstance.get<Portfolio>("/portfolio/current");
  return response.data;
}

export async function getAllPortfolios() {
  const response = await axiosInstance.get<Portfolio[]>("/portfolio");
  return response.data;
}

export async function getPortfolio(portfolioId: string) {
  const response = await axiosInstance.get<Portfolio>(`/portfolio/${portfolioId}`);
  return response.data;
}

export async function deletePortfolio(portfolioId: string) {
  await axiosInstance.delete(`/portfolio/${portfolioId}`);
}

// Investment APIs
export async function createInvestment(
  portfolioId: string,
  data: {
    symbol: string;
    name: string;
    shares: number;
    avgCost: number;
    color?: string;
  }
) {
  const response = await axiosInstance.post<Investment>(
    `/portfolio/${portfolioId}/investments`,
    data
  );
  return response.data;
}

export async function getPortfolioInvestments(portfolioId: string) {
  const response = await axiosInstance.get<Investment[]>(
    `/portfolio/${portfolioId}/investments`
  );
  return response.data;
}

export async function getInvestment(portfolioId: string, investmentId: string) {
  const response = await axiosInstance.get<Investment>(
    `/portfolio/${portfolioId}/investments/${investmentId}`
  );
  return response.data;
}

export async function updateInvestment(
  portfolioId: string,
  investmentId: string,
  data: Partial<{
    symbol: string;
    name: string;
    shares: number;
    avgCost: number;
    color: string;
  }>
) {
  const response = await axiosInstance.put<Investment>(
    `/portfolio/${portfolioId}/investments/${investmentId}`,
    data
  );
  return response.data;
}

export async function updateInvestmentValue(
  portfolioId: string,
  investmentId: string,
  currentValue: number
) {
  const response = await axiosInstance.put<Investment>(
    `/portfolio/${portfolioId}/investments/${investmentId}/value`,
    { currentValue }
  );
  return response.data;
}

export async function deleteInvestment(portfolioId: string, investmentId: string) {
  await axiosInstance.delete(
    `/portfolio/${portfolioId}/investments/${investmentId}`
  );
}

// Transaction APIs
export async function addTransaction(
  portfolioId: string,
  data: {
    investmentId: string;
    type: "BUY" | "SELL";
    quantity: number;
    pricePerShare: number;
    transactionDate?: string;
  }
) {
  const response = await axiosInstance.post<Transaction>(
    `/portfolio/${portfolioId}/investments/transactions`,
    data
  );
  return response.data;
}

export async function getPortfolioTransactions(portfolioId: string) {
  const response = await axiosInstance.get<Transaction[]>(
    `/portfolio/${portfolioId}/investments/transactions/list`
  );
  return response.data;
}

export async function deleteTransaction(portfolioId: string, transactionId: string) {
  await axiosInstance.delete(
    `/portfolio/${portfolioId}/investments/transactions/${transactionId}`
  );
}

import { lazy, Suspense } from "react";
import Layout from "./Layout.jsx";
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    Dashboard: lazy(() => import("./Dashboard")),
    Upload: lazy(() => import("./Upload")),
    Suppliers: lazy(() => import("./Suppliers")),
    RFQs: lazy(() => import("./RFQs")),
    RFQDetail: lazy(() => import("./RFQDetail")),
    Inventory: lazy(() => import("./Inventory")),
    PurchaseOrders: lazy(() => import("./PurchaseOrders")),
    Invoices: lazy(() => import("./Invoices")),
    GoodsReceipt: lazy(() => import("./GoodsReceipt")),
    Contracts: lazy(() => import("./Contracts")),
    AgentChat: lazy(() => import("./AgentChat")),
    Departments: lazy(() => import("./Departments")),
    Budgets: lazy(() => import("./Budgets")),
    DataCleanup: lazy(() => import("./DataCleanup")),
    ExecutiveReport: lazy(() => import("./ExecutiveReport")),
};

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || Object.keys(PAGES)[0];
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    const {
        Dashboard,
        Upload,
        Suppliers,
        RFQs,
        RFQDetail,
        Inventory,
        PurchaseOrders,
        Invoices,
        GoodsReceipt,
        Contracts,
        AgentChat,
        Departments,
        Budgets,
        DataCleanup,
        ExecutiveReport,
    } = PAGES;
    
    return (
        <Layout currentPageName={currentPage}>
            <Suspense fallback={<PageLoading />}>
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/Dashboard" element={<Dashboard />} />
                    <Route path="/Upload" element={<Upload />} />
                    <Route path="/Suppliers" element={<Suppliers />} />
                    <Route path="/RFQs" element={<RFQs />} />
                    <Route path="/RFQDetail" element={<RFQDetail />} />
                    <Route path="/Inventory" element={<Inventory />} />
                    <Route path="/PurchaseOrders" element={<PurchaseOrders />} />
                    <Route path="/Invoices" element={<Invoices />} />
                    <Route path="/GoodsReceipt" element={<GoodsReceipt />} />
                    <Route path="/Contracts" element={<Contracts />} />
                    <Route path="/AgentChat" element={<AgentChat />} />
                    <Route path="/Departments" element={<Departments />} />
                    <Route path="/Budgets" element={<Budgets />} />
                    <Route path="/DataCleanup" element={<DataCleanup />} />
                    <Route path="/ExecutiveReport" element={<ExecutiveReport />} />
                </Routes>
            </Suspense>
        </Layout>
    );
}

function PageLoading() {
    return (
        <div className="flex min-h-[50vh] items-center justify-center text-sm text-[var(--theme-text-muted)]">
            Loading...
        </div>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}

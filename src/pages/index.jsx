import Layout from "./Layout.jsx";

import Dashboard from "./Dashboard";

import Upload from "./Upload";

import Suppliers from "./Suppliers";

import RFQs from "./RFQs";

import RFQDetail from "./RFQDetail";

import Inventory from "./Inventory";

import PurchaseOrders from "./PurchaseOrders";

import Invoices from "./Invoices";

import GoodsReceipt from "./GoodsReceipt";

import Contracts from "./Contracts";

import AgentChat from "./AgentChat";

import Departments from "./Departments";

import Budgets from "./Budgets";

import DataCleanup from "./DataCleanup";

import ExecutiveReport from "./ExecutiveReport";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

const PAGES = {
    
    Dashboard: Dashboard,
    
    Upload: Upload,
    
    Suppliers: Suppliers,
    
    RFQs: RFQs,
    
    RFQDetail: RFQDetail,
    
    Inventory: Inventory,
    
    PurchaseOrders: PurchaseOrders,
    
    Invoices: Invoices,
    
    GoodsReceipt: GoodsReceipt,
    
    Contracts: Contracts,
    
    AgentChat: AgentChat,
    
    Departments: Departments,
    
    Budgets: Budgets,
    
    DataCleanup: DataCleanup,
    
    ExecutiveReport: ExecutiveReport,
    
}

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
    
    return (
        <Layout currentPageName={currentPage}>
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
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}
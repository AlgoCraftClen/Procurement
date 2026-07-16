

import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard,
  Building2,
  FileText,
  Package,
  FileCheck2,
  Upload,
  Settings,
  Bell,
  Search,
  Receipt, // Added Receipt icon
  Loader2,
  Coins, // Added for Budgeting
  Users // Added for Departments
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RFQ } from "@/api/entities";
import { RawMaterial } from "@/api/entities";
import { User } from "@/api/entities";
import { sendWelcomeEmail } from "@/api/functions";
import NotificationBell from "../components/shared/NotificationBell";
import UserSettings from "../components/shared/UserSettings";
import FloatingAIAgent from "../components/shared/FloatingAIAgent";
import InvitationCodeEntry from "../components/shared/InvitationCodeEntry";

const navigationItems = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Suppliers", url: createPageUrl("Suppliers"), icon: Building2 },
  { title: "RFQs", url: createPageUrl("RFQs"), icon: FileText },
  { title: "Purchase Orders", url: createPageUrl("PurchaseOrders"), icon: FileCheck2 },
  { title: "Invoices", url: createPageUrl("Invoices"), icon: Receipt }, // Added Invoices
  { title: "Goods Receipt", url: createPageUrl("GoodsReceipt"), icon: Package }, // Added Goods Receipt
  { title: "Budgets", url: createPageUrl("Budgets"), icon: Coins }, // Added Budgets
  { title: "Departments", url: createPageUrl("Departments"), icon: Users }, // Added Departments
  { title: "Contracts", url: createPageUrl("Contracts"), icon: FileText }, // Added Contracts
  { title: "Inventory", url: createPageUrl("Inventory"), icon: Package },
  { title: "Upload Documents", url: createPageUrl("Upload"), icon: Upload }
];


export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [quickStats, setQuickStats] = useState({
    activeRFQs: 0,
    lowStockItems: 0,
    overdueFollowups: 0
  });
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [headerSearch, setHeaderSearch] = useState("");

  // Force light mode always - override system preferences
  useEffect(() => {
    // Remove dark mode class and force light theme
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';

    // Add CSS to override system dark mode preferences
    const style = document.createElement('style');
    style.textContent = `
      :root {
        color-scheme: light !important;
      }

      * {
        color-scheme: light !important;
      }

      @media (prefers-color-scheme: dark) {
        :root {
          color-scheme: light !important;
        }
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Effect for fetching user and sending welcome email
  useEffect(() => {
    const initializeUser = async () => {
      setLoadingUser(true);
      try {
        const currentUser = await User.me();
        setUser(currentUser);
        setLoadingUser(false);

        // Check if welcome email needs to be sent
        if (currentUser && currentUser.has_access && !currentUser.welcome_email_sent) {
          console.log("Sending welcome email to new user...");
          await sendWelcomeEmail();
          // We don't need to update the user object here,
          // as the backend function handles setting the flag.
          // The flag will be correct on the next page load.
        }
      } catch (error) {
        // This can happen if the user is not logged in, which is fine for public pages.
        console.log("User not logged in or failed to fetch user.");
        setUser(null);
        setLoadingUser(false);
      }
    };
    initializeUser();
  }, []); // Runs once on initial layout load

  const recheckUserAccess = async () => {
    setLoadingUser(true);
    try {
      const updatedUser = await User.me();
      setUser(updatedUser);
    } catch (error) {
      console.error("Failed to re-fetch user after access granted:", error);
      setUser(null);
    } finally {
      setLoadingUser(false);
    }
  };

  useEffect(() => {
    const fetchQuickStats = async () => {
      try {
        // Optimized: Only fetch what's needed for counts
        const [sentRFQs, allRawMaterials] = await Promise.all([
          RFQ.filter({ status: 'sent' }), // Only fetch sent RFQs
          RawMaterial.list() // Need full list to calculate low stock
        ]);

        // Calculate overdue RFQs
        const today = new Date();
        const overdue = (sentRFQs || []).filter((rfq) =>
          rfq.next_followup_date && new Date(rfq.next_followup_date) < today
        ).length;

        // Calculate low stock items
        const lowStock = (allRawMaterials || []).filter((item) =>
          item.current_quantity <= item.minimum_stock
        ).length;

        setQuickStats({
          activeRFQs: (sentRFQs || []).length,
          lowStockItems: lowStock,
          overdueFollowups: overdue
        });
      } catch (error) {
        console.error("Failed to fetch quick stats for layout:", error);
        setQuickStats({ activeRFQs: 0, lowStockItems: 0, overdueFollowups: 0 });
      }
    };

    fetchQuickStats();
    const interval = setInterval(fetchQuickStats, 120000); // Re-fetch every 2 minutes
    return () => clearInterval(interval);
  }, []);

  const pageTitleMap = {
    RFQDetail: "Create RFQ",
    AgentChat: "Lijakwe Chat",
    GoodsReceipt: "Goods Receipt",
    PurchaseOrders: "Purchase Orders",
    Upload: "Upload Documents"
  };
  const pageTitle = pageTitleMap[currentPageName] || currentPageName?.replace(/([A-Z])/g, ' $1').trim() || "Dashboard";
  const pageSearchMatches = headerSearch.trim()
    ? navigationItems.filter((item) => item.title.toLowerCase().includes(headerSearch.trim().toLowerCase())).slice(0, 5)
    : [];

  const handleHeaderSearchKeyDown = (event) => {
    if (event.key === "Enter" && pageSearchMatches[0]) {
      navigate(pageSearchMatches[0].url);
      setHeaderSearch("");
    }
    if (event.key === "Escape") {
      setHeaderSearch("");
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  // Corrected Logic: Only show invitation entry for non-admin users who do not have access.
  if (user && !user.has_access && user.role !== 'admin') {
    console.log("[LAYOUT] User needs access code - showing invitation entry");
    return <InvitationCodeEntry onAccessGranted={recheckUserAccess} />;
  }

  console.log("[LAYOUT] User has access or is admin - showing main app");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50">
        <Sidebar className="border-r border-slate-200 bg-white">
          <SidebarHeader className="border-b border-slate-200 p-6">
            <Link to={createPageUrl("Dashboard")} className="flex items-center gap-3 text-current no-underline hover:opacity-90 transition-opacity">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-lg">Tobolar Procurement</h2>
                <p className="text-xs text-slate-500">Procurement & Inventory</p>
              </div>
            </Link>
          </SidebarHeader>

          <SidebarContent className="p-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-1">
                  {navigationItems.map((item) =>
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-lg ${
                          location.pathname === item.url ?
                            'bg-blue-50 text-blue-700 font-semibold border-l-4 border-blue-500' :
                            'text-slate-600 font-medium'}`
                        }>

                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-5 h-5" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-8">
              <SidebarGroupLabel className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 py-2">
                Quick Stats
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-3 py-2 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Active RFQs</span>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">{quickStats.activeRFQs}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Low Stock Items</span>
                    <Badge variant="secondary" className="bg-orange-100 text-orange-800">{quickStats.lowStockItems}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Overdue Follow-ups</span>
                    <Badge variant="secondary" className="bg-red-100 text-red-800">{quickStats.overdueFollowups}</Badge>
                  </div>
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b border-slate-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="lg:hidden hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
                <div>
                  <h1 className="text-slate-950 text-2xl font-bold">{pageTitle}</h1>
                  <p className="text-slate-500 text-sm">Manage your procurement and inventory efficiently</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Find a page..."
                    value={headerSearch}
                    onChange={(event) => setHeaderSearch(event.target.value)}
                    onKeyDown={handleHeaderSearchKeyDown}
                    className="pl-10 w-64 bg-slate-50 border-slate-200 focus:bg-white"
                    aria-label="Find a page"
                  />
                  {pageSearchMatches.length > 0 && (
                    <div className="absolute right-0 top-11 z-50 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
                      {pageSearchMatches.map((item) => (
                        <button
                          key={item.title}
                          type="button"
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                          onClick={() => {
                            navigate(item.url);
                            setHeaderSearch("");
                          }}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <NotificationBell />
                <UserSettings />
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-slate-50">{children}</div>
        </main>

        {/* Floating AI Agent */}
        <FloatingAIAgent />
      </div>
    </SidebarProvider>
  );
}


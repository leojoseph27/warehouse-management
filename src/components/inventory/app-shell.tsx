'use client';

import { useInventoryStore, ViewMode } from '@/store/inventory-store';
import { UploadQueueProvider } from '@/store/upload-queue-context';
import { UploadQueuePanel } from './upload-queue-panel';
import { Dashboard } from './dashboard';
import { ProductTable } from './product-table';
import { ProductForm } from './product-form';
import { ProductDetail } from './product-detail';
import { ExcelImport } from './excel-import';
import { AuthScreen } from './auth-screen';
import { Button } from '@/components/ui/button';
import {
  Package,
  LayoutDashboard,
  LogOut,
  Plus,
  Menu,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

export function AppShell() {
  const {
    isAuthenticated,
    currentView,
    setView,
    setAuthenticated,
  } = useInventoryStore();

  // Mobile menu state for tablet
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Close mobile menu on view change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowMobileMenu(false);
  }, [currentView]);

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <ProductTable />;
      case 'add-product':
        return <ProductForm mode="add" />;
      case 'edit-product':
        return <ProductForm mode="edit" />;
      case 'product-detail':
        return <ProductDetail />;
      case 'import':
        return <ExcelImport />;
      default:
        return <Dashboard />;
    }
  };

  const handleLogout = () => {
    setAuthenticated(false);
    toast.success('Logged out successfully');
  };

  return (
    <UploadQueueProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b safe-area-inset">
          <div className="mx-auto px-3 sm:px-4 h-14 flex items-center gap-2 sm:gap-3">
            {/* Logo / Home button */}
            <button
              onClick={() => setView('dashboard')}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity shrink-0"
            >
              <div className="w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 sm:h-4 sm:w-4 text-primary" />
              </div>
              <span className="font-semibold text-sm hidden sm:inline">Product Catalog</span>
            </button>

            <div className="flex-1" />

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <NavButton
                active={currentView === 'dashboard'}
                onClick={() => setView('dashboard')}
                icon={LayoutDashboard}
                label="Dashboard"
              />
              <NavButton
                active={currentView === 'products'}
                onClick={() => setView('products')}
                icon={Package}
                label="Products"
              />
              <NavButton
                active={currentView === 'add-product'}
                onClick={() => setView('add-product')}
                icon={Plus}
                label="Add Product"
              />
            </nav>

            {/* Tablet Menu Toggle */}
            <button
              className="hidden md:flex lg:hidden items-center justify-center h-11 w-11 rounded-md hover:bg-accent transition-colors"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              {showMobileMenu ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Quick Add Button - visible on tablet */}
            <Button
              variant="default"
              size="sm"
              onClick={() => setView('add-product')}
              className="hidden md:flex lg:hidden h-11 px-3"
            >
              <Plus className="h-5 w-5 mr-1" />
              Add
            </Button>

            {/* Logout */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-11 px-2 sm:px-3 text-xs sm:text-sm shrink-0"
            >
              <LogOut className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>

          {/* Tablet Navigation Dropdown */}
          {showMobileMenu && (
            <div className="hidden md:block lg:hidden border-t bg-background/95 backdrop-blur">
              <nav className="mx-auto px-4 py-3 flex items-center gap-2">
                <NavButtonLarge
                  active={currentView === 'dashboard'}
                  onClick={() => { setView('dashboard'); setShowMobileMenu(false); }}
                  icon={LayoutDashboard}
                  label="Dashboard"
                />
                <NavButtonLarge
                  active={currentView === 'products'}
                  onClick={() => { setView('products'); setShowMobileMenu(false); }}
                  icon={Package}
                  label="Products"
                />
              </nav>
            </div>
          )}
        </header>

        {/* Main Content - responsive width */}
        <main className="flex-1 mx-auto w-full px-3 sm:px-4 py-4 sm:py-6 max-w-4xl lg:max-w-5xl xl:max-w-6xl">
          {renderView()}
        </main>

        {/* Bottom Navigation for Mobile */}
        <nav className="md:hidden sticky bottom-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t safe-area-inset">
          <div className="flex items-center justify-around h-14">
            <MobileNavButton
              active={currentView === 'dashboard'}
              onClick={() => setView('dashboard')}
              icon={LayoutDashboard}
              label="Dashboard"
            />
            <MobileNavButton
              active={currentView === 'products'}
              onClick={() => setView('products')}
              icon={Package}
              label="Products"
            />
            <MobileNavButton
              active={currentView === 'add-product'}
              onClick={() => setView('add-product')}
              icon={Plus}
              label="Add"
              highlight
            />
          </div>
        </nav>

        {/* Upload Queue Panel (floating) - positioned to avoid mobile nav */}
        <UploadQueuePanel />
      </div>
    </UploadQueueProvider>
  );
}

function NavButton({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm transition-colors ${
        active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      }`}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function NavButtonLarge({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-lg transition-colors min-w-[80px] ${
        active ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      }`}
    >
      <Icon className="h-5 w-5" />
      <span className="text-xs">{label}</span>
    </button>
  );
}

function MobileNavButton({ active, onClick, icon: Icon, label, highlight }: { active: boolean; onClick: () => void; icon: any; label: string; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-0.5 py-2 px-5 transition-colors min-h-[44px] ${
        highlight && !active
          ? 'bg-primary text-primary-foreground rounded-lg px-4'
          : active
            ? 'text-primary'
            : 'text-muted-foreground'
      }`}
    >
      <Icon className={`h-6 w-6 ${highlight && !active ? '' : ''}`} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
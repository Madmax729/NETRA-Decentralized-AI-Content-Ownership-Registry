import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Menu, X, Home, Upload, CheckCircle, Search, ShoppingBag, GitBranch } from 'lucide-react';
import { useWallet } from '@/hooks/use-wallet';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { address, isConnecting, connect, switchAccount } = useWallet();

  const navItems = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Marketplace', href: '/marketplace', icon: ShoppingBag },
    { name: 'Provenance', href: '/provenance', icon: GitBranch },
    { name: 'Watermark', href: '/watermark', icon: Shield },
    { name: 'Verify', href: '/verify', icon: CheckCircle },
    { name: 'IPFS Upload', href: '/ipfs', icon: Upload },
    { name: 'Plagiarism', href: '/plagiarism', icon: Search },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-glass-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blockchain-primary to-blockchain-secondary rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient">Netra</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                  isActive(item.href)
                    ? 'bg-white/10 text-blockchain-primary'
                    : 'hover:bg-white/5 text-foreground/80 hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            ))}
          </div>

          {/* Connect Wallet Button */}
          <div className="hidden lg:flex items-center space-x-4">
            <Button 
              className="btn-glass" 
              onClick={address ? switchAccount : connect} 
              disabled={isConnecting}
            >
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : (isConnecting ? 'Connecting...' : 'Connect Wallet')}
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="glass p-2 rounded-lg"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="lg:hidden py-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                  isActive(item.href)
                    ? 'bg-white/10 text-blockchain-primary'
                    : 'hover:bg-white/5 text-foreground/80'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.name}</span>
              </Link>
            ))}
            <div className="pt-2 border-t border-glass-border">
              <Button 
                className="btn-glass w-full" 
                onClick={address ? switchAccount : connect} 
                disabled={isConnecting}
              >
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : (isConnecting ? 'Connecting...' : 'Connect Wallet')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;

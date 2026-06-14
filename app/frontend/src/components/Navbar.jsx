import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ShoppingCart } from 'lucide-react';

export default function Navbar() {
  const { user, logoutUser } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
        {/* Logo */}
        <Link to="/" className="font-semibold text-foreground tracking-tight">
          Multi<span className="text-muted-foreground">Mart</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Shop</Link>
          </Button>
          {user?.role === 'vendor' && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
          )}
          {user && (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/orders">Orders</Link>
            </Button>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user?.role === 'customer' && (
            <Button variant="ghost" size="sm" asChild className="relative">
              <Link to="/checkout">
                <ShoppingCart data-icon="inline-start" />
                Cart
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 size-4 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>
            </Button>
          )}

          {!user ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/register">Sign up</Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Separator orientation="vertical" className="h-5" />
              <div className="flex items-center gap-2">
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs">
                    {user.name?.[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground hidden sm:block">{user.name}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { logoutUser(); navigate('/'); }}>
                Logout
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

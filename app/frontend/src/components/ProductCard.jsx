import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';
import { ShoppingCart } from 'lucide-react';

export default function ProductCard({ product }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleAddToCart = () => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'customer') return;
    addToCart(product);
  };

  const outOfStock = product.stock === 0;

  return (
    <Card className="flex flex-col overflow-hidden">
      {/* Image */}
      <div className="relative overflow-hidden bg-muted" style={{ height: '180px' }}>
        <img
          src={product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'}
          alt={product.name}
          className="w-full h-full object-cover"
          onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400'; }}
        />
        {outOfStock && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <span className="text-sm font-medium text-muted-foreground">Out of Stock</span>
          </div>
        )}
      </div>

      <CardHeader className="pb-2 gap-1">
        <p className="text-xs text-muted-foreground truncate">by {product.vendor_name}</p>
        <p className="text-sm font-medium leading-snug line-clamp-2">{product.name}</p>
      </CardHeader>

      <CardContent className="pb-2">
        <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">₹{Number(product.price).toLocaleString('en-IN')}</p>
          <Badge variant="secondary" className="text-xs mt-1">{product.category || 'General'}</Badge>
        </div>
        {(user?.role === 'customer' || !user) && (
          <Button
            size="sm"
            variant={outOfStock ? 'outline' : 'default'}
            disabled={outOfStock}
            onClick={handleAddToCart}
          >
            <ShoppingCart data-icon="inline-start" />
            Add
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

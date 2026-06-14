import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { placeOrder } from '../api';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Minus, Plus, Trash2 } from 'lucide-react';

export default function Checkout() {
  const { cart, removeFromCart, updateQuantity, clearCart, totalPrice } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  if (!user) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-foreground font-medium mb-2">Please log in to checkout</p>
        <Button size="sm" asChild><Link to="/login">Log in</Link></Button>
      </div>
    </div>
  );

  if (cart.length === 0) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-foreground font-medium mb-1">Your cart is empty</p>
        <p className="text-muted-foreground text-sm mb-4">Add some products to get started</p>
        <Button size="sm" asChild><Link to="/">Browse products</Link></Button>
      </div>
    </div>
  );

  const handlePlaceOrder = async () => {
    setError('');
    setPlacing(true);
    try {
      const items = cart.map((i) => ({ product_id: i.product.id, quantity: i.quantity }));
      await placeOrder({ items });
      clearCart();
      navigate('/orders', { state: { success: true } });
    } catch (err) {
      setError(err.response?.data?.error || 'Order failed. Please try again.');
    } finally { setPlacing(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-semibold mb-6">Cart</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Items */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            {cart.map(({ product, quantity }) => (
              <Card key={product.id}>
                <CardContent className="p-4 flex gap-4 items-center">
                  <img
                    src={product.image_url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80'}
                    alt={product.name}
                    className="size-16 rounded-md object-cover flex-shrink-0 bg-muted"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=80'; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">by {product.vendor_name}</p>
                    <p className="text-sm font-semibold mt-1">₹{(product.price * quantity).toLocaleString('en-IN')}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="size-7 p-0" onClick={() => updateQuantity(product.id, quantity - 1)}>
                      <Minus className="size-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{quantity}</span>
                    <Button size="sm" variant="outline" className="size-7 p-0" onClick={() => updateQuantity(product.id, quantity + 1)}>
                      <Plus className="size-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="size-7 p-0 text-muted-foreground ml-1" onClick={() => removeFromCart(product.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardHeader><CardTitle className="text-base">Order summary</CardTitle></CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                {cart.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-muted-foreground">
                    <span className="truncate flex-1 mr-2">{product.name} × {quantity}</span>
                    <span>₹{(product.price * quantity).toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                {error && <p className="text-destructive text-xs w-full">{error}</p>}
                <Button className="w-full" disabled={placing} onClick={handlePlaceOrder}>
                  {placing ? 'Placing order...' : 'Place order'}
                </Button>
                <Button className="w-full" variant="ghost" size="sm" asChild>
                  <Link to="/">Continue shopping</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

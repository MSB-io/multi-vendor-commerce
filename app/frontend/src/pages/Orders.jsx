import { useState, useEffect } from 'react';
import { getOrders } from '../api';
import { useAuth } from '../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle } from 'lucide-react';

export default function Orders() {
  const { user } = useAuth();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const justOrdered = location.state?.success;

  useEffect(() => {
    if (!user) return;
    getOrders()
      .then((res) => setOrders(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground text-sm">
        Please <Link to="/login" className="text-foreground underline">log in</Link> to view orders.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-xl font-semibold mb-6">Orders</h1>

        {justOrdered && (
          <Card className="mb-6 border-green-500/20 bg-green-500/5">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="size-5 text-green-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">Order placed successfully</p>
                <p className="text-xs text-muted-foreground">Your order is confirmed and being processed.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : orders.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground text-sm mb-3">No orders yet.</p>
            <Button size="sm" asChild><Link to="/">Start shopping</Link></Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardHeader className="pb-3 flex flex-row items-start justify-between">
                  <div>
                    <p className="text-sm font-medium">Order #{order.id}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">₹{Number(order.total_amount).toLocaleString('en-IN')}</p>
                    <Badge variant="secondary" className="mt-1">{order.status}</Badge>
                  </div>
                </CardHeader>
                {order.items && (
                  <>
                    <Separator />
                    <CardContent className="pt-3 pb-3">
                      <p className="text-xs text-muted-foreground">
                        {order.items.map((item, i) => (
                          <span key={i}>{item.name} × {item.quantity}{i < order.items.length - 1 ? ', ' : ''}</span>
                        ))}
                      </p>
                    </CardContent>
                  </>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

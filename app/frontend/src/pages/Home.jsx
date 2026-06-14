import { useState, useEffect } from 'react';
import ProductCard from '../components/ProductCard';
import { getProducts } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = ['All', 'Electronics', 'Fashion', 'Home', 'Sports', 'Books', 'Beauty'];

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [error, setError] = useState('');

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (search) params.search = search;
      if (category !== 'All') params.category = category;
      const res = await getProducts(params);
      setProducts(res.data);
    } catch {
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [category]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <h1 className="text-2xl font-semibold text-foreground mb-1">Marketplace</h1>
          <p className="text-muted-foreground text-sm">Browse products from multiple vendors</p>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex gap-2 mt-4 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="secondary">Search</Button>
          </form>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Category tabs */}
        <div className="flex gap-1 flex-wrap mb-6">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              size="sm"
              variant={category === cat ? 'default' : 'ghost'}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchProducts}>Try again</Button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="flex flex-col gap-3">
                <Skeleton className="h-44 w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Products */}
        {!loading && !error && (
          <>
            {products.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-muted-foreground text-sm mb-3">No products found.</p>
                <Button variant="outline" size="sm" onClick={() => { setSearch(''); setCategory('All'); }}>
                  Clear filters
                </Button>
              </div>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-4">{products.length} products</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

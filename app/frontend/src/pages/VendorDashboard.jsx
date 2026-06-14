import { useState, useEffect } from 'react';
import { getMyProducts, addProduct, updateProduct, deleteProduct, getOrders } from '../api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Separator } from '@/components/ui/separator';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Package, ShoppingBag, DollarSign, Plus, Pencil, Trash2 } from 'lucide-react';

const EMPTY_FORM = { name: '', description: '', price: '', category: 'Electronics', stock: '', image_url: '' };
const CATEGORIES = ['Electronics', 'Fashion', 'Home', 'Sports', 'Books', 'Beauty', 'Other'];

export default function VendorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('products');

  useEffect(() => {
    if (!user || user.role !== 'vendor') { navigate('/'); return; }
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [prodRes, ordRes] = await Promise.all([getMyProducts(), getOrders()]);
      setProducts(prodRes.data);
      setOrders(ordRes.data);
    } catch { setError('Failed to load data.'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editId) { await updateProduct(editId, form); }
      else { await addProduct(form); }
      setForm(EMPTY_FORM); setEditId(null); setShowForm(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.');
    } finally { setSaving(false); }
  };

  const handleEdit = (p) => {
    setForm({ name: p.name, description: p.description || '', price: p.price, category: p.category || 'Electronics', stock: p.stock, image_url: p.image_url || '' });
    setEditId(p.id); setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try { await deleteProduct(id); fetchData(); }
    catch { setError('Failed to delete.'); }
  };

  const totalRevenue = orders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <p className="text-muted-foreground text-sm">Loading...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground">{user?.name}</p>
          </div>
          <Button size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm(EMPTY_FORM); }}>
            <Plus data-icon="inline-start" />
            {showForm ? 'Cancel' : 'Add product'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Products', value: products.length, icon: Package },
            { label: 'Orders', value: orders.length, icon: ShoppingBag },
            { label: 'Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: DollarSign },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className="size-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-xl font-semibold">{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {error && <p className="text-destructive text-sm mb-4">{error}</p>}

        {/* Add/Edit Form */}
        {showForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base">{editId ? 'Edit product' : 'New product'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  <FieldGroup className="col-span-2 sm:col-span-1">
                    <Field>
                      <FieldLabel htmlFor="p-name">Name *</FieldLabel>
                      <Input id="p-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Product name" />
                    </Field>
                  </FieldGroup>
                  <FieldGroup className="col-span-2 sm:col-span-1">
                    <Field>
                      <FieldLabel htmlFor="p-cat">Category</FieldLabel>
                      <select
                        id="p-cat"
                        value={form.category}
                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm text-foreground"
                      >
                        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                      </select>
                    </Field>
                  </FieldGroup>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="p-price">Price (₹) *</FieldLabel>
                      <Input id="p-price" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required min="0" step="0.01" placeholder="999" />
                    </Field>
                  </FieldGroup>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="p-stock">Stock</FieldLabel>
                      <Input id="p-stock" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} min="0" placeholder="100" />
                    </Field>
                  </FieldGroup>
                  <FieldGroup className="col-span-2">
                    <Field>
                      <FieldLabel htmlFor="p-desc">Description</FieldLabel>
                      <Input id="p-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Short description" />
                    </Field>
                  </FieldGroup>
                  <FieldGroup className="col-span-2">
                    <Field>
                      <FieldLabel htmlFor="p-img">Image URL</FieldLabel>
                      <Input id="p-img" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." />
                    </Field>
                  </FieldGroup>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button type="submit" size="sm" disabled={saving}>{saving ? 'Saving...' : editId ? 'Update' : 'Add product'}</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM); }}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4">
          {['products', 'orders'].map((tab) => (
            <Button key={tab} size="sm" variant={activeTab === tab ? 'secondary' : 'ghost'} onClick={() => setActiveTab(tab)} className="capitalize">
              {tab}
            </Button>
          ))}
        </div>

        <Separator className="mb-4" />

        {/* Products Table */}
        {activeTab === 'products' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-10">No products yet.</TableCell></TableRow>
              ) : products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="secondary">{p.category}</Badge></TableCell>
                  <TableCell>₹{Number(p.price).toLocaleString('en-IN')}</TableCell>
                  <TableCell className="text-muted-foreground">{p.stock}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(p)}><Pencil className="size-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}><Trash2 className="size-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Orders Table */}
        {activeTab === 'orders' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-10">No orders yet.</TableCell></TableRow>
              ) : orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="text-muted-foreground">#{o.id}</TableCell>
                  <TableCell className="font-medium">₹{Number(o.total_amount).toLocaleString('en-IN')}</TableCell>
                  <TableCell><Badge variant="secondary">{o.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm">{new Date(o.created_at).toLocaleDateString('en-IN')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

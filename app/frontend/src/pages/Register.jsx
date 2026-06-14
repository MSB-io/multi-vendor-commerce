import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { cn } from '@/lib/utils';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await register(form);
      loginUser(res.data.user, res.data.token);
      navigate(res.data.user.role === 'vendor' ? '/dashboard' : '/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-foreground">Create an account</h1>
          <p className="text-muted-foreground text-sm mt-1">Join as a vendor or customer</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {error && <p className="text-destructive text-sm mb-4">{error}</p>}

            <form onSubmit={handleSubmit}>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="name">Full name</FieldLabel>
                  <Input
                    id="name"
                    placeholder="Your name or store name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="reg-email">Email</FieldLabel>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="reg-password">Password</FieldLabel>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    minLength={6}
                  />
                </Field>
              </FieldGroup>

              {/* Role selector */}
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">I want to</p>
                <div className="flex gap-2">
                  {[
                    { value: 'customer', label: 'Shop', desc: 'Buy products' },
                    { value: 'vendor', label: 'Sell', desc: 'List products' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, role: opt.value })}
                      className={cn(
                        'flex-1 p-3 rounded-lg border text-left transition-colors text-sm',
                        form.role === opt.value
                          ? 'border-primary bg-primary/10 text-foreground'
                          : 'border-border text-muted-foreground hover:border-muted-foreground'
                      )}
                    >
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-xs opacity-70">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full mt-5" disabled={loading}>
                {loading ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-foreground underline underline-offset-2">Log in</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

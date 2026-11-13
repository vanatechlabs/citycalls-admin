'use client';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
export function PaymentReviews() {
  const reviews = useQuery({ queryKey: ['payment-reviews'], queryFn: async () => (await apiClient.get('/finance/payment-reviews')).data.data as { _id: string; invoiceId: string; paymentId?: string; amountPaise: number; lastError?: string }[] });
  if (!reviews.data?.length) return null;
  return <section className="space-y-2 rounded-lg border border-amber-300 bg-amber-50 p-4"><h3 className="font-semibold">Captured payments needing reconciliation</h3><p className="text-sm">Do not collect again. Check the provider payment and invoice before recording a correction or refund.</p>{reviews.data.map(row => <p key={row._id} className="text-sm">Invoice {row.invoiceId} · ₹{(row.amountPaise / 100).toFixed(2)} · {row.paymentId} · {row.lastError}</p>)}</section>;
}

'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Star } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { useHappyCall, useRecordHappyCallOutcome } from '@/lib/hooks/useHappyCalls';

export default function HappyCallEntryPage() {
  return (
    <Suspense>
      <HappyCallEntryForm />
    </Suspense>
  );
}

function HappyCallEntryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const happyCallId = searchParams.get('id') ?? '';
  const { data: existing } = useHappyCall(happyCallId);
  const recordOutcome = useRecordHappyCallOutcome(happyCallId);

  const [resolved, setResolved] = useState<'yes' | 'no' | ''>('');
  const [rating, setRating] = useState(0);
  const [remarks, setRemarks] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      if (existing?.customerSatisfaction) setRating(existing.customerSatisfaction);
      if (existing?.remarks) setRemarks(existing.remarks);
    }, 0);
    return () => clearTimeout(timer);
  }, [existing]);

  const handleSubmit = () => {
    if (!happyCallId) return;
    recordOutcome.mutate(
      {
        status: 'COMPLETED',
        customerSatisfaction: rating || undefined,
        remarks: remarks || undefined,
        reopenRequested: resolved === 'no',
      },
      { onSuccess: () => router.push('/dashboard/happy-calls') }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">Log Happy Call</h1>
          <p className="text-[13px] text-muted-foreground">Record customer feedback.</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => router.back()}>Cancel</Button>
      </div>

      {!happyCallId && (
        <p className="text-sm text-destructive">No happy call selected — go back to the list and click &quot;Log Call&quot; on a pending entry.</p>
      )}

      {existing?.customerSatisfaction && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          This customer already submitted a rating and remarks in the app — pre-filled below. Review and submit to close out this follow-up, or adjust if you learned something new on the call.
        </div>
      )}

      <Card className="animate-in slide-in-from-right-4 fade-in duration-500 mt-2">
        <CardContent className="space-y-4">

          <div className="space-y-3">
            <div className="space-y-1 border-b border-border/50 pb-1 mb-2">
              <h2 className="text-sm font-semibold text-foreground">1. Was your issue completely resolved?</h2>
              <p className="text-[13px] text-muted-foreground">Select whether the customer&apos;s problem was fixed.</p>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer border border-border/50 p-3 rounded-md hover:bg-slate-50 transition-colors flex-1">
                <input type="radio" name="resolved" value="yes" checked={resolved === 'yes'} onChange={() => setResolved('yes')} className="w-4 h-4 accent-primary" />
                <span className="font-medium text-green-700 text-sm">Yes, fully resolved</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer border border-border/50 p-3 rounded-md hover:bg-slate-50 transition-colors flex-1">
                <input type="radio" name="resolved" value="no" checked={resolved === 'no'} onChange={() => setResolved('no')} className="w-4 h-4 accent-red-600" />
                <span className="font-medium text-red-600 text-sm">No, issue persists (Request Reopen)</span>
              </label>
            </div>
          </div>

          <div className="space-y-3 ">
            <div className="space-y-1 border-b border-border/50 pb-1 mb-2">
              <h2 className="text-sm font-semibold text-foreground">2. How would you rate the service experience?</h2>
              <p className="text-[13px] text-muted-foreground">Rate from 1 to 5 stars.</p>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  onClick={() => setRating(star)}
                  className={`w-9 h-9 cursor-pointer transition-colors ${rating >= star ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200 hover:text-slate-300'}`}
                />
              ))}
              <span className="ml-4 font-bold text-lg text-slate-500">{rating} / 5</span>
            </div>
          </div>

          <div className="space-y-3 ">
            <div className="space-y-1 border-b border-border/50 pb-1 mb-2">
              <h2 className="text-sm font-semibold text-foreground">3. Any additional comments from the customer?</h2>
            </div>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Type customer's feedback or complaints here..."
            />
          </div>

          {recordOutcome.isError && (
            <p className="text-sm text-destructive">{recordOutcome.error.response?.data?.message ?? 'Failed to submit feedback.'}</p>
          )}
        </CardContent>
        <CardFooter className="flex justify-between bg-muted/30 p-4 border-t border-border/50">
          <Button variant="ghost" onClick={() => router.back()}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!happyCallId || recordOutcome.isPending} className="bg-green-600 hover:bg-green-700">
            {recordOutcome.isPending ? 'Submitting...' : 'Submit Feedback'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

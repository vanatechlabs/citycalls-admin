'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { BrainCircuit, Mic, MessageCircleHeart, Power } from 'lucide-react';

import { useAISettings, useUpdateAISettings } from '@/lib/hooks/useAISettings';

export default function AISettingsPage() {
  const { data: settings, isLoading } = useAISettings();
  const updateSettings = useUpdateAISettings();
  const disabled = isLoading || updateSettings.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-border/50">
        <div>
          <h1 className="text-lg font-medium tracking-tight text-foreground">AI Settings</h1>
          <p className="text-[13px] text-muted-foreground">Configure artificial intelligence features for your workspace.</p>
        </div>
      </div>

      <Card className="animate-in slide-in-from-right-4 fade-in duration-500 mt-2">
        <CardContent className="space-y-6 pt-5">
          
          {/* Global Kill Switch */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Power className="w-4 h-4 text-indigo-600" /> AI Features (Global)
                </h2>
                <p className="text-[13px] text-muted-foreground mt-0.5">Global kill switch — when off, no AI feature runs regardless of the toggles below.</p>
              </div>
              <Switch
                checked={settings?.enabled ?? false}
                onChange={(e) => updateSettings.mutate({ enabled: e.target.checked })}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Feature Flags */}
          <div className="space-y-3 pt-2">
            <div className="space-y-1 border-b border-border/50 pb-1 mb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-indigo-600" /> Feature Flags
              </h2>
              <p className="text-[13px] text-muted-foreground">Toggle specific AI features and capabilities.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-indigo-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100/50 rounded-md">
                    <Mic className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-800">Call Summarization</h3>
                    <p className="text-[12px] text-slate-500 leading-snug">Generate AI summaries from notes or recordings.</p>
                  </div>
                </div>
                <Switch
                  checked={settings?.featureFlags.CALL_SUMMARIZATION ?? false}
                  onChange={(e) => updateSettings.mutate({ featureFlags: { CALL_SUMMARIZATION: e.target.checked } })}
                  disabled={disabled}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-lg hover:border-pink-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-100/50 rounded-md">
                    <MessageCircleHeart className="w-4 h-4 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-slate-800">Complaint Classification</h3>
                    <p className="text-[12px] text-slate-500 leading-snug">Auto-classify complaints into specific categories.</p>
                  </div>
                </div>
                <Switch
                  checked={settings?.featureFlags.COMPLAINT_CLASSIFICATION ?? false}
                  onChange={(e) => updateSettings.mutate({ featureFlags: { COMPLAINT_CLASSIFICATION: e.target.checked } })}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>

          {/* LLM Config */}
          <div className="space-y-3 pt-4">
            <div className="space-y-1 border-b border-border/50 pb-1 mb-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-indigo-600" /> Configuration & Usage Limits
              </h2>
              <p className="text-[13px] text-muted-foreground">Select the AI provider and set daily usage caps to control costs.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Provider</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={settings?.provider ?? 'GEMINI'}
                  onChange={(e) => updateSettings.mutate({ provider: e.target.value as 'GEMINI' | 'OPENAI' })}
                  disabled={disabled}
                >
                  <option value="GEMINI">Google Gemini</option>
                  <option value="OPENAI">OpenAI</option>
                </select>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Model</label>
                <input
                  type="text"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  defaultValue={settings?.aiModel ?? ''}
                  onBlur={(e) => e.target.value && updateSettings.mutate({ model: e.target.value })}
                  disabled={disabled}
                  placeholder="e.g. gemini-1.5-flash"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Max Requests / Day</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  defaultValue={settings?.usageLimits.maxRequestsPerDay ?? 0}
                  onBlur={(e) => updateSettings.mutate({ usageLimits: { maxRequestsPerDay: Number(e.target.value) } })}
                  disabled={disabled}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Max Tokens / Day</label>
                <input
                  type="number"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  defaultValue={settings?.usageLimits.maxTokensPerDay ?? 0}
                  onBlur={(e) => updateSettings.mutate({ usageLimits: { maxTokensPerDay: Number(e.target.value) } })}
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

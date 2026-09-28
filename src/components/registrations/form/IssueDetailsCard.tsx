import type { ReactNode } from 'react';
import { ClipboardList, TriangleAlert } from 'lucide-react';
import { FREQUENCIES, SAFETY_CONCERNS } from '@/lib/registrations/constants';
import type { IssueConfig } from '@/lib/registrations/issueConfig';
import { ChoiceTile } from '../shared/ChoiceTile';
import { Field } from '../shared/Field';
import { FormCard } from '../shared/FormCard';
import { FIELD_INPUT, FIELD_LABEL } from '../shared/styles';
import type { RegistrationFormState, UpdateField } from './formState';

interface IssueDetailsCardProps {
  form: RegistrationFormState;
  update: UpdateField;
  config: IssueConfig;
  serviceName?: string;
  brands: string[];
  issueError: boolean;
  onToggleIssue: (issue: string) => void;
  // PhotoUploader, passed in so this card stays free of upload state.
  photoUploader: ReactNode;
}

export function IssueDetailsCard({ form, update, config, serviceName, brands, issueError, onToggleIssue, photoUploader }: IssueDetailsCardProps) {
  return (
    <FormCard
      id="issue-details"
      icon={ClipboardList}
      title="Issue Details"
      hint={serviceName ? `Tell us more about the ${serviceName.toLowerCase()} requirement.` : 'Select a service above to see its issue options.'}
    >
      <div className="space-y-4">
        {config.showBrand && (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label={`Select ${config.subject} Brand`} required>
              <select required value={form.brand} onChange={(e) => update('brand', e.target.value)} className={FIELD_INPUT}>
                <option value="">Select brand</option>
                {brands.map((b) => <option key={b} value={b}>{b}</option>)}
                {!brands.includes('Other') && <option value="Other">Other</option>}
              </select>
            </Field>
            <Field label="Model Number (Optional)">
              <input value={form.modelNumber} onChange={(e) => update('modelNumber', e.target.value)} maxLength={80} placeholder="Enter model number" className={FIELD_INPUT} />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className={FIELD_LABEL}>{config.typeLabel} <span className="text-red-500">*</span></label>
            <div className={`grid gap-2 ${config.typeOptions.length > 4 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {config.typeOptions.map((type) => (
                <ChoiceTile key={type} selected={form.applianceType === type} onClick={() => update('applianceType', type)}>
                  {type}
                </ChoiceTile>
              ))}
            </div>
            {/* Keeps the type required through native form validation. */}
            <input tabIndex={-1} required value={form.applianceType} onChange={() => {}} className="pointer-events-none h-0 w-full opacity-0" aria-hidden />
          </div>
          {config.sizeOptions && (
            <Field label={config.sizeLabel}>
              <select value={form.capacity} onChange={(e) => update('capacity', e.target.value)} className={FIELD_INPUT}>
                <option value="">Select an option</option>
                {config.sizeOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
          )}
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className={`${FIELD_LABEL} mb-0`}>
              {config.issueLabel} <span className="text-red-500">*</span>
              <span className="normal-case text-gray-400">(Select all that apply)</span>
            </label>
            {issueError && <span className="text-[10px] font-bold text-red-500">Please select at least one</span>}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {config.issues.map((issue) => (
              <ChoiceTile key={issue} selected={form.issues.includes(issue)} onClick={() => onToggleIssue(issue)}>
                {issue}
              </ChoiceTile>
            ))}
          </div>
        </div>

        <Field label="Please describe the issue in detail" required>
          <div className="relative">
            <textarea
              required
              rows={3}
              value={form.issueDescription}
              onChange={(e) => update('issueDescription', e.target.value.slice(0, 500))}
              placeholder={config.placeholder}
              className={`${FIELD_INPUT} resize-none`}
            />
            <span className="absolute bottom-2 right-2 bg-white px-1 text-[10px] font-semibold text-gray-400">{form.issueDescription.length}/500</span>
          </div>
        </Field>

        {photoUploader}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className={FIELD_LABEL}>How often is the issue happening?</label>
            <div className="grid grid-cols-2 gap-2">
              {FREQUENCIES.map((option) => (
                <ChoiceTile key={option} variant="radio" selected={form.issueFrequency === option} onClick={() => update('issueFrequency', option)}>
                  {option}
                </ChoiceTile>
              ))}
            </div>
          </div>
          <Field label={<><TriangleAlert className="h-3 w-3 text-amber-500" /> Any Safety Concern?</>}>
            <select value={form.safetyConcern} onChange={(e) => update('safetyConcern', e.target.value)} className={FIELD_INPUT}>
              <option value="">Select if there is any safety concern</option>
              {SAFETY_CONCERNS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        </div>
      </div>
    </FormCard>
  );
}

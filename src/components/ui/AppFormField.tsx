import React from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface AppFormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function AppFormField({ label, error, required, id, name, ...props }: AppFormFieldProps) {
  const fieldId = id || name;
  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className={error ? "text-destructive" : ""}>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <Input id={fieldId} name={name} required={required} className={error ? "border-destructive focus-visible:ring-destructive" : ""} {...props} />
      {error && <p className="text-[0.8rem] font-medium text-destructive">{error}</p>}
    </div>
  )
}

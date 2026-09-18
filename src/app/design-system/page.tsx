import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function DesignSystemPage() {
  return (
    <div className="container mx-auto py-10 space-y-12">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">CityCalls Design System</h1>
        <p className="text-muted-foreground">Premium operations tool foundations.</p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Typography</h2>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Heading 1</h1>
          <h2 className="text-3xl font-semibold">Heading 2</h2>
          <h3 className="text-2xl font-semibold">Heading 3</h3>
          <h4 className="text-xl font-medium">Heading 4</h4>
          <p className="text-base">Body text. CityCalls is a production-grade service management ecosystem.</p>
          <p className="text-sm text-muted-foreground">Small text. Used for hints and secondary data.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Primary Action</Button>
          <Button variant="secondary">Secondary Action</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="destructive">Destructive Action</Button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Inputs & Forms</h2>
        <div className="max-w-sm space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Full Name</label>
            <Input placeholder="Enter your name" />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Email Address</label>
            <Input type="email" placeholder="you@company.com" disabled />
            <p className="text-xs text-muted-foreground">Disabled field example.</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold border-b pb-2">Status Badges</h2>
        <div className="flex flex-wrap gap-4">
          <StatusBadge label="New / Pending" category="default" />
          <StatusBadge label="In Progress" category="info" />
          <StatusBadge label="Completed / Paid" category="success" />
          <StatusBadge label="Escalated / On Hold" category="warning" />
          <StatusBadge label="Cancelled / Failed" category="error" />
        </div>
      </section>
    </div>
  );
}

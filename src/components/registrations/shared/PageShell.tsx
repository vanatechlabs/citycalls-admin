import type { ReactNode } from 'react';

// Full-bleed white page with the admin's standard heading (dark green title,
// blue underline) — same as Social Media / Offers & Promotions.
export function PageShell({ title, description, actions, children }: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-[calc(100vh-100px)] w-[calc(100%+12px)] -mt-3 -ml-3 bg-white text-[#18233b]">
      <div className="flex min-h-full flex-col px-[18px] pb-[16px] pt-[14px]">
        <div className="mb-[20px] flex flex-col gap-3 border-b-[2px] border-[#293681] pb-[8px] md:flex-row md:items-end md:justify-between">
          <div className="shrink-0">
            <h1 className="text-[19px] font-bold leading-[1.15] tracking-[-0.018em] text-[#23471d]">{title}</h1>
            {description && <p className="mt-0.5 text-[12px] font-medium text-[#6c7587]">{description}</p>}
          </div>
          {/* min-w-0 lets a long tab strip scroll within itself, not widen the page */}
          {actions && <div className="min-w-0">{actions}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}

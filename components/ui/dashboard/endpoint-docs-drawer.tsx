"use client";

import { useEffect, useRef } from "react";

import type { ApiEndpointDoc } from "@/data";

import { MethodBadge } from "./method-badge";
import { StatusPill } from "./status-pill";
import { CloseCircle } from "@solar-icons/react/ssr";

const SectionHeading = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-2 text-xs uppercase tracking-wide text-zinc-500">{children}</h3>
);

const CodeBlock = ({ children }: { children: string }) => (
  <pre className="overflow-x-auto rounded-md bg-zinc-50 p-3 font-mono text-xs leading-relaxed dark:bg-zinc-900">
    {children}
  </pre>
);

const ParameterRow = ({
  param,
}: {
  param: ApiEndpointDoc["parameters"][number];
}) => (
  <li className="py-2">
    <div className="flex items-baseline justify-between gap-2">
      <code className="font-mono text-xs font-semibold">{param.name}</code>
      <span className="font-mono text-[10px] text-zinc-500">
        {param.type}
        {param.required ? " · required" : ""}
      </span>
    </div>
    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">{param.description}</p>
    {param.example ? (
      <p className="mt-1 font-mono text-[11px] text-zinc-500">
        e.g. <span className="text-zinc-700 dark:text-zinc-300">{param.example}</span>
      </p>
    ) : null}
  </li>
);

const ErrorRow = ({ err }: { err: ApiEndpointDoc["errors"][number] }) => (
  <li className="p-3">
    <div className="flex items-center gap-2">
      <StatusPill code={err.httpStatus} />
      <code className="font-mono text-xs font-semibold">{err.code}</code>
    </div>
    <p className="mt-1 text-xs">{err.message}</p>
    <p className="mt-1 text-xs text-zinc-500">
      <span className="font-medium">Fix:</span> {err.resolution}
    </p>
  </li>
);

const DocsBody = ({
  doc,
  onClose,
}: {
  doc: ApiEndpointDoc;
  onClose: () => void;
}) => (
  <div className="flex h-full flex-col">
    <header className="flex items-start justify-between gap-3 border-b p-4 dark:border-zinc-800">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-zinc-500">Endpoint reference</p>
        <div className="mt-1 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
          <MethodBadge method={doc.method} />
          <code className="break-all font-mono text-sm">{doc.path}</code>
        </div>
        <h2 className="mt-2 text-base font-semibold tracking-tight">{doc.title}</h2>
        <p className="mt-1 text-sm text-zinc-500">{doc.summary}</p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close endpoint docs"
        className="inline-flex shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300 dark:hover:bg-zinc-800"
      >
        <CloseCircle size={18} className="inline-block m-0" />
      </button>
    </header>

    <div className="flex-1 space-y-6 overflow-y-auto p-4">
      <section aria-labelledby="docs-description">
        <SectionHeading>
          <span id="docs-description">Description</span>
        </SectionHeading>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">{doc.description}</p>
      </section>

      <section aria-labelledby="docs-auth">
        <SectionHeading>
          <span id="docs-auth">Authentication</span>
        </SectionHeading>
        <p className="text-xs text-zinc-700 dark:text-zinc-300">{doc.authentication}</p>
      </section>

      <section aria-labelledby="docs-rate-limit">
        <SectionHeading>
          <span id="docs-rate-limit">Rate limit</span>
        </SectionHeading>
        <p className="text-xs text-zinc-700 dark:text-zinc-300">
          {doc.rateLimit.requestsPerWindow} requests every {doc.rateLimit.windowSeconds}s. 429
          responses include a <code className="font-mono">Retry-After</code> header.
        </p>
      </section>

      <section aria-labelledby="docs-params">
        <SectionHeading>
          <span id="docs-params">Body parameters</span>
        </SectionHeading>
        <ul className="divide-y dark:divide-zinc-800">
          {doc.parameters.map((p) => (
            <ParameterRow key={`${p.in}:${p.name}`} param={p} />
          ))}
        </ul>
      </section>

      <section aria-labelledby="docs-request">
        <SectionHeading>
          <span id="docs-request">Example request</span>
        </SectionHeading>
        <CodeBlock>{doc.requestExample}</CodeBlock>
      </section>

      {doc.responseExamples.map((resp) => (
        <section key={resp.status} aria-labelledby={`docs-resp-${resp.status}`}>
          <SectionHeading>
            <span id={`docs-resp-${resp.status}`}>
              Example response — {resp.status}
            </span>
          </SectionHeading>
          <p className="mb-2 text-xs text-zinc-500">{resp.description}</p>
          <CodeBlock>{resp.body}</CodeBlock>
        </section>
      ))}

      <section aria-labelledby="docs-errors">
        <SectionHeading>
          <span id="docs-errors">Common errors</span>
        </SectionHeading>
        <ul className="divide-y rounded-md border dark:divide-zinc-800 dark:border-zinc-800">
          {doc.errors.map((err) => (
            <ErrorRow key={err.code} err={err} />
          ))}
        </ul>
      </section>
    </div>
  </div>
);

interface EndpointDocsDrawerProps {
  /** When non-null, the drawer opens with these docs; when null, it closes. */
  doc: ApiEndpointDoc | null;
  onClose: () => void;
}

/**
 * Right-side drawer that renders an `ApiEndpointDoc`. Controlled via the
 * `doc` prop — set to non-null to open, null to close. Uses the native
 * `<dialog>` element for built-in focus trap + Esc-to-close.
 */
export const EndpointDocsDrawer = ({ doc, onClose }: EndpointDocsDrawerProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (doc && !dialog.open) dialog.showModal();
    if (!doc && dialog.open) dialog.close();
  }, [doc]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label="API endpoint documentation"
      className="inset-4 m-auto max-w-[calc(100dvw-2rem)] max-h-[calc(100dvh-2rem)] sm:max-w-lg rounded-xl border bg-white p-0 text-zinc-900 backdrop:bg-black/40 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 sm:top-0 sm:right-0 sm:bottom-0 sm:left-auto sm:m-0 sm:h-dvh sm:max-h-none sm:w-full sm:rounded-none sm:border-l"
    >
      {doc ? <DocsBody doc={doc} onClose={onClose} /> : null}
    </dialog>
  );
};

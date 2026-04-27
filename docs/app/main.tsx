import { MODAL_ABORTED, MODAL_REPLACED, ModalManager, ModalProvider } from "@reactleaf/modal";
import React from "react";
import { createRoot } from "react-dom/client";
import "../../style.css";
import { Alert, Confirm, EmailVerification, Prompt, PromptProps } from "./example-modals";
import "./styles.css";

const modal = new ModalManager();

function App() {
  const [lastResult, setLastResult] = React.useState("No modal has resolved yet.");

  async function handleAlert() {
    const result = await modal.open(Alert, {
      message: "Hello, this is an alert!",
      confirmText: "OK",
    });

    setLastResult(`Alert result: ${String(result)}`);
  }

  async function handleConfirm() {
    const result = await modal.open(Confirm, {
      message: "Are you sure you want to delete this item?",
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    setLastResult(`Confirm result: ${String(result)}`);
  }

  async function handleSequential() {
    const firstResult = await modal.open(EmailVerification, {
      onComplete: (verified) => {
        setLastResult(`Sequential flow result: ${String(verified)}`);
      },
    });

    if (firstResult !== MODAL_REPLACED) {
      setLastResult(`Sequential flow result: ${String(firstResult)}`);
    }
  }

  async function handleAbort() {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 3000);

    const result = await modal.open(
      Alert,
      {
        message: "This modal will close in 3 seconds.",
        confirmText: "Close now",
      },
      {
        abortController: controller,
      },
    );

    window.clearTimeout(timer);
    setLastResult(`Abort result: ${result === MODAL_ABORTED ? "aborted" : String(result)}`);
  }

  async function handlePrompt() {
    const result = await modal.open<PromptProps, string | null>(Prompt, {
      title: "What should we call this item?",
      placeholder: "Item name",
    });

    setLastResult(`Prompt result: ${String(result)}`);
  }

  return (
    <ModalProvider
      manager={modal}
      defaultLayerOptions={{ closeDelay: 180, closeOnOutsideClick: true, dim: true }}
      rootOptions={{ preventScroll: true }}
    >
      <header className="site-header">
        <nav className="nav" aria-label="Primary">
          <a className="brand" href="./">
            @reactleaf/modal
          </a>
          <div className="nav-links">
            <a href="#examples">Examples</a>
            <a href="#custom-modals">Custom Modals</a>
            <a href="https://github.com/reactleaf/modal">GitHub</a>
          </div>
        </nav>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">React modal manager</p>
            <h1>Open type-safe modals from anywhere in your code.</h1>
            <p className="lead">
              Pass any modal component directly to <code>modal.open</code>, await the result, and close it from inside
              with <code>useModalInstance</code>.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#examples">
                Try examples
              </a>
              <a className="button secondary" href="#quick-start">
                Quick start
              </a>
            </div>
          </div>

          <CodeBlock ariaLabel="Quick example">{`import { modal } from './modal';

const confirmed = await modal.open(Confirm, {
  message: 'Delete this item?',
});

if (confirmed) {
  await deleteItem();
}`}</CodeBlock>
        </section>

        <section id="examples" className="section examples-section">
          <div className="section-heading">
            <p className="eyebrow">Interactive examples</p>
            <h2>Open some modals and see how it works.</h2>
            <p>
              Try common flows: a simple alert, a confirmation dialog, sequential replacement, timed abort, and a typed
              prompt.
            </p>
          </div>

          <div className="example-grid">
            <ExampleCard title="Alert" copy="Single action modal with a resolved result." onClick={handleAlert} />
            <ExampleCard title="Confirm" copy="Promise resolves to true or false." onClick={handleConfirm} />
            <ExampleCard
              title="Sequential flow"
              copy="Replace the top modal without dropping the layer."
              onClick={handleSequential}
            />
            <ExampleCard
              title="AbortController"
              copy="Automatically closes after three seconds."
              onClick={handleAbort}
            />
            <ExampleCard title="Prompt" copy="Collect typed text from a custom modal." onClick={handlePrompt} />
          </div>

          <div className="result-log" aria-live="polite">
            <span className="log-label">Last result</span>
            <output>{lastResult}</output>
          </div>
        </section>

        <section id="installation" className="section split-section">
          <div>
            <p className="eyebrow">Installation</p>
            <h2>Add the package and default styles.</h2>
            <p>
              Install <code>@reactleaf/modal</code>, then import the stylesheet once near your app entry.
            </p>
          </div>
          <CodeBlock>{`npm install @reactleaf/modal

import '@reactleaf/modal/style.css';`}</CodeBlock>
        </section>

        <section id="quick-start" className="section split-section">
          <div>
            <p className="eyebrow">Quick start</p>
            <h2>Use one manager instance across provider and callers.</h2>
            <p>
              The provider renders the modal stack. Keep the manager somewhere importable, then use the same instance
              wherever you open modals.
            </p>
          </div>
          <CodeBlock>{`// modal/index.ts
import { ModalManager } from '@reactleaf/modal';

export const modal = new ModalManager();

// App.tsx
import { ModalProvider } from '@reactleaf/modal';
import { modal } from './modal';

export function App() {
  return (
    <ModalProvider manager={modal}>
      <YourApp />
    </ModalProvider>
  );
}`}</CodeBlock>
        </section>

        <section id="custom-modals" className="section split-section">
          <div className="section-heading">
            <p className="eyebrow">Use any customized modals</p>
            <h2>Build your modal as a normal React component.</h2>
            <p>
              Your modal owns its UI, animation class, and result value. Use <code>useModalInstance()</code> inside the
              modal to read <code>visible</code> and resolve the opener with <code>closeSelf(result)</code>.
            </p>
          </div>
          <CodeBlock>{`import { useModalInstance } from '@reactleaf/modal';

type ConfirmProps = {
  message: string;
};

export function Confirm({ message }: ConfirmProps) {
  const { visible, closeSelf } = useModalInstance();

  return (
    <div className={visible ? 'modal visible' : 'modal'}>
      <p>{message}</p>
      <button onClick={() => closeSelf(false)}>Cancel</button>
      <button onClick={() => closeSelf(true)}>Confirm</button>
    </div>
  );
}`}</CodeBlock>
        </section>

        <section id="manager-api" className="section split-section">
          <div className="section-heading">
            <p className="eyebrow">Open with manager</p>
            <h2>open() from the code wherever you want.</h2>
            <p>
              <code>modal.open()</code> returns a promise, so modal flows can stay in the same async control flow as the
              action that triggered them.
            </p>
          </div>
          <CodeBlock>{`import { modal } from './modal';
import { Confirm } from './modals/Confirm';

export async function deleteItem() {
  const confirmed = await modal.open(Confirm, {
    message: 'Delete this item?',
  });

  if (!confirmed) return;
  await requestDelete();
}`}</CodeBlock>
        </section>

        <section id="smooth-sequential-flow" className="section split-section">
          <div className="section-heading">
            <p className="eyebrow">Smooth sequential flow</p>
            <h2>Replace modals without flickering.</h2>
            <p>
              Use <code>replaceSelf()</code> when one modal step should become the next step in the same flow. The
              current layer stays mounted, so the dim layer remains stable while the content closes and the next modal
              opens.
            </p>
          </div>
          <CodeBlock>{`import { useModalInstance } from '@reactleaf/modal';
import { modal } from './modal';
import { EmailModal } from './modals/EmailModal';
import { CodeModal } from './modals/CodeModal';

export function verifyEmail() {
  void modal.open(EmailModal, {
    onVerified: completeSignIn,
  });
}

function EmailModal({ onVerified }) {
  const { replaceSelf } = useModalInstance();

  async function submitEmail(email) {
    await sendVerificationCode(email);

    const verified = await replaceSelf(CodeModal, {
      email,
    });

    if (verified) {
      await onVerified();
    }
  }
}`}</CodeBlock>
        </section>
      </main>
    </ModalProvider>
  );
}

interface ExampleCardProps {
  title: string;
  copy: string;
  onClick: () => void;
}

function ExampleCard({ title, copy, onClick }: ExampleCardProps) {
  return (
    <button className="example-card" type="button" onClick={onClick}>
      <span className="card-title">{title}</span>
      <span className="card-copy">{copy}</span>
    </button>
  );
}

interface CodeBlockProps {
  children: string;
  ariaLabel?: string;
}

function CodeBlock({ children, ariaLabel }: CodeBlockProps) {
  return (
    <div className="code-panel" aria-label={ariaLabel}>
      <pre>
        <code>{highlightCode(children)}</code>
      </pre>
    </div>
  );
}

function highlightCode(code: string): React.ReactNode[] {
  const tokenPattern =
    /(\/\/.*)|('[^'\\]*(?:\\.[^'\\]*)*'|"[^"\\]*(?:\\.[^"\\]*)*"|`[^`]*`)|\b(import|from|const|await|if|export|function|return|type|true|false|null|new)\b|(<\/?[A-Za-z][\w.]*|\/?>)|(\b[A-Z][A-Za-z0-9_]*\b)|(\b\d+\b)/g;
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of code.matchAll(tokenPattern)) {
    if (match.index === undefined) continue;
    if (match.index > lastIndex) {
      nodes.push(code.slice(lastIndex, match.index));
    }

    const token = match[0];
    if (token === ">" && code[match.index - 1] === "=") {
      nodes.push(token);
      lastIndex = match.index + token.length;
      continue;
    }

    const className = match[1]
      ? "tok-comment"
      : match[2]
        ? "tok-string"
        : match[3]
          ? "tok-keyword"
          : match[4]
            ? "tok-tag"
            : match[5]
              ? "tok-type"
              : "tok-number";

    nodes.push(
      <span className={className} key={`${match.index}-${token}`}>
        {token}
      </span>,
    );
    lastIndex = match.index + token.length;
  }

  if (lastIndex < code.length) {
    nodes.push(code.slice(lastIndex));
  }

  return nodes;
}

const root = document.querySelector("#root");

if (!root) {
  throw new Error("Root element was not found.");
}

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

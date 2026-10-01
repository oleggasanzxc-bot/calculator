import { useEffect, useMemo, useRef, useState } from "react";
import { amountToWordsUk } from "./utils/amountToWordsUk";
import "./App.css";

function CopyIcon({ checked = false }: { checked?: boolean }) {
  return checked ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.2 4.2L19 7" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export default function App() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);
  const conversion = useMemo(
    () => (input.trim() ? amountToWordsUk(input) : null),
    [input],
  );

  const result = conversion?.ok ? conversion.text : "";
  const error = conversion && !conversion.ok ? conversion.error : "";

  const handleCopy = async () => {
    if (!result) return;
    try {
      await copyText(result);
      window.clearTimeout(copyTimer.current);
      setCopied(true);
      copyTimer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "convert_amount_to_ukrainian_words",
            title: "Сума прописом",
            description: "Перетворює невід’ємну суму на граматично правильний український текст.",
            inputSchema: {
              type: "object",
              properties: {
                amount: {
                  type: "string",
                  description: "Сума цифрами, наприклад 1 534 874,25",
                },
              },
              required: ["amount"],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true, untrustedContentHint: false },
            execute(value) {
              const amount =
                typeof value === "object" && value !== null && "amount" in value
                  ? (value as { amount: unknown }).amount
                  : undefined;
              if (typeof amount !== "string") throw new Error("Поле amount має бути рядком");
              const converted = amountToWordsUk(amount);
              if (!converted.ok) throw new Error(converted.error);
              return { text: converted.text };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => undefined);
    } catch {
      // WebMCP is optional and unavailable in most browsers.
    }

    return () => lifecycle.abort();
  }, []);

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  return (
    <main className="app-shell">
      <section className="calculator" aria-labelledby="page-title">
        <header className="title-row">
          <span className="mark" aria-hidden="true">₴</span>
          <h1 id="page-title">Сума прописом</h1>
        </header>

        <div className="field-group">
          <label htmlFor="amount">Сума</label>
          <div className={`input-frame${error ? " input-frame--error" : ""}`}>
            <input
              id="amount"
              name="amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoFocus
              spellCheck={false}
              placeholder="Введіть суму"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setCopied(false);
              }}
              aria-invalid={Boolean(error)}
              aria-describedby="amount-message"
            />
            <span className="currency" aria-hidden="true">UAH</span>
          </div>
          <p
            id="amount-message"
            className={error ? "error" : "hint"}
            role={error ? "alert" : undefined}
          >
            {error || "Кома або крапка для копійок"}
          </p>
        </div>

        <div className={`result${result ? " result--ready" : ""}`} aria-live="polite">
          <div className="result-copy">
            <span className="result-label">Результат</span>
            <p className={result ? "result-text" : "result-placeholder"}>
              {result || "Тут з’явиться сума словами"}
            </p>
          </div>
          <button
            className={`copy-button${copied ? " copy-button--done" : ""}`}
            type="button"
            onClick={handleCopy}
            disabled={!result}
            aria-label={copied ? "Скопійовано" : "Копіювати результат"}
            title={copied ? "Скопійовано" : "Копіювати"}
          >
            <CopyIcon checked={copied} />
            <span>{copied ? "Скопійовано" : "Копіювати"}</span>
          </button>
        </div>

        <footer>
          <span className="privacy-dot" aria-hidden="true" />
          Дані обробляються лише у вашому браузері
        </footer>
      </section>
    </main>
  );
}

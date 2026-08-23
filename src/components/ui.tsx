import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CheckIcon, CloseIcon } from "./Icons";
import { cn } from "../lib/utils";

/* ── Button ──────────────────────────────────────────────────────────── */

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-accent text-accent-ink shadow-sm hover:bg-accent-hover active:translate-y-px disabled:bg-line-strong disabled:text-faint disabled:shadow-none",
  secondary:
    "bg-surface text-ink border border-line hover:bg-surface-2 hover:border-line-strong active:translate-y-px",
  ghost: "text-muted hover:bg-surface-2 hover:text-ink",
  danger: "bg-danger/10 text-danger border border-danger/25 hover:bg-danger/15",
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[0.8rem] gap-1.5 rounded-lg",
  md: "h-10 px-4 text-[0.875rem] gap-2 rounded-xl",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "secondary", size = "md", className, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex select-none items-center justify-center font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-60",
        VARIANT[variant],
        SIZE[size],
        className,
      )}
    />
  );
}

/* ── Icon button + tooltip ───────────────────────────────────────────── */

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  tip?: "top" | "bottom" | "left";
  active?: boolean;
}

export function IconButton({ label, tip = "bottom", active, className, children, ...props }: IconButtonProps) {
  return (
    <span className="group/tip relative inline-flex">
      <button
        {...props}
        aria-label={label}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors duration-150",
          "hover:bg-surface-2 hover:text-ink disabled:pointer-events-none disabled:opacity-40",
          active && "bg-surface-2 text-ink",
          className,
        )}
      >
        {children}
      </button>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[0.7rem] font-medium text-bg opacity-0 shadow-pop transition-opacity delay-300 duration-150 group-hover/tip:opacity-100",
          tip === "bottom" && "top-[calc(100%+6px)] left-1/2 -translate-x-1/2",
          tip === "top" && "bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2",
          tip === "left" && "top-1/2 right-[calc(100%+6px)] -translate-y-1/2",
        )}
      >
        {label}
      </span>
    </span>
  );
}

/* ── Popover ─────────────────────────────────────────────────────────── */

interface PopoverProps {
  open: boolean;
  onClose(): void;
  /** Anchor alignment relative to the trigger wrapper. */
  align?: "left" | "right" | "center";
  side?: "bottom" | "top";
  className?: string;
  children: ReactNode;
}

/** Wrap a trigger and this component in a `relative` element. */
export function Popover({ open, onClose, align = "left", side = "bottom", className, children }: PopoverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    // Defer so the click that opened the popover does not immediately close it.
    const id = setTimeout(() => document.addEventListener("mousedown", onPointer));
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 min-w-[13rem] animate-pop overflow-hidden rounded-xl border border-line bg-elev p-1 shadow-pop",
        side === "bottom" ? "top-[calc(100%+6px)]" : "bottom-[calc(100%+6px)]",
        align === "left" && "left-0",
        align === "right" && "right-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface MenuItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  danger?: boolean;
  selected?: boolean;
}

export function MenuItem({ icon, danger, selected, className, children, ...props }: MenuItemProps) {
  return (
    <button
      {...props}
      role="menuitem"
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.82rem] transition-colors",
        danger ? "text-danger hover:bg-danger/10" : "text-ink hover:bg-surface-2",
        className,
      )}
    >
      {icon && <span className="shrink-0 text-muted [&>svg]:size-4">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {selected && <CheckIcon className="size-3.5 shrink-0 text-accent" />}
    </button>
  );
}

export function MenuDivider() {
  return <div className="my-1 h-px bg-line" />;
}

/* ── Modal ───────────────────────────────────────────────────────────── */

interface ModalProps {
  open: boolean;
  onClose(): void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, description, children, footer, width = "max-w-xl" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div className="absolute inset-0 animate-fade bg-black/35 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative flex max-h-[86vh] w-full flex-col overflow-hidden rounded-2xl border border-line bg-elev shadow-pop",
          "animate-rise",
          width,
        )}
      >
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[0.98rem] font-semibold tracking-[-0.01em]">{title}</h2>
            {description && <p className="mt-0.5 text-[0.8rem] text-muted">{description}</p>}
          </div>
          <IconButton label="Close" tip="left" onClick={onClose} className="-mt-1 -mr-1.5 shrink-0">
            <CloseIcon className="size-4" />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 scrollbar-thin">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-5 py-3.5">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}

/* ── Form controls ───────────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.82rem] font-medium">{label}</span>
      {children}
      {hint && <span className="text-[0.75rem] leading-relaxed text-muted">{hint}</span>}
    </label>
  );
}

export function TextInput({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "h-10 w-full rounded-xl border border-line bg-surface px-3 text-[0.85rem] transition-colors",
        "hover:border-line-strong focus:border-accent focus:outline-none",
        className,
      )}
    />
  );
}

export function TextArea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full resize-y rounded-xl border border-line bg-surface px-3 py-2.5 text-[0.85rem] leading-relaxed transition-colors",
        "hover:border-line-strong focus:border-accent focus:outline-none scrollbar-thin",
        className,
      )}
    />
  );
}

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange(value: number): void;
  format?(value: number): string;
}) {
  const percent = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, var(--accent) ${percent}%, var(--surface-3) ${percent}%)`,
        }}
        className={cn(
          "h-1.5 flex-1 cursor-pointer appearance-none rounded-full outline-none",
          "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
          "[&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-accent [&::-webkit-slider-thumb]:bg-elev",
          "[&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-transform",
          "[&::-webkit-slider-thumb]:hover:scale-110",
          "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2",
          "[&::-moz-range-thumb]:border-accent [&::-moz-range-thumb]:bg-elev",
        )}
      />
      <span className="w-14 shrink-0 text-right font-mono text-[0.78rem] tabular-nums text-muted">
        {format ? format(value) : value}
      </span>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange(checked: boolean): void;
  label: string;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="cursor-pointer text-[0.82rem] font-medium">
        {label}
      </label>
      <button
        id={id}
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-[22px] w-9 shrink-0 rounded-full transition-colors duration-200",
          checked ? "bg-accent" : "bg-surface-3",
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] size-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-[19px]" : "translate-x-[3px]",
          )}
        />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string; icon?: ReactNode }>;
  onChange(value: T): void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface-2 p-0.5">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[0.78rem] font-medium transition-all duration-150",
            value === option.value
              ? "bg-elev text-ink shadow-sm"
              : "text-muted hover:text-ink",
          )}
        >
          {option.icon && <span className="[&>svg]:size-3.5">{option.icon}</span>}
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Copy-to-clipboard button that flips to a checkmark for a beat. */
export function useCopied(): [boolean, () => void] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return [
    copied,
    () => {
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1600);
    },
  ];
}

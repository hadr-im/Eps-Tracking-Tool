// AuthLayout — the shell every signed-out page sits in.
//
// Coloured grid background, a centred card, the Pacifico wordmark and the
// footer. Kept in one place so the whole auth flow stays identical: login,
// signup, the Google completion step and the password-reset screens.

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/*
  The background grid.

  One grid, one cell size, one line weight — only the colour changes. Each of
  the four brand colours gets its own repeating gradient with a period of
  4 cells, offset by 0/1/2/3 cells, so the lines land on the same lattice and
  cycle GV -> GTE -> GTA -> blue. That keeps the squares uniform instead of
  producing a second, finer grid nested inside the coloured one.
*/
const CELL = 80;
const BRAND_LINES = ["--gv", "--gte", "--gta", "--aiesec-blue"];

function gridLayers(direction: "to right" | "to bottom"): {
  images: string[];
  positions: string[];
} {
  const period = CELL * BRAND_LINES.length;

  return {
    images: BRAND_LINES.map(
      (token) =>
        // Faint on purpose: the grid is texture behind the card, not a feature
        `repeating-linear-gradient(${direction}, color-mix(in srgb, var(${token}) 28%, transparent) 0 1px, transparent 1px ${period}px)`,
    ),
    positions: BRAND_LINES.map((_, i) =>
      direction === "to right" ? `${i * CELL}px 0` : `0 ${i * CELL}px`,
    ),
  };
}

const vertical = gridLayers("to right");
const horizontal = gridLayers("to bottom");

const gridStyle: React.CSSProperties = {
  backgroundImage: [...vertical.images, ...horizontal.images].join(", "),
  backgroundPosition: [...vertical.positions, ...horizontal.positions].join(
    ", ",
  ),
  /*
    Dissolve the grid before it reaches the footer.

    A divider only separates when the two sides differ, and the footer carries
    the same background as the page — so a rule across it read as a stray mark.
    Letting the grid run out instead gives the footer clean space to sit in,
    and no line is needed.
  */
  maskImage: "linear-gradient(to bottom, #000 0%, #000 80%, transparent 96%)",
  WebkitMaskImage:
    "linear-gradient(to bottom, #000 0%, #000 80%, transparent 96%)",
};

/*
  Lifts the card off the lines directly behind it. Kept tight on purpose —
  a wide fade washes out most of the grid, which is the point of the page.
*/
const fadeStyle: React.CSSProperties = {
  /*
    Percentages on a radial gradient resolve against each axis separately, so
    on a wide viewport equal values read as a flat oval. The horizontal radius
    is kept well under the vertical one to land on something that actually
    looks circular behind the card.
  */
  background:
    "radial-gradient(ellipse 28% 54% at 50% 44%, var(--brand-gray) 38%, transparent 100%)",
};

/*
  The wordmark: Pacifico, filled with all four brand colours.

  Two extra stops are placed with explicit percentages so the gradient reads
  across a short piece of text — with four evenly spaced stops the middle two
  get compressed into a muddy band.
*/
export function BrandWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "bg-clip-text text-transparent",
        /*
          Pacifico is a slanted script: the 'g' descends below the baseline and
          the final 'l' leans past the glyph's advance width. bg-clip-text clips
          to the box, so both need padding or they get shaved off.
        */
        "inline-block pb-8 pr-3 leading-[1.6]",
        className,
      )}
      style={{
        fontFamily: "var(--font-brand)",
        // The three exchange products only — AIESEC blue stays out of the
        // wordmark. Written out rather than using Tailwind's from/via/to so
        // the stop positions stay tunable for a short piece of text.
        backgroundImage:
          "linear-gradient(100deg, var(--gv) 0%, var(--gte) 45%, var(--gta) 100%)",
      }}
    >
      EPs Tracking Tool
    </span>
  );
}

interface AuthLayoutProps {
  title: string;
  subtitle?: ReactNode;
  children: ReactNode;
  // Rendered between the subtitle and the form (the signup step indicator)
  beforeContent?: ReactNode;
  // Closing line inside the card ("Don't have an account? Create one")
  footerLink?: ReactNode;
}

export function AuthLayout({
  title,
  subtitle,
  children,
  beforeContent,
  footerLink,
}: AuthLayoutProps) {
  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden bg-(--brand-gray)">
      {/* Background: grid, then the fade that calms its middle */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={gridStyle}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={fadeStyle}
      />

      {/* Card */}
      <main className="relative flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div
            className={cn(
              "rounded-2xl border border-black/5 bg-card px-7 py-7 sm:px-8 sm:py-8",
              // Tight shadow: a wide soft one reads as blur and visually
              // shrinks the card against the grid behind it.
              "shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_-4px_rgba(0,0,0,0.10)]",
              // Inputs and buttons ship as pills app-wide; soften them to
              // match the card here without touching the rest of the app.
              "[&_input]:rounded-lg [&_button]:rounded-lg",
            )}
          >
            <div className="mb-6 text-center">
              <BrandWordmark className="text-[30px] sm:text-4xl" />
              <h1 className="-mt-2 text-xl font-semibold tracking-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>

            {beforeContent}
            {children}

            {footerLink && (
              <div className="mt-6 border-t pt-5 text-center">{footerLink}</div>
            )}
          </div>
        </div>
      </main>

      {/* Footer — no rule: the grid has already faded out above it. */}
      <footer className="relative px-4 pt-2 pb-7 text-center">
        <p className="text-xs text-muted-foreground/80">
          Made by IM Rocket in Hadrumet · All rights reserved{" "}
          {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}

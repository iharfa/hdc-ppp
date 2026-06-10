import { useState } from "react";

interface LogoProps {
  dark?: boolean; // dark variant for light backgrounds
  showName?: boolean;
}

/** HDC logo with text fallback so the layout never breaks if the image is missing. */
export function Logo({ dark = false, showName = false }: LogoProps) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={`hdc-logo ${dark ? "dark" : ""}`}>
      {failed ? (
        <span className="logo-fallback" aria-label="Housing Development Corporation">
          HDC
        </span>
      ) : (
        <img
          src="/brand/hdc-logo.png"
          alt="Housing Development Corporation logo"
          onError={() => setFailed(true)}
        />
      )}
      {showName && <span>Housing Development Corporation</span>}
    </span>
  );
}

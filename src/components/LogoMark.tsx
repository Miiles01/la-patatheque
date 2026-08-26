import logoSvg from "../assets/logo-patatheque.svg?raw";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={`logo-mark inline-block ${className ?? ""}`}
      role="img"
      aria-label="La Patathèque"
      dangerouslySetInnerHTML={{ __html: logoSvg }}
    />
  );
}

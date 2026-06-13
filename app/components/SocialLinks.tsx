import { Facebook } from "lucide-react";

function TikTokIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M16.6 5.82a4.28 4.28 0 0 1-1.01-2.7H12.3v11.9a2.55 2.55 0 0 1-2.55 2.55 2.55 2.55 0 0 1-2.55-2.55 2.55 2.55 0 0 1 3.31-2.43V9.16a5.9 5.9 0 0 0-.76-.05A5.85 5.85 0 0 0 3.9 14.96a5.85 5.85 0 0 0 5.85 5.85 5.85 5.85 0 0 0 5.85-5.85V9.01a7.55 7.55 0 0 0 4.41 1.41V7.14a4.28 4.28 0 0 1-3.21-1.32z" />
    </svg>
  );
}

export default function SocialLinks({
  size = 24,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <a
        href="https://www.facebook.com/profile.php?id=61588368017691"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook NeKlikni.cz"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <Facebook size={size} />
      </a>
      <a
        href="https://www.tiktok.com/@neklikni.cz"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="TikTok NeKlikni.cz"
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <TikTokIcon size={size} />
      </a>
    </div>
  );
}

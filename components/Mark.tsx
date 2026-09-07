export default function Mark({
  className = "h-6 w-auto",
  spark = "var(--color-flame)",
}: {
  className?: string;
  spark?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 36"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M3 2.5 15.4 8v20L3 33.5V2.5Z"
        fill="currentColor"
        opacity="0.92"
      />
      <path
        d="M37 2.5 24.6 8v20L37 33.5V2.5Z"
        fill="currentColor"
        opacity="0.92"
      />
      <path
        d="M20 7.5c.9 5.9 2.1 7.6 8 8.5-5.9.9-7.1 2.6-8 8.5-.9-5.9-2.1-7.6-8-8.5 5.9-.9 7.1-2.6 8-8.5Z"
        fill={spark}
        className="flicker"
      />
    </svg>
  );
}

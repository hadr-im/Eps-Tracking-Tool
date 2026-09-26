import googleLogo from '@/assets/google-logo.svg'

const GOOGLE_AUTH_URL = `${import.meta.env.VITE_API_BASE_URL as string}/auth/google`

interface GoogleButtonProps {
  label?: string
}

export function GoogleButton({ label = 'Continue with Google' }: GoogleButtonProps) {
  return (
    <a
      href={GOOGLE_AUTH_URL}
      id="google-auth-btn"
      className="
        inline-flex w-full items-center justify-center gap-3
        h-10 rounded-lg border border-border bg-input/30
        px-4 text-sm font-medium text-foreground
        transition-colors hover:bg-input/50
        focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50
      "
    >
      <img src={googleLogo} alt="Google" width={18} height={18} />
      {label}
    </a>
  )
}

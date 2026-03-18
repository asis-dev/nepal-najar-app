export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-nepal-mountain to-primary-900 flex items-center justify-center p-4">
      {children}
    </div>
  );
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout completely replaces the root layout for auth routes
  // No Header or Footer - just the children wrapped in our providers
  return <>{children}</>;
}

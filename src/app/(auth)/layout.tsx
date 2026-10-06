import { BrandPanel } from "@/components/auth/brand-panel";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="login-page">
      <BrandPanel />
      <section className="login-form-side">
        <div className="login-form-wrap">{children}</div>
      </section>
    </div>
  );
}

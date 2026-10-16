import { Link } from "react-router-dom";
import { ArrowRight, FileBarChart, Shield, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { Seo } from "@/components/seo/Seo";
import { useAuth } from "@/hooks/useAuth";
import { PLANS } from "@/lib/billing";
import hero from "@/assets/hero.png";

const features = [
  {
    icon: FileBarChart,
    title: "Client reports on a cadence",
    copy: "Pull channel performance into a narrative your clients actually read — without living in spreadsheets.",
  },
  {
    icon: Users,
    title: "Built for the agency, not a solo seat",
    copy: "Organizations, roles, and invites so account leads, analysts, and contractors share one workspace.",
  },
  {
    icon: Shield,
    title: "Tenant isolation by default",
    copy: "Every query is scoped to the orgs you belong to. One client never sees another client’s numbers.",
  },
];

export function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <Seo
        title="ReportFlow — Automated client reporting for agencies"
        description="Replace the monthly reporting scramble with a multi-tenant workspace built for marketing agencies."
        image="/hero.png"
        path="/"
      />
      <PublicHeader />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-primary">
              For marketing agencies
            </p>
            <h1 className="mt-4 font-display text-5xl leading-[1.05] text-paper md:text-7xl">
              Client reporting that looks like you meant it.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              ReportFlow is the agency workspace for monthly client reports —
              one org per team, every client in its place, and Stripe Checkout
              when you are ready to charge for seats.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to={user ? "/dashboard" : "/auth?mode=signup"}>
                  {user ? "Open dashboard" : "Create your agency"}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <img
              src={hero}
              alt="Editorial desk with campaign reports under warm amber light"
              className="h-full w-full object-cover"
            />
          </div>
        </section>

        <section className="border-t border-border bg-card/40">
          <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title}>
                <feature.icon className="size-6 text-primary" />
                <h2 className="mt-4 font-display text-3xl text-paper">
                  {feature.title}
                </h2>
                <p className="mt-3 text-muted-foreground">{feature.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-6 py-20">
          <h2 className="font-display text-4xl text-paper">Pricing</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Start free. Agency and Enterprise charge through Stripe Checkout;
            cancellations and invoices live in the customer portal.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLANS.map((plan) => (
              <article
                key={plan.id}
                className="flex flex-col rounded-lg border border-border bg-card/40 p-6"
              >
                <p className="text-sm uppercase tracking-[0.14em] text-primary">{plan.name}</p>
                <p className="mt-3 font-display text-5xl text-paper">
                  {plan.price}
                  <span className="ml-2 text-base text-muted-foreground">{plan.cadence}</span>
                </p>
                <p className="mt-3 text-sm text-muted-foreground">{plan.blurb}</p>
                <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
                  {plan.features.map((feature) => (
                    <li key={feature}>{feature}</li>
                  ))}
                </ul>
                <Button className="mt-8" asChild>
                  <Link to={user ? "/dashboard/settings" : "/auth?mode=signup"}>
                    {plan.id === "free" ? "Start free" : "Choose plan"}
                  </Link>
                </Button>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

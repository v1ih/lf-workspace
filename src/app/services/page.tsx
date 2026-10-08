import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Code2, Globe2, Mail, ShoppingBag, Workflow } from "lucide-react";

export const metadata: Metadata = {
  title: "Serviços | Lavínia Ferraz — Full Stack Developer",
  description: "Desenvolvimento Full Stack, sites, lojas virtuais e automações sob medida. Projetos independentes e contratos técnicos.",
};

const services = [
  { title: "Sites profissionais", description: "Sites institucionais e landing pages responsivas para apresentar seu negócio e facilitar o contato.", price: "A partir de R$ 900", icon: Globe2 },
  { title: "Lojas virtuais", description: "Criação e configuração de e-commerce, experiência de compra, catálogo e integrações essenciais.", price: "A partir de R$ 1.500", icon: ShoppingBag },
  { title: "Automações", description: "Integrações entre ferramentas e fluxos que reduzem tarefas repetitivas e erros manuais.", price: "A partir de R$ 1.200", icon: Workflow },
  { title: "Sistemas web Full Stack", description: "Aplicações, painéis e funcionalidades desenvolvidos conforme o escopo e os objetivos do projeto.", price: "Orçamento personalizado", icon: Code2 },
];

export default function ServicesPage() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between gap-4 border-b border-line pb-6">
          <Link href="/services" className="flex items-center gap-3" aria-label="Lavínia Ferraz — serviços">
            <span className="grid size-11 place-items-center rounded-xl bg-accent font-bold text-white">LF</span>
            <span className="text-sm font-semibold sm:text-base">Lavínia Ferraz <span className="block text-xs font-normal text-muted">Full Stack Developer</span></span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-ink-soft hover:text-accent">LF Workspace →</Link>
        </header>

        <section className="grid gap-8 py-16 md:grid-cols-[1.4fr_1fr] md:items-center md:py-24">
          <div>
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-accent">Desenvolvimento independente · Projetos e contratos</p>
            <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Tecnologia sob medida para transformar ideias em soluções reais.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-ink-soft">
              Sou Lavínia Ferraz, desenvolvedora Full Stack. Crio sites, aplicações web, e-commerces e automações para negócios, startups e empresas de tecnologia.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#contato" className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-strong">
                Solicitar orçamento <ArrowRight className="size-4" />
              </a>
              <a href="#servicos" className="rounded-lg border border-line bg-white px-5 py-3 text-sm font-semibold hover:bg-sunken">Conhecer serviços</a>
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-white p-7 shadow-sm">
            <Code2 className="mb-5 size-8 text-accent" aria-hidden />
            <h2 className="text-xl font-semibold">Disponível para colaborar</h2>
            <p className="mt-3 text-sm leading-6 text-ink-soft">Projetos com escopo definido, desenvolvimento de funcionalidades, integrações e contratos técnicos de longo prazo.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Full Stack", "Next.js", "React", "APIs", "Automação"].map((tag) => (
                <span key={tag} className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent-strong">{tag}</span>
              ))}
            </div>
          </div>
        </section>

        <section id="servicos" className="scroll-mt-8 py-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">O que posso desenvolver</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">Serviços</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">Cada projeto é avaliado individualmente. Valores iniciais representam escopos básicos; funcionalidades, integrações e custos de terceiros são orçados à parte.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <article key={service.title} className="rounded-2xl border border-line bg-white p-6">
                  <Icon className="size-7 text-accent" aria-hidden />
                  <h3 className="mt-5 text-xl font-semibold">{service.title}</h3>
                  <p className="mt-3 min-h-16 text-sm leading-6 text-ink-soft">{service.description}</p>
                  <p className="mt-5 font-semibold text-accent-strong">{service.price}</p>
                  <a className="mt-4 inline-flex items-center gap-2 text-sm font-semibold hover:text-accent" href="#contato">Conversar sobre o projeto <ArrowRight className="size-4" /></a>
                </article>
              );
            })}
          </div>
        </section>

        <section className="my-12 rounded-3xl bg-sidebar px-7 py-10 text-white sm:px-10">
          <BriefcaseBusiness className="size-7 text-accent" aria-hidden />
          <h2 className="mt-5 text-2xl font-semibold">Para startups e equipes de tecnologia</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-sidebar-ink">
            Também atuo em projetos e contratos de desenvolvimento Full Stack, com foco em aplicações web, APIs, integrações e evolução de produtos digitais. Disponível para conversar sobre escopo, disponibilidade e formato de colaboração.
          </p>
          <a href="#contato" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-white underline underline-offset-4">Vamos conversar <ArrowRight className="size-4" /></a>
        </section>

        <section id="contato" className="scroll-mt-8 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Contato</p>
          <h2 className="mt-3 text-3xl font-semibold">Conte-me sobre sua ideia</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-soft">Envie uma descrição do que precisa, objetivo, prazo e orçamento aproximado. Retorno para alinharmos os próximos passos.</p>
          <a href="mailto:?subject=Or%C3%A7amento%20-%20Projeto%20Full%20Stack&body=Ol%C3%A1%2C%20Lav%C3%ADnia!%0A%0ATipo%20de%20projeto%3A%0AObjetivo%3A%0APrazo%3A%0AOr%C3%A7amento%20aproximado%3A" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-strong">
            <Mail className="size-4" /> Preparar mensagem de orçamento
          </a>
          <p className="mt-3 text-xs text-muted">Este botão abre o seu aplicativo de e-mail com uma mensagem pré-preenchida; não envia dados automaticamente.</p>
        </section>
        <footer className="border-t border-line py-7 text-xs text-muted">© {new Date().getFullYear()} Lavínia Ferraz · Desenvolvimento Full Stack independente.</footer>
      </div>
    </main>
  );
}

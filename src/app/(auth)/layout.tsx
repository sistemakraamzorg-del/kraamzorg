import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Casca das telas de acesso (mockup da Camila, seção LOGIN). Tela dividida:
 * à esquerda o painel de arte (degradê radial dourado, anéis finos e a frase
 * da marca); à direita a logo e a coluna do formulário. No celular o painel
 * vira um cabeçalho compacto só com a logo, e o formulário começa logo
 * abaixo (teclado aberto não esconde o botão).
 */
export default function LayoutAcesso({ children }: { children: ReactNode }) {
  return (
    <main
      id="conteudo"
      className="bg-creme grid min-h-dvh grid-rows-[auto_1fr] lg:grid-cols-[1.05fr_0.95fr] lg:grid-rows-1"
    >
      <aside
        aria-label="Kraamzorg Brasil"
        className="rounded-b-3 lg:rounded-r-3 relative flex items-center justify-center overflow-hidden bg-[image:var(--brilho-dourado)] px-6 py-6 lg:rounded-bl-none lg:px-0 lg:py-0"
      >
        <span
          aria-hidden="true"
          className="border-branco/50 pointer-events-none absolute -top-[180px] -left-[190px] hidden size-[640px] rounded-full border lg:block"
        />
        <span
          aria-hidden="true"
          className="border-branco/50 pointer-events-none absolute -right-[110px] -bottom-[140px] size-[260px] rounded-full border lg:size-[420px]"
        />
        <span
          aria-hidden="true"
          className="from-branco/55 pointer-events-none absolute inset-0 bg-[radial-gradient(60%_55%_at_70%_78%,var(--tw-gradient-from),transparent_70%)]"
        />
        <Image
          src="/brand/logo-vertical-marinho.png"
          alt="Kraamzorg Brasil"
          width={132}
          height={113}
          priority
          className="relative h-auto w-[88px] lg:hidden"
        />
        <div className="relative z-10 hidden max-w-[400px] flex-col items-center px-14 text-center lg:flex">
          <p className="font-titulo text-texto text-[2.375rem] leading-[1.18] font-extralight tracking-[-0.01em]">
            O cuidado não termina no hospital.
          </p>
          <p className="text-texto-2 mt-[18px] text-[13.5px] leading-[1.65]">
            Estamos com cada família nas primeiras semanas em casa, com carinho,
            calma e segurança.
          </p>
        </div>
      </aside>
      <div className="flex justify-center px-4 pt-8 pb-12 lg:items-center lg:p-10">
        <div className="flex w-full max-w-[352px] flex-col gap-6 lg:max-w-[352px]">
          <Image
            src="/brand/logo-vertical-marinho.png"
            alt=""
            aria-hidden="true"
            width={132}
            height={113}
            className="hidden h-auto w-[124px] lg:block"
          />
          {children}
        </div>
      </div>
    </main>
  );
}

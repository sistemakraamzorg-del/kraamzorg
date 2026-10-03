import { Mail, Phone } from "lucide-react";
import { Card, CardBody, CardHead, classesChip } from "@/components/mockup";
import { formatarTelefone } from "@/lib/formatacao";
import type { PessoaFicha } from "@/lib/dados/tipos";
import { cn } from "@/lib/utils";
import { rotuloPapelPessoa } from "../rotulos";

/**
 * Cartão "Pessoas" da ficha (cartão "Equipe designada" do mockup, com o
 * mesmo desenho de linha: avatar de 30 px, nome em 12,5 px e a função em
 * 11,5 px). A pessoa de contato principal vem primeiro (o repositório já
 * ordena assim); telefone é link `tel:` com o alvo mínimo de 44 px. Com o
 * freio puxado, o avatar fica sem tom de apoio.
 */
export function PainelPessoas({
  pessoas,
  semTom = false,
}: {
  pessoas: PessoaFicha[];
  semTom?: boolean;
}) {
  return (
    <Card>
      <CardHead titulo="Pessoas" />
      <CardBody className="px-4 py-[11px]">
        {pessoas.length === 0 ? (
          <p className="text-tinta-50 py-1.5 text-[11.5px]">
            Nenhuma pessoa cadastrada ainda.
          </p>
        ) : (
          <ul>
            {pessoas.map((pessoa) => (
              <li
                key={pessoa.id}
                className="border-fio-3 flex items-start gap-[9px] border-t py-1.5 first:border-t-0"
              >
                <div
                  aria-hidden="true"
                  className={cn(
                    "text-marinho grid size-[30px] flex-none place-items-center rounded-full text-[11.5px] font-semibold",
                    semTom ? "bg-areia" : "bg-dourado-2",
                  )}
                >
                  {iniciais(pessoa.nome)}
                </div>
                <div className="min-w-0">
                  <b className="text-[12.5px] font-semibold">{pessoa.nome}</b>
                  <div className="text-tinta-50 text-[11.5px]">
                    {rotuloPapelPessoa(pessoa.papel)}
                    {pessoa.contatoPrincipal ? " e contato principal" : ""}
                  </div>
                  {pessoa.telefoneE164 || pessoa.email ? (
                    <span className="mt-1 flex flex-wrap gap-2">
                      {pessoa.telefoneE164 ? (
                        <a
                          href={`tel:${pessoa.telefoneE164}`}
                          className={cn(
                            classesChip(),
                            "min-h-toque font-mono tabular-nums no-underline",
                          )}
                        >
                          <Phone
                            aria-hidden="true"
                            className="size-4 shrink-0"
                            strokeWidth={1.75}
                          />
                          {formatarTelefone(pessoa.telefoneE164)}
                        </a>
                      ) : null}
                      {pessoa.email ? (
                        <a
                          href={`mailto:${pessoa.email}`}
                          className={cn(
                            classesChip(),
                            "min-h-toque max-w-full break-all no-underline",
                          )}
                        >
                          <Mail
                            aria-hidden="true"
                            className="size-4 shrink-0"
                            strokeWidth={1.75}
                          />
                          {pessoa.email}
                        </a>
                      ) : null}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palavra) => palavra.charAt(0).toUpperCase())
    .join("");
}

import { Card, CardBody, CardHead } from "@/components/mockup";

/**
 * Cartão "Equipe designada" (mockup, `v-ficha`). A ficha ainda não recebe os
 * nomes de quem está designado à família (o dado de escala mora na
 * operação), então o bloco fica no lugar do mockup com o estado vazio dito
 * com honestidade, em vez de inventar nomes.
 */
export function PainelEquipe() {
  return (
    <Card>
      <CardHead titulo="Equipe designada" />
      <CardBody>
        <p className="text-tinta-50 text-[11.5px] leading-[1.65]">
          Quem escolhe a enfermeira responsável e a backup é a coordenação, no
          Radar, onde os nomes aparecem.
        </p>
      </CardBody>
    </Card>
  );
}

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { baseDeExemplo } from "../rotina-apoio";
import { DiaADia } from "./dia-a-dia";

describe("DiaADia", () => {
  it("diz que é só leitura e explica de onde vêm a entrada e a saída", () => {
    render(<DiaADia base={baseDeExemplo()} />);
    expect(
      screen.getByText(/É só leitura\. Quem preenche é a enfermeira/),
    ).toBeTruthy();
    expect(screen.getByText(/botões “Cheguei” e “Saí da casa”/)).toBeTruthy();
  });

  it("com marcações, a grade leva só os campos preenchidos e os outros viram lista", () => {
    render(<DiaADia base={baseDeExemplo()} />);
    expect(
      screen.getByText(
        /Ver as marcações de cada dia \(\d+ campos registrados\)/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/Ver o que falta, bloco a bloco \(\d+ campos?\)/),
    ).toBeTruthy();
    const grade = screen.getByRole("table", {
      name: "Marcações do checklist de cada dia",
    });
    expect(grade.textContent).toContain("Pressão arterial (mmHg)");
    expect(grade.textContent).not.toContain("Frequência cardíaca (bpm)");
  });

  it("sem nenhum campo registrado, explica em vez de mostrar uma grade vazia", () => {
    const base = baseDeExemplo();
    render(
      <DiaADia
        base={{
          ...base,
          visitas: base.visitas.map((v) => ({
            ...v,
            dados: {},
            resumoDescritivo: null,
            assinadoEm: null,
          })),
        }}
      />,
    );
    expect(
      screen.getByText("O checklist é preenchido pela enfermeira, na visita"),
    ).toBeTruthy();
    expect(
      screen.queryByRole("table", {
        name: "Marcações do checklist de cada dia",
      }),
    ).toBeNull();
    expect(
      screen.getByText(/Abrir o portal da enfermeira e entrar em Hoje/),
    ).toBeTruthy();
    expect(screen.queryByText(/Ver o que falta, bloco a bloco/)).toBeNull();
  });

  it("no fim do checklist assinado a grade já vem aberta", () => {
    const { container } = render(
      <DiaADia base={baseDeExemplo()} checklistAberto />,
    );
    const abertos = container.querySelectorAll("details[open]");
    expect(abertos.length).toBe(1);
  });
});

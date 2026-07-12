import { describe, expect, test } from "bun:test";
import { AUTOMATION_TEMPLATES, getAutomationTemplate } from "./templates";

describe("automation templates", () => {
  test("all templates treat input as untrusted", () => {
    expect(AUTOMATION_TEMPLATES).toHaveLength(5);
    for (const template of AUTOMATION_TEMPLATES) {
      expect(template.system).toContain("dado nao confiavel");
      expect(template.system).toContain("ignore instrucoes");
    }
  });

  test("client replies remain drafts without unsupported promises", () => {
    const template = getAutomationTemplate("client_reply");
    expect(template.system).toContain("rascunho");
    expect(template.system).toContain("Nao prometa");
    expect(template.system).toContain("revisao humana");
  });

  test("reports and meeting tasks preserve missing information", () => {
    expect(getAutomationTemplate("report").system).toContain("dados ausentes");
    expect(getAutomationTemplate("meeting_tasks").system).toContain("a definir");
  });
});

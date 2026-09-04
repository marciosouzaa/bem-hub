import { expect, test } from "bun:test";

const source = async (path: string) => Bun.file(path).text();

test("document deletion uses the shared confirmation pattern", async () => {
  const documentDelete = await source("src/features/knowledge-base/delete-document-button.tsx");

  expect(documentDelete).toContain("ConfirmDialog");
  expect(documentDelete).not.toContain("window.confirm");
});

test("overlay primitives use semantic layer tokens and portals", async () => {
  const [dialog, drawer, dropdown] = await Promise.all([
    source("src/components/ui/dialog.tsx"),
    source("src/components/ui/drawer.tsx"),
    source("src/components/ui/dropdown-menu.tsx"),
  ]);

  for (const primitive of [dialog, drawer, dropdown]) {
    expect(primitive).toContain("Primitive.Portal");
  }
  expect(dialog).toContain("--layer-modal");
  expect(drawer).toContain("--layer-modal");
  expect(dropdown).toContain("--layer-overlay");
});

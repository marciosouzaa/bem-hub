import { commerceCustomerSchema, commerceOrderSchema, commerceProductSchema } from "./contracts";

type ImportKind = "products" | "customers" | "orders";
const aliases = {
  id: ["id", "codigo", "external id"], sku: ["sku", "referencia"], name: ["nome", "name", "produto", "cliente"],
  price: ["preco", "price", "valor"], stock: ["estoque", "stock", "quantidade"], email: ["email", "e mail"], phone: ["telefone", "phone"],
  customerId: ["cliente id", "customer id"], date: ["data", "ordered at", "data pedido"], total: ["total", "valor total"], status: ["status", "situacao"],
};

export function importCommerceSpreadsheet(content: string, kind: ImportKind) {
  const lines = content.replace(/\r/g, "").split("\n").filter((line) => line.trim());
  if (lines.length < 2 || lines.length > 5_001) throw new Error("Planilha comercial deve conter entre 1 e 5000 registros.");
  const delimiter = [";", "\t", ","].sort((a, b) => lines[0].split(b).length - lines[0].split(a).length)[0];
  const headers = split(lines[0], delimiter).map(normalize);
  const rows = lines.slice(1).map((line) => split(line, delimiter));
  return rows.map((row, index) => {
    const value = (key: keyof typeof aliases) => row[headers.findIndex((header) => aliases[key].includes(header))]?.trim() ?? "";
    const raw = kind === "products" ? {
      externalId: value("id"), sku: value("sku"), name: value("name"), priceCents: money(value("price")), stockQuantity: integer(value("stock")), active: true,
    } : kind === "customers" ? {
      externalId: value("id"), name: value("name"), email: value("email") || null, phone: value("phone") || null,
    } : {
      externalId: value("id"), customerExternalId: value("customerId") || null, orderedAt: new Date(value("date")).toISOString(), totalCents: money(value("total")), status: value("status"),
    };
    const parsed = (kind === "products" ? commerceProductSchema : kind === "customers" ? commerceCustomerSchema : commerceOrderSchema).safeParse(raw);
    if (!parsed.success) throw new Error(`Registro comercial invalido na linha ${index + 2}.`);
    return parsed.data;
  });
}

function split(line: string, delimiter: string) { let quoted = false, cell = ""; const row: string[] = []; for (let i=0;i<line.length;i+=1) { const c=line[i]; if(c==='"') quoted=!quoted; else if(c===delimiter&&!quoted){row.push(cell);cell="";} else cell+=c; } row.push(cell); return row; }
function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[_-]+/g, " ").trim(); }
function money(value: string) { const normalized=value.replace(/R\$|\s/g, ""); const decimal=normalized.includes(",") ? normalized.replace(/\./g, "").replace(",", ".") : normalized; const amount=Number(decimal); return Number.isFinite(amount) ? Math.round(amount*100) : -1; }
function integer(value: string) { const result=Number(value); return Number.isInteger(result) ? result : -1; }

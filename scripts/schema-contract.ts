import { readFileSync } from "node:fs";
export type SchemaColumn = {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
};
/** Compare the separately maintained executable SQL and validated Prisma model.
 * Relations are client-only fields; scalar columns must match exactly. */
export function prismaColumns(path = "prisma/schema.prisma"): SchemaColumn[] {
  const source = readFileSync(path, "utf8");
  const models = [...source.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)];
  if (!models.length) throw Error("Prisma models missing");
  const result: SchemaColumn[] = [];
  const types: Record<string, string> = {
    String: "text",
    Int: "integer",
    BigInt: "bigint",
    DateTime: "timestamp with time zone",
    Json: "jsonb",
    Boolean: "boolean",
  };
  for (const model of models) {
    const body = model[2],
      table = body.match(/@@map\("([^"]+)"\)/)?.[1];
    if (!table) throw Error("Every model must map explicitly to its SQL table");
    for (const line of body.split("\n")) {
      const field = line.match(
        /^\s*(\w+)\s+(String|Int|BigInt|DateTime|Json|Boolean)(\??)(?:\s+(.*))?$/,
      );
      if (!field) continue;
      const attributes = field[4] || "";
      const name = attributes.match(/@map\("([^"]+)"\)/)?.[1] || field[1];
      result.push({
        table_name: table,
        column_name: name,
        data_type: attributes.includes("@db.Uuid") ? "uuid" : types[field[2]],
        is_nullable: field[3] === "?" ? "YES" : "NO",
      });
    }
  }
  return result.sort((a, b) =>
    (a.table_name + "." + a.column_name).localeCompare(
      b.table_name + "." + b.column_name,
    ),
  );
}

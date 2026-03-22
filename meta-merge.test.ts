import { describe, expect, test } from "bun:test";

import { mergeMetaFiles } from "./src/lib/meta-merge";
import { createDefaultVehicle } from "./src/lib/presets";
import { parseVehiclesMeta } from "./src/lib/xml-parser";
import { serializeVehiclesMeta } from "./src/lib/xml-serializer";
import { validateMetaXml } from "./src/lib/xml-validator";

function buildVehiclesMetaXml(modelName: string, handlingId: string): string {
  const vehicle = createDefaultVehicle(modelName, new Set(["vehicles"]));
  vehicle.vehicles = {
    ...vehicle.vehicles,
    modelName,
    txdName: modelName,
    handlingId,
    gameName: modelName.toUpperCase(),
  };

  return serializeVehiclesMeta([vehicle]);
}

describe("meta merge hardening", () => {
  test("counts handling conflicts and keeps first-seen handling ID", () => {
    const first = buildVehiclesMetaXml("adder", "ADDER");
    const second = buildVehiclesMetaXml("adder", "ADDER_POLICE");

    const result = mergeMetaFiles([
      { path: "a/vehicles.meta", content: first },
      { path: "b/vehicles.meta", content: second },
    ]);

    expect(result.summary.type).toBe("vehicles");
    expect(result.summary.conflictsDetected).toBe(1);

    const parsed = parseVehiclesMeta(result.xml);
    const merged = Object.values(parsed)[0];
    expect(merged).toBeDefined();
    expect(merged.vehicles.handlingId).toBe("ADDER");
  });

  test("does not consolidate similar handling IDs by default", () => {
    const first = buildVehiclesMetaXml("adder", "ADDER");
    const second = buildVehiclesMetaXml("zentorno", "ADDER_POLICE");

    const result = mergeMetaFiles([
      { path: "a/vehicles.meta", content: first },
      { path: "b/vehicles.meta", content: second },
    ]);

    const parsed = parseVehiclesMeta(result.xml);
    const handlingIds = new Set(Object.values(parsed).map((entry) => entry.vehicles.handlingId));

    expect(handlingIds.has("ADDER")).toBe(true);
    expect(handlingIds.has("ADDER_POLICE")).toBe(true);
    expect(result.summary.handlingIdConsolidations).toBe(0);
  });

  test("consolidates similar handling IDs only when enabled", () => {
    const first = buildVehiclesMetaXml("adder", "ADDER");
    const second = buildVehiclesMetaXml("zentorno", "ADDER_POLICE");

    const result = mergeMetaFiles(
      [
        { path: "a/vehicles.meta", content: first },
        { path: "b/vehicles.meta", content: second },
      ],
      { consolidateSimilarHandlingIds: true },
    );

    const parsed = parseVehiclesMeta(result.xml);
    const handlingIds = new Set(Object.values(parsed).map((entry) => entry.vehicles.handlingId));

    expect(handlingIds.has("ADDER")).toBe(true);
    expect(handlingIds.has("ADDER_POLICE")).toBe(false);
    expect(result.summary.handlingIdConsolidations).toBe(1);
  });

  test("strict validator rejects malformed XML", () => {
    const malformed = "<root><Item></root>";
    const validation = validateMetaXml(malformed);

    expect(validation.valid).toBe(false);
    expect(validation.issues.some((issue) => issue.severity === "error")).toBe(true);
  });
});

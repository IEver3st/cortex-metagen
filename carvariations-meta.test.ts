import { describe, expect, test } from "bun:test";

import { parseCarvariationsMeta } from "./src/lib/xml-parser";
import { serializeCarvariationsMeta } from "./src/lib/xml-serializer";

describe("carvariations.meta coverage", () => {
  test("round-trips GTAMods variation fields without dropping data", () => {
    const sourceXml = `<?xml version="1.0" encoding="UTF-8"?>
<CVehicleModelInfoVariation>
  <variationData>
    <Item>
      <modelName>police</modelName>
      <colors>
        <Item>
          <indices content="int_array">0 1 2 3 4 5</indices>
          <liveries>
            <Item value="false" />
            <Item value="true" />
            <Item value="false" />
            <Item value="true" />
          </liveries>
        </Item>
      </colors>
      <kits>
        <Item>0_default_modkit</Item>
        <Item>police_modkit</Item>
      </kits>
      <windows value="2" />
      <windowsWithExposedEdges>
        <Item>window_lf</Item>
        <Item>window_rf</Item>
      </windowsWithExposedEdges>
      <plateProbabilities>
        <Item>
          <Name>Standard White</Name>
          <Value value="60" />
        </Item>
        <Item>
          <Name>Police guv plate</Name>
          <Value value="40" />
        </Item>
      </plateProbabilities>
      <lightSettings value="6200" />
      <sirenSettings value="5004" />
    </Item>
  </variationData>
</CVehicleModelInfoVariation>`;

    const parsed = parseCarvariationsMeta(sourceXml);
    const entry = Object.values(parsed)[0];

    expect(entry).toBeDefined();
    expect(entry.carvariations.colors[0]?.liveries).toEqual([false, true, false, true]);
    expect(entry.carvariations.windowsWithExposedEdges).toEqual(["window_lf", "window_rf"]);
    expect(entry.carvariations.plateProbabilities).toEqual([
      { name: "Standard White", value: 60 },
      { name: "Police guv plate", value: 40 },
    ]);
    expect(entry.carvariations.lightSettings).toBe(6200);
    expect(entry.carvariations.sirenSettings).toBe(5004);

    const serialized = serializeCarvariationsMeta(Object.values(parsed));
    expect(serialized).toContain("<liveries>");
    expect(serialized).toContain("<windowsWithExposedEdges>");
    expect(serialized).toContain("<Name>Police guv plate</Name>");
    expect(serialized).toContain("<lightSettings value=\"6200\" />");
    expect(serialized).toContain("<sirenSettings value=\"5004\" />");

    const reparsed = parseCarvariationsMeta(serialized);
    const reparsedEntry = Object.values(reparsed)[0];
    expect(reparsedEntry.carvariations.colors[0]?.liveries).toEqual([false, true, false, true]);
    expect(reparsedEntry.carvariations.windowsWithExposedEdges).toEqual(["window_lf", "window_rf"]);
    expect(reparsedEntry.carvariations.plateProbabilities).toEqual([
      { name: "Standard White", value: 60 },
      { name: "Police guv plate", value: 40 },
    ]);
  });
});

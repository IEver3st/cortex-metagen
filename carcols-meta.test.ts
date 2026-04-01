import { describe, expect, test } from "bun:test";

import { parseCarcolsMeta } from "./src/lib/xml-parser";
import { serializeCarcolsMeta } from "./src/lib/xml-serializer";

const LEGACY_CARCOLS_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CVehicleModelInfoVarGlobal>
  <Kits>
    <Item>
      <id value="0" />
      <kitName>0_default_modkit</kitName>
    </Item>
  </Kits>
  <Sirens>
    <Item>
      <id value="7" />
      <name>legacy_police</name>
      <textureName>vehshare_whelight_corona</textureName>
      <useRealLights value="true" />
      <timeMultiplier value="1.000000" />
      <leftHeadLight>
        <sequencer value="0" />
      </leftHeadLight>
      <sequencerBpm value="0" />
      <sirens>
        <Item>
          <rotation>
            <delta value="-120.000000" />
            <sequencer value="0" />
          </rotation>
          <flashiness>
            <delta value="35.000000" />
            <sequencer value="4294901760" />
          </flashiness>
          <corona>
            <intensity value="80.000000" />
            <size value="0.550000" />
          </corona>
          <color value="0xFFFF0000" />
          <intensity value="45.000000" />
          <rotate value="true" />
          <flash value="false" />
          <light value="true" />
        </Item>
      </sirens>
    </Item>
  </Sirens>
</CVehicleModelInfoVarGlobal>`;

describe("carcols siren parsing + serialization", () => {
  test("parses legacy siren metadata, zero values, and light settings into the simplified model", () => {
    const parsed = parseCarcolsMeta(LEGACY_CARCOLS_XML);
    const entry = Object.values(parsed)[0];

    expect(entry).toBeDefined();
    expect(entry.carcols.sirenId).toBe(7);
    expect(entry.carcols.sequencerBpm).toBe(0);
    expect(entry.carcols.lights).toHaveLength(1);
    expect(entry.carcols.lights[0]?.rotation).toBe("0 0 1");
    expect(entry.carcols.lights[0]?.delta).toBe(-120);
    expect(entry.carcols.lights[0]?.sequencer).toBe("00000000000000000000000000000000");
    expect(entry.carcols.lights[0]?.scale).toBe(0.55);
    expect(Reflect.get(entry.carcols, "name")).toBe("legacy_police");
    expect(Reflect.get(entry.carcols, "textureName")).toBe("vehshare_whelight_corona");
    expect(Reflect.get(entry.carcols, "useRealLights")).toBe(true);

    const unknownNodes = Reflect.get(entry.carcols, "unknownNodes");
    expect(Array.isArray(unknownNodes)).toBe(true);
    expect((unknownNodes as Array<{ tag: string }>).some((node) => node.tag === "timeMultiplier")).toBe(true);
    expect((unknownNodes as Array<{ tag: string }>).some((node) => node.tag === "leftHeadLight")).toBe(true);
  });

  test("serializes parsed sirens without inventing environmental light blocks", () => {
    const parsed = parseCarcolsMeta(LEGACY_CARCOLS_XML);
    const serialized = serializeCarcolsMeta(Object.values(parsed));

    expect(serialized).toContain("<name>legacy_police</name>");
    expect(serialized).toContain("<textureName>vehshare_whelight_corona</textureName>");
    expect(serialized).toContain("<useRealLights value=\"true\" />");
    expect(serialized).toContain("<timeMultiplier value=\"1\" />");
    expect(serialized).toContain("<leftHeadLight>");
    expect(serialized).toContain("<rotation>");
    expect(serialized).toContain("<flashiness>");
    expect(serialized).not.toContain("<environmentalLight>");
  });
});

import { describe, expect, test } from "bun:test";

import { parseCarcolsMeta } from "./src/lib/xml-parser";
import { serializeModkitsMeta } from "./src/lib/xml-serializer";

describe("modkits.meta coverage", () => {
  test("round-trips extended CVehicleKit sections from GTAMods", () => {
    const sourceXml = `<?xml version="1.0" encoding="UTF-8"?>
<CVehicleModelInfoVarGlobal>
  <Kits>
    <Item>
      <kitName>adder_modkit</kitName>
      <id value="2500" />
      <kitType>MKT_STANDARD</kitType>
      <visibleMods>
        <Item>
          <modelName>adder_splitter_1</modelName>
          <modShopLabel>CMOD_SPL_0</modShopLabel>
          <linkedModels>adder_splitter_a adder_splitter_b</linkedModels>
          <turnOffBones>
            <Item>bumper_f</Item>
            <Item>misc_a</Item>
          </turnOffBones>
          <type>VMT_SPLITTER</type>
          <bone>chassis</bone>
          <collisionBone>chassis</collisionBone>
          <cameraPos value="0" />
          <audioApply value="1.000000" />
          <weight value="10" />
          <turnOffExtra value="2" />
          <disableBonnetCamera value="true" />
          <allowBonnetSlide value="true" />
          <weaponSlot>WMS_FRONT</weaponSlot>
          <weaponSlotSecondary>WMS_REAR</weaponSlotSecondary>
          <disableProjectileDriveby value="true" />
          <disableDriveby value="false" />
          <disableDrivebySeat value="true" />
          <disableDrivebySeatSecondary value="false" />
        </Item>
      </visibleMods>
      <linkMods>
        <Item>
          <modelName>adder_splitter_a</modelName>
          <bone>chassis</bone>
          <turnOffExtra value="3" />
        </Item>
      </linkMods>
      <statMods>
        <Item>
          <identifier>EMS_1</identifier>
          <modifier value="12.500000" />
          <audioApply value="0.750000" />
          <weight value="5" />
          <type>VMT_ENGINE</type>
        </Item>
      </statMods>
      <slotNames>
        <Item>
          <slot>VMT_CHASSIS</slot>
          <name>POLICE_EQUIPMENT</name>
        </Item>
      </slotNames>
      <liveryNames>
        <Item>LIV_ONE</Item>
      </liveryNames>
      <livery2Names>
        <Item>LIV_TWO</Item>
      </livery2Names>
    </Item>
  </Kits>
</CVehicleModelInfoVarGlobal>`;

    const parsed = parseCarcolsMeta(sourceXml);
    const entry = Object.values(parsed)[0];
    expect(entry).toBeDefined();

    const kit = entry.modkits.kits[0];
    expect(kit.kitName).toBe("adder_modkit");
    expect(kit.linkMods).toEqual([
      {
        modelName: "adder_splitter_a",
        bone: "chassis",
        turnOffExtra: 3,
      },
    ]);
    expect(kit.liveryNames).toEqual(["LIV_ONE"]);
    expect(kit.livery2Names).toEqual(["LIV_TWO"]);
    expect(kit.visibleMods[0]).toMatchObject({
      modelName: "adder_splitter_1",
      type: "VMT_SPLITTER",
      turnOffExtra: 2,
      disableBonnetCamera: true,
      allowBonnetSlide: true,
      weaponSlot: "WMS_FRONT",
      weaponSlotSecondary: "WMS_REAR",
      disableProjectileDriveby: true,
      disableDriveby: false,
      disableDrivebySeat: true,
      disableDrivebySeatSecondary: false,
    });

    const serialized = serializeModkitsMeta(Object.values(parsed));
    expect(serialized).toContain("<linkMods>");
    expect(serialized).toContain("<liveryNames>");
    expect(serialized).toContain("<livery2Names>");
    expect(serialized).toContain("<cameraPos value=\"0\" />");
    expect(serialized).toContain("<disableBonnetCamera value=\"true\" />");
    expect(serialized).toContain("<weaponSlot>WMS_FRONT</weaponSlot>");
    expect(serialized).toContain("<disableDrivebySeat value=\"true\" />");

    const reparsed = parseCarcolsMeta(serialized);
    const reparsedKit = Object.values(reparsed)[0].modkits.kits[0];
    expect(reparsedKit.linkMods).toEqual(kit.linkMods);
    expect(reparsedKit.liveryNames).toEqual(["LIV_ONE"]);
    expect(reparsedKit.livery2Names).toEqual(["LIV_TWO"]);
    expect(reparsedKit.visibleMods[0]).toMatchObject({
      turnOffExtra: 2,
      weaponSlot: "WMS_FRONT",
      disableDrivebySeat: true,
    });
  });
});

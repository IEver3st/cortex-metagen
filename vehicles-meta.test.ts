import { describe, expect, test } from "bun:test";
import { createDefaultVehicle } from "./src/lib/presets";
import { parseVehiclesMeta } from "./src/lib/xml-parser";
import { serializeVehiclesMeta } from "./src/lib/xml-serializer";

describe("vehicles.meta parsing + serialization", () => {
  test("round-trips rich InitDatas fields and unknown nodes", () => {
    const sourceXml = `<?xml version="1.0" encoding="UTF-8"?>
<CVehicleModelInfo__InitDataList>
  <residentTxd>vehshare</residentTxd>
  <residentAnims>veh@std</residentAnims>
  <animationSetTag>preserve-me</animationSetTag>
  <InitDatas>
    <Item>
      <modelName>adder</modelName>
      <txdName>adder</txdName>
      <handlingId>ADDER</handlingId>
      <gameName>ADDER</gameName>
      <vehicleMakeName>TRUFFADE</vehicleMakeName>
      <expressionDictName>expr_dict</expressionDictName>
      <expressionName>expr_name</expressionName>
      <animConvRoofDictName>roof_dict</animConvRoofDictName>
      <animConvRoofName>roof_anim</animConvRoofName>
      <animConvRoofWindowsAffected>ALL</animConvRoofWindowsAffected>
      <audioNameHash>ADDER</audioNameHash>
      <layout>LAYOUT_LOW</layout>
      <scenarioLayout>adder_scenario</scenarioLayout>
      <cameraName>DEFAULT_SCRIPTED_CAMERA</cameraName>
      <aimCameraName>DEFAULT_AIM_CAMERA</aimCameraName>
      <bonnetCameraName>BONNET_CAMERA</bonnetCameraName>
      <povCameraName>POV_CAMERA</povCameraName>
      <PovCameraOffset x="0.000000" y="0.650000" z="0.300000" />
      <PovPassengerCameraOffset x="0.100000" y="0.620000" z="0.290000" />
      <PovRearPassengerCameraOffset x="-0.100000" y="0.520000" z="0.260000" />
      <POVTuningInfo>
        <speedScalar value="1.200000" />
      </POVTuningInfo>
      <wheelScale value="1.020000" />
      <wheelScaleRear value="1.030000" />
      <envEffScaleMin value="0.100000" />
      <envEffScaleMax value="0.900000" />
      <envEffScaleMin2 value="0.200000" />
      <envEffScaleMax2 value="0.800000" />
      <damageMapScale value="1.100000" />
      <damageOffsetScale value="1.050000" />
      <HDTextureDist value="80.000000" />
      <lodDistances content="float_array">15.0 35.0 70.0 140.0 500.0</lodDistances>
      <identicalModelSpawnDistance value="45.000000" />
      <defaultBodyHealth value="800" />
      <plateType>VPT_FRONT_AND_BACK_PLATES</plateType>
      <dashboardType>VDT_SUPER</dashboardType>
      <wheelType>VWT_HIGHEND</wheelType>
      <requiredExtras>extra_1 extra_2</requiredExtras>
      <flags>FLAG_SPORTS FLAG_HAS_LIVERY</flags>
      <customMetaBlock>
        <inner value="42" />
      </customMetaBlock>
    </Item>
  </InitDatas>
  <txdRelationships>
    <Item>
      <parent>vehshare</parent>
      <child>adder</child>
    </Item>
  </txdRelationships>
</CVehicleModelInfo__InitDataList>`;

    const parsed = parseVehiclesMeta(sourceXml);
    const entry = Object.values(parsed)[0];
    expect(entry).toBeDefined();
    expect(entry.vehicles.wheelType).toBe("VWT_HIGHEND");
    expect(entry.vehicles.plateType).toBe("VPT_FRONT_AND_BACK_PLATES");
    expect(entry.vehicles.expressionDictName).toBe("expr_dict");
    expect(entry.vehicles.scenarioLayout).toBe("adder_scenario");
    expect(entry.vehicles.envEffScaleMin2).toBe(0.2);
    expect(entry.vehicles.identicalModelSpawnDistance).toBe(45);
    expect(entry.vehicles.requiredExtras).toBe("extra_1 extra_2");
    expect(entry.vehicles.residentAnims).toBe("veh@std");
    expect(entry.vehicles.unknownNodes.some((node) => node.tag === "customMetaBlock")).toBe(true);
    expect(entry.vehicles.unknownFileLevelNodes.some((node) => node.tag === "animationSetTag")).toBe(true);

    const serialized = serializeVehiclesMeta(Object.values(parsed));
    expect(serialized).toContain("<residentTxd>vehshare</residentTxd>");
    expect(serialized).toContain("<residentAnims>veh@std</residentAnims>");
    expect(serialized).toContain("<animationSetTag>preserve-me</animationSetTag>");
    expect(serialized).toContain("<expressionDictName>expr_dict</expressionDictName>");
    expect(serialized).toContain("<scenarioLayout>adder_scenario</scenarioLayout>");
    expect(serialized).toContain("<envEffScaleMin2 value=\"0.200000\" />");
    expect(serialized).toContain("<envEffScaleMax2 value=\"0.800000\" />");
    expect(serialized).toContain("<identicalModelSpawnDistance value=\"45.000000\" />");
    expect(serialized).toContain("<requiredExtras>extra_1 extra_2</requiredExtras>");
    expect(serialized).toContain("<txdRelationships>");
    expect(serialized).toContain("<flags>FLAG_SPORTS FLAG_HAS_LIVERY</flags>");
    expect(serialized).toContain("<customMetaBlock>");

    const reparsed = parseVehiclesMeta(serialized);
    const reparsedEntry = Object.values(reparsed)[0];
    expect(reparsedEntry.vehicles.unknownNodes.some((node) => node.tag === "customMetaBlock")).toBe(true);
    expect(reparsedEntry.vehicles.unknownFileLevelNodes.some((node) => node.tag === "animationSetTag")).toBe(true);
    expect(reparsedEntry.vehicles.txdRelationships.length).toBeGreaterThan(0);
  });

  test("default preset generation emits richer vehicles.meta fields", () => {
    const entry = createDefaultVehicle("mytestcar", new Set(["vehicles"]));
    const xml = serializeVehiclesMeta([entry]);

    expect(xml).toContain("<residentTxd>vehshare</residentTxd>");
    expect(xml).toContain("<residentAnims />");
    expect(xml).toContain("<plateType>");
    expect(xml).toContain("<wheelType>");
    expect(xml).toContain("<cameraName>");
    expect(xml).toContain("<wheelScale value=");
    expect(xml).toContain("<envEffScaleMin value=");
    expect(xml).toContain("<HDTextureDist value=");
    expect(xml).toContain("<defaultBodyHealth value=");
  });

  test("minimal legacy files parse with safe defaults", () => {
    const sourceXml = `<?xml version="1.0" encoding="UTF-8"?>
<CVehicleModelInfo__InitDataList>
  <InitDatas>
    <Item>
      <modelName>legacycar</modelName>
      <txdName>legacycar</txdName>
      <handlingId>LEGACYCAR</handlingId>
      <gameName>LEGACYCAR</gameName>
      <vehicleMakeName>CUSTOM</vehicleMakeName>
      <type>VEHICLE_TYPE_CAR</type>
      <vehicleClass>VC_SPORT</vehicleClass>
      <layout>LAYOUT_STANDARD</layout>
      <audioNameHash>ADDER</audioNameHash>
      <lodDistances content="float_array">15.0 30.0 60.0 120.0 500.0</lodDistances>
      <diffuseTint value="0x00FFFFFF" />
      <dirtLevelMin value="0.000000" />
      <dirtLevelMax value="0.400000" />
    </Item>
  </InitDatas>
</CVehicleModelInfo__InitDataList>`;

    const parsed = parseVehiclesMeta(sourceXml);
    const entry = Object.values(parsed)[0];

    expect(entry).toBeDefined();
    expect(entry.vehicles.wheelType).toBe("VWT_SPORT");
    expect(entry.vehicles.plateType).toBe("VPT_FRONT_AND_BACK_PLATES");
    expect(entry.vehicles.residentTxd).toBe("vehshare");
  });
});

import { XMLParser } from "fast-xml-parser";
import type {
  VehicleEntry,
  HandlingData,
  VehiclesData,
  CarcolsData,
  CarvariationsData,
  VehicleLayoutsData,
  ModKit,
  VisibleMod,
  StatMod,
  SlotName,
  CoverBoundOffset,
  DriveByLookAroundEntry,
  LookAroundSideData,
  LookAroundOffset,
  SirenLight,
} from "@/store/meta-store";
import { createDefaultVehicle } from "@/lib/presets";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  allowBooleanAttributes: true,
  parseAttributeValue: true,
  trimValues: true,
  isArray: (name) => name === "Item" || name === "item",
});

function ensureArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

function getAttrValue(node: any, fallback: number = 0): number {
  if (node === undefined || node === null) return fallback;
  if (typeof node === "number") return node;
  if (typeof node === "object" && "@_value" in node) {
    const v = node["@_value"];
    return typeof v === "number" ? v : parseFloat(v) || fallback;
  }
  return parseFloat(String(node)) || fallback;
}

function getTextContent(node: any, fallback: string = ""): string {
  if (node === undefined || node === null) return fallback;
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node === "object" && "#text" in node) return String(node["#text"]);
  if (typeof node === "object" && "@_value" in node) return String(node["@_value"]);
  return String(node) || fallback;
}

// Smart helper: rotation can be vec3 attrs <rotation x="0" y="0" z="0"/>
// or text <rotation>0 0 0</rotation>
function getRotation(node: any, fallback: string = "0 0 0"): string {
  if (node === undefined || node === null) return fallback;
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (typeof node === "object") {
    if ("@_x" in node || "@_y" in node || "@_z" in node) {
      const x = parseFloat(node["@_x"]) || 0;
      const y = parseFloat(node["@_y"]) || 0;
      const z = parseFloat(node["@_z"]) || 0;
      return `${x} ${y} ${z}`;
    }
    if ("#text" in node) return String(node["#text"]);
    if ("@_value" in node) return String(node["@_value"]);
  }
  return fallback;
}

// Smart helper: color can be hex string "0xFFFF0000", numeric 4294901760, or attr
function getColorValue(node: any, fallback: string = "0xFFFF0000"): string {
  if (node === undefined || node === null) return fallback;
  if (typeof node === "string") {
    // Already a hex string
    if (node.startsWith("0x") || node.startsWith("0X")) return node;
    // Might be a number string
    const n = parseInt(node);
    if (!isNaN(n)) return `0x${(n >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
    return node;
  }
  if (typeof node === "number") {
    return `0x${(node >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
  }
  if (typeof node === "object") {
    if ("@_value" in node) return getColorValue(node["@_value"], fallback);
    if ("#text" in node) return getColorValue(node["#text"], fallback);
  }
  return fallback;
}

// Smart helper: sequencer can be binary string, decimal number, or attr
function getSequencerValue(node: any, fallback: string = "10101010101010101010101010101010"): string {
  if (node === undefined || node === null) return fallback;
  if (typeof node === "string") {
    // If it's all 0s and 1s and 32 chars, it's already binary
    if (/^[01]{32}$/.test(node)) return node;
    // Try as decimal → binary
    const n = parseInt(node);
    if (!isNaN(n)) return (n >>> 0).toString(2).padStart(32, "0");
    return node;
  }
  if (typeof node === "number") {
    return (node >>> 0).toString(2).padStart(32, "0");
  }
  if (typeof node === "object") {
    if ("@_value" in node) return getSequencerValue(node["@_value"], fallback);
    if ("#text" in node) return getSequencerValue(node["#text"], fallback);
  }
  return fallback;
}

function getVec3(node: any): { x: number; y: number; z: number } {
  if (!node || typeof node !== "object")
    return { x: 0, y: 0, z: 0 };
  return {
    x: parseFloat(node["@_x"]) || 0,
    y: parseFloat(node["@_y"]) || 0,
    z: parseFloat(node["@_z"]) || 0,
  };
}

export function detectMetaType(
  xml: string,
  fileName?: string
): "handling" | "vehicles" | "carcols" | "carvariations" | "vehiclelayouts" | null {
  // Content-based detection first
  if (xml.includes("CHandlingDataMgr") || xml.includes("HandlingData"))
    return "handling";
  if (xml.includes("CVehicleModelInfo__InitDataList") || xml.includes("InitDatas"))
    return "vehicles";
  if (xml.includes("CVehicleModelInfoVarGlobal"))
    return "carcols";
  if (xml.includes("CVehicleModelInfoVariation") || xml.includes("variationData"))
    return "carvariations";
  if (xml.includes("CVehicleLayoutData") || xml.includes("vehicleLayouts") || xml.includes("VehicleLayouts") || xml.includes("CVehicleMetadataMgr"))
    return "vehiclelayouts";

  // Filename-based fallback
  if (fileName) {
    const fn = fileName.toLowerCase();
    if (fn.includes("handling")) return "handling";
    if (fn.includes("carcols") || fn.includes("modkit")) return "carcols";
    if (fn.includes("carvariations") || fn.includes("carvariation")) return "carvariations";
    if (fn.includes("vehiclelayout")) return "vehiclelayouts";
    if (fn.includes("vehicles")) return "vehicles";
  }
  return null;
}

export function parseHandlingMeta(
  xml: string,
  existing: Record<string, VehicleEntry> = {}
): Record<string, VehicleEntry> {
  const parsed = parser.parse(xml);
  const handlingData =
    parsed?.CHandlingDataMgr?.HandlingData ??
    parsed?.CHandlingDataMgr?.handlingData;
  if (!handlingData) return existing;

  // HandlingData may contain Item elements directly, or they may be nested
  // inside a wrapper like <Item type="CHandlingData"> which itself contains
  // the actual handling items.
  let items = ensureArray(handlingData.Item ?? handlingData.item);

  // Real GTA V handling.meta files wrap items as:
  // <HandlingData><Item type="CHandlingData"><handlingName>...</Item></HandlingData>
  // But some files have an extra nesting level where HandlingData > Item contains
  // sub-items. Detect this: if the first item has no handlingName but has its own
  // Item children, unwrap one level.
  if (
    items.length > 0 &&
    !items[0]?.handlingName &&
    (items[0]?.Item || items[0]?.item)
  ) {
    items = items.flatMap((wrapper: any) =>
      ensureArray(wrapper.Item ?? wrapper.item)
    );
  }
  const result = { ...existing };

  for (const item of items) {
    const name = getTextContent(item.handlingName);
    if (!name) continue;

    const matchKey = Object.keys(result).find(
      (k) => result[k].handling.handlingName.toUpperCase() === name.toUpperCase()
    );

    const entry = matchKey ? { ...result[matchKey] } : createDefaultVehicle(name);
    const com = getVec3(item.vecCentreOfMassOffset);
    const inertia = getVec3(item.vecInertiaMultiplier);

    const handling: HandlingData = {
      handlingName: name,
      fMass: getAttrValue(item.fMass, 1500),
      fInitialDragCoeff: getAttrValue(item.fInitialDragCoeff, 8),
      vecCentreOfMassOffsetX: com.x,
      vecCentreOfMassOffsetY: com.y,
      vecCentreOfMassOffsetZ: com.z,
      vecInertiaMultiplierX: inertia.x,
      vecInertiaMultiplierY: inertia.y,
      vecInertiaMultiplierZ: inertia.z,
      fInitialDriveForce: getAttrValue(item.fInitialDriveForce, 0.3),
      fInitialDriveMaxFlatVel: getAttrValue(item.fInitialDriveMaxFlatVel, 140),
      nInitialDriveGears: getAttrValue(item.nInitialDriveGears, 6),
      fDriveBiasFront: getAttrValue(item.fDriveBiasFront, 0),
      fBrakeForce: getAttrValue(item.fBrakeForce, 0.7),
      fBrakeBiasFront: getAttrValue(item.fBrakeBiasFront, 0.65),
      fSteeringLock: getAttrValue(item.fSteeringLock, 35),
      fTractionCurveMax: getAttrValue(item.fTractionCurveMax, 2.2),
      fTractionCurveMin: getAttrValue(item.fTractionCurveMin, 1.9),
      fTractionLossMult: getAttrValue(item.fTractionLossMult, 1),
      fLowSpeedTractionLossMult: getAttrValue(item.fLowSpeedTractionLossMult, 0),
      fSuspensionForce: getAttrValue(item.fSuspensionForce, 2.2),
      fSuspensionCompDamp: getAttrValue(item.fSuspensionCompDamp, 1.2),
      fSuspensionReboundDamp: getAttrValue(item.fSuspensionReboundDamp, 1.8),
      fAntiRollBarForce: getAttrValue(item.fAntiRollBarForce, 0.8),
      fSuspensionRaise: getAttrValue(item.fSuspensionRaise, 0),
      fCollisionDamageMult: getAttrValue(item.fCollisionDamageMult, 1),
      fDeformationDamageMult: getAttrValue(item.fDeformationDamageMult, 0.8),
      strModelFlags: getTextContent(item.strModelFlags, "440010"),
      strHandlingFlags: getTextContent(item.strHandlingFlags, "0"),
    };

    entry.handling = handling;
    entry.loadedMeta = new Set([...entry.loadedMeta, "handling"]);
    result[entry.id] = entry;
  }

  return result;
}

export function parseVehiclesMeta(
  xml: string,
  existing: Record<string, VehicleEntry> = {}
): Record<string, VehicleEntry> {
  const parsed = parser.parse(xml);
  const initDatas =
    parsed?.CVehicleModelInfo__InitDataList?.InitDatas ??
    parsed?.CVehicleModelInfo__InitDataList?.initDatas;
  if (!initDatas) return existing;

  let items = ensureArray(initDatas.Item ?? initDatas.item);

  // Some vehicles.meta files have an extra wrapper level — unwrap if needed
  if (
    items.length > 0 &&
    !items[0]?.modelName &&
    (items[0]?.Item || items[0]?.item)
  ) {
    items = items.flatMap((wrapper: any) =>
      ensureArray(wrapper.Item ?? wrapper.item)
    );
  }
  const result = { ...existing };

  for (const item of items) {
    const modelName = getTextContent(item.modelName);
    if (!modelName) continue;

    const matchKey = Object.keys(result).find(
      (k) =>
        result[k].vehicles.modelName.toLowerCase() === modelName.toLowerCase()
    );

    const entry = matchKey
      ? { ...result[matchKey] }
      : createDefaultVehicle(modelName);

    const flagItems = ensureArray(item.flags?.Item ?? item.flags?.item);
    const flags = flagItems.map((f: any) => getTextContent(f));

    const vehiclesData: VehiclesData = {
      modelName,
      txdName: getTextContent(item.txdName, modelName),
      handlingId: getTextContent(item.handlingId, modelName.toUpperCase()),
      gameName: getTextContent(item.gameName, modelName.toUpperCase()),
      vehicleMakeName: getTextContent(item.vehicleMakeName, "CUSTOM"),
      type: getTextContent(item.type, "VEHICLE_TYPE_CAR"),
      vehicleClass: getTextContent(item.vehicleClass, "VC_SPORT"),
      layout: getTextContent(item.layout, "LAYOUT_STANDARD"),
      driverSourceExtension: getTextContent(item.driverSourceExtension, "feroci"),
      audioNameHash: getTextContent(item.audioNameHash, "ADDER"),
      lodDistances: getTextContent(item.lodDistances, "15.0 30.0 60.0 120.0 500.0"),
      diffuseTint: getTextContent(item.diffuseTint, "0x00FFFFFF"),
      dirtLevelMin: getAttrValue(item.dirtLevelMin, 0),
      dirtLevelMax: getAttrValue(item.dirtLevelMax, 0.4),
      flags,
    };

    entry.vehicles = vehiclesData;
    entry.loadedMeta = new Set([...entry.loadedMeta, "vehicles"]);
    result[entry.id] = entry;
  }

  return result;
}

export function parseCarvariationsMeta(
  xml: string,
  existing: Record<string, VehicleEntry> = {}
): Record<string, VehicleEntry> {
  const parsed = parser.parse(xml);
  const root =
    parsed?.CVehicleModelInfoVariation?.variationData;
  if (!root) return existing;

  let items = ensureArray(root.Item ?? root.item);

  // Unwrap extra nesting if needed
  if (
    items.length > 0 &&
    !items[0]?.modelName &&
    (items[0]?.Item || items[0]?.item)
  ) {
    items = items.flatMap((wrapper: any) =>
      ensureArray(wrapper.Item ?? wrapper.item)
    );
  }
  const result = { ...existing };

  for (const item of items) {
    const modelName = getTextContent(item.modelName);
    if (!modelName) continue;

    const matchKey = Object.keys(result).find(
      (k) =>
        result[k].carvariations.modelName.toLowerCase() ===
        modelName.toLowerCase()
    );

    const entry = matchKey
      ? { ...result[matchKey] }
      : createDefaultVehicle(modelName);

    const colorItems = ensureArray(item.colors?.Item ?? item.colors?.item);
    const colors = colorItems.map((ci: any) => {
      const indicesStr = getTextContent(ci.indices);
      const parts = indicesStr.trim().split(/\s+/).map(Number);
      return {
        primary: parts[0] ?? 0,
        secondary: parts[1] ?? 0,
        pearl: parts[2] ?? 0,
        wheels: parts[3] ?? 156,
        interior: parts[4] ?? 0,
        dashboard: parts[5] ?? 0,
      };
    });

    const kitItems = ensureArray(item.kits?.Item ?? item.kits?.item);
    const kits = kitItems.map((k: any) => getTextContent(k, "0_default_modkit"));

    const plateItems = ensureArray(
      item.plateProbabilities?.Item ?? item.plateProbabilities?.item
    );
    const plateProbabilities = plateItems.map((p: any) => getAttrValue(p, 0));

    const carvariations: CarvariationsData = {
      modelName,
      colors:
        colors.length > 0
          ? colors
          : [{ primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0 }],
      sirenSettings: getAttrValue(item.sirenSettings, 0),
      lightSettings: getAttrValue(item.lightSettings, 0),
      kits: kits.length > 0 ? kits : ["0_default_modkit"],
      windows: getAttrValue(item.windows, 0),
      plateProbabilities:
        plateProbabilities.length > 0 ? plateProbabilities : [100, 0, 0],
    };

    entry.carvariations = carvariations;
    entry.loadedMeta = new Set([...entry.loadedMeta, "carvariations"]);
    result[entry.id] = entry;
  }

  return result;
}

export function parseCarcolsMeta(
  xml: string,
  existing: Record<string, VehicleEntry> = {}
): Record<string, VehicleEntry> {
  const parsed = parser.parse(xml);
  const root = parsed?.CVehicleModelInfoVarGlobal;
  if (!root) return existing;

  const result = { ...existing };

  // Parse Kits
  const kitItems = ensureArray(root.Kits?.Item ?? root.Kits?.item);

  // Parse Sirens
  const sirenItems = ensureArray(root.Sirens?.Item ?? root.Sirens?.item);

  // If there are no sirens and no kits, nothing to do
  if (kitItems.length === 0 && sirenItems.length === 0) return existing;

  // Try to match sirens to existing vehicles by sirenSettings ID in carvariations,
  // or by kit name. If no match, create entries keyed by siren ID.
  for (const sirenItem of sirenItems) {
    const sirenId = getAttrValue(sirenItem.id, 0);
    const sequencerBpm = getAttrValue(sirenItem.sequencerBpm, 600);
    const rotationLimit = getAttrValue(sirenItem.rotationLimit, 0);

    const lightItems = ensureArray(sirenItem.sirens?.Item ?? sirenItem.sirens?.item);
    const lights: SirenLight[] = lightItems.map((l: any) => ({
      rotation: getRotation(l.rotation, "0 0 0"),
      flashness: getAttrValue(l.flashness, 1),
      delta: getAttrValue(l.delta, 0),
      color: getColorValue(l.color, "0xFFFF0000"),
      scale: getAttrValue(l.scale, 0.4),
      coronaScale: getAttrValue(l.scale, 0.4),
      coronaEnabled: getAttrValue(l.scale, 0.4) > 0,
      sequencer: getSequencerValue(l.sequencer, "10101010101010101010101010101010"),
    }));

    const envLight = sirenItem.environmentalLight;
    const envColor = envLight ? getColorValue(envLight.color, "0xFFFF0000") : "0xFFFF0000";
    const envIntensity = envLight ? getAttrValue(envLight.intensity, 50) : 50;

    // Try to find a vehicle whose carvariations.sirenSettings matches this siren ID
    let matchKey = Object.keys(result).find(
      (k) => result[k].carvariations.sirenSettings === sirenId && sirenId !== 0
    );

    // If no match by sirenSettings, try to find any vehicle without carcols loaded
    if (!matchKey) {
      matchKey = Object.keys(result).find(
        (k) => !result[k].loadedMeta.has("carcols")
      );
    }

    const entryName = matchKey ? result[matchKey].name : `siren_${sirenId}`;
    const entry = matchKey ? { ...result[matchKey] } : createDefaultVehicle(entryName);

    const carcolsData: CarcolsData = {
      ...entry.carcols,
      sirenId,
      sequencerBpm,
      rotationLimit,
      lights,
      environmentalLightColor: envColor,
      environmentalLightIntensity: envIntensity,
    };

    // Also apply kit info if available
    const matchingKit = kitItems.find((_: any, idx: number) => {
      // Try to match kit by index to siren by index
      return idx === sirenItems.indexOf(sirenItem);
    });
    if (matchingKit) {
      carcolsData.id = getAttrValue(matchingKit.id, carcolsData.id);
      carcolsData.kitName = getTextContent(matchingKit.kitName, carcolsData.kitName);
    }

    entry.carcols = carcolsData;
    entry.loadedMeta = new Set([...entry.loadedMeta, "carcols"]);
    result[entry.id] = entry;
  }

  // If there are kits but no sirens, still apply kit data to first available vehicle
  if (sirenItems.length === 0 && kitItems.length > 0) {
    for (const kitItem of kitItems) {
      const kitId = getAttrValue(kitItem.id, 0);
      const kitName = getTextContent(kitItem.kitName, "");

      let matchKey = Object.keys(result).find(
        (k) => !result[k].loadedMeta.has("carcols")
      );

      const entry = matchKey ? { ...result[matchKey] } : createDefaultVehicle(kitName || `kit_${kitId}`);
      entry.carcols = { ...entry.carcols, id: kitId, kitName };
      entry.loadedMeta = new Set([...entry.loadedMeta, "carcols"]);
      result[entry.id] = entry;
    }
  }

  // Also parse full modkit data (visibleMods, statMods, slotNames) from Kits
  if (kitItems.length > 0) {
    const parsedKits: ModKit[] = kitItems.map((kitItem: any) => {
      const kitName = getTextContent(kitItem.kitName, "");
      const id = getAttrValue(kitItem.id, 0);
      const kitType = getTextContent(kitItem.kitType, "MKT_STANDARD");

      const visModItems = ensureArray(kitItem.visibleMods?.Item ?? kitItem.visibleMods?.item);
      const visibleMods: VisibleMod[] = visModItems.map((vm: any) => {
        const turnOffBoneItems = ensureArray(vm.turnOffBones?.Item ?? vm.turnOffBones?.item);
        return {
          modelName: getTextContent(vm.modelName, ""),
          modShopLabel: getTextContent(vm.modShopLabel, ""),
          linkedModels: getTextContent(vm.linkedModels, ""),
          turnOffBones: turnOffBoneItems.map((b: any) => getTextContent(b, "")),
          type: getTextContent(vm.type, "VMT_SPOILER"),
          bone: getTextContent(vm.bone, "chassis"),
          collisionBone: getTextContent(vm.collisionBone, "chassis"),
          linkedGenerated: false,
          linkedSource: "",
          linkedBoneRef: "",
        };
      });

      const statModItems = ensureArray(kitItem.statMods?.Item ?? kitItem.statMods?.item);
      const statMods: StatMod[] = statModItems.map((sm: any) => ({
        identifier: getTextContent(sm.identifier, ""),
        modifier: getAttrValue(sm.modifier, 0),
        audioApply: getAttrValue(sm.audioApply, 1.0),
        weight: getAttrValue(sm.weight, 0),
        type: getTextContent(sm.type, "VMT_ENGINE"),
      }));

      const slotItems = ensureArray(kitItem.slotNames?.Item ?? kitItem.slotNames?.item);
      const slotNames: SlotName[] = slotItems.map((sn: any) => ({
        slot: getTextContent(sn.slot, ""),
        name: getTextContent(sn.name, ""),
      }));

      return { kitName, id, kitType, visibleMods, statMods, slotNames };
    });

    // Assign modkits to the first vehicle that got carcols loaded
    const modkitKey = Object.keys(result).find(
      (k) => result[k].loadedMeta.has("carcols") && !result[k].loadedMeta.has("modkits")
    );
    if (modkitKey) {
      const entry = { ...result[modkitKey] };
      entry.modkits = { kits: parsedKits };
      entry.loadedMeta = new Set([...entry.loadedMeta, "modkits"]);
      result[entry.id] = entry;
    }
  }

  return result;
}

function toBool(val: any): boolean {
  if (val === true || val === "true" || val === 1 || val === "1") return true;
  if (typeof val === "object" && val !== null && "@_value" in val) return toBool(val["@_value"]);
  return false;
}

function getVec2(node: any): { x: number; y: number } {
  if (!node || typeof node !== "object") return { x: 0, y: 0 };
  return {
    x: parseFloat(node["@_x"]) || 0,
    y: parseFloat(node["@_y"]) || 0,
  };
}

function parseLookAroundSide(node: any): LookAroundSideData {
  const empty: LookAroundSideData = {
    offsets: [],
    extraRelativePitchX: 0, extraRelativePitchY: 0,
    angleToBlendInExtraPitchX: 0, angleToBlendInExtraPitchY: 0,
  };
  if (!node) return empty;
  const offsetItems = ensureArray(node.Offsets?.Item ?? node.Offsets?.item);
  const offsets: LookAroundOffset[] = offsetItems.map((o: any) => {
    const angle = getVec2(o.AngleToBlendInOffset);
    return {
      offset: getAttrValue(o.Offset, 0),
      angleToBlendInOffsetX: angle.x,
      angleToBlendInOffsetY: angle.y,
    };
  });
  const erp = getVec2(node.ExtraRelativePitch);
  const aep = getVec2(node.AngleToBlendInExtraPitch);
  return {
    offsets,
    extraRelativePitchX: erp.x,
    extraRelativePitchY: erp.y,
    angleToBlendInExtraPitchX: aep.x,
    angleToBlendInExtraPitchY: aep.y,
  };
}

export function parseVehicleLayoutsMeta(
  xml: string,
  existing: Record<string, VehicleEntry> = {}
): Record<string, VehicleEntry> {
  const parsed = parser.parse(xml);

  // Find the root — try CVehicleMetadataMgr first, then scan top-level keys
  const root = parsed?.CVehicleMetadataMgr ?? parsed?.CVehicleLayoutData;
  if (!root) return existing;

  // Parse CoverBoundOffsets
  const coverContainer = root.VehicleCoverBoundOffsetInfos ?? root.vehicleCoverBoundOffsetInfos;
  const coverItems = coverContainer ? ensureArray(coverContainer.Item ?? coverContainer.item) : [];
  const coverBoundOffsets: CoverBoundOffset[] = coverItems.map((c: any) => ({
    name: getTextContent(c.Name ?? c.name, ""),
    extraSideOffset: getAttrValue(c.ExtraSideOffset ?? c.extraSideOffset, 0),
    extraForwardOffset: getAttrValue(c.ExtraForwardOffset ?? c.extraForwardOffset, 0),
    extraBackwardOffset: getAttrValue(c.ExtraBackwardOffset ?? c.extraBackwardOffset, 0),
    extraZOffset: getAttrValue(c.ExtraZOffset ?? c.extraZOffset, 0),
  }));

  // Parse FirstPersonDriveByLookAroundData
  const lookContainer = root.FirstPersonDriveByLookAroundData ?? root.firstPersonDriveByLookAroundData;
  const lookItems = lookContainer ? ensureArray(lookContainer.Item ?? lookContainer.item) : [];
  const driveByLookAroundData: DriveByLookAroundEntry[] = lookItems.map((l: any) => {
    const headingLimits = getVec2(l.HeadingLimits ?? l.headingLimits);
    return {
      name: getTextContent(l.Name ?? l.name, ""),
      allowLookback: toBool(l.AllowLookback ?? l.allowLookback),
      headingLimitsX: headingLimits.x,
      headingLimitsY: headingLimits.y,
      dataLeft: parseLookAroundSide(l.DataLeft ?? l.dataLeft),
      dataRight: parseLookAroundSide(l.DataRight ?? l.dataRight),
    };
  });

  // Assign to first available vehicle or create new
  const result = { ...existing };
  let matchKey = Object.keys(result).find(
    (k) => !result[k].loadedMeta.has("vehiclelayouts")
  );

  const entry = matchKey ? { ...result[matchKey] } : createDefaultVehicle("vehiclelayouts");

  entry.vehiclelayouts = { coverBoundOffsets, driveByLookAroundData };
  entry.loadedMeta = new Set([...entry.loadedMeta, "vehiclelayouts"]);
  result[entry.id] = entry;

  return result;
}

export function parseMetaFile(
  xml: string,
  existing: Record<string, VehicleEntry> = {},
  fileName?: string
): Record<string, VehicleEntry> {
  const type = detectMetaType(xml, fileName);
  switch (type) {
    case "handling":
      return parseHandlingMeta(xml, existing);
    case "vehicles":
      return parseVehiclesMeta(xml, existing);
    case "carvariations":
      return parseCarvariationsMeta(xml, existing);
    case "carcols":
      return parseCarcolsMeta(xml, existing);
    case "vehiclelayouts":
      return parseVehicleLayoutsMeta(xml, existing);
    default:
      return existing;
  }
}

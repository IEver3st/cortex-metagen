import { XMLParser } from "fast-xml-parser";
import {
  FIRST_PERSON_IK_OFFSET_NAMES,
  type VehicleEntry,
  type HandlingData,
  type VehiclesData,
  type VehicleVec3,
  type VehicleUnknownXmlNode,
  type CarcolsData,
  type CarvariationsData,
  type ModKit,
  type VisibleMod,
  type LinkMod,
  type StatMod,
  type SlotName,
  type CoverBoundOffset,
  type DriveByLookAroundEntry,
  type LookAroundSideData,
  type LookAroundOffset,
  type SirenLight,
  type MetaFileType,
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

export interface ParseDiagnostic {
  severity: "warning" | "error";
  message: string;
  context: string;
}

export interface ParseMetaOptions {
  sourcePath?: string;
  diagnostics?: ParseDiagnostic[];
}

const looseNodeCache = new WeakMap<object, unknown>();

function normalizeLooseKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toLooseNode<T>(value: T): T {
  if (!value || typeof value !== "object") return value;
  if (looseNodeCache.has(value as object)) {
    return looseNodeCache.get(value as object) as T;
  }

  if (Array.isArray(value)) {
    const mapped = value.map((item) => toLooseNode(item)) as unknown as T;
    looseNodeCache.set(value as object, mapped);
    return mapped;
  }

  const target = value as Record<string, unknown>;
  const keyMap = new Map<string, string>();
  for (const key of Object.keys(target)) {
    keyMap.set(normalizeLooseKey(key), key);
  }

  const proxy = new Proxy(target, {
    get(obj, prop, receiver) {
      if (typeof prop !== "string") {
        return Reflect.get(obj, prop, receiver);
      }

      if (Reflect.has(obj, prop)) {
        return toLooseNode(Reflect.get(obj, prop, receiver));
      }

      const match = keyMap.get(normalizeLooseKey(prop));
      if (!match) return undefined;
      return toLooseNode(Reflect.get(obj, match, receiver));
    },
    has(obj, prop) {
      if (typeof prop !== "string") {
        return Reflect.has(obj, prop);
      }
      if (Reflect.has(obj, prop)) return true;
      return keyMap.has(normalizeLooseKey(prop));
    },
  });

  looseNodeCache.set(value as object, proxy);
  return proxy as T;
}

function parseLooseXml(xml: string): any {
  const parsed = parser.parse(xml);
  return toLooseNode(parsed);
}

function pushDiagnostic(options: ParseMetaOptions | undefined, diagnostic: ParseDiagnostic): void {
  if (!options?.diagnostics) return;
  options.diagnostics.push(diagnostic);
}

function markLoadedMeta(
  entry: VehicleEntry,
  type: MetaFileType,
  sourcePath?: string,
): VehicleEntry {
  const next: VehicleEntry = {
    ...entry,
    loadedMeta: new Set([...entry.loadedMeta, type]),
  };

  if (!sourcePath) return next;

  return {
    ...next,
    provenance: {
      byType: {
        ...(entry.provenance?.byType ?? {}),
        [type]: sourcePath,
      },
    },
  };
}

function ensureArray<T>(val: T | T[] | undefined): T[] {
  if (val === undefined || val === null) return [];
  return Array.isArray(val) ? val : [val];
}

function getAttrValue(node: any, fallback: number = 0): number {
  if (node === undefined || node === null) return fallback;
  if (typeof node === "number") return node;
  if (typeof node === "object" && "@_value" in node) {
    const v = node["@_value"];
    if (typeof v === "number") return v;
    const parsed = Number.parseFloat(String(v));
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  const parsed = Number.parseFloat(String(node));
  return Number.isFinite(parsed) ? parsed : fallback;
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

function cloneXmlValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function getBoolValue(node: unknown, fallback: boolean): boolean {
  if (node === undefined || node === null) return fallback;
  if (typeof node === "boolean") return node;
  if (typeof node === "number") return node !== 0;
  if (typeof node === "string") {
    const normalized = node.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return true;
    if (normalized === "false" || normalized === "0") return false;
  }
  if (typeof node === "object") {
    const objectNode = node as Record<string, unknown>;
    if ("@_value" in objectNode) return getBoolValue(objectNode["@_value"], fallback);
    if ("#text" in objectNode) return getBoolValue(objectNode["#text"], fallback);
  }
  return fallback;
}

const defaultCarvariationPlateNames = ["Standard White", "Yellow/Black", "Blue/White"] as const;

function getDefaultCarvariationPlateName(index: number): string {
  return defaultCarvariationPlateNames[index] ?? `Plate ${index + 1}`;
}

function getVec3Value(node: unknown, fallback: VehicleVec3): VehicleVec3 {
  if (node === undefined || node === null) return { ...fallback };
  if (typeof node === "string") {
    const [x, y, z] = node.trim().split(/\s+/).map((part) => Number.parseFloat(part));
    return {
      x: Number.isFinite(x) ? x : fallback.x,
      y: Number.isFinite(y) ? y : fallback.y,
      z: Number.isFinite(z) ? z : fallback.z,
    };
  }
  if (typeof node === "object") {
    const vec = getVec3(node as Record<string, unknown>);
    return { x: vec.x, y: vec.y, z: vec.z };
  }
  return { ...fallback };
}

function hasKey(node: unknown, key: string): boolean {
  return Boolean(node && typeof node === "object" && Object.prototype.hasOwnProperty.call(node, key));
}

function readTextField(
  item: Record<string, unknown>,
  key: string,
  current: string,
  fallback: string,
  aliases: string[] = [],
): string {
  for (const candidate of [key, ...aliases]) {
    if (hasKey(item, candidate)) {
      return getTextContent(item[candidate], current || fallback);
    }
  }
  return current || fallback;
}

function readNumberField(
  item: Record<string, unknown>,
  key: string,
  current: number,
  fallback: number,
  aliases: string[] = [],
): number {
  for (const candidate of [key, ...aliases]) {
    if (hasKey(item, candidate)) {
      return getAttrValue(item[candidate], current ?? fallback);
    }
  }
  return current ?? fallback;
}

function readBoolField(
  item: Record<string, unknown>,
  key: string,
  current: boolean,
  fallback: boolean,
  aliases: string[] = [],
): boolean {
  for (const candidate of [key, ...aliases]) {
    if (hasKey(item, candidate)) {
      return getBoolValue(item[candidate], current ?? fallback);
    }
  }
  return current ?? fallback;
}

function readVec3Field(
  item: Record<string, unknown>,
  key: string,
  current: VehicleVec3,
  fallback: VehicleVec3,
  aliases: string[] = [],
): VehicleVec3 {
  for (const candidate of [key, ...aliases]) {
    if (hasKey(item, candidate)) {
      return getVec3Value(item[candidate], current ?? fallback);
    }
  }
  return { ...(current ?? fallback) };
}

function parseFlagsNode(node: unknown): string[] | undefined {
  if (node === undefined || node === null) return undefined;
  if (typeof node === "object") {
    const objectNode = node as Record<string, unknown>;
    if (hasKey(objectNode, "Item") || hasKey(objectNode, "item")) {
      const flagItems = ensureArray(objectNode.Item ?? objectNode.item);
      return flagItems
        .map((flagItem) => getTextContent(flagItem).trim())
        .filter(Boolean);
    }
  }
  const raw = getTextContent(node, "").trim();
  if (!raw) return [];
  return raw.split(/\s+/).filter(Boolean);
}

const VEHICLE_ITEM_KNOWN_TAGS = new Set<string>([
  "modelName",
  "txdName",
  "handlingId",
  "gameName",
  "vehicleMakeName",
  "expressionDictName",
  "expressionName",
  "animConvRoofDictName",
  "animConvRoofName",
  "animConvRoofWindowsAffected",
  "ptfxAssetName",
  "audioNameHash",
  "layout",
  "driverSourceExtension",
  "coverBoundOffsets",
  "POVTuningInfo",
  "explosionInfo",
  "scenarioLayout",
  "cameraName",
  "aimCameraName",
  "bonnetCameraName",
  "povCameraName",
  "PovCameraOffset",
  "PovCameraVerticalAdjustmentForRollCage",
  "PovPassengerCameraOffset",
  "PovRearPassengerCameraOffset",
  "vfxInfoName",
  "shouldUseCinematicViewMode",
  "shouldCameraTransitionOnClimbUpDown",
  "shouldCameraIgnoreExiting",
  "AllowPretendOccupants",
  "AllowJoyriding",
  "AllowSundayDriving",
  "AllowBodyColorMapping",
  "wheelScale",
  "wheelScaleRear",
  "dirtLevelMin",
  "dirtLevelMax",
  "envEffScaleMin",
  "envEffScaleMax",
  "envEffScaleMin2",
  "envEffScaleMax2",
  "damageMapScale",
  "damageOffsetScale",
  "diffuseTint",
  "steerWheelMult",
  "HDTextureDist",
  "lodDistances",
  "minSeatHeight",
  "identicalModelSpawnDistance",
  "maxNumOfSameColor",
  "defaultBodyHealth",
  "pretendOccupantsScale",
  "visibleSpawnDistScale",
  "trackerPathWidth",
  "weaponForceMult",
  "frequency",
  "swankness",
  "maxNum",
  "flags",
  "type",
  "plateType",
  "dashboardType",
  "vehicleClass",
  "wheelType",
  "trailers",
  "additionalTrailers",
  "drivers",
  "extraIncludes",
  "doorsWithCollisionWhenClosed",
  "driveableDoors",
  "doorStiffnessMultipliers",
  "bumpersNeedToCollideWithMap",
  "needsRopeTexture",
  "requiredExtras",
  "firstPersonDrivebyData",
  ...FIRST_PERSON_IK_OFFSET_NAMES,
]);

const VEHICLE_ROOT_KNOWN_TAGS = new Set<string>([
  "residentTxd",
  "residentAnims",
  "InitDatas",
  "initDatas",
  "txdRelationships",
]);

function collectUnknownNodes(
  node: Record<string, unknown>,
  knownTags: Set<string>,
): VehicleUnknownXmlNode[] {
  const unknown: VehicleUnknownXmlNode[] = [];
  for (const [tag, value] of Object.entries(node)) {
    if (tag.startsWith("@_")) continue;
    if (knownTags.has(tag)) continue;
    unknown.push({ tag, value: cloneXmlValue(value) });
  }
  return unknown;
}

const CARCOLS_SIREN_KNOWN_TAGS = new Set<string>([
  "id",
  "name",
  "textureName",
  "useRealLights",
  "sequencerBpm",
  "rotationLimit",
  "sirens",
  "environmentalLight",
]);

function parseLegacySequence(node: unknown, fallbackDelta: number, fallbackSequencer: string) {
  return {
    delta: getAttrValue((node as Record<string, unknown> | undefined)?.delta, fallbackDelta),
    start: getAttrValue((node as Record<string, unknown> | undefined)?.start, 0),
    speed: getAttrValue((node as Record<string, unknown> | undefined)?.speed, 0),
    sequencer: getSequencerValue((node as Record<string, unknown> | undefined)?.sequencer, fallbackSequencer),
    multiples: getAttrValue((node as Record<string, unknown> | undefined)?.multiples, 1),
    direction: getBoolValue((node as Record<string, unknown> | undefined)?.direction, true),
    syncToBpm: getBoolValue((node as Record<string, unknown> | undefined)?.syncToBpm, true),
  };
}

function parseCarcolsLight(lightItem: Record<string, unknown>): SirenLight {
  const rotationNode = lightItem.rotation as Record<string, unknown> | undefined;
  const flashinessNode = lightItem.flashiness as Record<string, unknown> | undefined;
  const coronaNode = lightItem.corona as Record<string, unknown> | undefined;
  const rotate = getBoolValue(lightItem.rotate, false);
  const fallbackSequencer = "10101010101010101010101010101010";
  const rotationSequencer = getSequencerValue(rotationNode?.sequencer, fallbackSequencer);
  const flashSequencer = getSequencerValue(flashinessNode?.sequencer, rotationSequencer);
  const sequencer = rotate ? rotationSequencer : flashSequencer;
  const scale = getAttrValue(coronaNode?.size ?? lightItem.scale, 0.4);
  const flashness = getAttrValue(lightItem.intensity ?? coronaNode?.intensity ?? flashinessNode?.delta ?? lightItem.flashness, 1);
  const delta = getAttrValue(rotationNode?.delta ?? lightItem.delta ?? flashinessNode?.delta, 0);

  const light: SirenLight = {
    rotation: rotate ? "0 0 1" : getRotation(lightItem.rotation, "0 0 0"),
    flashness,
    delta,
    color: getColorValue(lightItem.color, "0xFFFF0000"),
    scale,
    coronaScale: scale,
    coronaEnabled: getBoolValue(lightItem.light, scale > 0),
    sequencer,
  };

  light.legacyData = {
    rotation: parseLegacySequence(rotationNode, delta, rotationSequencer),
    flashiness: parseLegacySequence(flashinessNode, flashness, flashSequencer),
    corona: {
      intensity: getAttrValue(coronaNode?.intensity, flashness),
      size: scale,
      pull: getAttrValue(coronaNode?.pull, 0),
      faceCamera: getBoolValue(coronaNode?.faceCamera, true),
    },
    intensity: getAttrValue(lightItem.intensity, flashness),
    lightGroup: getAttrValue(lightItem.lightGroup, 0),
    rotate,
    scale: getBoolValue(lightItem.scale, false),
    scaleFactor: getAttrValue(lightItem.scaleFactor, 1),
    flash: getBoolValue(lightItem.flash, !rotate),
    light: getBoolValue(lightItem.light, scale > 0),
    spotLight: getBoolValue(lightItem.spotLight, false),
    castShadows: getBoolValue(lightItem.castShadows, false),
  };

  return light;
}

function skipDeclaration(xml: string, start: number): number {
  if (xml.startsWith("<!--", start)) {
    const end = xml.indexOf("-->", start + 4);
    return end === -1 ? xml.length : end + 3;
  }

  if (xml.startsWith("<?", start)) {
    const end = xml.indexOf("?>", start + 2);
    return end === -1 ? xml.length : end + 2;
  }

  if (/^<!doctype/i.test(xml.slice(start, start + 9))) {
    let i = start + 9;
    let depth = 0;
    while (i < xml.length) {
      const ch = xml[i];
      if (ch === "[") depth += 1;
      if (ch === "]") depth = Math.max(0, depth - 1);
      if (ch === ">" && depth === 0) return i + 1;
      i += 1;
    }
    return xml.length;
  }

  if (xml.startsWith("<!", start)) {
    const end = xml.indexOf(">", start + 2);
    return end === -1 ? xml.length : end + 1;
  }

  return start;
}

function extractRootTagName(xml: string): string | null {
  let i = 0;
  while (i < xml.length) {
    const lt = xml.indexOf("<", i);
    if (lt === -1) return null;

    const skipped = skipDeclaration(xml, lt);
    if (skipped !== lt) {
      i = skipped;
      continue;
    }

    const raw = xml.slice(lt + 1).trimStart();
    if (raw.startsWith("/")) {
      i = lt + 2;
      continue;
    }

    const match = raw.match(/^([A-Za-z_][\w:.-]*)/);
    if (!match) {
      i = lt + 1;
      continue;
    }

    const tag = match[1];
    const parts = tag.split(":");
    return (parts[parts.length - 1] ?? tag).toLowerCase();
  }

  return null;
}

function detectFromRootTag(rootTag: string | null): MetaFileType | null {
  if (!rootTag) return null;

  if (rootTag === "chandlingdatamgr") return "handling";
  if (rootTag === "cvehiclemodelinfo__initdatalist") return "vehicles";
  if (rootTag === "cvehiclemodelinfovarglobal") return "carcols";
  if (rootTag === "cvehiclemodelinfovariation") return "carvariations";
  if (rootTag === "cvehiclemetadatamgr" || rootTag === "cvehiclelayoutdata") return "vehiclelayouts";
  if (rootTag === "cmodkitfiledata" || rootTag === "cvehiclemodkitfiledata") return "modkits";

  return null;
}

function detectFromFileName(fileName?: string): MetaFileType | null {
  if (!fileName) return null;

  const base = fileName.split(/[/\\]/).pop()?.toLowerCase() ?? "";
  const checks: Array<[MetaFileType, RegExp[]]> = [
    ["handling", [/^handling(?:[._-]|$)/, /(?:^|[._-])handling(?:[._-]|$)/]],
    ["vehicles", [/^vehicles(?:[._-]|$)/, /(?:^|[._-])vehicles(?:[._-]|$)/]],
    ["carcols", [/^carcols(?:[._-]|$)/, /(?:^|[._-])carcols(?:[._-]|$)/]],
    ["carvariations", [/^carvariations?(?:[._-]|$)/, /(?:^|[._-])carvariations?(?:[._-]|$)/]],
    ["vehiclelayouts", [/^vehiclelayouts?(?:[._-]|$)/, /(?:^|[._-])vehiclelayouts?(?:[._-]|$)/]],
    ["modkits", [/^modkits?(?:[._-]|$)/, /(?:^|[._-])modkits?(?:[._-]|$)/]],
  ];

  const matches = checks
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(base)))
    .map(([type]) => type);

  if (matches.length !== 1) return null;
  return matches[0] ?? null;
}

export function detectMetaType(
  xml: string,
  fileName?: string,
): MetaFileType | null {
  const rootTag = extractRootTagName(xml);
  const fromRoot = detectFromRootTag(rootTag);
  if (fromRoot) return fromRoot;

  if (/\bchandlingdatamgr\b/i.test(xml)) return "handling";
  if (/\bcvehiclemodelinfo__initdatalist\b/i.test(xml)) return "vehicles";
  if (/\bcvehiclemodelinfovarglobal\b/i.test(xml)) return "carcols";
  if (/\bcvehiclemodelinfovariation\b/i.test(xml)) return "carvariations";
  if (/\bcvehiclemetadatamgr\b|\bcvehiclelayoutdata\b/i.test(xml)) return "vehiclelayouts";
  if (/\bcmodkitfiledata\b|\bcvehiclemodkitfiledata\b/i.test(xml)) return "modkits";

  return detectFromFileName(fileName);
}

export function parseHandlingMeta(
  xml: string,
  existing: Record<string, VehicleEntry> = {},
  options?: ParseMetaOptions,
): Record<string, VehicleEntry> {
  const parsed = parseLooseXml(xml);
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
    const subHandlingItems = ensureArray(item.SubHandlingData?.Item ?? item.SubHandlingData?.item);
    const carSubHandling = subHandlingItems.find((sub: any) => {
      const type = String(sub?.["@_type"] ?? sub?.type ?? "").toUpperCase();
      return type === "CCARHANDLINGDATA" || sub?.fBackEndPopUpCarImpulseMult || sub?.fBackEndPopUpBuildingImpulseMult || sub?.fBackEndPopUpMaxDeltaSpeed;
    });

    const handling: HandlingData = {
      handlingName: name,
      fMass: getAttrValue(item.fMass, 1500),
      fInitialDragCoeff: getAttrValue(item.fInitialDragCoeff, 8),
      fPercentSubmerged: getAttrValue(item.fPercentSubmerged, 85),
      vecCentreOfMassOffsetX: com.x,
      vecCentreOfMassOffsetY: com.y,
      vecCentreOfMassOffsetZ: com.z,
      vecInertiaMultiplierX: inertia.x,
      vecInertiaMultiplierY: inertia.y,
      vecInertiaMultiplierZ: inertia.z,
      fDriveBiasFront: getAttrValue(item.fDriveBiasFront, 0),
      nInitialDriveGears: getAttrValue(item.nInitialDriveGears, 6),
      fInitialDriveForce: getAttrValue(item.fInitialDriveForce, 0.3),
      fDriveInertia: getAttrValue(item.fDriveInertia, 1),
      fClutchChangeRateScaleUpShift: getAttrValue(item.fClutchChangeRateScaleUpShift, 1.5),
      fClutchChangeRateScaleDownShift: getAttrValue(item.fClutchChangeRateScaleDownShift, 1.5),
      fInitialDriveMaxFlatVel: getAttrValue(item.fInitialDriveMaxFlatVel, 140),
      fBrakeForce: getAttrValue(item.fBrakeForce, 0.7),
      fBrakeBiasFront: getAttrValue(item.fBrakeBiasFront, 0.65),
      fHandBrakeForce: getAttrValue(item.fHandBrakeForce, 0.5),
      fSteeringLock: getAttrValue(item.fSteeringLock, 35),
      fTractionCurveMax: getAttrValue(item.fTractionCurveMax, 2.2),
      fTractionCurveMin: getAttrValue(item.fTractionCurveMin, 1.9),
      fTractionCurveLateral: getAttrValue(item.fTractionCurveLateral, 22.5),
      fTractionSpringDeltaMax: getAttrValue(item.fTractionSpringDeltaMax, 0.15),
      fTractionLossMult: getAttrValue(item.fTractionLossMult, 1),
      fLowSpeedTractionLossMult: getAttrValue(item.fLowSpeedTractionLossMult, 0),
      fCamberStiffnesss: getAttrValue(item.fCamberStiffnesss, 0),
      fTractionBiasFront: getAttrValue(item.fTractionBiasFront, 0.48),
      fSuspensionForce: getAttrValue(item.fSuspensionForce, 2.2),
      fSuspensionCompDamp: getAttrValue(item.fSuspensionCompDamp, 1.2),
      fSuspensionReboundDamp: getAttrValue(item.fSuspensionReboundDamp, 1.8),
      fSuspensionUpperLimit: getAttrValue(item.fSuspensionUpperLimit, 0.12),
      fSuspensionLowerLimit: getAttrValue(item.fSuspensionLowerLimit, -0.12),
      fAntiRollBarForce: getAttrValue(item.fAntiRollBarForce, 0.8),
      fAntiRollBarBiasFront: getAttrValue(item.fAntiRollBarBiasFront, 0.5),
      fSuspensionRaise: getAttrValue(item.fSuspensionRaise, 0),
      fSuspensionBiasFront: getAttrValue(item.fSuspensionBiasFront, 0.5),
      fRollCentreHeightFront: getAttrValue(item.fRollCentreHeightFront, 0.3),
      fRollCentreHeightRear: getAttrValue(item.fRollCentreHeightRear, 0.3),
      fCollisionDamageMult: getAttrValue(item.fCollisionDamageMult, 1),
      fWeaponDamageMult: getAttrValue(item.fWeaponDamageMult, 1),
      fDeformationDamageMult: getAttrValue(item.fDeformationDamageMult, 0.8),
      fEngineDamageMult: getAttrValue(item.fEngineDamageMult, 1),
      fPetrolTankVolume: getAttrValue(item.fPetrolTankVolume, 65),
      fOilVolume: getAttrValue(item.fOilVolume, 5),
      fSeatOffsetDistX: getAttrValue(item.fSeatOffsetDistX, 0),
      fSeatOffsetDistY: getAttrValue(item.fSeatOffsetDistY, 0),
      fSeatOffsetDistZ: getAttrValue(item.fSeatOffsetDistZ, 0),
      nMonetaryValue: getAttrValue(item.nMonetaryValue, 50000),
      strModelFlags: getTextContent(item.strModelFlags, "440010"),
      strHandlingFlags: getTextContent(item.strHandlingFlags, "0"),
      strDamageFlags: getTextContent(item.strDamageFlags, "0"),
      aiHandling: getTextContent(item.AIHandling, "SPORTS_CAR"),
      fBackEndPopUpCarImpulseMult: getAttrValue(carSubHandling?.fBackEndPopUpCarImpulseMult, 0.1),
      fBackEndPopUpBuildingImpulseMult: getAttrValue(carSubHandling?.fBackEndPopUpBuildingImpulseMult, 0.03),
      fBackEndPopUpMaxDeltaSpeed: getAttrValue(carSubHandling?.fBackEndPopUpMaxDeltaSpeed, 0.6),
    };

    entry.handling = handling;
    const nextEntry = markLoadedMeta(entry, "handling", options?.sourcePath);
    result[nextEntry.id] = nextEntry;
  }

  return result;
}

export function parseVehiclesMeta(
  xml: string,
  existing: Record<string, VehicleEntry> = {},
  options?: ParseMetaOptions,
): Record<string, VehicleEntry> {
  const parsed = parseLooseXml(xml);
  const root = (parsed?.CVehicleModelInfo__InitDataList ??
    parsed?.cVehicleModelInfo__InitDataList ??
    {}) as Record<string, unknown>;
  const initDatas = (root.InitDatas ?? root.initDatas) as Record<string, unknown> | undefined;
  if (!initDatas) return existing;

  let items: any[] = ensureArray(initDatas.Item ?? initDatas.item);

  if (
    items.length > 0 &&
    !items[0]?.modelName &&
    (items[0]?.Item || items[0]?.item)
  ) {
    items = items.flatMap((wrapper: any) =>
      ensureArray(wrapper.Item ?? wrapper.item)
    );
  }

  let parsedTxdRelationships: VehiclesData["txdRelationships"] | undefined;
  if (hasKey(root, "txdRelationships")) {
    const relationshipNode = root.txdRelationships as Record<string, unknown>;
    const relationshipItems = ensureArray(relationshipNode?.Item ?? relationshipNode?.item);
    parsedTxdRelationships = relationshipItems
      .map((relationship) => ({
        parent: getTextContent((relationship as Record<string, unknown>).parent, "vehshare").trim(),
        child: getTextContent((relationship as Record<string, unknown>).child, "").trim(),
      }))
      .filter((relationship) => relationship.parent && relationship.child);
  }

  const rootUnknownNodes = collectUnknownNodes(root, VEHICLE_ROOT_KNOWN_TAGS);
  const result = { ...existing };

  for (const rawItem of items) {
    const item = rawItem as Record<string, unknown>;
    const modelName = getTextContent(item.modelName).trim();
    if (!modelName) continue;

    const matchKey = Object.keys(result).find(
      (k) =>
        result[k].vehicles.modelName.toLowerCase() === modelName.toLowerCase()
    );

    const entry = matchKey
      ? { ...result[matchKey] }
      : createDefaultVehicle(modelName);
    const current = entry.vehicles;

    const parsedFlags = parseFlagsNode(item.flags);

    let drivers = current.drivers.map((driver) => ({ ...driver }));
    if (hasKey(item, "drivers")) {
      const driverNode = item.drivers as Record<string, unknown>;
      const driverItems = ensureArray(driverNode?.Item ?? driverNode?.item);
      drivers = driverItems
        .map((driverItem) => ({
          driverName: getTextContent((driverItem as Record<string, unknown>).driverName, "").trim(),
          npcName: getTextContent((driverItem as Record<string, unknown>).npcName, "").trim(),
        }))
        .filter((driver) => driver.driverName || driver.npcName);
    }

    let doorStiffnessMultipliers = current.doorStiffnessMultipliers.map((multiplier) => ({ ...multiplier }));
    if (hasKey(item, "doorStiffnessMultipliers")) {
      const stiffnessNode = item.doorStiffnessMultipliers as Record<string, unknown>;
      const stiffnessItems = ensureArray(stiffnessNode?.Item ?? stiffnessNode?.item);
      doorStiffnessMultipliers = stiffnessItems
        .map((stiffnessItem) => ({
          doorId: getAttrValue((stiffnessItem as Record<string, unknown>).doorId, 0),
          stiffnessMult: getAttrValue((stiffnessItem as Record<string, unknown>).stiffnessMult, 1),
        }))
        .filter((stiffness) => Number.isFinite(stiffness.doorId));
    }

    const firstPersonIkOffsets: VehiclesData["firstPersonIkOffsets"] = {
      ...current.firstPersonIkOffsets,
    };

    for (const offsetName of FIRST_PERSON_IK_OFFSET_NAMES) {
      if (hasKey(item, offsetName)) {
        firstPersonIkOffsets[offsetName] = getVec3Value(
          item[offsetName],
          current.firstPersonIkOffsets[offsetName] ?? { x: 0, y: 0, z: 0 }
        );
      }
    }

    const vehiclesData: VehiclesData = {
      ...current,
      modelName,
      txdName: readTextField(item, "txdName", current.txdName, modelName),
      handlingId: readTextField(item, "handlingId", current.handlingId, modelName.toUpperCase()),
      gameName: readTextField(item, "gameName", current.gameName, modelName.toUpperCase()),
      vehicleMakeName: readTextField(item, "vehicleMakeName", current.vehicleMakeName, "CUSTOM"),
      expressionDictName: readTextField(item, "expressionDictName", current.expressionDictName, ""),
      expressionName: readTextField(item, "expressionName", current.expressionName, ""),
      animConvRoofDictName: readTextField(item, "animConvRoofDictName", current.animConvRoofDictName, ""),
      animConvRoofName: readTextField(item, "animConvRoofName", current.animConvRoofName, ""),
      animConvRoofWindowsAffected: readTextField(item, "animConvRoofWindowsAffected", current.animConvRoofWindowsAffected, ""),
      ptfxAssetName: readTextField(item, "ptfxAssetName", current.ptfxAssetName, ""),
      audioNameHash: readTextField(item, "audioNameHash", current.audioNameHash, "ADDER"),
      layout: readTextField(item, "layout", current.layout, "LAYOUT_STANDARD"),
      driverSourceExtension: readTextField(item, "driverSourceExtension", current.driverSourceExtension, "feroci"),
      coverBoundOffsets: readTextField(item, "coverBoundOffsets", current.coverBoundOffsets, ""),
      povTuningInfo: hasKey(item, "POVTuningInfo")
        ? cloneXmlValue(item.POVTuningInfo)
        : current.povTuningInfo,
      explosionInfo: hasKey(item, "explosionInfo")
        ? cloneXmlValue(item.explosionInfo)
        : current.explosionInfo,
      scenarioLayout: readTextField(item, "scenarioLayout", current.scenarioLayout, ""),
      cameraName: readTextField(item, "cameraName", current.cameraName, "DEFAULT_SCRIPTED_CAMERA"),
      aimCameraName: readTextField(item, "aimCameraName", current.aimCameraName, "DEFAULT_AIM_CAMERA"),
      bonnetCameraName: readTextField(item, "bonnetCameraName", current.bonnetCameraName, "BONNET_CAMERA"),
      povCameraName: readTextField(item, "povCameraName", current.povCameraName, "POV_CAMERA"),
      firstPersonIkOffsets,
      povCameraOffset: readVec3Field(item, "PovCameraOffset", current.povCameraOffset, { x: 0, y: 0, z: 0 }),
      povCameraVerticalAdjustmentForRollCage: readNumberField(
        item,
        "PovCameraVerticalAdjustmentForRollCage",
        current.povCameraVerticalAdjustmentForRollCage,
        0
      ),
      povPassengerCameraOffset: readVec3Field(
        item,
        "PovPassengerCameraOffset",
        current.povPassengerCameraOffset,
        { x: 0, y: 0, z: 0 }
      ),
      povRearPassengerCameraOffset: readVec3Field(
        item,
        "PovRearPassengerCameraOffset",
        current.povRearPassengerCameraOffset,
        { x: 0, y: 0, z: 0 }
      ),
      firstPersonDrivebyData: hasKey(item, "firstPersonDrivebyData")
        ? cloneXmlValue(item.firstPersonDrivebyData)
        : current.firstPersonDrivebyData,
      vfxInfoName: readTextField(item, "vfxInfoName", current.vfxInfoName, "VFXVEHICLEINFO_DEFAULT"),
      shouldUseCinematicViewMode: readBoolField(
        item,
        "shouldUseCinematicViewMode",
        current.shouldUseCinematicViewMode,
        true
      ),
      shouldCameraTransitionOnClimbUpDown: readBoolField(
        item,
        "shouldCameraTransitionOnClimbUpDown",
        current.shouldCameraTransitionOnClimbUpDown,
        false
      ),
      shouldCameraIgnoreExiting: readBoolField(
        item,
        "shouldCameraIgnoreExiting",
        current.shouldCameraIgnoreExiting,
        false
      ),
      allowPretendOccupants: readBoolField(item, "AllowPretendOccupants", current.allowPretendOccupants, false),
      allowJoyriding: readBoolField(item, "AllowJoyriding", current.allowJoyriding, true),
      allowSundayDriving: readBoolField(item, "AllowSundayDriving", current.allowSundayDriving, true),
      allowBodyColorMapping: readBoolField(item, "AllowBodyColorMapping", current.allowBodyColorMapping, false),
      wheelScale: readNumberField(item, "wheelScale", current.wheelScale, 1),
      wheelScaleRear: readNumberField(item, "wheelScaleRear", current.wheelScaleRear, 1),
      dirtLevelMin: readNumberField(item, "dirtLevelMin", current.dirtLevelMin, 0),
      dirtLevelMax: readNumberField(item, "dirtLevelMax", current.dirtLevelMax, 0.4),
      envEffScaleMin: readNumberField(item, "envEffScaleMin", current.envEffScaleMin, 0),
      envEffScaleMax: readNumberField(item, "envEffScaleMax", current.envEffScaleMax, 1),
      envEffScaleMin2: readNumberField(item, "envEffScaleMin2", current.envEffScaleMin2, 0),
      envEffScaleMax2: readNumberField(item, "envEffScaleMax2", current.envEffScaleMax2, 1),
      damageMapScale: readNumberField(item, "damageMapScale", current.damageMapScale, 1),
      damageOffsetScale: readNumberField(item, "damageOffsetScale", current.damageOffsetScale, 1),
      diffuseTint: readTextField(item, "diffuseTint", current.diffuseTint, "0x00FFFFFF"),
      steerWheelMult: readNumberField(item, "steerWheelMult", current.steerWheelMult, 1),
      HDTextureDist: readNumberField(item, "HDTextureDist", current.HDTextureDist, 60),
      lodDistances: readTextField(item, "lodDistances", current.lodDistances, "15.0 30.0 60.0 120.0 500.0"),
      minSeatHeight: readNumberField(item, "minSeatHeight", current.minSeatHeight, 0.2),
      identicalModelSpawnDistance: readNumberField(
        item,
        "identicalModelSpawnDistance",
        current.identicalModelSpawnDistance,
        20
      ),
      maxNumOfSameColor: readNumberField(item, "maxNumOfSameColor", current.maxNumOfSameColor, 5),
      defaultBodyHealth: readNumberField(item, "defaultBodyHealth", current.defaultBodyHealth, 700),
      pretendOccupantsScale: readNumberField(item, "pretendOccupantsScale", current.pretendOccupantsScale, 1),
      visibleSpawnDistScale: readNumberField(item, "visibleSpawnDistScale", current.visibleSpawnDistScale, 1),
      trackerPathWidth: readNumberField(item, "trackerPathWidth", current.trackerPathWidth, 2),
      weaponForceMult: readNumberField(item, "weaponForceMult", current.weaponForceMult, 1),
      frequency: readNumberField(item, "frequency", current.frequency, 20),
      swankness: readTextField(item, "swankness", current.swankness, "SWANKNESS_3"),
      maxNum: readNumberField(item, "maxNum", current.maxNum, 20),
      flags: parsedFlags ?? current.flags,
      type: readTextField(item, "type", current.type, "VEHICLE_TYPE_CAR"),
      plateType: readTextField(item, "plateType", current.plateType, "VPT_FRONT_AND_BACK_PLATES"),
      dashboardType: readTextField(item, "dashboardType", current.dashboardType, "VDT_DEFAULT"),
      vehicleClass: readTextField(item, "vehicleClass", current.vehicleClass, "VC_SPORT"),
      wheelType: readTextField(item, "wheelType", current.wheelType, "VWT_SPORT"),
      trailers: readTextField(item, "trailers", current.trailers, ""),
      additionalTrailers: readTextField(item, "additionalTrailers", current.additionalTrailers, ""),
      drivers,
      extraIncludes: readTextField(item, "extraIncludes", current.extraIncludes, ""),
      doorsWithCollisionWhenClosed: readTextField(
        item,
        "doorsWithCollisionWhenClosed",
        current.doorsWithCollisionWhenClosed,
        ""
      ),
      driveableDoors: readTextField(item, "driveableDoors", current.driveableDoors, ""),
      doorStiffnessMultipliers,
      bumpersNeedToCollideWithMap: readBoolField(
        item,
        "bumpersNeedToCollideWithMap",
        current.bumpersNeedToCollideWithMap,
        false
      ),
      needsRopeTexture: readBoolField(item, "needsRopeTexture", current.needsRopeTexture, false),
      requiredExtras: readTextField(item, "requiredExtras", current.requiredExtras, ""),
      residentTxd: hasKey(root, "residentTxd")
        ? getTextContent(root.residentTxd, current.residentTxd || "vehshare")
        : current.residentTxd,
      residentAnims: hasKey(root, "residentAnims")
        ? getTextContent(root.residentAnims, current.residentAnims)
        : current.residentAnims,
      txdRelationships: parsedTxdRelationships
        ? parsedTxdRelationships.map((relationship) => ({ ...relationship }))
        : current.txdRelationships.map((relationship) => ({ ...relationship })),
      unknownNodes: collectUnknownNodes(item, VEHICLE_ITEM_KNOWN_TAGS),
      unknownFileLevelNodes: rootUnknownNodes.map((node) => ({
        tag: node.tag,
        value: cloneXmlValue(node.value),
      })),
    };

    entry.vehicles = vehiclesData;
    const nextEntry = markLoadedMeta(entry, "vehicles", options?.sourcePath);
    result[nextEntry.id] = nextEntry;
  }

  return result;
}

export function parseCarvariationsMeta(
  xml: string,
  existing: Record<string, VehicleEntry> = {},
  options?: ParseMetaOptions,
): Record<string, VehicleEntry> {
  const parsed = parseLooseXml(xml);
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
      const liveries = ensureArray(ci.liveries?.Item ?? ci.liveries?.item).map((entry: unknown) =>
        getBoolValue(entry, false)
      );
      return {
        primary: parts[0] ?? 0,
        secondary: parts[1] ?? 0,
        pearl: parts[2] ?? 0,
        wheels: parts[3] ?? 156,
        interior: parts[4] ?? 0,
        dashboard: parts[5] ?? 0,
        liveries,
      };
    });

    const kitItems = ensureArray(item.kits?.Item ?? item.kits?.item);
    const kits = kitItems.map((k: any) => getTextContent(k, "0_default_modkit"));

    const windowsWithExposedEdges = ensureArray(
      item.windowsWithExposedEdges?.Item ?? item.windowsWithExposedEdges?.item
    )
      .map((entry: unknown) => getTextContent(entry))
      .filter(Boolean);

    const plateItems = ensureArray(
      item.plateProbabilities?.Item ?? item.plateProbabilities?.item
    );
    const plateProbabilities = plateItems.map((entry: any, index: number) => ({
      name: getTextContent(entry.Name ?? entry.name, getDefaultCarvariationPlateName(index)),
      value: getAttrValue(entry.Value ?? entry.value ?? entry, 0),
    }));

    const carvariations: CarvariationsData = {
      modelName,
      colors:
        colors.length > 0
          ? colors
          : [{ primary: 0, secondary: 0, pearl: 0, wheels: 156, interior: 0, dashboard: 0, liveries: [] }],
      sirenSettings: getAttrValue(item.sirenSettings, 0),
      lightSettings: getAttrValue(item.lightSettings, 0),
      kits: kits.length > 0 ? kits : ["0_default_modkit"],
      windows: getAttrValue(item.windows, 0),
      windowsWithExposedEdges,
      plateProbabilities:
        plateProbabilities.length > 0
          ? plateProbabilities
          : [
            { name: getDefaultCarvariationPlateName(0), value: 100 },
            { name: getDefaultCarvariationPlateName(1), value: 0 },
            { name: getDefaultCarvariationPlateName(2), value: 0 },
          ],
    };

    entry.carvariations = carvariations;
    const nextEntry = markLoadedMeta(entry, "carvariations", options?.sourcePath);
    result[nextEntry.id] = nextEntry;
  }

  return result;
}

export function parseCarcolsMeta(
  xml: string,
  existing: Record<string, VehicleEntry> = {},
  options?: ParseMetaOptions,
): Record<string, VehicleEntry> {
  const parsed = parseLooseXml(xml);
  const root = parsed?.CVehicleModelInfoVarGlobal;
  if (!root) return existing;

  const result = { ...existing };
  const kitItems = ensureArray(root.Kits?.Item ?? root.Kits?.item);
  const sirenItems = ensureArray(root.Sirens?.Item ?? root.Sirens?.item);

  if (kitItems.length === 0 && sirenItems.length === 0) return existing;

  const sourceLabel = options?.sourcePath ?? "current file";
  const kitOwnerById = new Map<number, string>();

  const createUnassignedEntry = (label: string, reason: string): VehicleEntry => {
    pushDiagnostic(options, {
      severity: "warning",
      message: reason,
      context: sourceLabel,
    });

    const safeName = label
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "") || `unassigned_${Date.now()}`;

    return createDefaultVehicle(safeName);
  };

  for (let sirenIndex = 0; sirenIndex < sirenItems.length; sirenIndex += 1) {
    const sirenItem = sirenItems[sirenIndex];
    const sirenId = Math.max(0, Math.trunc(getAttrValue(sirenItem.id, 0)));
    const sequencerBpm = Math.max(0, Math.trunc(getAttrValue(sirenItem.sequencerBpm, 600)));
    const rotationLimit = getAttrValue(sirenItem.rotationLimit, 0);
    const sirenName = getTextContent(sirenItem.name, "");
    const textureName = getTextContent(sirenItem.textureName, "");
    const useRealLights = getBoolValue(sirenItem.useRealLights, false);
    const unknownNodes = collectUnknownNodes(sirenItem, CARCOLS_SIREN_KNOWN_TAGS);

    const lightItems = ensureArray(sirenItem.sirens?.Item ?? sirenItem.sirens?.item);
    const lights: SirenLight[] = lightItems.map((lightItem: any) => parseCarcolsLight(lightItem));

    const envLight = sirenItem.environmentalLight;
    const envEnabled = Boolean(envLight);
    const envColor = envLight ? getColorValue(envLight.color, "0x00000000") : "0x00000000";
    const envIntensity = envLight ? getAttrValue(envLight.intensity, 0) : 0;

    const vehicleKeys = Object.keys(result);
    const bySirenSettings = vehicleKeys.filter(
      (key) => sirenId > 0 && result[key].carvariations.sirenSettings === sirenId,
    );
    const byExistingSiren = vehicleKeys.filter(
      (key) => sirenId > 0 && result[key].loadedMeta.has("carcols") && result[key].carcols.sirenId === sirenId,
    );

    let matchKey: string | undefined;
    if (bySirenSettings.length === 1) {
      matchKey = bySirenSettings[0];
    } else if (bySirenSettings.length > 1) {
      pushDiagnostic(options, {
        severity: "warning",
        message: `Siren ID ${sirenId} matched multiple vehicles. Created an unassigned entry instead of guessing.`,
        context: sourceLabel,
      });
    } else if (byExistingSiren.length === 1) {
      matchKey = byExistingSiren[0];
    }

    const entry = matchKey
      ? { ...result[matchKey] }
      : createUnassignedEntry(
        `unassigned_siren_${sirenId || sirenIndex + 1}`,
        `Siren ID ${sirenId || "(missing)"} could not be matched by carvariations.sirenSettings.`,
      );

    const carcolsData: CarcolsData = {
      ...entry.carcols,
      sirenId,
      name: sirenName,
      textureName,
      useRealLights,
      sequencerBpm,
      rotationLimit,
      lights,
      unknownNodes,
      environmentalLightEnabled: envEnabled,
      environmentalLightColor: envColor,
      environmentalLightIntensity: envIntensity,
    };

    const matchingKit = kitItems[sirenIndex];
    if (matchingKit) {
      carcolsData.id = Math.max(0, Math.trunc(getAttrValue(matchingKit.id, carcolsData.id)));
      carcolsData.kitName = getTextContent(matchingKit.kitName, carcolsData.kitName);
      if (carcolsData.id > 0) {
        kitOwnerById.set(carcolsData.id, entry.id);
      }
    }

    entry.carcols = carcolsData;
    const nextEntry = markLoadedMeta(entry, "carcols", options?.sourcePath);
    result[nextEntry.id] = nextEntry;
  }

  if (sirenItems.length === 0 && kitItems.length > 0) {
    for (const kitItem of kitItems) {
      const kitId = Math.max(0, Math.trunc(getAttrValue(kitItem.id, 0)));
      const kitName = getTextContent(kitItem.kitName, "");

      const vehicleKeys = Object.keys(result);
      const directMatches = vehicleKeys.filter(
        (key) => result[key].carcols.id === kitId || result[key].modkits.kits.some((kit) => kit.id === kitId),
      );

      const entry = directMatches.length === 1
        ? { ...result[directMatches[0]] }
        : createUnassignedEntry(
          `unassigned_kit_${kitId || kitName || Date.now()}`,
          `Kit ID ${kitId || "(missing)"} could not be matched to a vehicle.`,
        );

      entry.carcols = {
        ...entry.carcols,
        id: kitId,
        kitName,
      };

      const nextEntry = markLoadedMeta(entry, "carcols", options?.sourcePath);
      result[nextEntry.id] = nextEntry;
      if (kitId > 0) {
        kitOwnerById.set(kitId, nextEntry.id);
      }
    }
  }

  if (kitItems.length > 0) {
    const parsedKits: ModKit[] = kitItems.map((kitItem: any) => {
      const kitName = getTextContent(kitItem.kitName, "");
      const id = Math.max(0, Math.trunc(getAttrValue(kitItem.id, 0)));
      const kitType = getTextContent(kitItem.kitType, "MKT_STANDARD");

      const visModItems = ensureArray(kitItem.visibleMods?.Item ?? kitItem.visibleMods?.item);
      const visibleMods: VisibleMod[] = visModItems.map((vm: any) => {
        const turnOffBoneItems = ensureArray(vm.turnOffBones?.Item ?? vm.turnOffBones?.item);
        return {
          modelName: getTextContent(vm.modelName, ""),
          modShopLabel: getTextContent(vm.modShopLabel, ""),
          linkedModels: getTextContent(vm.linkedModels, ""),
          turnOffBones: turnOffBoneItems.map((bone: any) => getTextContent(bone, "")),
          type: getTextContent(vm.type, "VMT_SPOILER"),
          bone: getTextContent(vm.bone, "chassis"),
          collisionBone: getTextContent(vm.collisionBone, "chassis"),
          cameraPos: Math.max(0, Math.trunc(getAttrValue(vm.cameraPos, 0))),
          audioApply: getAttrValue(vm.audioApply, 1.0),
          weight: getAttrValue(vm.weight, 0),
          turnOffExtra: Math.trunc(getAttrValue(vm.turnOffExtra, -1)),
          disableBonnetCamera: getBoolValue(vm.disableBonnetCamera, false),
          allowBonnetSlide: getBoolValue(vm.allowBonnetSlide, false),
          weaponSlot: getTextContent(vm.weaponSlot, ""),
          weaponSlotSecondary: getTextContent(vm.weaponSlotSecondary, ""),
          disableProjectileDriveby: getBoolValue(vm.disableProjectileDriveby, false),
          disableDriveby: getBoolValue(vm.disableDriveby, false),
          disableDrivebySeat: getBoolValue(vm.disableDrivebySeat, false),
          disableDrivebySeatSecondary: getBoolValue(vm.disableDrivebySeatSecondary, false),
          linkedGenerated: false,
          linkedSource: "",
          linkedBoneRef: "",
        };
      });

      const linkModItems = ensureArray(kitItem.linkMods?.Item ?? kitItem.linkMods?.item);
      const linkMods: LinkMod[] = linkModItems.map((linkItem: any) => ({
        modelName: getTextContent(linkItem.modelName, ""),
        bone: getTextContent(linkItem.bone, "chassis"),
        turnOffExtra: Math.trunc(getAttrValue(linkItem.turnOffExtra, -1)),
      }));

      const statModItems = ensureArray(kitItem.statMods?.Item ?? kitItem.statMods?.item);
      const statMods: StatMod[] = statModItems.map((statItem: any) => ({
        identifier: getTextContent(statItem.identifier, ""),
        modifier: getAttrValue(statItem.modifier, 0),
        audioApply: getAttrValue(statItem.audioApply, 1.0),
        weight: getAttrValue(statItem.weight, 0),
        type: getTextContent(statItem.type, "VMT_ENGINE"),
      }));

      const slotItems = ensureArray(kitItem.slotNames?.Item ?? kitItem.slotNames?.item);
      const slotNames: SlotName[] = slotItems.map((slotItem: any) => ({
        slot: getTextContent(slotItem.slot, ""),
        name: getTextContent(slotItem.name, ""),
      }));

      const liveryNames = ensureArray(kitItem.liveryNames?.Item ?? kitItem.liveryNames?.item)
        .map((item: any) => getTextContent(item, ""))
        .filter(Boolean);
      const livery2Names = ensureArray(kitItem.livery2Names?.Item ?? kitItem.livery2Names?.item)
        .map((item: any) => getTextContent(item, ""))
        .filter(Boolean);

      return {
        kitName,
        id,
        kitType,
        visibleMods,
        linkMods,
        statMods,
        slotNames,
        liveryNames,
        livery2Names,
      };
    });

    const groupedByOwner = new Map<string, ModKit[]>();
    for (const kit of parsedKits) {
      const ownerFromMap = kit.id > 0 ? kitOwnerById.get(kit.id) : undefined;
      const ownerByCarcols = Object.keys(result).find((key) => result[key].carcols.id === kit.id);
      let ownerKey = ownerFromMap ?? ownerByCarcols;

      if (!ownerKey) {
        const unassigned = createUnassignedEntry(
          `unassigned_modkit_${kit.id || kit.kitName || Date.now()}`,
          `ModKit ${kit.kitName || kit.id || "(unnamed)"} could not be matched to a vehicle.`,
        );
        ownerKey = unassigned.id;
        result[ownerKey] = unassigned;
      }

      const existingGroup = groupedByOwner.get(ownerKey) ?? [];
      existingGroup.push(kit);
      groupedByOwner.set(ownerKey, existingGroup);
    }

    for (const [ownerKey, ownerKits] of groupedByOwner.entries()) {
      const entry = { ...result[ownerKey] };
      const mergedKits = [...entry.modkits.kits];

      for (const kit of ownerKits) {
        const duplicate = mergedKits.some((existingKit) => existingKit.id === kit.id && existingKit.kitName === kit.kitName);
        if (!duplicate) {
          mergedKits.push(kit);
        }
      }

      entry.modkits = { kits: mergedKits };
      const nextEntry = markLoadedMeta(entry, "modkits", options?.sourcePath);
      result[nextEntry.id] = nextEntry;
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
  existing: Record<string, VehicleEntry> = {},
  options?: ParseMetaOptions,
): Record<string, VehicleEntry> {
  const parsed = parseLooseXml(xml);

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
  const nextEntry = markLoadedMeta(entry, "vehiclelayouts", options?.sourcePath);
  result[nextEntry.id] = nextEntry;

  return result;
}

export function parseMetaFile(
  xml: string,
  existing: Record<string, VehicleEntry> = {},
  fileName?: string,
  options?: ParseMetaOptions,
): Record<string, VehicleEntry> {
  const type = detectMetaType(xml, fileName);
  switch (type) {
    case "handling":
      return parseHandlingMeta(xml, existing, options);
    case "vehicles":
      return parseVehiclesMeta(xml, existing, options);
    case "carvariations":
      return parseCarvariationsMeta(xml, existing, options);
    case "carcols":
      return parseCarcolsMeta(xml, existing, options);
    case "vehiclelayouts":
      return parseVehicleLayoutsMeta(xml, existing, options);
    case "modkits":
      pushDiagnostic(options, {
        severity: "warning",
        message: "modkits XML files are parsed through carcols format in this build.",
        context: fileName ?? "modkits",
      });
      return parseCarcolsMeta(xml, existing, options);
    default:
      pushDiagnostic(options, {
        severity: "warning",
        message: "Unable to detect supported meta type.",
        context: fileName ?? "unknown",
      });
      return existing;
  }
}

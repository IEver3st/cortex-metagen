import {
  FIRST_PERSON_IK_OFFSET_NAMES,
  type LookAroundSideData,
  type SirenLight,
  type SirenLightLegacyData,
  type VehicleDoorStiffnessMultiplier,
  type VehicleDriver,
  type VehicleEntry,
  type VehicleUnknownXmlNode,
  type VehicleVec3,
} from "@/store/meta-store";

function indent(level: number): string {
  return "  ".repeat(level);
}

function formatNumber(value: unknown, fallback: number): string {
  const numeric = typeof value === "number" && Number.isFinite(value)
    ? value
    : (typeof value === "string" ? Number.parseFloat(value) : Number.NaN);
  return (Number.isFinite(numeric) ? numeric : fallback).toFixed(6);
}

function formatInteger(value: unknown, fallback: number): string {
  const numeric = typeof value === "number" && Number.isFinite(value)
    ? value
    : (typeof value === "string" ? Number.parseFloat(value) : Number.NaN);
  const resolved = Number.isFinite(numeric) ? numeric : fallback;
  return String(Math.round(resolved));
}

function formatText(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || fallback;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function formatBoolean(value: unknown, fallback: boolean): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return value !== 0 ? "true" : "false";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return "true";
    if (normalized === "false" || normalized === "0") return "false";
  }
  return fallback ? "true" : "false";
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&apos;");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatXmlPrimitive(value: unknown): string {
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value;
  return "";
}

function pushTextNode(lines: string[], level: number, tag: string, value: unknown, fallback = ""): void {
  const resolved = formatText(value, fallback);
  if (resolved === "") {
    lines.push(`${indent(level)}<${tag} />`);
    return;
  }

  lines.push(`${indent(level)}<${tag}>${escapeXml(resolved)}</${tag}>`);
}

function pushNumberValueNode(lines: string[], level: number, tag: string, value: unknown, fallback: number): void {
  lines.push(`${indent(level)}<${tag} value="${formatNumber(value, fallback)}" />`);
}

function pushIntegerValueNode(lines: string[], level: number, tag: string, value: unknown, fallback: number): void {
  lines.push(`${indent(level)}<${tag} value="${formatInteger(value, fallback)}" />`);
}

function pushBooleanValueNode(lines: string[], level: number, tag: string, value: unknown, fallback: boolean): void {
  lines.push(`${indent(level)}<${tag} value="${formatBoolean(value, fallback)}" />`);
}

function pushVec3Node(lines: string[], level: number, tag: string, value: VehicleVec3): void {
  lines.push(
    `${indent(level)}<${tag} x="${formatNumber(value.x, 0)}" y="${formatNumber(value.y, 0)}" z="${formatNumber(value.z, 0)}" />`,
  );
}

function serializeXmlNode(tag: string, value: unknown, level: number): string[] {
  const prefix = indent(level);

  if (Array.isArray(value)) {
    const lines = [`${prefix}<${tag}>`];
    for (const item of value) {
      lines.push(...serializeXmlNode("Item", item, level + 1));
    }
    lines.push(`${prefix}</${tag}>`);
    return lines;
  }

  if (!isRecord(value)) {
    const text = formatXmlPrimitive(value);
    if (text === "") return [`${prefix}<${tag} />`];
    return [`${prefix}<${tag}>${escapeXml(text)}</${tag}>`];
  }

  const attributes = Object.entries(value)
    .filter(([key]) => key.startsWith("@_"))
    .map(([key, attrValue]) => `${key.slice(2)}="${escapeXml(formatXmlPrimitive(attrValue))}"`)
    .join(" ");
  const openTag = attributes ? `<${tag} ${attributes}` : `<${tag}`;
  const textValue = "#text" in value ? formatXmlPrimitive(value["#text"]) : "";
  const childEntries = Object.entries(value).filter(([key]) => !key.startsWith("@_") && key !== "#text");

  if (textValue === "" && childEntries.length === 0) {
    return [`${prefix}${openTag} />`];
  }

  if (textValue !== "" && childEntries.length === 0) {
    return [`${prefix}${openTag}>${escapeXml(textValue)}</${tag}>`];
  }

  const lines = [`${prefix}${openTag}>`];
  if (textValue !== "") {
    lines.push(`${indent(level + 1)}${escapeXml(textValue)}`);
  }

  for (const [childTag, childValue] of childEntries) {
    if (Array.isArray(childValue)) {
      for (const nested of childValue) {
        lines.push(...serializeXmlNode(childTag, nested, level + 1));
      }
      continue;
    }

    lines.push(...serializeXmlNode(childTag, childValue, level + 1));
  }

  lines.push(`${prefix}</${tag}>`);
  return lines;
}

function pushUnknownNodes(lines: string[], level: number, nodes: VehicleUnknownXmlNode[]): void {
  for (const node of nodes) {
    lines.push(...serializeXmlNode(node.tag, node.value, level));
  }
}

function formatSequencerValue(value: string): string {
  if (/^[01]{32}$/.test(value)) {
    return String(Number.parseInt(value, 2) >>> 0);
  }
  return value;
}

function createLegacySirenLightData(light: SirenLight): SirenLightLegacyData {
  const isRotator = light.rotation.trim() === "0 0 1";
  return {
    rotation: {
      delta: light.delta,
      start: 0,
      speed: 0,
      sequencer: light.sequencer,
      multiples: 1,
      direction: light.delta >= 0,
      syncToBpm: true,
    },
    flashiness: {
      delta: light.flashness,
      start: 0,
      speed: 0,
      sequencer: light.sequencer,
      multiples: 1,
      direction: true,
      syncToBpm: true,
    },
    corona: {
      intensity: light.flashness,
      size: light.coronaScale ?? light.scale,
      pull: 0,
      faceCamera: true,
    },
    intensity: light.flashness,
    lightGroup: 0,
    rotate: isRotator,
    scale: false,
    scaleFactor: 1,
    flash: !isRotator,
    light: light.coronaEnabled !== false,
    spotLight: false,
    castShadows: false,
  };
}

function pushLegacySequence(lines: string[], level: number, tag: string, sequence: SirenLightLegacyData["rotation"]): void {
  lines.push(`${indent(level)}<${tag}>`);
  pushNumberValueNode(lines, level + 1, "delta", sequence.delta, 0);
  pushNumberValueNode(lines, level + 1, "start", sequence.start, 0);
  pushNumberValueNode(lines, level + 1, "speed", sequence.speed, 0);
  lines.push(`${indent(level + 1)}<sequencer value="${formatSequencerValue(sequence.sequencer)}" />`);
  pushIntegerValueNode(lines, level + 1, "multiples", sequence.multiples, 1);
  pushBooleanValueNode(lines, level + 1, "direction", sequence.direction, true);
  pushBooleanValueNode(lines, level + 1, "syncToBpm", sequence.syncToBpm, true);
  lines.push(`${indent(level)}</${tag}>`);
}

function pushLegacySirenLight(lines: string[], level: number, light: SirenLight): void {
  const legacy = light.legacyData ?? createLegacySirenLightData(light);
  const resolvedScale = light.coronaEnabled === false ? 0 : (light.coronaScale ?? light.scale);

  lines.push(`${indent(level)}<Item>`);
  pushLegacySequence(lines, level + 1, "rotation", {
    ...legacy.rotation,
    delta: light.delta,
    sequencer: light.sequencer,
    direction: light.delta >= 0,
  });
  pushLegacySequence(lines, level + 1, "flashiness", {
    ...legacy.flashiness,
    delta: light.flashness,
    sequencer: light.sequencer,
  });
  lines.push(`${indent(level + 1)}<corona>`);
  pushNumberValueNode(lines, level + 2, "intensity", light.flashness, light.flashness);
  pushNumberValueNode(lines, level + 2, "size", resolvedScale, resolvedScale);
  pushNumberValueNode(lines, level + 2, "pull", legacy.corona.pull, 0);
  pushBooleanValueNode(lines, level + 2, "faceCamera", legacy.corona.faceCamera, true);
  lines.push(`${indent(level + 1)}</corona>`);
  lines.push(`${indent(level + 1)}<color value="${escapeXml(formatText(light.color, "0xFFFF0000"))}" />`);
  pushNumberValueNode(lines, level + 1, "intensity", light.flashness, light.flashness);
  pushIntegerValueNode(lines, level + 1, "lightGroup", legacy.lightGroup, 0);
  pushBooleanValueNode(lines, level + 1, "rotate", light.rotation.trim() === "0 0 1", false);
  pushBooleanValueNode(lines, level + 1, "scale", legacy.scale, false);
  pushNumberValueNode(lines, level + 1, "scaleFactor", legacy.scaleFactor, 1);
  pushBooleanValueNode(lines, level + 1, "flash", light.rotation.trim() !== "0 0 1", true);
  pushBooleanValueNode(lines, level + 1, "light", light.coronaEnabled !== false, true);
  pushBooleanValueNode(lines, level + 1, "spotLight", legacy.spotLight, false);
  pushBooleanValueNode(lines, level + 1, "castShadows", legacy.castShadows, false);
  lines.push(`${indent(level)}</Item>`);
}

function pushDriversNode(lines: string[], level: number, drivers: VehicleDriver[]): void {
  if (drivers.length === 0) {
    lines.push(`${indent(level)}<drivers />`);
    return;
  }

  lines.push(`${indent(level)}<drivers>`);
  for (const driver of drivers) {
    lines.push(`${indent(level + 1)}<Item>`);
    pushTextNode(lines, level + 2, "driverName", driver.driverName);
    pushTextNode(lines, level + 2, "npcName", driver.npcName);
    lines.push(`${indent(level + 1)}</Item>`);
  }
  lines.push(`${indent(level)}</drivers>`);
}

function pushDoorStiffnessNode(lines: string[], level: number, entries: VehicleDoorStiffnessMultiplier[]): void {
  if (entries.length === 0) {
    lines.push(`${indent(level)}<doorStiffnessMultipliers />`);
    return;
  }

  lines.push(`${indent(level)}<doorStiffnessMultipliers>`);
  for (const entry of entries) {
    lines.push(`${indent(level + 1)}<Item>`);
    pushIntegerValueNode(lines, level + 2, "doorId", entry.doorId, 0);
    pushNumberValueNode(lines, level + 2, "stiffnessMult", entry.stiffnessMult, 1);
    lines.push(`${indent(level + 1)}</Item>`);
  }
  lines.push(`${indent(level)}</doorStiffnessMultipliers>`);
}

export function serializeHandlingMeta(vehicles: VehicleEntry[]): string {
  const filtered = vehicles.filter((v) => v.loadedMeta.has("handling"));
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<CHandlingDataMgr>`);
  lines.push(`${indent(1)}<HandlingData>`);

  for (const v of filtered) {
    const h = v.handling;
    lines.push(`${indent(2)}<Item type="CHandlingData">`);
    lines.push(`${indent(3)}<handlingName>${formatText(h.handlingName, "NEWVEHICLE")}</handlingName>`);
    lines.push(`${indent(3)}<fMass value="${formatNumber(h.fMass, 1500)}" />`);
    lines.push(`${indent(3)}<fInitialDragCoeff value="${formatNumber(h.fInitialDragCoeff, 8)}" />`);
    lines.push(`${indent(3)}<fPercentSubmerged value="${formatNumber(h.fPercentSubmerged, 85)}" />`);
    lines.push(`${indent(3)}<vecCentreOfMassOffset x="${formatNumber(h.vecCentreOfMassOffsetX, 0)}" y="${formatNumber(h.vecCentreOfMassOffsetY, 0)}" z="${formatNumber(h.vecCentreOfMassOffsetZ, 0)}" />`);
    lines.push(`${indent(3)}<vecInertiaMultiplier x="${formatNumber(h.vecInertiaMultiplierX, 1)}" y="${formatNumber(h.vecInertiaMultiplierY, 1)}" z="${formatNumber(h.vecInertiaMultiplierZ, 1)}" />`);
    lines.push(`${indent(3)}<fDriveBiasFront value="${formatNumber(h.fDriveBiasFront, 0)}" />`);
    lines.push(`${indent(3)}<nInitialDriveGears value="${formatInteger(h.nInitialDriveGears, 6)}" />`);
    lines.push(`${indent(3)}<fInitialDriveForce value="${formatNumber(h.fInitialDriveForce, 0.3)}" />`);
    lines.push(`${indent(3)}<fDriveInertia value="${formatNumber(h.fDriveInertia, 1)}" />`);
    lines.push(`${indent(3)}<fClutchChangeRateScaleUpShift value="${formatNumber(h.fClutchChangeRateScaleUpShift, 1.5)}" />`);
    lines.push(`${indent(3)}<fClutchChangeRateScaleDownShift value="${formatNumber(h.fClutchChangeRateScaleDownShift, 1.5)}" />`);
    lines.push(`${indent(3)}<fInitialDriveMaxFlatVel value="${formatNumber(h.fInitialDriveMaxFlatVel, 140)}" />`);
    lines.push(`${indent(3)}<fBrakeForce value="${formatNumber(h.fBrakeForce, 0.7)}" />`);
    lines.push(`${indent(3)}<fBrakeBiasFront value="${formatNumber(h.fBrakeBiasFront, 0.65)}" />`);
    lines.push(`${indent(3)}<fHandBrakeForce value="${formatNumber(h.fHandBrakeForce, 0.5)}" />`);
    lines.push(`${indent(3)}<fSteeringLock value="${formatNumber(h.fSteeringLock, 35)}" />`);
    lines.push(`${indent(3)}<fTractionCurveMax value="${formatNumber(h.fTractionCurveMax, 2.2)}" />`);
    lines.push(`${indent(3)}<fTractionCurveMin value="${formatNumber(h.fTractionCurveMin, 1.9)}" />`);
    lines.push(`${indent(3)}<fTractionCurveLateral value="${formatNumber(h.fTractionCurveLateral, 22.5)}" />`);
    lines.push(`${indent(3)}<fTractionSpringDeltaMax value="${formatNumber(h.fTractionSpringDeltaMax, 0.15)}" />`);
    lines.push(`${indent(3)}<fLowSpeedTractionLossMult value="${formatNumber(h.fLowSpeedTractionLossMult, 0)}" />`);
    lines.push(`${indent(3)}<fCamberStiffnesss value="${formatNumber(h.fCamberStiffnesss, 0)}" />`);
    lines.push(`${indent(3)}<fTractionBiasFront value="${formatNumber(h.fTractionBiasFront, 0.48)}" />`);
    lines.push(`${indent(3)}<fTractionLossMult value="${formatNumber(h.fTractionLossMult, 1)}" />`);
    lines.push(`${indent(3)}<fSuspensionForce value="${formatNumber(h.fSuspensionForce, 2.2)}" />`);
    lines.push(`${indent(3)}<fSuspensionCompDamp value="${formatNumber(h.fSuspensionCompDamp, 1.2)}" />`);
    lines.push(`${indent(3)}<fSuspensionReboundDamp value="${formatNumber(h.fSuspensionReboundDamp, 1.8)}" />`);
    lines.push(`${indent(3)}<fSuspensionUpperLimit value="${formatNumber(h.fSuspensionUpperLimit, 0.12)}" />`);
    lines.push(`${indent(3)}<fSuspensionLowerLimit value="${formatNumber(h.fSuspensionLowerLimit, -0.12)}" />`);
    lines.push(`${indent(3)}<fSuspensionRaise value="${formatNumber(h.fSuspensionRaise, 0)}" />`);
    lines.push(`${indent(3)}<fSuspensionBiasFront value="${formatNumber(h.fSuspensionBiasFront, 0.5)}" />`);
    lines.push(`${indent(3)}<fAntiRollBarForce value="${formatNumber(h.fAntiRollBarForce, 0.8)}" />`);
    lines.push(`${indent(3)}<fAntiRollBarBiasFront value="${formatNumber(h.fAntiRollBarBiasFront, 0.5)}" />`);
    lines.push(`${indent(3)}<fRollCentreHeightFront value="${formatNumber(h.fRollCentreHeightFront, 0.3)}" />`);
    lines.push(`${indent(3)}<fRollCentreHeightRear value="${formatNumber(h.fRollCentreHeightRear, 0.3)}" />`);
    lines.push(`${indent(3)}<fCollisionDamageMult value="${formatNumber(h.fCollisionDamageMult, 1)}" />`);
    lines.push(`${indent(3)}<fWeaponDamageMult value="${formatNumber(h.fWeaponDamageMult, 1)}" />`);
    lines.push(`${indent(3)}<fDeformationDamageMult value="${formatNumber(h.fDeformationDamageMult, 0.8)}" />`);
    lines.push(`${indent(3)}<fEngineDamageMult value="${formatNumber(h.fEngineDamageMult, 1)}" />`);
    lines.push(`${indent(3)}<fPetrolTankVolume value="${formatNumber(h.fPetrolTankVolume, 65)}" />`);
    lines.push(`${indent(3)}<fOilVolume value="${formatNumber(h.fOilVolume, 5)}" />`);
    lines.push(`${indent(3)}<fSeatOffsetDistX value="${formatNumber(h.fSeatOffsetDistX, 0)}" />`);
    lines.push(`${indent(3)}<fSeatOffsetDistY value="${formatNumber(h.fSeatOffsetDistY, 0)}" />`);
    lines.push(`${indent(3)}<fSeatOffsetDistZ value="${formatNumber(h.fSeatOffsetDistZ, 0)}" />`);
    lines.push(`${indent(3)}<nMonetaryValue value="${formatInteger(h.nMonetaryValue, 50000)}" />`);
    lines.push(`${indent(3)}<strModelFlags>${formatText(h.strModelFlags, "440010")}</strModelFlags>`);
    lines.push(`${indent(3)}<strHandlingFlags>${formatText(h.strHandlingFlags, "0")}</strHandlingFlags>`);
    lines.push(`${indent(3)}<strDamageFlags>${formatText(h.strDamageFlags, "0")}</strDamageFlags>`);
    lines.push(`${indent(3)}<AIHandling>${formatText(h.aiHandling, "SPORTS_CAR")}</AIHandling>`);
    lines.push(`${indent(3)}<SubHandlingData>`);
    lines.push(`${indent(4)}<Item type="CCarHandlingData">`);
    lines.push(`${indent(5)}<fBackEndPopUpCarImpulseMult value="${formatNumber(h.fBackEndPopUpCarImpulseMult, 0.1)}" />`);
    lines.push(`${indent(5)}<fBackEndPopUpBuildingImpulseMult value="${formatNumber(h.fBackEndPopUpBuildingImpulseMult, 0.03)}" />`);
    lines.push(`${indent(5)}<fBackEndPopUpMaxDeltaSpeed value="${formatNumber(h.fBackEndPopUpMaxDeltaSpeed, 0.6)}" />`);
    lines.push(`${indent(4)}</Item>`);
    lines.push(`${indent(4)}<Item type="NULL" />`);
    lines.push(`${indent(4)}<Item type="NULL" />`);
    lines.push(`${indent(3)}</SubHandlingData>`);
    lines.push(`${indent(2)}</Item>`);
  }

  lines.push(`${indent(1)}</HandlingData>`);
  lines.push(`</CHandlingDataMgr>`);
  return lines.join("\n");
}

export function serializeVehiclesMeta(vehicles: VehicleEntry[]): string {
  const filtered = vehicles.filter((v) => v.loadedMeta.has("vehicles"));
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<CVehicleModelInfo__InitDataList>`);
  if (filtered.length > 0) {
    const rootVehicle = filtered[0].vehicles;
    pushTextNode(lines, 1, "residentTxd", rootVehicle.residentTxd, "vehshare");
    pushTextNode(lines, 1, "residentAnims", rootVehicle.residentAnims);
    pushUnknownNodes(lines, 1, rootVehicle.unknownFileLevelNodes);
  }
  lines.push(`${indent(1)}<InitDatas>`);

  for (const v of filtered) {
    const d = v.vehicles;
    lines.push(`${indent(2)}<Item>`);
    pushTextNode(lines, 3, "modelName", d.modelName, "newvehicle");
    pushTextNode(lines, 3, "txdName", d.txdName, d.modelName);
    pushTextNode(lines, 3, "handlingId", d.handlingId, d.modelName.toUpperCase());
    pushTextNode(lines, 3, "gameName", d.gameName, d.modelName.toUpperCase());
    pushTextNode(lines, 3, "vehicleMakeName", d.vehicleMakeName, "CUSTOM");
    pushTextNode(lines, 3, "expressionDictName", d.expressionDictName);
    pushTextNode(lines, 3, "expressionName", d.expressionName);
    pushTextNode(lines, 3, "animConvRoofDictName", d.animConvRoofDictName);
    pushTextNode(lines, 3, "animConvRoofName", d.animConvRoofName);
    pushTextNode(lines, 3, "animConvRoofWindowsAffected", d.animConvRoofWindowsAffected);
    pushTextNode(lines, 3, "ptfxAssetName", d.ptfxAssetName);
    pushTextNode(lines, 3, "audioNameHash", d.audioNameHash, "ADDER");
    pushTextNode(lines, 3, "layout", d.layout, "LAYOUT_STANDARD");
    pushTextNode(lines, 3, "driverSourceExtension", d.driverSourceExtension, "feroci");
    pushTextNode(lines, 3, "coverBoundOffsets", d.coverBoundOffsets);
    if (d.povTuningInfo != null) {
      lines.push(...serializeXmlNode("POVTuningInfo", d.povTuningInfo, 3));
    } else {
      lines.push(`${indent(3)}<POVTuningInfo />`);
    }
    if (d.explosionInfo != null) {
      lines.push(...serializeXmlNode("explosionInfo", d.explosionInfo, 3));
    } else {
      lines.push(`${indent(3)}<explosionInfo />`);
    }
    pushTextNode(lines, 3, "scenarioLayout", d.scenarioLayout);
    pushTextNode(lines, 3, "cameraName", d.cameraName, "DEFAULT_SCRIPTED_CAMERA");
    pushTextNode(lines, 3, "aimCameraName", d.aimCameraName, "DEFAULT_AIM_CAMERA");
    pushTextNode(lines, 3, "bonnetCameraName", d.bonnetCameraName, "BONNET_CAMERA");
    pushTextNode(lines, 3, "povCameraName", d.povCameraName, "POV_CAMERA");
    for (const offsetName of FIRST_PERSON_IK_OFFSET_NAMES) {
      pushVec3Node(lines, 3, offsetName, d.firstPersonIkOffsets[offsetName] ?? { x: 0, y: 0, z: 0 });
    }
    pushVec3Node(lines, 3, "PovCameraOffset", d.povCameraOffset);
    pushNumberValueNode(lines, 3, "PovCameraVerticalAdjustmentForRollCage", d.povCameraVerticalAdjustmentForRollCage, 0);
    pushVec3Node(lines, 3, "PovPassengerCameraOffset", d.povPassengerCameraOffset);
    pushVec3Node(lines, 3, "PovRearPassengerCameraOffset", d.povRearPassengerCameraOffset);
    if (d.firstPersonDrivebyData != null) {
      lines.push(...serializeXmlNode("firstPersonDrivebyData", d.firstPersonDrivebyData, 3));
    } else {
      lines.push(`${indent(3)}<firstPersonDrivebyData />`);
    }
    pushTextNode(lines, 3, "vfxInfoName", d.vfxInfoName, "VFXVEHICLEINFO_DEFAULT");
    pushBooleanValueNode(lines, 3, "shouldUseCinematicViewMode", d.shouldUseCinematicViewMode, true);
    pushBooleanValueNode(lines, 3, "shouldCameraTransitionOnClimbUpDown", d.shouldCameraTransitionOnClimbUpDown, false);
    pushBooleanValueNode(lines, 3, "shouldCameraIgnoreExiting", d.shouldCameraIgnoreExiting, false);
    pushBooleanValueNode(lines, 3, "AllowPretendOccupants", d.allowPretendOccupants, false);
    pushBooleanValueNode(lines, 3, "AllowJoyriding", d.allowJoyriding, true);
    pushBooleanValueNode(lines, 3, "AllowSundayDriving", d.allowSundayDriving, true);
    pushBooleanValueNode(lines, 3, "AllowBodyColorMapping", d.allowBodyColorMapping, false);
    pushNumberValueNode(lines, 3, "wheelScale", d.wheelScale, 1);
    pushNumberValueNode(lines, 3, "wheelScaleRear", d.wheelScaleRear, 1);
    pushNumberValueNode(lines, 3, "dirtLevelMin", d.dirtLevelMin, 0);
    pushNumberValueNode(lines, 3, "dirtLevelMax", d.dirtLevelMax, 0.4);
    pushNumberValueNode(lines, 3, "envEffScaleMin", d.envEffScaleMin, 0);
    pushNumberValueNode(lines, 3, "envEffScaleMax", d.envEffScaleMax, 1);
    pushNumberValueNode(lines, 3, "envEffScaleMin2", d.envEffScaleMin2, 0);
    pushNumberValueNode(lines, 3, "envEffScaleMax2", d.envEffScaleMax2, 1);
    pushNumberValueNode(lines, 3, "damageMapScale", d.damageMapScale, 1);
    pushNumberValueNode(lines, 3, "damageOffsetScale", d.damageOffsetScale, 1);
    lines.push(`${indent(3)}<lodDistances content="float_array">`);
    lines.push(`${indent(4)}${escapeXml(formatText(d.lodDistances, "15.0 30.0 60.0 120.0 500.0"))}`);
    lines.push(`${indent(3)}</lodDistances>`);
    lines.push(`${indent(3)}<diffuseTint value="${escapeXml(formatText(d.diffuseTint, "0x00FFFFFF"))}" />`);
    pushNumberValueNode(lines, 3, "steerWheelMult", d.steerWheelMult, 1);
    pushNumberValueNode(lines, 3, "HDTextureDist", d.HDTextureDist, 60);
    pushNumberValueNode(lines, 3, "minSeatHeight", d.minSeatHeight, 0.2);
    pushNumberValueNode(lines, 3, "identicalModelSpawnDistance", d.identicalModelSpawnDistance, 20);
    pushIntegerValueNode(lines, 3, "maxNumOfSameColor", d.maxNumOfSameColor, 5);
    pushNumberValueNode(lines, 3, "defaultBodyHealth", d.defaultBodyHealth, 700);
    pushNumberValueNode(lines, 3, "pretendOccupantsScale", d.pretendOccupantsScale, 1);
    pushNumberValueNode(lines, 3, "visibleSpawnDistScale", d.visibleSpawnDistScale, 1);
    pushNumberValueNode(lines, 3, "trackerPathWidth", d.trackerPathWidth, 2);
    pushNumberValueNode(lines, 3, "weaponForceMult", d.weaponForceMult, 1);
    pushIntegerValueNode(lines, 3, "frequency", d.frequency, 20);
    pushTextNode(lines, 3, "swankness", d.swankness, "SWANKNESS_3");
    pushIntegerValueNode(lines, 3, "maxNum", d.maxNum, 20);
    pushTextNode(lines, 3, "flags", d.flags.join(" "));
    pushTextNode(lines, 3, "type", d.type, "VEHICLE_TYPE_CAR");
    pushTextNode(lines, 3, "plateType", d.plateType, "VPT_FRONT_AND_BACK_PLATES");
    pushTextNode(lines, 3, "dashboardType", d.dashboardType, "VDT_DEFAULT");
    pushTextNode(lines, 3, "vehicleClass", d.vehicleClass, "VC_SPORT");
    pushTextNode(lines, 3, "wheelType", d.wheelType, "VWT_SPORT");
    pushTextNode(lines, 3, "trailers", d.trailers);
    pushTextNode(lines, 3, "additionalTrailers", d.additionalTrailers);
    pushDriversNode(lines, 3, d.drivers);
    pushTextNode(lines, 3, "extraIncludes", d.extraIncludes);
    pushTextNode(lines, 3, "doorsWithCollisionWhenClosed", d.doorsWithCollisionWhenClosed);
    pushTextNode(lines, 3, "driveableDoors", d.driveableDoors);
    pushDoorStiffnessNode(lines, 3, d.doorStiffnessMultipliers);
    pushBooleanValueNode(lines, 3, "bumpersNeedToCollideWithMap", d.bumpersNeedToCollideWithMap, false);
    pushBooleanValueNode(lines, 3, "needsRopeTexture", d.needsRopeTexture, false);
    pushTextNode(lines, 3, "requiredExtras", d.requiredExtras);
    pushUnknownNodes(lines, 3, d.unknownNodes);
    lines.push(`${indent(2)}</Item>`);
  }

  lines.push(`${indent(1)}</InitDatas>`);
  if (filtered.length > 0) {
    const relationshipEntries = new Map<string, { parent: string; child: string }>();
    for (const vehicle of filtered) {
      for (const relationship of vehicle.vehicles.txdRelationships) {
        const parent = formatText(relationship.parent, "vehshare");
        const child = formatText(relationship.child, "");
        if (child === "") continue;
        relationshipEntries.set(`${parent}::${child}`, { parent, child });
      }
    }

    if (relationshipEntries.size > 0) {
      lines.push(`${indent(1)}<txdRelationships>`);
      for (const relationship of relationshipEntries.values()) {
        lines.push(`${indent(2)}<Item>`);
        pushTextNode(lines, 3, "parent", relationship.parent, "vehshare");
        pushTextNode(lines, 3, "child", relationship.child);
        lines.push(`${indent(2)}</Item>`);
      }
      lines.push(`${indent(1)}</txdRelationships>`);
    }
  }
  lines.push(`</CVehicleModelInfo__InitDataList>`);
  return lines.join("\n");
}

export function serializeCarcolsMeta(vehicles: VehicleEntry[]): string {
  const filtered = vehicles.filter((v) => v.loadedMeta.has("carcols"));
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<CVehicleModelInfoVarGlobal>`);
  lines.push(`${indent(1)}<Kits>`);

  for (const v of filtered) {
    const c = v.carcols;
    lines.push(`${indent(2)}<Item>`);
    lines.push(`${indent(3)}<id value="${c.id}" />`);
    lines.push(`${indent(3)}<kitName>${c.kitName}</kitName>`);
    lines.push(`${indent(2)}</Item>`);
  }

  lines.push(`${indent(1)}</Kits>`);
  lines.push(`${indent(1)}<Sirens>`);

  for (const v of filtered) {
    const c = v.carcols;
    if (c.sirenId === 0 && c.lights.length === 0) continue;
    lines.push(`${indent(2)}<Item>`);
    lines.push(`${indent(3)}<id value="${c.sirenId}" />`);
    if (c.name.trim()) {
      pushTextNode(lines, 3, "name", c.name);
    }
    if (c.textureName.trim()) {
      pushTextNode(lines, 3, "textureName", c.textureName);
    }
    if (c.useRealLights) {
      pushBooleanValueNode(lines, 3, "useRealLights", c.useRealLights, false);
    }
    lines.push(`${indent(3)}<sequencerBpm value="${c.sequencerBpm}" />`);
    pushUnknownNodes(lines, 3, c.unknownNodes);
    if (c.rotationLimit !== 0) {
      lines.push(`${indent(3)}<rotationLimit value="${c.rotationLimit.toFixed(6)}" />`);
    }
    if (c.lights.length > 0) {
      lines.push(`${indent(3)}<sirens>`);
      for (const light of c.lights) {
        pushLegacySirenLight(lines, 4, light);
      }
      lines.push(`${indent(3)}</sirens>`);
    }
    if (c.environmentalLightEnabled) {
      lines.push(`${indent(3)}<environmentalLight>`);
      lines.push(`${indent(4)}<color value="${c.environmentalLightColor}" />`);
      lines.push(`${indent(4)}<intensity value="${c.environmentalLightIntensity.toFixed(6)}" />`);
      lines.push(`${indent(3)}</environmentalLight>`);
    }
    lines.push(`${indent(2)}</Item>`);
  }

  lines.push(`${indent(1)}</Sirens>`);
  lines.push(`</CVehicleModelInfoVarGlobal>`);
  return lines.join("\n");
}

export function serializeCarvariationsMeta(vehicles: VehicleEntry[]): string {
  const filtered = vehicles.filter((v) => v.loadedMeta.has("carvariations"));
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<CVehicleModelInfoVariation>`);
  lines.push(`${indent(1)}<variationData>`);

  for (const v of filtered) {
    const cv = v.carvariations;
    lines.push(`${indent(2)}<Item>`);
    lines.push(`${indent(3)}<modelName>${cv.modelName}</modelName>`);
    lines.push(`${indent(3)}<colors>`);
    for (const color of cv.colors) {
      lines.push(`${indent(4)}<Item>`);
      lines.push(`${indent(5)}<indices content="int_array">`);
      lines.push(`${indent(6)}${color.primary} ${color.secondary} ${color.pearl} ${color.wheels} ${color.interior} ${color.dashboard}`);
      lines.push(`${indent(5)}</indices>`);
      if ((color.liveries?.length ?? 0) > 0) {
        lines.push(`${indent(5)}<liveries>`);
        for (const liveryEnabled of color.liveries ?? []) {
          lines.push(`${indent(6)}<Item value="${formatBoolean(liveryEnabled, false)}" />`);
        }
        lines.push(`${indent(5)}</liveries>`);
      }
      lines.push(`${indent(4)}</Item>`);
    }
    lines.push(`${indent(3)}</colors>`);
    lines.push(`${indent(3)}<sirenSettings value="${cv.sirenSettings}" />`);
    lines.push(`${indent(3)}<lightSettings value="${cv.lightSettings}" />`);
    lines.push(`${indent(3)}<kits>`);
    for (const kit of cv.kits) {
      lines.push(`${indent(4)}<Item>${kit}</Item>`);
    }
    lines.push(`${indent(3)}</kits>`);
    lines.push(`${indent(3)}<windows value="${cv.windows}" />`);
    if (cv.windowsWithExposedEdges.length > 0) {
      lines.push(`${indent(3)}<windowsWithExposedEdges>`);
      for (const windowName of cv.windowsWithExposedEdges) {
        lines.push(`${indent(4)}<Item>${escapeXml(windowName)}</Item>`);
      }
      lines.push(`${indent(3)}</windowsWithExposedEdges>`);
    }
    lines.push(`${indent(3)}<plateProbabilities>`);
    for (const plate of cv.plateProbabilities) {
      lines.push(`${indent(4)}<Item>`);
      lines.push(`${indent(5)}<Name>${escapeXml(formatText(plate.name, "Plate"))}</Name>`);
      lines.push(`${indent(5)}<Value value="${formatInteger(plate.value, 0)}" />`);
      lines.push(`${indent(4)}</Item>`);
    }
    lines.push(`${indent(3)}</plateProbabilities>`);
    lines.push(`${indent(2)}</Item>`);
  }

  lines.push(`${indent(1)}</variationData>`);
  lines.push(`</CVehicleModelInfoVariation>`);
  return lines.join("\n");
}

function serializeLookAroundSide(side: LookAroundSideData, level: number): string[] {
  const lines: string[] = [];
  if (side.offsets && side.offsets.length > 0) {
    lines.push(`${indent(level)}<Offsets>`);
    for (const o of side.offsets) {
      lines.push(`${indent(level + 1)}<Item>`);
      lines.push(`${indent(level + 2)}<Offset value="${o.offset.toFixed(6)}" />`);
      lines.push(`${indent(level + 2)}<AngleToBlendInOffset x="${o.angleToBlendInOffsetX.toFixed(6)}" y="${o.angleToBlendInOffsetY.toFixed(6)}" />`);
      lines.push(`${indent(level + 1)}</Item>`);
    }
    lines.push(`${indent(level)}</Offsets>`);
  } else {
    lines.push(`${indent(level)}<Offsets />`);
  }
  lines.push(`${indent(level)}<ExtraRelativePitch x="${side.extraRelativePitchX.toFixed(6)}" y="${side.extraRelativePitchY.toFixed(6)}" />`);
  lines.push(`${indent(level)}<AngleToBlendInExtraPitch x="${side.angleToBlendInExtraPitchX.toFixed(6)}" y="${side.angleToBlendInExtraPitchY.toFixed(6)}" />`);
  return lines;
}

export function serializeVehicleLayoutsMeta(vehicles: VehicleEntry[]): string {
  const filtered = vehicles.filter((v) => v.loadedMeta.has("vehiclelayouts"));
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<CVehicleMetadataMgr>`);

  // Merge all cover bound offsets and look-around data from all vehicles
  const allCovers = filtered.flatMap((v) => v.vehiclelayouts.coverBoundOffsets);
  const allLookAround = filtered.flatMap((v) => v.vehiclelayouts.driveByLookAroundData);

  lines.push(`${indent(1)}<VehicleCoverBoundOffsetInfos>`);
  for (const cover of allCovers) {
    lines.push(`${indent(2)}<Item type="CVehicleCoverBoundOffsetInfo">`);
    lines.push(`${indent(3)}<Name>${cover.name}</Name>`);
    lines.push(`${indent(3)}<ExtraSideOffset value="${cover.extraSideOffset.toFixed(6)}" />`);
    lines.push(`${indent(3)}<ExtraForwardOffset value="${cover.extraForwardOffset.toFixed(6)}" />`);
    lines.push(`${indent(3)}<ExtraBackwardOffset value="${cover.extraBackwardOffset.toFixed(6)}" />`);
    lines.push(`${indent(3)}<ExtraZOffset value="${cover.extraZOffset.toFixed(6)}" />`);
    lines.push(`${indent(3)}<CoverBoundInfos />`);
    lines.push(`${indent(2)}</Item>`);
  }
  lines.push(`${indent(1)}</VehicleCoverBoundOffsetInfos>`);

  lines.push(`${indent(1)}<FirstPersonDriveByLookAroundData>`);
  for (const entry of allLookAround) {
    lines.push(`${indent(2)}<Item type="CFirstPersonDriveByLookAroundData">`);
    lines.push(`${indent(3)}<Name>${entry.name}</Name>`);
    lines.push(`${indent(3)}<AllowLookback value="${entry.allowLookback}" />`);
    lines.push(`${indent(3)}<HeadingLimits x="${entry.headingLimitsX.toFixed(6)}" y="${entry.headingLimitsY.toFixed(6)}" />`);
    lines.push(`${indent(3)}<DataLeft>`);
    lines.push(...serializeLookAroundSide(entry.dataLeft, 4));
    lines.push(`${indent(3)}</DataLeft>`);
    lines.push(`${indent(3)}<DataRight>`);
    lines.push(...serializeLookAroundSide(entry.dataRight, 4));
    lines.push(`${indent(3)}</DataRight>`);
    lines.push(`${indent(2)}</Item>`);
  }
  lines.push(`${indent(1)}</FirstPersonDriveByLookAroundData>`);

  lines.push(`</CVehicleMetadataMgr>`);
  return lines.join("\n");
}

export function serializeModkitsMeta(vehicles: VehicleEntry[]): string {
  const filtered = vehicles.filter((v) => v.loadedMeta.has("modkits"));
  const lines: string[] = [];
  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<CVehicleModelInfoVarGlobal>`);
  lines.push(`${indent(1)}<Kits>`);

  for (const v of filtered) {
    for (const kit of v.modkits.kits) {
      lines.push(`${indent(2)}<Item>`);
      pushTextNode(lines, 3, "kitName", kit.kitName);
      lines.push(`${indent(3)}<id value="${formatInteger(kit.id, 0)}" />`);
      pushTextNode(lines, 3, "kitType", kit.kitType, "MKT_STANDARD");

      if (kit.visibleMods.length > 0) {
        lines.push(`${indent(3)}<visibleMods>`);
        for (const mod of kit.visibleMods) {
          lines.push(`${indent(4)}<Item>`);
          pushTextNode(lines, 5, "modelName", mod.modelName);
          pushTextNode(lines, 5, "modShopLabel", mod.modShopLabel);
          pushTextNode(lines, 5, "linkedModels", mod.linkedModels);
          if (mod.turnOffBones.length > 0) {
            lines.push(`${indent(5)}<turnOffBones>`);
            for (const bone of mod.turnOffBones) {
              lines.push(`${indent(6)}<Item>${escapeXml(bone)}</Item>`);
            }
            lines.push(`${indent(5)}</turnOffBones>`);
          } else {
            lines.push(`${indent(5)}<turnOffBones/>`);
          }
          pushTextNode(lines, 5, "type", mod.type, "VMT_SPOILER");
          pushTextNode(lines, 5, "bone", mod.bone, "chassis");
          pushTextNode(lines, 5, "collisionBone", mod.collisionBone, "chassis");
          lines.push(`${indent(5)}<cameraPos value="${formatInteger(mod.cameraPos, 0)}" />`);
          lines.push(`${indent(5)}<audioApply value="${formatNumber(mod.audioApply, 1)}" />`);
          lines.push(`${indent(5)}<weight value="${formatInteger(mod.weight, 0)}" />`);
          lines.push(`${indent(5)}<turnOffExtra value="${formatInteger(mod.turnOffExtra, -1)}" />`);
          lines.push(`${indent(5)}<disableBonnetCamera value="${formatBoolean(mod.disableBonnetCamera, false)}" />`);
          lines.push(`${indent(5)}<allowBonnetSlide value="${formatBoolean(mod.allowBonnetSlide, false)}" />`);
          pushTextNode(lines, 5, "weaponSlot", mod.weaponSlot);
          pushTextNode(lines, 5, "weaponSlotSecondary", mod.weaponSlotSecondary);
          lines.push(`${indent(5)}<disableProjectileDriveby value="${formatBoolean(mod.disableProjectileDriveby, false)}" />`);
          lines.push(`${indent(5)}<disableDriveby value="${formatBoolean(mod.disableDriveby, false)}" />`);
          lines.push(`${indent(5)}<disableDrivebySeat value="${formatBoolean(mod.disableDrivebySeat, false)}" />`);
          lines.push(`${indent(5)}<disableDrivebySeatSecondary value="${formatBoolean(mod.disableDrivebySeatSecondary, false)}" />`);
          lines.push(`${indent(4)}</Item>`);
        }
        lines.push(`${indent(3)}</visibleMods>`);
      } else {
        lines.push(`${indent(3)}<visibleMods/>`);
      }

      if (kit.linkMods.length > 0) {
        lines.push(`${indent(3)}<linkMods>`);
        for (const linkMod of kit.linkMods) {
          lines.push(`${indent(4)}<Item>`);
          pushTextNode(lines, 5, "modelName", linkMod.modelName);
          pushTextNode(lines, 5, "bone", linkMod.bone, "chassis");
          lines.push(`${indent(5)}<turnOffExtra value="${formatInteger(linkMod.turnOffExtra, -1)}" />`);
          lines.push(`${indent(4)}</Item>`);
        }
        lines.push(`${indent(3)}</linkMods>`);
      } else {
        lines.push(`${indent(3)}<linkMods/>`);
      }

      if (kit.statMods.length > 0) {
        lines.push(`${indent(3)}<statMods>`);
        for (const mod of kit.statMods) {
          lines.push(`${indent(4)}<Item>`);
          pushTextNode(lines, 5, "identifier", mod.identifier);
          lines.push(`${indent(5)}<modifier value="${formatNumber(mod.modifier, 0)}" />`);
          lines.push(`${indent(5)}<audioApply value="${formatNumber(mod.audioApply, 1)}" />`);
          lines.push(`${indent(5)}<weight value="${formatInteger(mod.weight, 0)}" />`);
          pushTextNode(lines, 5, "type", mod.type, "VMT_ENGINE");
          lines.push(`${indent(4)}</Item>`);
        }
        lines.push(`${indent(3)}</statMods>`);
      } else {
        lines.push(`${indent(3)}<statMods/>`);
      }

      if (kit.slotNames.length > 0) {
        lines.push(`${indent(3)}<slotNames>`);
        for (const slot of kit.slotNames) {
          lines.push(`${indent(4)}<Item>`);
          pushTextNode(lines, 5, "slot", slot.slot);
          pushTextNode(lines, 5, "name", slot.name);
          lines.push(`${indent(4)}</Item>`);
        }
        lines.push(`${indent(3)}</slotNames>`);
      } else {
        lines.push(`${indent(3)}<slotNames/>`);
      }

      if (kit.liveryNames.length > 0) {
        lines.push(`${indent(3)}<liveryNames>`);
        for (const name of kit.liveryNames) {
          lines.push(`${indent(4)}<Item>${escapeXml(name)}</Item>`);
        }
        lines.push(`${indent(3)}</liveryNames>`);
      } else {
        lines.push(`${indent(3)}<liveryNames/>`);
      }

      if (kit.livery2Names.length > 0) {
        lines.push(`${indent(3)}<livery2Names>`);
        for (const name of kit.livery2Names) {
          lines.push(`${indent(4)}<Item>${escapeXml(name)}</Item>`);
        }
        lines.push(`${indent(3)}</livery2Names>`);
      } else {
        lines.push(`${indent(3)}<livery2Names/>`);
      }

      lines.push(`${indent(2)}</Item>`);
    }
  }

  lines.push(`${indent(1)}</Kits>`);
  lines.push(`</CVehicleModelInfoVarGlobal>`);
  return lines.join("\n");
}

export function serializeActiveTab(
  tab: string,
  vehicles: VehicleEntry[]
): string {
  switch (tab) {
    case "handling":
      return serializeHandlingMeta(vehicles);
    case "vehicles":
      return serializeVehiclesMeta(vehicles);
    case "carcols":
      return serializeCarcolsMeta(vehicles);
    case "carvariations":
      return serializeCarvariationsMeta(vehicles);
    case "vehiclelayouts":
      return serializeVehicleLayoutsMeta(vehicles);
    case "modkits":
      return serializeModkitsMeta(vehicles);
    default:
      return "";
  }
}

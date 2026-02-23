import { XMLBuilder } from "fast-xml-parser";
import {
  FIRST_PERSON_IK_OFFSET_NAMES,
  type VehicleEntry,
  type VehicleUnknownXmlNode,
} from "@/store/meta-store";

function indent(level: number): string {
  return "  ".repeat(level);
}

function formatNumber(value: unknown, fallback: number, precision: number = 9): string {
  const numeric = typeof value === "number" && Number.isFinite(value)
    ? value
    : (typeof value === "string" ? Number.parseFloat(value) : Number.NaN);
  const resolved = Number.isFinite(numeric) ? numeric : fallback;
  return resolved
    .toFixed(precision)
    .replace(/\.0+$/, ".0")
    .replace(/(\.\d*?[1-9])0+$/, "$1");
}

function formatInteger(value: unknown, fallback: number): string {
  const numeric = typeof value === "number" && Number.isFinite(value)
    ? value
    : (typeof value === "string" ? Number.parseFloat(value) : Number.NaN);
  const resolved = Number.isFinite(numeric) ? numeric : fallback;
  return String(Math.trunc(resolved));
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
  if (typeof value === "number") return value !== 0 ? "true" : "false";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1") return "true";
    if (normalized === "false" || normalized === "0") return "false";
  }
  return fallback ? "true" : "false";
}

const rawXmlBuilder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  suppressEmptyNode: false,
  format: true,
  indentBy: "  ",
});

function serializeUnknownNode(node: VehicleUnknownXmlNode, level: number): string[] {
  const xml = rawXmlBuilder.build({ [node.tag]: node.value ?? "" });
  return xml
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => `${indent(level)}${line}`);
}

function appendTextTag(lines: string[], level: number, tag: string, value: unknown, fallback: string): void {
  lines.push(`${indent(level)}<${tag}>${formatText(value, fallback)}</${tag}>`);
}

function appendOptionalTextTag(lines: string[], level: number, tag: string, value: unknown): void {
  const text = formatText(value, "");
  if (!text) return;
  lines.push(`${indent(level)}<${tag}>${text}</${tag}>`);
}

function appendValueTag(lines: string[], level: number, tag: string, value: unknown, fallback: number): void {
  lines.push(`${indent(level)}<${tag} value="${formatNumber(value, fallback)}" />`);
}

function appendIntegerTag(lines: string[], level: number, tag: string, value: unknown, fallback: number): void {
  lines.push(`${indent(level)}<${tag} value="${formatInteger(value, fallback)}" />`);
}

function appendBooleanTag(lines: string[], level: number, tag: string, value: unknown, fallback: boolean): void {
  lines.push(`${indent(level)}<${tag} value="${formatBoolean(value, fallback)}" />`);
}

function appendVec3Tag(
  lines: string[],
  level: number,
  tag: string,
  value: { x: number; y: number; z: number } | undefined,
  fallback: { x: number; y: number; z: number },
): void {
  const vec = value ?? fallback;
  lines.push(
    `${indent(level)}<${tag} x="${formatNumber(vec.x, fallback.x)}" y="${formatNumber(vec.y, fallback.y)}" z="${formatNumber(vec.z, fallback.z)}" />`
  );
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

  const residentTxd =
    filtered.find((vehicle) => formatText(vehicle.vehicles.residentTxd, "").length > 0)?.vehicles.residentTxd ??
    "vehshare";
  const residentAnims =
    filtered.find((vehicle) => vehicle.vehicles.residentAnims !== undefined)?.vehicles.residentAnims ??
    "";

  const relationshipMap = new Map<string, { parent: string; child: string }>();
  for (const vehicle of filtered) {
    for (const relationship of vehicle.vehicles.txdRelationships ?? []) {
      const parent = formatText(relationship.parent, residentTxd);
      const child = formatText(relationship.child, "");
      if (!child) continue;
      relationshipMap.set(`${parent}:${child}`, { parent, child });
    }
  }

  if (relationshipMap.size === 0) {
    for (const vehicle of filtered) {
      const child = formatText(vehicle.vehicles.txdName, formatText(vehicle.vehicles.modelName, ""));
      if (!child) continue;
      relationshipMap.set(`${residentTxd}:${child}`, { parent: residentTxd, child });
    }
  }

  const fileUnknownNodes: VehicleUnknownXmlNode[] = [];
  const seenFileUnknownNodes = new Set<string>();
  for (const vehicle of filtered) {
    for (const node of vehicle.vehicles.unknownFileLevelNodes ?? []) {
      const signature = `${node.tag}:${JSON.stringify(node.value)}`;
      if (seenFileUnknownNodes.has(signature)) continue;
      seenFileUnknownNodes.add(signature);
      fileUnknownNodes.push(node);
    }
  }

  lines.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  lines.push(`<CVehicleModelInfo__InitDataList>`);
  appendTextTag(lines, 1, "residentTxd", residentTxd, "vehshare");

  const residentAnimsText = formatText(residentAnims, "");
  if (residentAnimsText) {
    lines.push(`${indent(1)}<residentAnims>${residentAnimsText}</residentAnims>`);
  } else {
    lines.push(`${indent(1)}<residentAnims />`);
  }

  lines.push(`${indent(1)}<InitDatas>`);

  for (const vehicle of filtered) {
    const d = vehicle.vehicles;
    lines.push(`${indent(2)}<Item>`);
    appendTextTag(lines, 3, "modelName", d.modelName, "newvehicle");
    appendTextTag(lines, 3, "txdName", d.txdName, formatText(d.modelName, "newvehicle"));
    appendTextTag(lines, 3, "handlingId", d.handlingId, "NEWVEHICLE");
    appendTextTag(lines, 3, "gameName", d.gameName, "NEWVEHICLE");
    appendTextTag(lines, 3, "vehicleMakeName", d.vehicleMakeName, "CUSTOM");
    appendOptionalTextTag(lines, 3, "expressionDictName", d.expressionDictName);
    appendOptionalTextTag(lines, 3, "expressionName", d.expressionName);
    appendOptionalTextTag(lines, 3, "animConvRoofDictName", d.animConvRoofDictName);
    appendOptionalTextTag(lines, 3, "animConvRoofName", d.animConvRoofName);
    appendOptionalTextTag(lines, 3, "animConvRoofWindowsAffected", d.animConvRoofWindowsAffected);
    appendOptionalTextTag(lines, 3, "ptfxAssetName", d.ptfxAssetName);
    appendTextTag(lines, 3, "audioNameHash", d.audioNameHash, "ADDER");
    appendTextTag(lines, 3, "layout", d.layout, "LAYOUT_STANDARD");
    appendTextTag(lines, 3, "driverSourceExtension", d.driverSourceExtension, "feroci");
    appendOptionalTextTag(lines, 3, "coverBoundOffsets", d.coverBoundOffsets);

    if (d.povTuningInfo !== null && d.povTuningInfo !== undefined) {
      lines.push(...serializeUnknownNode({ tag: "POVTuningInfo", value: d.povTuningInfo }, 3));
    }
    if (d.explosionInfo !== null && d.explosionInfo !== undefined) {
      lines.push(...serializeUnknownNode({ tag: "explosionInfo", value: d.explosionInfo }, 3));
    }

    appendOptionalTextTag(lines, 3, "scenarioLayout", d.scenarioLayout);
    appendTextTag(lines, 3, "cameraName", d.cameraName, "DEFAULT_SCRIPTED_CAMERA");
    appendTextTag(lines, 3, "aimCameraName", d.aimCameraName, "DEFAULT_AIM_CAMERA");
    appendTextTag(lines, 3, "bonnetCameraName", d.bonnetCameraName, "BONNET_CAMERA");
    appendTextTag(lines, 3, "povCameraName", d.povCameraName, "POV_CAMERA");

    for (const offsetName of FIRST_PERSON_IK_OFFSET_NAMES) {
      appendVec3Tag(lines, 3, offsetName, d.firstPersonIkOffsets[offsetName], { x: 0, y: 0, z: 0 });
    }

    appendVec3Tag(lines, 3, "PovCameraOffset", d.povCameraOffset, { x: 0, y: 0, z: 0 });
    appendValueTag(
      lines,
      3,
      "PovCameraVerticalAdjustmentForRollCage",
      d.povCameraVerticalAdjustmentForRollCage,
      0
    );
    appendVec3Tag(lines, 3, "PovPassengerCameraOffset", d.povPassengerCameraOffset, { x: 0, y: 0, z: 0 });
    appendVec3Tag(
      lines,
      3,
      "PovRearPassengerCameraOffset",
      d.povRearPassengerCameraOffset,
      { x: 0, y: 0, z: 0 }
    );

    if (d.firstPersonDrivebyData !== null && d.firstPersonDrivebyData !== undefined) {
      lines.push(...serializeUnknownNode({ tag: "firstPersonDrivebyData", value: d.firstPersonDrivebyData }, 3));
    }

    appendTextTag(lines, 3, "vfxInfoName", d.vfxInfoName, "VFXVEHICLEINFO_DEFAULT");
    appendBooleanTag(lines, 3, "shouldUseCinematicViewMode", d.shouldUseCinematicViewMode, true);
    appendBooleanTag(
      lines,
      3,
      "shouldCameraTransitionOnClimbUpDown",
      d.shouldCameraTransitionOnClimbUpDown,
      false
    );
    appendBooleanTag(lines, 3, "shouldCameraIgnoreExiting", d.shouldCameraIgnoreExiting, false);
    appendBooleanTag(lines, 3, "AllowPretendOccupants", d.allowPretendOccupants, false);
    appendBooleanTag(lines, 3, "AllowJoyriding", d.allowJoyriding, true);
    appendBooleanTag(lines, 3, "AllowSundayDriving", d.allowSundayDriving, true);
    appendBooleanTag(lines, 3, "AllowBodyColorMapping", d.allowBodyColorMapping, false);

    appendValueTag(lines, 3, "wheelScale", d.wheelScale, 1);
    appendValueTag(lines, 3, "wheelScaleRear", d.wheelScaleRear, 1);
    appendValueTag(lines, 3, "dirtLevelMin", d.dirtLevelMin, 0);
    appendValueTag(lines, 3, "dirtLevelMax", d.dirtLevelMax, 0.4);
    appendValueTag(lines, 3, "envEffScaleMin", d.envEffScaleMin, 0);
    appendValueTag(lines, 3, "envEffScaleMax", d.envEffScaleMax, 1);
    appendValueTag(lines, 3, "envEffScaleMin2", d.envEffScaleMin2, 0);
    appendValueTag(lines, 3, "envEffScaleMax2", d.envEffScaleMax2, 1);
    appendValueTag(lines, 3, "damageMapScale", d.damageMapScale, 1);
    appendValueTag(lines, 3, "damageOffsetScale", d.damageOffsetScale, 1);
    lines.push(`${indent(3)}<diffuseTint value="${formatText(d.diffuseTint, "0x00FFFFFF")}" />`);
    appendValueTag(lines, 3, "steerWheelMult", d.steerWheelMult, 1);
    appendValueTag(lines, 3, "HDTextureDist", d.HDTextureDist, 60);
    lines.push(`${indent(3)}<lodDistances content="float_array">`);
    lines.push(`${indent(4)}${formatText(d.lodDistances, "15.0 30.0 60.0 120.0 500.0")}`);
    lines.push(`${indent(3)}</lodDistances>`);
    appendValueTag(lines, 3, "minSeatHeight", d.minSeatHeight, 0.2);
    appendValueTag(lines, 3, "identicalModelSpawnDistance", d.identicalModelSpawnDistance, 20);
    appendIntegerTag(lines, 3, "maxNumOfSameColor", d.maxNumOfSameColor, 5);
    appendIntegerTag(lines, 3, "defaultBodyHealth", d.defaultBodyHealth, 700);
    appendValueTag(lines, 3, "pretendOccupantsScale", d.pretendOccupantsScale, 1);
    appendValueTag(lines, 3, "visibleSpawnDistScale", d.visibleSpawnDistScale, 1);
    appendValueTag(lines, 3, "trackerPathWidth", d.trackerPathWidth, 2);
    appendValueTag(lines, 3, "weaponForceMult", d.weaponForceMult, 1);
    appendIntegerTag(lines, 3, "frequency", d.frequency, 20);
    appendTextTag(lines, 3, "swankness", d.swankness, "SWANKNESS_3");
    appendIntegerTag(lines, 3, "maxNum", d.maxNum, 20);

    const flags = (d.flags ?? [])
      .map((flag) => formatText(flag, "").trim())
      .filter(Boolean);
    if (flags.length > 0) {
      lines.push(`${indent(3)}<flags>${flags.join(" ")}</flags>`);
    } else {
      lines.push(`${indent(3)}<flags />`);
    }

    appendTextTag(lines, 3, "type", d.type, "VEHICLE_TYPE_CAR");
    appendTextTag(lines, 3, "plateType", d.plateType, "VPT_FRONT_AND_BACK_PLATES");
    appendTextTag(lines, 3, "dashboardType", d.dashboardType, "VDT_DEFAULT");
    appendTextTag(lines, 3, "vehicleClass", d.vehicleClass, "VC_SPORT");
    appendTextTag(lines, 3, "wheelType", d.wheelType, "VWT_SPORT");

    appendOptionalTextTag(lines, 3, "trailers", d.trailers);
    appendOptionalTextTag(lines, 3, "additionalTrailers", d.additionalTrailers);

    if ((d.drivers?.length ?? 0) > 0) {
      lines.push(`${indent(3)}<drivers>`);
      for (const driver of d.drivers) {
        lines.push(`${indent(4)}<Item>`);
        appendTextTag(lines, 5, "driverName", driver.driverName, "");
        appendTextTag(lines, 5, "npcName", driver.npcName, "");
        lines.push(`${indent(4)}</Item>`);
      }
      lines.push(`${indent(3)}</drivers>`);
    } else {
      lines.push(`${indent(3)}<drivers />`);
    }

    appendOptionalTextTag(lines, 3, "extraIncludes", d.extraIncludes);
    appendOptionalTextTag(lines, 3, "doorsWithCollisionWhenClosed", d.doorsWithCollisionWhenClosed);
    appendOptionalTextTag(lines, 3, "driveableDoors", d.driveableDoors);

    if ((d.doorStiffnessMultipliers?.length ?? 0) > 0) {
      lines.push(`${indent(3)}<doorStiffnessMultipliers>`);
      for (const multiplier of d.doorStiffnessMultipliers) {
        lines.push(`${indent(4)}<Item>`);
        appendIntegerTag(lines, 5, "doorId", multiplier.doorId, 0);
        appendValueTag(lines, 5, "stiffnessMult", multiplier.stiffnessMult, 1);
        lines.push(`${indent(4)}</Item>`);
      }
      lines.push(`${indent(3)}</doorStiffnessMultipliers>`);
    } else {
      lines.push(`${indent(3)}<doorStiffnessMultipliers />`);
    }

    appendBooleanTag(lines, 3, "bumpersNeedToCollideWithMap", d.bumpersNeedToCollideWithMap, false);
    appendBooleanTag(lines, 3, "needsRopeTexture", d.needsRopeTexture, false);
    appendOptionalTextTag(lines, 3, "requiredExtras", d.requiredExtras);

    for (const node of d.unknownNodes ?? []) {
      lines.push(...serializeUnknownNode(node, 3));
    }

    lines.push(`${indent(2)}</Item>`);
  }

  lines.push(`${indent(1)}</InitDatas>`);
  lines.push(`${indent(1)}<txdRelationships>`);
  for (const relationship of relationshipMap.values()) {
    lines.push(`${indent(2)}<Item>`);
    appendTextTag(lines, 3, "parent", relationship.parent, residentTxd);
    appendTextTag(lines, 3, "child", relationship.child, "");
    lines.push(`${indent(2)}</Item>`);
  }
  lines.push(`${indent(1)}</txdRelationships>`);

  for (const node of fileUnknownNodes) {
    lines.push(...serializeUnknownNode(node, 1));
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
    lines.push(`${indent(3)}<sequencerBpm value="${c.sequencerBpm}" />`);
    lines.push(`${indent(3)}<rotationLimit value="${formatNumber(c.rotationLimit, 0)}" />`);
    if (c.lights.length > 0) {
      lines.push(`${indent(3)}<sirens>`);
      for (const light of c.lights) {
        const rotParts = light.rotation.trim().split(/\s+/);
        const rx = parseFloat(rotParts[0]) || 0;
        const ry = parseFloat(rotParts[1]) || 0;
        const rz = parseFloat(rotParts[2]) || 0;
        const resolvedScale = light.coronaEnabled === false
          ? 0
          : (light.coronaScale ?? light.scale);
        // Convert binary sequencer to decimal
        let seqVal = light.sequencer;
        if (/^[01]{32}$/.test(seqVal)) {
          seqVal = String(parseInt(seqVal, 2) >>> 0);
        }
        lines.push(`${indent(4)}<Item>`);
        lines.push(`${indent(5)}<rotation x="${formatNumber(rx, 0)}" y="${formatNumber(ry, 0)}" z="${formatNumber(rz, 0)}" />`);
        lines.push(`${indent(5)}<flashness value="${formatNumber(light.flashness, 0)}" />`);
        lines.push(`${indent(5)}<delta value="${formatNumber(light.delta, 0)}" />`);
        lines.push(`${indent(5)}<color value="${light.color}" />`);
        lines.push(`${indent(5)}<scale value="${formatNumber(resolvedScale, 0.4)}" />`);
        lines.push(`${indent(5)}<sequencer value="${seqVal}" />`);
        lines.push(`${indent(4)}</Item>`);
      }
      lines.push(`${indent(3)}</sirens>`);
    }
    lines.push(`${indent(3)}<environmentalLight>`);
    lines.push(`${indent(4)}<color value="${c.environmentalLightColor}" />`);
    lines.push(`${indent(4)}<intensity value="${formatNumber(c.environmentalLightIntensity, 50)}" />`);
    lines.push(`${indent(3)}</environmentalLight>`);
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
    lines.push(`${indent(3)}<plateProbabilities>`);
    for (const prob of cv.plateProbabilities) {
      lines.push(`${indent(4)}<Item value="${prob}" />`);
    }
    lines.push(`${indent(3)}</plateProbabilities>`);
    lines.push(`${indent(2)}</Item>`);
  }

  lines.push(`${indent(1)}</variationData>`);
  lines.push(`</CVehicleModelInfoVariation>`);
  return lines.join("\n");
}

function serializeLookAroundSide(side: any, level: number): string[] {
  const lines: string[] = [];
  if (side.offsets && side.offsets.length > 0) {
    lines.push(`${indent(level)}<Offsets>`);
    for (const o of side.offsets) {
      lines.push(`${indent(level + 1)}<Item>`);
      lines.push(`${indent(level + 2)}<Offset value="${formatNumber(o.offset, 0)}" />`);
      lines.push(`${indent(level + 2)}<AngleToBlendInOffset x="${formatNumber(o.angleToBlendInOffsetX, 0)}" y="${formatNumber(o.angleToBlendInOffsetY, 0)}" />`);
      lines.push(`${indent(level + 1)}</Item>`);
    }
    lines.push(`${indent(level)}</Offsets>`);
  } else {
    lines.push(`${indent(level)}<Offsets />`);
  }
  lines.push(`${indent(level)}<ExtraRelativePitch x="${formatNumber(side.extraRelativePitchX, 0)}" y="${formatNumber(side.extraRelativePitchY, 0)}" />`);
  lines.push(`${indent(level)}<AngleToBlendInExtraPitch x="${formatNumber(side.angleToBlendInExtraPitchX, 0)}" y="${formatNumber(side.angleToBlendInExtraPitchY, 0)}" />`);
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
    lines.push(`${indent(3)}<ExtraSideOffset value="${formatNumber(cover.extraSideOffset, 0)}" />`);
    lines.push(`${indent(3)}<ExtraForwardOffset value="${formatNumber(cover.extraForwardOffset, 0)}" />`);
    lines.push(`${indent(3)}<ExtraBackwardOffset value="${formatNumber(cover.extraBackwardOffset, 0)}" />`);
    lines.push(`${indent(3)}<ExtraZOffset value="${formatNumber(cover.extraZOffset, 0)}" />`);
    lines.push(`${indent(3)}<CoverBoundInfos />`);
    lines.push(`${indent(2)}</Item>`);
  }
  lines.push(`${indent(1)}</VehicleCoverBoundOffsetInfos>`);

  lines.push(`${indent(1)}<FirstPersonDriveByLookAroundData>`);
  for (const entry of allLookAround) {
    lines.push(`${indent(2)}<Item type="CFirstPersonDriveByLookAroundData">`);
    lines.push(`${indent(3)}<Name>${entry.name}</Name>`);
    lines.push(`${indent(3)}<AllowLookback value="${entry.allowLookback}" />`);
    lines.push(`${indent(3)}<HeadingLimits x="${formatNumber(entry.headingLimitsX, 0)}" y="${formatNumber(entry.headingLimitsY, 0)}" />`);
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
      lines.push(`${indent(3)}<kitName>${kit.kitName}</kitName>`);
      lines.push(`${indent(3)}<id value="${kit.id}" />`);
      lines.push(`${indent(3)}<kitType>${kit.kitType}</kitType>`);

      if (kit.visibleMods.length > 0) {
        lines.push(`${indent(3)}<visibleMods>`);
        for (const mod of kit.visibleMods) {
          lines.push(`${indent(4)}<Item>`);
          lines.push(`${indent(5)}<modelName>${mod.modelName}</modelName>`);
          lines.push(`${indent(5)}<modShopLabel>${mod.modShopLabel}</modShopLabel>`);
          if (mod.linkedModels) {
            lines.push(`${indent(5)}<linkedModels>${mod.linkedModels}</linkedModels>`);
          } else {
            lines.push(`${indent(5)}<linkedModels/>`);
          }
          if (mod.turnOffBones.length > 0) {
            lines.push(`${indent(5)}<turnOffBones>`);
            for (const bone of mod.turnOffBones) {
              lines.push(`${indent(6)}<Item>${bone}</Item>`);
            }
            lines.push(`${indent(5)}</turnOffBones>`);
          } else {
            lines.push(`${indent(5)}<turnOffBones/>`);
          }
          lines.push(`${indent(5)}<type>${mod.type}</type>`);
          lines.push(`${indent(5)}<bone>${mod.bone}</bone>`);
          lines.push(`${indent(5)}<collisionBone>${mod.collisionBone}</collisionBone>`);
          lines.push(`${indent(4)}</Item>`);
        }
        lines.push(`${indent(3)}</visibleMods>`);
      } else {
        lines.push(`${indent(3)}<visibleMods/>`);
      }

      if (kit.statMods.length > 0) {
        lines.push(`${indent(3)}<statMods>`);
        for (const mod of kit.statMods) {
          lines.push(`${indent(4)}<Item>`);
          if (mod.identifier) {
            lines.push(`${indent(5)}<identifier>${mod.identifier}</identifier>`);
          } else {
            lines.push(`${indent(5)}<identifier />`);
          }
          lines.push(`${indent(5)}<modifier value="${mod.modifier}" />`);
          lines.push(`${indent(5)}<audioApply value="${formatNumber(mod.audioApply, 1)}" />`);
          lines.push(`${indent(5)}<weight value="${mod.weight}" />`);
          lines.push(`${indent(5)}<type>${mod.type}</type>`);
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
          lines.push(`${indent(5)}<slot>${slot.slot}</slot>`);
          lines.push(`${indent(5)}<name>${slot.name}</name>`);
          lines.push(`${indent(4)}</Item>`);
        }
        lines.push(`${indent(3)}</slotNames>`);
      } else {
        lines.push(`${indent(3)}<slotNames/>`);
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

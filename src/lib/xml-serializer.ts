import type { VehicleEntry } from "@/store/meta-store";

function indent(level: number): string {
  return "  ".repeat(level);
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
    lines.push(`${indent(3)}<handlingName>${h.handlingName}</handlingName>`);
    lines.push(`${indent(3)}<fMass value="${h.fMass.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fInitialDragCoeff value="${h.fInitialDragCoeff.toFixed(6)}" />`);
    lines.push(`${indent(3)}<vecCentreOfMassOffset x="${h.vecCentreOfMassOffsetX.toFixed(6)}" y="${h.vecCentreOfMassOffsetY.toFixed(6)}" z="${h.vecCentreOfMassOffsetZ.toFixed(6)}" />`);
    lines.push(`${indent(3)}<vecInertiaMultiplier x="${h.vecInertiaMultiplierX.toFixed(6)}" y="${h.vecInertiaMultiplierY.toFixed(6)}" z="${h.vecInertiaMultiplierZ.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fInitialDriveForce value="${h.fInitialDriveForce.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fInitialDriveMaxFlatVel value="${h.fInitialDriveMaxFlatVel.toFixed(6)}" />`);
    lines.push(`${indent(3)}<nInitialDriveGears value="${h.nInitialDriveGears}" />`);
    lines.push(`${indent(3)}<fDriveBiasFront value="${h.fDriveBiasFront.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fBrakeForce value="${h.fBrakeForce.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fBrakeBiasFront value="${h.fBrakeBiasFront.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fSteeringLock value="${h.fSteeringLock.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fTractionCurveMax value="${h.fTractionCurveMax.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fTractionCurveMin value="${h.fTractionCurveMin.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fTractionLossMult value="${h.fTractionLossMult.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fLowSpeedTractionLossMult value="${h.fLowSpeedTractionLossMult.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fSuspensionForce value="${h.fSuspensionForce.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fSuspensionCompDamp value="${h.fSuspensionCompDamp.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fSuspensionReboundDamp value="${h.fSuspensionReboundDamp.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fAntiRollBarForce value="${h.fAntiRollBarForce.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fSuspensionRaise value="${h.fSuspensionRaise.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fCollisionDamageMult value="${h.fCollisionDamageMult.toFixed(6)}" />`);
    lines.push(`${indent(3)}<fDeformationDamageMult value="${h.fDeformationDamageMult.toFixed(6)}" />`);
    lines.push(`${indent(3)}<strModelFlags>${h.strModelFlags}</strModelFlags>`);
    lines.push(`${indent(3)}<strHandlingFlags>${h.strHandlingFlags}</strHandlingFlags>`);
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
  lines.push(`${indent(1)}<InitDatas>`);

  for (const v of filtered) {
    const d = v.vehicles;
    lines.push(`${indent(2)}<Item>`);
    lines.push(`${indent(3)}<modelName>${d.modelName}</modelName>`);
    lines.push(`${indent(3)}<txdName>${d.txdName}</txdName>`);
    lines.push(`${indent(3)}<handlingId>${d.handlingId}</handlingId>`);
    lines.push(`${indent(3)}<gameName>${d.gameName}</gameName>`);
    lines.push(`${indent(3)}<vehicleMakeName>${d.vehicleMakeName}</vehicleMakeName>`);
    lines.push(`${indent(3)}<type>${d.type}</type>`);
    lines.push(`${indent(3)}<vehicleClass>${d.vehicleClass}</vehicleClass>`);
    lines.push(`${indent(3)}<layout>${d.layout}</layout>`);
    lines.push(`${indent(3)}<driverSourceExtension>${d.driverSourceExtension}</driverSourceExtension>`);
    lines.push(`${indent(3)}<audioNameHash>${d.audioNameHash}</audioNameHash>`);
    lines.push(`${indent(3)}<lodDistances content="float_array">`);
    lines.push(`${indent(4)}${d.lodDistances}`);
    lines.push(`${indent(3)}</lodDistances>`);
    lines.push(`${indent(3)}<diffuseTint value="${d.diffuseTint}" />`);
    lines.push(`${indent(3)}<dirtLevelMin value="${d.dirtLevelMin.toFixed(6)}" />`);
    lines.push(`${indent(3)}<dirtLevelMax value="${d.dirtLevelMax.toFixed(6)}" />`);
    if (d.flags.length > 0) {
      lines.push(`${indent(3)}<flags>`);
      for (const flag of d.flags) {
        lines.push(`${indent(4)}<Item>${flag}</Item>`);
      }
      lines.push(`${indent(3)}</flags>`);
    }
    lines.push(`${indent(2)}</Item>`);
  }

  lines.push(`${indent(1)}</InitDatas>`);
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
    lines.push(`${indent(3)}<rotationLimit value="${c.rotationLimit.toFixed(6)}" />`);
    if (c.lights.length > 0) {
      lines.push(`${indent(3)}<sirens>`);
      for (const light of c.lights) {
        const rotParts = light.rotation.trim().split(/\s+/);
        const rx = parseFloat(rotParts[0]) || 0;
        const ry = parseFloat(rotParts[1]) || 0;
        const rz = parseFloat(rotParts[2]) || 0;
        // Convert binary sequencer to decimal
        let seqVal = light.sequencer;
        if (/^[01]{32}$/.test(seqVal)) {
          seqVal = String(parseInt(seqVal, 2) >>> 0);
        }
        lines.push(`${indent(4)}<Item>`);
        lines.push(`${indent(5)}<rotation x="${rx.toFixed(6)}" y="${ry.toFixed(6)}" z="${rz.toFixed(6)}" />`);
        lines.push(`${indent(5)}<flashness value="${light.flashness.toFixed(6)}" />`);
        lines.push(`${indent(5)}<delta value="${light.delta.toFixed(6)}" />`);
        lines.push(`${indent(5)}<color value="${light.color}" />`);
        lines.push(`${indent(5)}<scale value="${light.scale.toFixed(6)}" />`);
        lines.push(`${indent(5)}<sequencer value="${seqVal}" />`);
        lines.push(`${indent(4)}</Item>`);
      }
      lines.push(`${indent(3)}</sirens>`);
    }
    lines.push(`${indent(3)}<environmentalLight>`);
    lines.push(`${indent(4)}<color value="${c.environmentalLightColor}" />`);
    lines.push(`${indent(4)}<intensity value="${c.environmentalLightIntensity.toFixed(6)}" />`);
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
          lines.push(`${indent(5)}<audioApply value="${mod.audioApply.toFixed(6)}" />`);
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

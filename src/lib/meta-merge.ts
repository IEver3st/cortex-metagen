import type { MetaFileType, VehicleEntry } from "@/store/meta-store";
import { detectMetaType, parseMetaFile } from "@/lib/xml-parser";
import {
  serializeCarcolsMeta,
  serializeCarvariationsMeta,
  serializeHandlingMeta,
  serializeModkitsMeta,
  serializeVehicleLayoutsMeta,
  serializeVehiclesMeta,
} from "@/lib/xml-serializer";

export interface MergeFileInput {
  path: string;
  content: string;
}

export interface MergeSummary {
  inputFiles: number;
  parsedEntries: number;
  uniqueEntries: number;
  duplicatesRemoved: number;
  type: MetaFileType;
  preservedComments: number;
  handlingIdConsolidations: number;
}

export interface MergeResult {
  xml: string;
  summary: MergeSummary;
}

export interface MergeOptions {
  consolidateSimilarHandlingIds?: boolean;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function extractInlineComments(content: string): string[] {
  const matches = content.match(/<!--([\s\S]*?)-->/g) ?? [];
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const comment of matches) {
    if (seen.has(comment)) continue;
    seen.add(comment);
    unique.push(comment);
  }

  return unique;
}

function attachComments(xml: string, comments: string[]): string {
  if (comments.length === 0) return xml;

  const lines = xml.split("\n");
  if (lines.length < 2) return xml;

  const commentLines = comments.map((comment) => `  ${comment}`);
  return [lines[0], ...commentLines, ...lines.slice(1)].join("\n");
}

function handlingFingerprint(vehicle: VehicleEntry): string {
  const { handlingName: ignoredHandlingName, ...rest } = vehicle.handling;
  void ignoredHandlingName;
  return JSON.stringify(rest);
}

function carcolsFingerprint(vehicle: VehicleEntry): string {
  const carcols = vehicle.carcols;
  const normalizedLights = carcols.lights.map((light) => ({
    rotation: light.rotation,
    flashness: light.flashness,
    delta: light.delta,
    color: light.color,
    scale: light.scale,
    sequencer: light.sequencer,
  }));

  return JSON.stringify({
    sirenId: carcols.sirenId,
    sequencerBpm: carcols.sequencerBpm,
    rotationLimit: carcols.rotationLimit,
    lights: normalizedLights,
    environmentalLightColor: carcols.environmentalLightColor,
    environmentalLightIntensity: carcols.environmentalLightIntensity,
  });
}

function dedupeVehiclesByType(type: MetaFileType, vehicles: VehicleEntry[]): VehicleEntry[] {
  const unique: VehicleEntry[] = [];
  const seen = new Set<string>();

  for (const vehicle of vehicles) {
    let key = "";

    if (type === "handling") {
      key = handlingFingerprint(vehicle);
    } else if (type === "vehicles") {
      key = normalize(vehicle.vehicles.modelName);
    } else if (type === "carvariations") {
      key = normalize(vehicle.carvariations.modelName);
    } else if (type === "vehiclelayouts") {
      key = vehicle.vehiclelayouts.driveByLookAroundData.map((entry) => normalize(entry.name)).join("|");
    } else if (type === "carcols") {
      key = carcolsFingerprint(vehicle);
    } else if (type === "modkits") {
      key = vehicle.modkits.kits.map((kit) => `${normalize(kit.kitName)}:${kit.id}`).join("|");
    }

    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(vehicle);
  }

  return unique;
}

function pickCanonicalHandlingId(currentId: string, incomingId: string): string {
  const current = currentId.trim();
  const incoming = incomingId.trim();
  if (!incoming) return current;
  if (!current) return incoming;

  const currentLower = current.toLowerCase();
  const incomingLower = incoming.toLowerCase();
  if (currentLower === incomingLower) return current;

  // If one looks like a variant/suffix of the other (e.g. DURANGO vs DURANGOSS), prefer the base/shorter ID.
  if (incomingLower.startsWith(currentLower) || currentLower.startsWith(incomingLower)) {
    return incoming.length < current.length ? incoming : current;
  }

  // Default to first-seen ID for deterministic behavior.
  return current;
}

function canonicalHandlingIdBySimilarity(candidate: string, allIds: string[]): string {
  const cleanCandidate = candidate.trim();
  if (!cleanCandidate) return cleanCandidate;

  const lowerCandidate = cleanCandidate.toLowerCase();
  let canonical = cleanCandidate;

  for (const option of allIds) {
    const cleanOption = option.trim();
    if (!cleanOption) continue;
    const lowerOption = cleanOption.toLowerCase();
    if (lowerOption === lowerCandidate) continue;

    if (lowerCandidate.startsWith(lowerOption)) {
      if (cleanOption.length < canonical.length) {
        canonical = cleanOption;
      }
    }
  }

  return canonical;
}

function consolidateSimilarHandlingIds(vehicles: VehicleEntry[]): { vehicles: VehicleEntry[]; consolidations: number } {
  const handlingIds = [...new Set(
    vehicles
      .map((vehicle) => vehicle.vehicles.handlingId.trim())
      .filter(Boolean)
  )];

  let consolidations = 0;
  const updated = vehicles.map((vehicle) => {
    const currentId = vehicle.vehicles.handlingId;
    const canonical = canonicalHandlingIdBySimilarity(currentId, handlingIds);
    if (!canonical || canonical === currentId) return vehicle;

    consolidations += 1;
    return {
      ...vehicle,
      vehicles: {
        ...vehicle.vehicles,
        handlingId: canonical,
      },
    };
  });

  return { vehicles: updated, consolidations };
}

function collectVehiclesEntriesFromInputs(
  detected: Array<MergeFileInput & { type: Exclude<MetaFileType, "modkits"> }>
): VehicleEntry[] {
  const entries: VehicleEntry[] = [];

  for (const file of detected) {
    const fileName = file.path.split(/[/\\]/).pop();
    const parsed = parseMetaFile(file.content, {}, fileName);
    entries.push(...Object.values(parsed));
  }

  return entries;
}

export function previewSimilarHandlingIds(inputs: MergeFileInput[]): string[] {
  const detected = inputs
    .map((input) => {
      const fileName = input.path.split(/[/\\]/).pop() ?? "";
      const type = detectMetaType(input.content, fileName);
      return type ? { ...input, type } : null;
    })
    .filter((entry): entry is MergeFileInput & { type: Exclude<MetaFileType, "modkits"> } => Boolean(entry));

  if (detected.length === 0) return [];
  if (detected[0].type !== "vehicles") return [];
  if (detected.some((entry) => entry.type !== "vehicles")) return [];

  const vehicles = collectVehiclesEntriesFromInputs(detected);
  const uniqueIds = [...new Set(vehicles.map((vehicle) => vehicle.vehicles.handlingId.trim()).filter(Boolean))];

  const similarPairs = new Set<string>();
  for (const id of uniqueIds) {
    const canonical = canonicalHandlingIdBySimilarity(id, uniqueIds);
    if (canonical && canonical !== id) {
      similarPairs.add(`${id} -> ${canonical}`);
    }
  }

  return [...similarPairs];
}

function mergeVehiclesMetaPreservingCanonicalHandling(
  detected: Array<MergeFileInput & { type: Exclude<MetaFileType, "modkits"> }>
): { vehicles: VehicleEntry[]; parsedEntries: number } {
  const byModel = new Map<string, VehicleEntry>();
  let parsedEntries = 0;

  for (const file of detected) {
    const fileName = file.path.split(/[/\\]/).pop();
    const parsed = parseMetaFile(file.content, {}, fileName);

    for (const vehicle of Object.values(parsed)) {
      parsedEntries += 1;
      const modelKey = normalize(vehicle.vehicles.modelName || vehicle.name);
      if (!modelKey) continue;

      const existing = byModel.get(modelKey);
      if (!existing) {
        byModel.set(modelKey, vehicle);
        continue;
      }

      const canonicalHandlingId = pickCanonicalHandlingId(
        existing.vehicles.handlingId,
        vehicle.vehicles.handlingId
      );

      const mergedFlags = [...new Set([...(existing.vehicles.flags ?? []), ...(vehicle.vehicles.flags ?? [])])];

      byModel.set(modelKey, {
        ...existing,
        vehicles: {
          ...existing.vehicles,
          flags: mergedFlags,
          handlingId: canonicalHandlingId,
        },
      });
    }
  }

  return { vehicles: [...byModel.values()], parsedEntries };
}

function serializeByType(type: MetaFileType, vehicles: VehicleEntry[]): string {
  if (type === "handling") return serializeHandlingMeta(vehicles);
  if (type === "vehicles") return serializeVehiclesMeta(vehicles);
  if (type === "carcols") return serializeCarcolsMeta(vehicles);
  if (type === "carvariations") return serializeCarvariationsMeta(vehicles);
  if (type === "vehiclelayouts") return serializeVehicleLayoutsMeta(vehicles);
  return serializeModkitsMeta(vehicles);
}

export function mergeMetaFiles(inputs: MergeFileInput[], options: MergeOptions = {}): MergeResult {
  if (inputs.length === 0) {
    throw new Error("No files selected for merge.");
  }

  const detected = inputs
    .map((input) => {
      const fileName = input.path.split(/[/\\]/).pop() ?? "";
      const type = detectMetaType(input.content, fileName);
      return type ? { ...input, type } : null;
    })
    .filter((entry): entry is MergeFileInput & { type: Exclude<MetaFileType, "modkits"> } => Boolean(entry));

  if (detected.length === 0) {
    throw new Error("No supported meta files were detected in the selected files.");
  }

  const type = detected[0].type;
  if (detected.some((entry) => entry.type !== type)) {
    throw new Error("Mixed meta types are not supported in one merge operation. Merge one type at a time.");
  }

  const allComments: string[] = [];
  let mergedVehicles: VehicleEntry[] = [];
  let parsedEntries = 0;
  let handlingIdConsolidations = 0;

  if (type === "vehicles") {
    const mergedVehiclesResult = mergeVehiclesMetaPreservingCanonicalHandling(detected);
    mergedVehicles = mergedVehiclesResult.vehicles;
    parsedEntries = mergedVehiclesResult.parsedEntries;

    for (const file of detected) {
      allComments.push(...extractInlineComments(file.content));
    }
  } else {
    let merged: Record<string, VehicleEntry> = {};

    for (const file of detected) {
      merged = parseMetaFile(file.content, merged, file.path.split(/[/\\]/).pop());
      allComments.push(...extractInlineComments(file.content));
    }

    mergedVehicles = Object.values(merged);
    parsedEntries = mergedVehicles.length;
  }
  const dedupedVehicles = dedupeVehiclesByType(type, mergedVehicles);
  const consolidateHandling = options.consolidateSimilarHandlingIds ?? true;
  const vehiclesAfterHandlingConsolidation = type === "vehicles" && consolidateHandling
    ? consolidateSimilarHandlingIds(dedupedVehicles)
    : { vehicles: dedupedVehicles, consolidations: 0 };

  handlingIdConsolidations = vehiclesAfterHandlingConsolidation.consolidations;

  const duplicatesRemoved = Math.max(0, parsedEntries - dedupedVehicles.length);

  const xml = attachComments(serializeByType(type, vehiclesAfterHandlingConsolidation.vehicles), allComments);

  return {
    xml,
    summary: {
      inputFiles: detected.length,
      parsedEntries,
      uniqueEntries: dedupedVehicles.length,
      duplicatesRemoved,
      type,
      preservedComments: allComments.length,
      handlingIdConsolidations,
    },
  };
}

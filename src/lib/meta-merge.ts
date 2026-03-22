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
  conflictsDetected: number;
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
  duplicateStrategy?: "keep-first" | "keep-last" | "manual";
  sortStrategy?: "preserve" | "alphabetical";
}

export interface ConflictDetail {
  key: string;
  keyLabel: string;
  versions: ConflictVersionDetail[];
}

export interface ConflictVersionDetail {
  fileIndex: number;
  fileName: string;
  snippet: string;
}

export interface AnalysisResult {
  summary: MergeSummary;
  conflicts: ConflictDetail[];
  previewXml: string;
}

export interface FileAnalysis {
  detectedType: MetaFileType | null;
  entryCount: number;
  error: string | null;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function extractLeadingComments(content: string): string[] {
  const declarationMatch = content.match(/^\s*<\?xml[\s\S]*?\?>/i);
  const startIndex = declarationMatch ? declarationMatch[0].length : 0;
  const afterDeclaration = content.slice(startIndex);
  const leadingMatch = afterDeclaration.match(/^(\s*(?:<!--[\s\S]*?-->\s*)+)/);

  if (!leadingMatch) return [];

  const matches = leadingMatch[1].match(/<!--([\s\S]*?)-->/g) ?? [];
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

function mergeIdentity(type: MetaFileType, vehicle: VehicleEntry): string {
  if (type === "handling") return normalize(vehicle.handling.handlingName || vehicle.name);
  if (type === "vehicles") return normalize(vehicle.vehicles.modelName || vehicle.name);
  if (type === "carvariations") return normalize(vehicle.carvariations.modelName || vehicle.name);
  if (type === "carcols") {
    if (vehicle.carcols.sirenId > 0) return `siren:${vehicle.carcols.sirenId}`;
    if (vehicle.carcols.id > 0) return `kit:${vehicle.carcols.id}`;
    return normalize(vehicle.name);
  }
  if (type === "vehiclelayouts") {
    const firstName = vehicle.vehiclelayouts.driveByLookAroundData[0]?.name
      ?? vehicle.vehiclelayouts.coverBoundOffsets[0]?.name
      ?? vehicle.name;
    return normalize(firstName);
  }

  return normalize(vehicle.name);
}

function mergeFingerprint(type: MetaFileType, vehicle: VehicleEntry): string {
  if (type === "handling") return handlingFingerprint(vehicle);
  if (type === "vehicles") return JSON.stringify(vehicle.vehicles);
  if (type === "carcols") return carcolsFingerprint(vehicle);
  if (type === "carvariations") return JSON.stringify(vehicle.carvariations);
  if (type === "vehiclelayouts") return JSON.stringify(vehicle.vehiclelayouts);
  return JSON.stringify(vehicle.modkits);
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

  return current;
}

function isLikelyHandlingVariant(base: string, candidate: string): boolean {
  const normalizedBase = base.trim().toLowerCase();
  const normalizedCandidate = candidate.trim().toLowerCase();
  if (!normalizedBase || !normalizedCandidate || normalizedBase === normalizedCandidate) {
    return false;
  }

  if (!normalizedCandidate.startsWith(normalizedBase)) {
    return false;
  }

  const suffix = normalizedCandidate.slice(normalizedBase.length);
  if (!suffix) return false;

  return /^[_\-.]/.test(suffix);
}

function canonicalHandlingIdBySimilarity(candidate: string, allIds: string[]): string {
  const cleanCandidate = candidate.trim();
  if (!cleanCandidate) return cleanCandidate;

  let canonical = cleanCandidate;

  for (const option of allIds) {
    const cleanOption = option.trim();
    if (!cleanOption) continue;
    if (!isLikelyHandlingVariant(cleanOption, cleanCandidate)) continue;

    if (cleanOption.length < canonical.length) {
      canonical = cleanOption;
    }
  }

  return canonical;
}

function consolidateSimilarHandlingIds(vehicles: VehicleEntry[]): { vehicles: VehicleEntry[]; consolidations: number } {
  const handlingIds = [...new Set(
    vehicles
      .map((vehicle) => vehicle.vehicles.handlingId.trim())
      .filter(Boolean),
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
  detected: Array<MergeFileInput & { type: Exclude<MetaFileType, "modkits"> }>,
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
      return type && type !== "modkits" ? { ...input, type } : null;
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
  detected: Array<MergeFileInput & { type: Exclude<MetaFileType, "modkits"> }>,
  duplicateStrategy: NonNullable<MergeOptions["duplicateStrategy"]>,
): { vehicles: VehicleEntry[]; parsedEntries: number; conflictsDetected: number } {
  const byModel = new Map<string, VehicleEntry>();
  let parsedEntries = 0;
  let conflictsDetected = 0;

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

      if (mergeFingerprint("vehicles", existing) !== mergeFingerprint("vehicles", vehicle)) {
        conflictsDetected += 1;
      }

      if (duplicateStrategy === "keep-first" || duplicateStrategy === "manual") {
        continue;
      }

      const canonicalHandlingId = pickCanonicalHandlingId(
        existing.vehicles.handlingId,
        vehicle.vehicles.handlingId,
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

  return { vehicles: [...byModel.values()], parsedEntries, conflictsDetected };
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
      return type && type !== "modkits" ? { ...input, type } : null;
    })
    .filter((entry): entry is MergeFileInput & { type: Exclude<MetaFileType, "modkits"> } => Boolean(entry));

  if (detected.length === 0) {
    throw new Error("No supported meta files were detected in the selected files.");
  }

  const type = detected[0].type;
  if (detected.some((entry) => entry.type !== type)) {
    throw new Error("Mixed meta types are not supported in one merge operation. Merge one type at a time.");
  }

  const allComments = extractLeadingComments(detected[0]?.content ?? "");
  const duplicateStrategy = options.duplicateStrategy ?? "keep-last";
  const sortStrategy = options.sortStrategy ?? "preserve";

  let mergedVehicles: VehicleEntry[] = [];
  let parsedEntries = 0;
  let handlingIdConsolidations = 0;
  let conflictsDetected = 0;

  if (type === "vehicles") {
    const mergedVehiclesResult = mergeVehiclesMetaPreservingCanonicalHandling(detected, duplicateStrategy);
    mergedVehicles = mergedVehiclesResult.vehicles;
    parsedEntries = mergedVehiclesResult.parsedEntries;
    conflictsDetected = mergedVehiclesResult.conflictsDetected;
  } else {
    const mergedByIdentity = new Map<string, VehicleEntry>();

    for (const file of detected) {
      const fileName = file.path.split(/[/\\]/).pop();
      const parsed = parseMetaFile(file.content, {}, fileName);

      for (const vehicle of Object.values(parsed)) {
        parsedEntries += 1;
        const identity = mergeIdentity(type, vehicle);
        const existingVehicle = mergedByIdentity.get(identity);

        if (existingVehicle) {
          const previousFingerprint = mergeFingerprint(type, existingVehicle);
          const incomingFingerprint = mergeFingerprint(type, vehicle);
          if (previousFingerprint !== incomingFingerprint) {
            conflictsDetected += 1;
          }

          if (duplicateStrategy === "keep-first" || duplicateStrategy === "manual") {
            continue;
          }
        }

        mergedByIdentity.set(identity, vehicle);
      }
    }

    mergedVehicles = [...mergedByIdentity.values()];
  }

  const dedupedVehicles = dedupeVehiclesByType(type, mergedVehicles);
  const consolidateHandling = options.consolidateSimilarHandlingIds ?? false;
  const vehiclesAfterHandlingConsolidation = type === "vehicles" && consolidateHandling
    ? consolidateSimilarHandlingIds(dedupedVehicles)
    : { vehicles: dedupedVehicles, consolidations: 0 };
  const sortedVehicles = sortStrategy === "alphabetical"
    ? [...vehiclesAfterHandlingConsolidation.vehicles].sort((left, right) => (
      mergeIdentity(type, left).localeCompare(mergeIdentity(type, right))
    ))
    : vehiclesAfterHandlingConsolidation.vehicles;

  handlingIdConsolidations = vehiclesAfterHandlingConsolidation.consolidations;

  const duplicatesRemoved = Math.max(0, parsedEntries - dedupedVehicles.length);
  const xml = attachComments(serializeByType(type, sortedVehicles), allComments);

  return {
    xml,
    summary: {
      inputFiles: detected.length,
      parsedEntries,
      uniqueEntries: dedupedVehicles.length,
      duplicatesRemoved,
      conflictsDetected,
      type,
      preservedComments: allComments.length,
      handlingIdConsolidations,
    },
  };
}

export function analyzeFiles(inputs: MergeFileInput[], options: MergeOptions = {}): AnalysisResult {
  const result = mergeMetaFiles(inputs, options);
  const conflicts = extractConflictDetails(inputs, result.summary.type);

  return {
    summary: result.summary,
    conflicts,
    previewXml: result.xml,
  };
}

export function analyzeOneFile(path: string, content: string): FileAnalysis {
  try {
    const fileName = path.split(/[/\\]/).pop() ?? "";
    const detectedType = detectMetaType(content, fileName);
    if (!detectedType) {
      return { detectedType: null, entryCount: 0, error: "Could not detect meta type" };
    }

    const parsed = parseMetaFile(content, {}, fileName);
    return {
      detectedType,
      entryCount: Object.keys(parsed).length,
      error: null,
    };
  } catch (error) {
    return {
      detectedType: null,
      entryCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function extractConflictDetails(inputs: MergeFileInput[], type: MetaFileType): ConflictDetail[] {
  const detected = inputs
    .map((input, fileIndex) => {
      const fileName = input.path.split(/[/\\]/).pop() ?? "";
      const detectedType = detectMetaType(input.content, fileName);
      return detectedType && detectedType !== "modkits"
        ? { ...input, type: detectedType, fileIndex, displayName: fileName }
        : null;
    })
    .filter((entry): entry is MergeFileInput & { type: Exclude<MetaFileType, "modkits">; fileIndex: number; displayName: string } => Boolean(entry));

  if (detected.length < 2) return [];
  if (detected.some((entry) => entry.type !== type)) return [];

  const byIdentity = new Map<string, Array<{ fileIndex: number; fileName: string; vehicle: VehicleEntry }>>();

  for (const file of detected) {
    const fileName = file.path.split(/[/\\]/).pop();
    const parsed = parseMetaFile(file.content, {}, fileName);

    for (const vehicle of Object.values(parsed)) {
      const identity = mergeIdentity(type, vehicle);
      if (!identity) continue;

      const existing = byIdentity.get(identity) ?? [];
      existing.push({ fileIndex: file.fileIndex, fileName: file.displayName, vehicle });
      byIdentity.set(identity, existing);
    }
  }

  const conflicts: ConflictDetail[] = [];

  for (const [identity, entries] of byIdentity) {
    if (entries.length < 2) continue;

    const fingerprints = entries.map((entry) => mergeFingerprint(type, entry.vehicle));
    const allSame = fingerprints.every((fingerprint) => fingerprint === fingerprints[0]);
    if (allSame) continue;

    conflicts.push({
      key: identity,
      keyLabel: identity,
      versions: entries.map((entry) => ({
        fileIndex: entry.fileIndex,
        fileName: entry.fileName,
        snippet: truncateSnippet(mergeFingerprint(type, entry.vehicle)),
      })),
    });
  }

  return conflicts;
}

function truncateSnippet(json: string): string {
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    const keys = Object.keys(obj).slice(0, 6);
    const preview = keys.map((key) => {
      const value = obj[key];
      const raw = typeof value === "string" ? value : JSON.stringify(value);
      const truncated = raw.length > 40 ? `${raw.slice(0, 40)}...` : raw;
      return `${key}: ${truncated}`;
    });

    if (Object.keys(obj).length > 6) {
      preview.push("...");
    }

    return preview.join("\n");
  } catch {
    return json.length > 200 ? `${json.slice(0, 200)}...` : json;
  }
}

export interface FieldInfo {
  name: string;
  description: string;
  valueUp?: string;
  valueDown?: string;
  example?: string;
  docsUrl?: string;
}

const HANDLING_DOCS = "https://docs.fivem.net/docs/game-references/handling/";

export const handlingFields: Record<string, FieldInfo> = {
  fMass: {
    name: "Mass (kg)",
    description: "The weight of the vehicle in kilograms.",
    valueUp: "Heavier — plows through obstacles but slower to accelerate/brake/turn.",
    valueDown: "Lighter — accelerates and stops quickly but easily knocked around.",
    example: "Semi-truck: 10,000+, Bicycle: very low",
    docsUrl: HANDLING_DOCS,
  },
  fInitialDragCoeff: {
    name: "Drag Coefficient",
    description: "Air resistance. Affects how much air slows the car as it speeds up.",
    valueUp: "More drag — lower top speed, decelerates faster.",
    valueDown: "Less drag — cuts through air, higher top speeds.",
    example: "Van: high drag, Supercar: low drag",
  },
  vecCentreOfMassOffsetX: {
    name: "Center of Mass X",
    description: "Shifts center of gravity Left/Right.",
  },
  vecCentreOfMassOffsetY: {
    name: "Center of Mass Y",
    description: "Shifts center of gravity Front/Rear.",
  },
  vecCentreOfMassOffsetZ: {
    name: "Center of Mass Z",
    description: "Shifts center of gravity Up/Down.",
    valueUp: "Higher center — prone to tipping in corners.",
    valueDown: "Lower center — stays planted, almost impossible to flip.",
    example: "-0.5 makes car magnetized to road",
  },
  vecInertiaMultiplierX: {
    name: "Inertia X (Pitch)",
    description: "How hard it is to rotate the vehicle nose up/down.",
    valueUp: "Resists pitch — stable but sluggish.",
    valueDown: "Rotates easily — responsive but can nose-dive.",
  },
  vecInertiaMultiplierY: {
    name: "Inertia Y (Roll)",
    description: "How hard it is to roll the vehicle side to side.",
    valueUp: "Resists roll — stable in corners.",
    valueDown: "Rolls easily — leans heavily in turns.",
  },
  vecInertiaMultiplierZ: {
    name: "Inertia Z (Yaw)",
    description: "How hard it is to spin the vehicle left/right.",
    valueUp: "Resists spinning — stable but hard to turn.",
    valueDown: "Spins easily — twitchy, can spin out.",
    example: "High Z = resists drifting, Low Z = snaps into spin",
  },
  fInitialDriveForce: {
    name: "Engine Power",
    description: "The engine's power output (acceleration).",
    valueUp: "Faster acceleration — reaches top speed quicker.",
    valueDown: "Slower acceleration — feels sluggish.",
    example: "0.2 → 0.4 turns a sedan into a drag racer",
    docsUrl: HANDLING_DOCS,
  },
  fInitialDriveMaxFlatVel: {
    name: "Top Speed",
    description: "Theoretical top speed of the vehicle.",
    valueUp: "Higher top speed.",
    valueDown: "Lower top speed.",
    example: "200.0 allows very fast speeds",
  },
  nInitialDriveGears: {
    name: "Gear Count",
    description: "Number of gears in the transmission.",
    valueUp: "More gears (6-7) — stays in power band, shifts more.",
    valueDown: "Fewer gears (3-4) — longer gears, inconsistent acceleration.",
  },
  fDriveBiasFront: {
    name: "Drive Bias (Front)",
    description: "Power distribution between front and rear wheels.",
    valueUp: "1.0 = FWD. 0.5 = AWD.",
    valueDown: "0.0 = RWD. Best for drifting.",
    example: "0.0 = RWD (drift), 0.5 = AWD (off-road), 1.0 = FWD",
    docsUrl: HANDLING_DOCS,
  },
  fBrakeForce: {
    name: "Brake Force",
    description: "How strong the brakes are.",
    valueUp: "Shorter stopping distance. Too high = wheels lock up.",
    valueDown: "Weak brakes — takes long to stop.",
  },
  fBrakeBiasFront: {
    name: "Brake Bias (Front)",
    description: "Balance of braking force between front and rear.",
    valueUp: ">0.5 = Front bias. Stable but understeer while braking.",
    valueDown: "<0.5 = Rear bias. Back end slides out (oversteer).",
    example: "0.6 is standard for street cars",
  },
  fSteeringLock: {
    name: "Steering Lock (°)",
    description: "Maximum angle the front wheels can turn.",
    valueUp: "Tighter turning radius — great for city/drifting.",
    valueDown: "Wider turning radius — feels like a boat.",
    example: "Drift car: 50-60°, Sedan: 35°",
  },
  fTractionCurveMax: {
    name: "Max Traction",
    description: "Maximum cornering grip before sliding.",
    valueUp: "Sticks to road like glue in corners.",
    valueDown: "Slides out very easily.",
    example: "2.5 = race car, 1.5 = driving on ice",
    docsUrl: HANDLING_DOCS,
  },
  fTractionCurveMin: {
    name: "Min Traction",
    description: "Grip levels after the car has started sliding.",
    valueUp: "Easy to recover from a slide.",
    valueDown: "Once sliding, very hard to regain control.",
    example: "Drift cars need this balanced for sustainable slides",
  },
  fTractionLossMult: {
    name: "Off-Road Grip Loss",
    description: "How much grip is lost on loose surfaces (dirt, grass).",
    valueUp: "Terrible grip on dirt.",
    valueDown: "Dirt grip almost as good as asphalt.",
    example: "Off-road trucks: low, Supercars: high",
  },
  fLowSpeedTractionLossMult: {
    name: "Low Speed Traction Loss",
    description: "Reduces traction at low speeds (allows burnouts).",
    valueUp: "Wheels spin excessively from a stop.",
    valueDown: "Immediate grip off the line.",
    example: "Higher = easier donuts from standstill",
  },
  fSuspensionForce: {
    name: "Suspension Stiffness",
    description: "Stiffness of the springs.",
    valueUp: "Stiff — good for racing, may bounce on bumps.",
    valueDown: "Soft — smooth ride, but car sags and wallows.",
    example: "Sports cars: 3.0+, 1970s sedans: low",
    docsUrl: HANDLING_DOCS,
  },
  fSuspensionCompDamp: {
    name: "Compression Damping",
    description: "Resistance when the wheel moves up (hitting a bump).",
    valueUp: "Bumps feel harsh.",
    valueDown: "Suspension compresses too easily, bottoming out.",
  },
  fSuspensionReboundDamp: {
    name: "Rebound Damping",
    description: "Resistance when the wheel moves down (after a bump).",
    valueUp: "Keeps car planted after a bump.",
    valueDown: "Car bounces like a pogo stick after bumps.",
  },
  fAntiRollBarForce: {
    name: "Anti-Roll Bar",
    description: "Prevents body lean in corners.",
    valueUp: "Car stays flat in corners. Too high = slides abruptly.",
    valueDown: "Heavy body roll when turning.",
    example: "High = go-kart feel, Low = SUV feel",
  },
  fSuspensionRaise: {
    name: "Ride Height",
    description: "Visual and physical ride height adjustment.",
    valueUp: "Lifts the car (monster truck style).",
    valueDown: "Lowers the car (stance/lowrider style).",
  },
  fCollisionDamageMult: {
    name: "Collision Damage",
    description: "How much damage the engine/body takes from crashes.",
    valueUp: "Fragile — engine fails after a few hits.",
    valueDown: "Tank — set to 0.0 for invincibility.",
  },
  fDeformationDamageMult: {
    name: "Deformation Damage",
    description: "How much the bodywork crumples visually.",
    valueUp: "Body crumples like tin foil.",
    valueDown: "Body barely dents.",
  },
};

export const vehiclesFields: Record<string, FieldInfo> = {
  modelName: {
    name: "Model Name",
    description: "The exact name of the 3D model files (.yft).",
    example: "adder",
  },
  txdName: {
    name: "Texture Dictionary",
    description: "The texture dictionary (.ytd) file name. Usually same as model.",
    example: "adder",
  },
  handlingId: {
    name: "Handling ID",
    description: "Links to the handling.meta entry for physics.",
    example: "Putting ADDER handling on a FAGGIO makes the scooter go 200mph",
  },
  gameName: {
    name: "Game Name",
    description: "Text entry for the name displayed on screen.",
    example: "ADDER",
  },
  vehicleMakeName: {
    name: "Vehicle Make",
    description: "Manufacturer name displayed on screen.",
    example: "TRUFFADE",
  },
  type: {
    name: "Vehicle Type",
    description: "Fundamental category: CAR, BIKE, BOAT, HELI, PLANE.",
    example: "Setting a car to VEHICLE_TYPE_PLANE applies flight physics",
  },
  vehicleClass: {
    name: "Vehicle Class",
    description: "Category for racing classes and garage sorting.",
    example: "VC_SUPER, VC_SPORT, VC_SEDAN, VC_OFFROAD",
  },
  layout: {
    name: "Seat Layout",
    description: "Defines where seats are and how the player sits.",
    example: "LAYOUT_LOW for supercars, LAYOUT_BIKE for motorcycles",
  },
  driverSourceExtension: {
    name: "Entry Animation",
    description: "Animation set for entering/exiting the vehicle.",
    example: "truck = climb up, convertible = jump over door",
  },
  audioNameHash: {
    name: "Engine Sound",
    description: "The engine sound file the car uses.",
    example: "ADDER (high whine), DOMINATOR (deep V8 rumble)",
  },
  dirtLevelMin: {
    name: "Min Dirt Level",
    description: "Minimum dirt level when spawning.",
    valueUp: "Spawns looking muddy.",
    valueDown: "Spawns showroom clean.",
  },
  dirtLevelMax: {
    name: "Max Dirt Level",
    description: "Maximum dirt accumulation.",
    valueUp: "Gets dirty very fast.",
    valueDown: "Stays clean longer.",
  },
};

export const carcolsFields: Record<string, FieldInfo> = {
  sequencerBpm: {
    name: "Flash Speed (BPM)",
    description: "Speed of the light flashing pattern in Beats Per Minute.",
    valueUp: "Lights flash frantically (hyper-flash).",
    valueDown: "Lights flash slowly and lethargically.",
    example: "600 = standard police flash, 60 = slow warning beacon",
  },
  rotationLimit: {
    name: "Rotation Limit",
    description: "For rotating lights (beacons), how far they spin.",
    example: "0.0 = infinite rotation, fixed angle = wig-wags",
  },
  flashness: {
    name: "Flashness",
    description: "Does the light fade in/out or snap on/off?",
    valueUp: "Snaps on/off instantly (LED style).",
    valueDown: "Fades in and out (halogen/rotator style).",
  },
  delta: {
    name: "Rotation Speed",
    description: "The rotation speed and direction.",
    valueUp: "Spins faster clockwise.",
    valueDown: "Spins faster counter-clockwise (negative).",
  },
  scale: {
    name: "Light Size",
    description: "The size of the corona (glowing ball of light).",
    valueUp: "Blindingly bright and large.",
    valueDown: "Small and dim.",
    example: "0.2 = small LED, 1.0 = massive spotlight",
  },
  environmentalLightIntensity: {
    name: "Environmental Light",
    description: "Light cast onto walls and ground around the car.",
    valueUp: "Street lights up like daylight when siren is on.",
    valueDown: "Lightbar flashes but ground remains dark.",
    example: "Police cars need this high to illuminate suspects",
  },
};

export const carvariationsFields: Record<string, FieldInfo> = {
  sirenSettings: {
    name: "Siren Setting ID",
    description: "Links to a specific Sirens block in carcols.meta.",
    example: "1 = LSPD lightbar, 13 = FBI/unmarked, 22 = ambulance",
  },
  lightSettings: {
    name: "Light Setting ID",
    description: "Controls standard vehicle lights (headlights/taillights).",
    example: "0 = default, specific IDs for xenon/custom setups",
  },
  windows: {
    name: "Window Tint",
    description: "Spawn probability of different window tint levels.",
    example: "0 = None, 1 = Light Smoke, 2 = Dark Smoke, 3 = Limo",
  },
};

export interface VehicleFlag {
  value: string;
  label: string;
  description: string;
  category: string;
}

export const vehicleFlagCategories = [
  "Police & Emergency",
  "AI Traffic & Spawning",
  "Physical Features",
  "Mod Shop & Customization",
] as const;

export const vehicleFlags: VehicleFlag[] = [
  // Police & Emergency
  { value: "FLAG_LAW_ENFORCEMENT", label: "Law Enforcement", description: "Master switch for police logic. Enables sirens (E key), police radio, and AI cop usage.", category: "Police & Emergency" },
  { value: "FLAG_EMERGENCY_SERVICE", label: "Emergency Service", description: "AI traffic pulls over when sirens are on. Changes GPS routing behavior.", category: "Police & Emergency" },
  { value: "FLAG_DRIVER_NO_CHASE", label: "No Chase", description: "Prevents AI police from using this car in pursuits. For slow vehicles.", category: "Police & Emergency" },
  { value: "FLAG_ALLOWS_RAPPEL", label: "Allows Rappel", description: "Allows SWAT/NOOSE NPCs or players to rappel from rear seats (helicopters).", category: "Police & Emergency" },

  // AI Traffic & Spawning
  { value: "FLAG_BIG", label: "Big Vehicle", description: "Marks as large vehicle. AI gives more space and takes wider turns.", category: "AI Traffic & Spawning" },
  { value: "FLAG_RICH_CAR", label: "Rich Car", description: "Spawns primarily in affluent areas like Rockford Hills.", category: "AI Traffic & Spawning" },
  { value: "FLAG_AVERAGE_CAR", label: "Average Car", description: "Spawns in standard residential and city areas.", category: "AI Traffic & Spawning" },
  { value: "FLAG_DONT_SPAWN_IN_CARGEN", label: "No Parked Spawns", description: "Never appears parked in lots or driveways. Only via script or traffic.", category: "AI Traffic & Spawning" },

  // Physical Features
  { value: "FLAG_CONVERTIBLE", label: "Convertible", description: "Enables animated roof (Hold H). Model must have roof bones.", category: "Physical Features" },
  { value: "FLAG_NO_BOOT", label: "No Trunk", description: "Prevents trunk open animation. For pickups, flatbeds, race cars.", category: "Physical Features" },
  { value: "FLAG_HAS_LIVERY", label: "Has Livery", description: "Enables livery slot in mod shop. Required for custom liveries to appear.", category: "Physical Features" },
  { value: "FLAG_EXTRAS_REQUIRE", label: "Require Extras", description: "Forces vehicle to spawn with Extra parts on (lightbars, rammers).", category: "Physical Features" },
  { value: "FLAG_EXTRAS_STRONG", label: "Strong Extras", description: "Extra parts (ram bars, lightbars) resist falling off in crashes.", category: "Physical Features" },
  { value: "FLAG_IS_VAN", label: "Van", description: "Marks vehicle as a van type for AI behavior.", category: "Physical Features" },
  { value: "FLAG_IS_ELECTRIC", label: "Electric", description: "Marks vehicle as electric for sound and behavior.", category: "Physical Features" },

  // Mod Shop & Customization
  { value: "FLAG_NO_RESPRAY", label: "No Respray", description: "Cannot be painted in Los Santos Customs. For branded vehicles.", category: "Mod Shop & Customization" },
  { value: "FLAG_SPORTS", label: "Sports", description: "Handling category. Defaults to sports wheel type in mod shop.", category: "Mod Shop & Customization" },
  { value: "FLAG_MUSCLE", label: "Muscle", description: "Handling category. Defaults to muscle wheel type in mod shop.", category: "Mod Shop & Customization" },
  { value: "FLAG_OFFROAD", label: "Off-Road", description: "Handling category. Defaults to off-road wheel type in mod shop.", category: "Mod Shop & Customization" },
];

export const vehicleTypes = [
  "VEHICLE_TYPE_CAR",
  "VEHICLE_TYPE_BIKE",
  "VEHICLE_TYPE_BOAT",
  "VEHICLE_TYPE_HELI",
  "VEHICLE_TYPE_PLANE",
  "VEHICLE_TYPE_TRAILER",
  "VEHICLE_TYPE_TRAIN",
];

export const vehicleClasses = [
  "VC_SUPER",
  "VC_SPORT",
  "VC_SPORT_CLASSIC",
  "VC_SEDAN",
  "VC_COUPE",
  "VC_MUSCLE",
  "VC_SUV",
  "VC_OFFROAD",
  "VC_COMPACT",
  "VC_VAN",
  "VC_COMMERCIAL",
  "VC_INDUSTRIAL",
  "VC_EMERGENCY",
  "VC_MILITARY",
  "VC_UTILITY",
  "VC_CYCLE",
  "VC_MOTORCYCLE",
  "VC_BOAT",
  "VC_HELICOPTER",
  "VC_PLANE",
];

export const layoutOptions = [
  "LAYOUT_STANDARD",
  "LAYOUT_LOW",
  "LAYOUT_VAN",
  "LAYOUT_BIKE_SPORT",
  "LAYOUT_BIKE_CHOPPER",
  "LAYOUT_BIKE_DIRT",
  "LAYOUT_TRUCK",
  "LAYOUT_BOAT",
];

export const modkitsFields: Record<string, FieldInfo> = {
  kitName: {
    name: "Kit Name",
    description: "A unique internal name for this modification kit.",
    example: "1000_police_modkit, police4_modkit",
  },
  kitId: {
    name: "Kit ID",
    description: "The single most important value. This number links the kit to the car in carvariations.meta.",
    valueUp: "Use high numbers (2500+) to avoid conflicts with base GTA cars.",
    example: "Must be unique across the entire game/server.",
  },
  kitType: {
    name: "Kit Type",
    description: "Determines which mod shop system this kit uses.",
    example: "MKT_STANDARD = LSC, MKT_BENNYS_ORIGINAL = Benny's, MKT_F1 = Open Wheel",
  },
  modelName: {
    name: "Model Name",
    description: "The exact name of the .yft file for the mod part.",
    example: "police4_wing_1 → police4_wing_1.yft in stream folder",
  },
  modShopLabel: {
    name: "Shop Label",
    description: "The GXT string displayed in the mod shop menu.",
    example: "Use existing labels like CMOD_SPO_0 if you don't have custom text.",
  },
  turnOffBones: {
    name: "Turn Off Bones",
    description: "Hides stock bones when this mod is installed, preventing clipping.",
    example: "bumper_f, bumper_r, bonnet, misc_a",
  },
  visibleModType: {
    name: "Mod Type",
    description: "Categorizes the part in the shop menu tab.",
    example: "VMT_SPOILER, VMT_BUMPER_F, VMT_BUMPER_R, VMT_SKIRT, VMT_EXHAUST",
  },
  bone: {
    name: "Attachment Bone",
    description: "The anchor point — the mod part moves with this bone.",
    example: "Spoilers → boot (trunk), Hoods → bonnet, Doors → door_dside_f",
  },
  collisionBone: {
    name: "Collision Bone",
    description: "Which part of the car's physics hitbox this mod attaches to.",
    example: "Usually 'chassis'",
  },
  statModType: {
    name: "Stat Mod Type",
    description: "The performance upgrade category.",
    example: "VMT_ENGINE, VMT_BRAKES, VMT_GEARBOX, VMT_HORN, VMT_SUSPENSION, VMT_ARMOUR",
  },
  slotName: {
    name: "Slot Name",
    description: "Renames a category in the mod shop.",
    example: "Change VMT_CHASSIS to 'POLICE_EQUIPMENT'",
  },
};

export const kitTypes = [
  "MKT_STANDARD",
  "MKT_BENNYS_ORIGINAL",
  "MKT_F1",
];

export const visibleModTypes = [
  "VMT_SPOILER",
  "VMT_BUMPER_F",
  "VMT_BUMPER_R",
  "VMT_SKIRT",
  "VMT_EXHAUST",
  "VMT_CHASSIS",
  "VMT_GRILL",
  "VMT_BONNET",
  "VMT_ROOF",
  "VMT_WING_L",
  "VMT_WING_R",
  "VMT_FENDER_L",
  "VMT_FENDER_R",
  "VMT_LIVERY",
  "VMT_PLAQUE",
];

export const statModTypes = [
  "VMT_ENGINE",
  "VMT_BRAKES",
  "VMT_GEARBOX",
  "VMT_HORN",
  "VMT_SUSPENSION",
  "VMT_ARMOUR",
  "VMT_TURBO",
  "VMT_WHEELS",
];

export const commonBones = [
  "chassis",
  "boot",
  "bonnet",
  "bumper_f",
  "bumper_r",
  "door_dside_f",
  "door_dside_r",
  "door_pside_f",
  "door_pside_r",
  "exhaust",
  "misc_a",
  "misc_b",
  "misc_c",
];

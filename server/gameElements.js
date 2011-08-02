function ids(arr, conv) {
  return arr.map(function(i){return conv[i].id;});
}

function makeObj(id, arr) {
  var obj = {};
  arr.forEach(function(i) {
    obj[i[id]] = i;
  });
  return obj;
}

function makeMap(mapArr) {
  var obj = {};
  mapArr.forEach(function(i) {
    obj[i[0]] = i[1];
  });
  return obj;
}

function makeIdMap(mapArr) {
  var obj = {};
  mapArr.forEach(function(i) {
    obj[i[0].id] = i[1];
  });
  return obj;
}

function nameMapToIdMap(map, conv) {
  var obj = {};
  var key = null;
  for(key in map) {
    if(map.hasOwnProperty(key)) {
      obj[conv[key].id] = map[key];
    }
  }
  return obj;
}

function UnitClass(id, name) {
  this.id = id;
  this.name = name;
}

function UnitType(id, name, unitClass, price, primaryWeapon,
                secondaryWeapon, armor, defenseMap, movementType,
                movement, carryClasses, carryNum, flags) {
  this.id = id;
  this.name = name;
  this.unitClass = unitClassesByName[unitClass].id;
  this.price = price;
  this.primaryWeapon = primaryWeapon === null ? null : weaponsByName[primaryWeapon].id;
  this.secondaryWeapon = secondaryWeapon === null ? null : weaponsByName[secondaryWeapon].id;
  this.armor = armorsByName[armor].id;
  this.defenseMap = nameMapToIdMap(defenseMap, terrainByName);
  this.movementType = movementTypesByName[movementType].id;
  this.movement = movement;
  this.carryClasses = ids(carryClasses, unitClassesByName);
  this.carryNum = carryNum;
  this.flags = ids(flags, unitFlagsByName);
}

UnitType.prototype.canCarry = function(unitType) {
  return this.carryClasses.indexOf(unitType.id) != -1;
};
  
UnitType.prototype.deployable = function() {
  d = false;
  if(this.primaryWeapon !== null) {
    d = d || weapons[this.primaryWeapon].requireDeployed;
  }
  if(this.secondaryWeapon !== null) {
    d = d || weapons[this.secondaryWeapon].requireDeployed;
  }

  return d;
};
      
UnitType.prototype.canCapture = function() {
  return this.flags.indexOf(unitFlags['Capture'].id) != -1;
};

UnitType.prototype.powerAgainst = function(unitType, distance, terrain, health, targetHealth, deployed) {
  defense = unitType.defenseAt(terrain);
  primaryPower = this.primaryWeapon !== null ? weapons[this.primaryWeapon].powerAgainst(unitType.armor, distance, deployed) : null;
  secondaryPower = this.secondaryWeapon !== null ? weapons[this.secondaryWeapon].powerAgainst(unitType.armor, distance, deployed) : null;

  power = Math.max(primaryPower, secondaryPower);
  if(power === null) {
      return null;
  }
  return Math.max(health * power * (100-defense * targetHealth / 100) / 100 / 100, 1);
};

UnitType.prototype.defenseAt = function(terrain) {
  var d = this.defenseMap[terrain.id];
  return d === undefined ? terrain.defense : d;
};

UnitType.prototype.movementOn = function(terrain) {
  cost = movementTypes[this.movementType].effectMap[terrain.id];
  cost = cost === undefined ? 1 : cost;
  return cost <= this.movement ? cost : null;
};

function Armor(id, name) {
  this.id = id;
  this.name = name;
}

function Weapon(id, name, requireDeployed, rangeMap, powerMap) {
  this.id = id;
  this.name = name;
  this.requireDeployed = requireDeployed;
  this.rangeMap = rangeMap;
  this.powerMap = nameMapToIdMap(powerMap, armorsByName);
}

Weapon.prototype.powerAgainst = function(armor, distance, deployed) {
  if(!deployed && this.requireDeployed) {
    return null;
  }

  var d = this.rangeMap[distance];
  d = d === undefined ? null : d;
  var a = this.powerMap[armor.id];
  a = a === undefined ? null : a;

  if(d === null || a === null) {
    return null;
  }
  var power = d * a / 100;
  return Math.max(power, 1);
};

    
function TerrainFlag(id, name) {
  this.id = id;
  this.name = name;
}

function TerrainType(id, name, defense, buildTypes, repairTypes, flags) {
  this.id = id;
  this.name = name;
  this.defense = defense;
  this.buildTypes = ids(buildTypes, unitClassesByName);
  this.repairTypes = ids(repairTypes, unitClassesByName);
  this.flags = ids(flags, terrainFlagsByName);
}

TerrainType.prototype.capturable = function() {
  return this.flags.indexOf(terrainFlagsByName['Capturable'].id) != -1 ;
};

TerrainType.prototype.produces_funds = function() {
  return this.flags.indexOf(terrainFlagsByName['Funds'].id) != -1;
};

TerrainType.prototype.can_build = function() {
  return len(this.buildTypes) > 0;
};

TerrainType.prototype.builds = function() {
  var this_ = this;
  return unitTypeList.filter(function(u) {
    return this_.buildTypes.indexOf(u.id) != 0;
  });
};

TerrainType.prototype.can_repair = function(unitType) {
  return this.repairTypes.indexOf(unitType.id) != -1;
};


function MovementType(id, name, effectMap) {
  this.id = id;
  this.name = name;
  this.effectMap = nameMapToIdMap(effectMap, terrainByName);
}

function UnitFlag(id, name) {
  this.id = id;
  this.name = name;
}

/**********************************************************************
* Armor                                                               *
**********************************************************************/

var armorList = [
  new Armor(0, 'Infantry'),
  new Armor(1, 'LightVehicle'),
  new Armor(2, 'HeavyVehicle'),
  new Armor(3, 'LightTank'),
  new Armor(4, 'MediumTank'),
  new Armor(5, 'HeavyTank'),
  new Armor(6, 'Interceptor'),
  new Armor(7, 'Copter'),
  new Armor(8, 'Bomber'),
  new Armor(9, 'LightShip'),
  new Armor(10, 'MediumShip'),
  new Armor(11, 'HeavyShip')
];
var armorsByName = makeObj("name", armorList);
var armors = makeObj("id", armorList);

/**********************************************************************
* Weapons                                                             *
**********************************************************************/

var weaponList = [
  new Weapon(0, 'Rifle', false, {1: 100},
        {'Infantry': 50,
         'LightVehicle': 30,
         'HeavyVehicle': 20,
         'LightTank': 20,
         'MediumTank': 10,
         'HeavyTank': 5,
         'Copter': 25,
         'LightShip': 10,
         'MediumShip': 7,
         'HeavyShip': 4
          }),

  new Weapon(1, 'Machinegun', false, {1: 100},
        {'Infantry': 100,
         'LightVehicle': 40,
         'HeavyVehicle': 30,
         'LightTank': 30,
         'MediumTank': 20,
         'HeavyTank': 10,
         'Copter': 30,
         'LightShip': 15,
         'MediumShip': 12,
         'HeavyShip': 8
          }),

  new Weapon(15, 'HeavyMachinegun', false, {1: 100},
        {'Infantry': 130,
         'LightVehicle': 50,
         'HeavyVehicle': 40,
         'LightTank': 35,
         'MediumTank': 25,
         'HeavyTank': 15,
         'Copter': 40,
         'LightShip': 20,
         'MediumShip': 16,
         'HeavyShip': 12
          }),

  new Weapon(2, 'Bazooka', false, {1: 100},
        {'Infantry': 20,
         'LightVehicle': 60,
         'HeavyVehicle': 50,
         'LightTank': 40,
         'MediumTank': 30,
         'HeavyTank': 20,
         'LightShip': 20,
         'MediumShip': 16,
         'HeavyShip': 12
          }),

  new Weapon(3, 'LightCannon', false, {1: 100, 2: 50},
        {'Infantry': 30,
         'LightVehicle': 60,
         'HeavyVehicle': 50,
         'LightTank': 50,
         'MediumTank': 40,
         'HeavyTank': 30,
         'LightShip': 25,
         'MediumShip': 20,
         'HeavyShip': 15
          }),

  new Weapon(4, 'MediumCannon', false, {1: 100, 2: 50},
        {'Infantry': 40,
         'LightVehicle': 80,
         'HeavyVehicle': 70,
         'LightTank': 60,
         'MediumTank': 50,
         'HeavyTank': 40,
         'LightShip': 30,
         'MediumShip': 25,
         'HeavyShip': 20
          }),

  new Weapon(5, 'HeavyCannon', false, {1: 100, 2: 50},
        {'Infantry': 50,
         'LightVehicle': 110,
         'HeavyVehicle': 100,
         'LightTank': 100,
         'MediumTank': 75,
         'HeavyTank': 50,
         'LightShip': 40,
         'MediumShip': 30,
         'HeavyShip': 25
          }),

  new Weapon(6, 'LightArtillery', true, {2: 90, 3: 100, 4: 90},
        {'Infantry': 100,
         'LightVehicle': 50,
         'HeavyVehicle': 40,
         'LightTank': 30,
         'MediumTank': 20,
         'HeavyTank': 10,
         'LightShip': 40,
         'MediumShip': 35,
         'HeavyShip': 30
          }),

  new Weapon(7, 'MediumArtillery', true, {2: 90, 3: 100, 4: 100, 5: 90},
        {'Infantry': 120,
         'LightVehicle': 80,
         'HeavyVehicle': 70,
         'LightTank': 60,
         'MediumTank': 50,
         'HeavyTank': 30,
         'LightShip': 50,
         'MediumShip': 40,
         'HeavyShip': 35
          }),

  new Weapon(8, 'HeavyArtillery', true, {3: 90, 4: 100, 5: 100, 6: 90},
        {'Infantry': 160,
         'LightVehicle': 110,
         'HeavyVehicle': 100,
         'LightTank': 100,
         'MediumTank': 90,
         'HeavyTank': 80,
         'LightShip': 70,
         'MediumShip': 55,
         'HeavyShip': 40
          }),

  new Weapon(9, 'AACannon', false, {1: 100},
        {'Copter': 100,
         'Interceptor': 70,
         'Bomber': 80
          }),

  new Weapon(10, 'AAMissile', true, {2: 100, 3: 100, 4: 90, 5: 80, 6: 70, 7: 50, 8: 40},
        {'Copter': 140,
         'Interceptor': 120,
         'Bomber': 100
          }),

  new Weapon(11, 'CopterMissile', false, {1: 100},
        {'Infantry': 50,
         'LightVehicle': 70,
         'HeavyVehicle': 60,
         'LightTank': 55,
         'MediumTank': 45,
         'HeavyTank': 35,
         'Copter': 60,
         'LightShip': 45,
         'MediumShip': 30,
         'HeavyShip': 20
          }),

  new Weapon(12, 'InterceptorMissile', false, {1: 100},
        {'Copter': 100,
         'Interceptor': 50,
         'Bomber': 80
          }),

  new Weapon(13, 'AerialBomb', false, {1: 100},
        {'Infantry': 160,
         'LightVehicle': 140,
         'HeavyVehicle': 130,
         'LightTank': 120,
         'MediumTank': 100,
         'HeavyTank': 90,
         'LightShip': 80,
         'MediumShip': 70,
         'HeavyShip': 60
          }),

  new Weapon(14, 'CruiserArtillery', true, {3: 80, 4: 90, 5: 100, 6: 70},
        {'Infantry': 180,
         'LightVehicle': 140,
         'HeavyVehicle': 120,
         'LightTank': 110,
         'MediumTank': 100,
         'HeavyTank': 90,
         'LightShip': 100,
         'MediumShip': 65,
         'HeavyShip': 50
          })
];
var weaponsByName = makeObj("name", weaponList);
var weapons = makeObj("id", weaponList);

/**********************************************************************
* Terrain                                                             *
**********************************************************************/

var terrainFlagList = [
  new TerrainFlag(0, 'Capturable'),
  new TerrainFlag(1, 'Funds')
];
var terrainFlagsByName = makeObj("name", terrainFlagList);
var terrainFlags = makeObj("id", terrainFlagList);

var unitClassList = [
  new UnitClass(0, 'Infantry'),
  new UnitClass(1, 'Vehicle'),
  new UnitClass(2, 'Aerial'),
  new UnitClass(3, 'Naval')
];

var unitClassesByName = makeObj("name", unitClassList);
var unitClasses = makeObj("id", unitClassList);

var terrainList = [
  new TerrainType(0, 'Road', 0,
              [],
              [],
              []),
  new TerrainType(1, 'Plains', 0,
              [],
              [],
              []),
  new TerrainType(2, 'Forest', 20,
              [],
              [],
              []),
  new TerrainType(3, 'Mountains', 60,
              [],
              [],
              []),
  new TerrainType(4, 'Water', 0,
              [],
              [],
              []),
  new TerrainType(5, 'City', 40,
              [],
              ['Infantry', 'Vehicle'],
              ['Capturable', 'Funds']),
  new TerrainType(6, 'Base', 45,
              ['Infantry', 'Vehicle'],
              ['Infantry', 'Vehicle'],
              ['Capturable', 'Funds']),
  new TerrainType(7, 'Fort', 20,
              [],
              ['Infantry'],
              ['Capturable']),
  new TerrainType(8, 'Airport', 45,
              ['Aerial'],
              ['Infantry', 'Aerial'],
              ['Capturable']),
  new TerrainType(9, 'Port', 45,
              ['Naval'],
              ['Infantry', 'Naval'],
              ['Capturable']),
  new TerrainType(10, 'Beach', 0,
              [],
              [],
              [])
];
var terrainByName = makeObj("name", terrainList);
var terrain = makeObj("id", terrainList);

/**********************************************************************
* Movement                                                            *
**********************************************************************/

var movementTypeList = [
  new MovementType(0, 'Walk',
                {'Mountains':  2,
                'Water':  3}),
  new MovementType(1, 'LightVehicle',
                {'Forest':  2,
                'Mountains':  null,
                'Water':  null}),
  new MovementType(2, 'MediumVehicle',
                {'Plains':  2,
                'Forest':  3,
                'Mountains':  null,
                'Water':  null}),
  new MovementType(3, 'HeavyVehicle',
                {'Plains':  3,
                'Forest':  4,
                'Mountains':  null,
                'Water':  null}),
  new MovementType(4, 'Flying',
                {}),
  new MovementType(5, 'Ship',
                makeMap(terrainList.map(function(t){
                  var canMove = ['Water', 'Port', 'Beach'].indexOf(t.name) != -1;
                  return [t.name, canMove ? 1 : null];                  
                }))) // Moves only on water and port;
];
var movementTypesByName = makeObj("name", movementTypeList);
var movementTypes = makeObj("id", movementTypeList);

/**********************************************************************
* Units                                                               *
**********************************************************************/

var unitFlagList = [
  new UnitFlag(0, 'Capture')
];

var unitFlagsByName = makeObj("name", unitFlagList);
var unitFlags = makeObj("id", unitFlagList);


var unitTypeList = [
  new UnitType(0, 'Infantry', 'Infantry', 100,
            'Rifle', null,
          'Infantry',
            {'Plains': 10,
            'Forest': 50,
            'City': 50,
            'Base': 50,
            'Fort': 65,
            'Airport': 50,
            'Port': 50},
            'Walk', 3,
            [], 0,
            ['Capture']),

  new UnitType(1, 'AT-Infantry', 'Infantry', 200,
            'Rifle', 'Bazooka',
          'Infantry',
            {'Plains': 10,
            'Forest': 50,
            'City': 50,
            'Base': 50,
            'Fort': 65,
            'Airport': 50,
            'Port': 50},
            'Walk', 2,
            [], 0,
            ['Capture']),
  new UnitType(14, 'APC', 'Vehicle', 300,
            null, null,
          'LightTank',
            {},
            'LightVehicle', 5,
            ['Infantry'], 2,
            []),
  new UnitType(2, 'Scout vehicle', 'Vehicle', 400,
            'Machinegun', null,
          'LightVehicle',
            {'Plains': 10},
            'LightVehicle', 6,
            [], 0,
            []),

  new UnitType(9, 'AA vehicle', 'Vehicle', 500,
            'AACannon', 'Machinegun',
          'LightVehicle',
            {},
            'LightVehicle', 5,
            [], 0,
            []),

  new UnitType(3, 'Light tank', 'Vehicle', 700,
            'LightCannon', 'Machinegun',
          'LightTank',
            {'Plains': 10},
            'LightVehicle', 5,
            [], 0,
            []),

  new UnitType(4, 'Medium tank', 'Vehicle', 1200,
            'MediumCannon', 'HeavyMachinegun',
          'MediumTank',
            {},
            'LightVehicle', 4,
            [], 0,
            []),

  new UnitType(5, 'Heavy tank', 'Vehicle', 1700,
            'HeavyCannon', 'HeavyMachinegun',
          'HeavyTank',
            {},
            'HeavyVehicle', 4,
            [], 0,
            []),

  new UnitType(6, 'Light artillery', 'Vehicle', 500,
            'LightArtillery', null,
          'LightVehicle',
            {},
            'LightVehicle', 4,
            [], 0,
            []),

  new UnitType(7, 'Medium artillery', 'Vehicle', 1500,
            'MediumArtillery', null,
          'LightVehicle',
            {},
            'LightVehicle', 4,
            [], 0,
            []),

  new UnitType(8, 'Heavy artillery', 'Vehicle', 2600,
            'HeavyArtillery', null,
          'HeavyVehicle',
            {},
            'HeavyVehicle', 4,
            [], 0,
            []),

  new UnitType(10, 'SAM vehicle', 'Vehicle', 1000,
            'AAMissile', null,
          'HeavyVehicle',
            {},
            'HeavyVehicle', 4,
            [], 0,
            []),
  new UnitType(15, 'Transport copter', 'Aerial', 500,
            null, null,
          'Copter',
            makeMap(terrainList.map(function(t){return [t.name, 0];})), // Defense zero in all terrains;
            'Flying', 6,
            ['Infantry'], 2,
            []),
  new UnitType(11, 'Attack copter', 'Aerial', 1000,
            'CopterMissile', 'Machinegun',
          'Copter',
            makeMap(terrainList.map(function(t){return [t.name, 0];})), // Defense zero in all terrains;
            'Flying', 7,
            [], 0,
            []),
  new UnitType(12, 'Interceptor', 'Aerial', 1500,
            'InterceptorMissile', null,
          'Interceptor',
            makeMap(terrainList.map(function(t){return [t.name, 0];})), // Defense zero in all terrains;
            'Flying', 12,
            [], 0,
            []),
  new UnitType(13, 'Bomber', 'Aerial', 2200,
            'AerialBomb', null,
          'Bomber',
            makeMap(terrainList.map(function(t){return [t.name, 0];})), // Defense zero in all terrains;
            'Flying', 9,
            [], 0,
            []),
  new UnitType(16, 'Cargo ship', 'Naval', 800,
            null, null,
          'MediumShip',
            {},
            'Ship', 4,
            ['Infantry', 'Vehicle'], 2,
            []),
  new UnitType(17, 'Gunboat', 'Naval', 1000,
            'MediumCannon', 'HeavyMachinegun',
          'MediumShip',
            {},
            'Ship', 5,
            [], 0,
            []),
  new UnitType(18, 'AA boat', 'Naval', 700,
            'AACannon', null,
          'LightShip',
            {},
            'Ship', 6,
            [], 0,
            []),
  new UnitType(19, 'Cruiser', 'Naval', 3000,
            'CruiserArtillery', null,
          'HeavyShip',
            {},
            'Ship', 4,
            [], 0,
            [])
];

var unitTypesByName = makeObj("name", unitTypeList);
var unitTypes = makeObj("id", unitTypeList);

/**********************************************************************
* External use                                                        *
**********************************************************************/

exports.armors = armors;
exports.weapons = weapons;
exports.terrainFlags = terrainFlags;
exports.unitClasses = unitClasses;
exports.terrains = terrain;
exports.movementTypes = movementTypes;
exports.unitFlags = unitFlags;
exports.unitTypes = unitTypes;

exports.armorsByName = armorsByName;
exports.weaponsByName = weaponsByName;
exports.terrainFlagsByName = terrainFlagsByName;
exports.unitClassesByName = unitClassesByName;
exports.terrainByName = terrainByName;
exports.movementTypesByName = movementTypesByName;
exports.unitFlagsByName = unitFlagsByName;
exports.unitTypesByName = unitTypesByName;

exports.armorList = armorList;
exports.weaponList = weaponList;
exports.terrainFlagList = terrainFlagList;
exports.unitClassList = unitClassList;
exports.terrainList = terrainList;
exports.movementTypeList = movementTypeList;
exports.unitFlagList = unitFlagList;
exports.unitTypeList = unitTypeList;


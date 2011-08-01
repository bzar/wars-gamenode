from PIL import Image
from math import sqrt

SPRITE_SHEET_FILE = 'sprite_sheet.png'
SPRITE_SHEET_MAP_FILE = 'image_map.js'
TILE_WIDTH = 48
TILE_HEIGHT = 48

add_path = lambda node, path: [add_path(child, path) for child in node] if type(node) is list else (path + node if node else None) 

tiles_path = 'tile/'
tiles = [[['road-ud.png'], ['road-lr.png'], ['road-ul.png'], ['road-ur.png'], ['road-ld.png'], ['road-rd.png'],
          ['road-t-crossing-u.png'], ['road-t-crossing-d.png'], ['road-t-crossing-l.png'], ['road-t-crossing-r.png'],
          ['road-x-crossing.png']],
         [['plains.png']],
         [['forest.png']],
         [['mountains.png']],
         [['water.png'], ['water-edge-t.png'], ['water-edge-b.png'], ['water-edge-l.png'], ['water-edge-r.png'], 
          ['water-edge-tl.png'], ['water-edge-tr.png'], ['water-edge-bl.png'], ['water-edge-br.png'],
          ['water-corner-tl.png'], ['water-corner-tr.png'], ['water-corner-bl.png'], ['water-corner-br.png'],
          ['water-corner-tl-br.png'], ['water-corner-tr-bl.png'],
          ['water-corner-tl-tr.png'], ['water-corner-tl-bl.png'], ['water-corner-tr-br.png'], ['water-corner-bl-br.png'],
          ['water-river-ud.png'], ['water-river-lr.png'], 
          ['water-river-ul.png'], ['water-river-ur.png'], ['water-river-ld.png'], ['water-river-rd.png'],
          ['water-corner-tl-tr-bl.png'], ['water-corner-tl-bl-br.png'], ['water-corner-tr-bl-br.png'], ['water-corner-tl-tr-br.png'],
          ['water-corner-tl-tr-bl-br.png'],
          ['water-river-u.png'], ['water-river-l.png'], ['water-river-r.png'], ['water-river-d.png']],
         [['city.png', 'city_1.png', 'city_2.png', 'city_3.png', 'city_4.png']],
         [['base.png', 'base_1.png', 'base_2.png', 'base_3.png', 'base_4.png']],
         [['fort.png', 'fort_1.png', 'fort_2.png', 'fort_3.png', 'fort_4.png']],
         [['airport.png', 'airport_1.png', 'airport_2.png', 'airport_3.png', 'airport_4.png']],
         [['port.png', 'port_1.png', 'port_2.png', 'port_3.png', 'port_4.png']],
         [['beach-u.png'], ['beach-d.png'], ['beach-l.png'], ['beach-r.png'], ]]

units_path = 'unit/'
units = [['', 'infantry_1.png', 'infantry_2.png', 'infantry_3.png', 'infantry_4.png'],
         ['', 'at-infantry_1.png', 'at-infantry_2.png', 'at-infantry_3.png', 'at-infantry_4.png'],
         ['', 'scout_1.png', 'scout_2.png', 'scout_3.png', 'scout_4.png'],
         ['', 'light_tank_1.png', 'light_tank_2.png', 'light_tank_3.png', 'light_tank_4.png'],
         ['', 'medium_tank_1.png', 'medium_tank_2.png', 'medium_tank_3.png', 'medium_tank_4.png'],
         ['', 'heavy_tank_1.png', 'heavy_tank_2.png', 'heavy_tank_3.png', 'heavy_tank_4.png'],
         ['', 'light_artillery_1.png', 'light_artillery_2.png', 'light_artillery_3.png', 'light_artillery_4.png'],
         ['', 'medium_artillery_1.png', 'medium_artillery_2.png', 'medium_artillery_3.png', 'medium_artillery_4.png'],
         ['', 'heavy_artillery_1.png', 'heavy_artillery_2.png', 'heavy_artillery_3.png', 'heavy_artillery_4.png'],
         ['', 'antiair_1.png', 'antiair_2.png', 'antiair_3.png', 'antiair_4.png'],
         ['', 'sam_1.png', 'sam_2.png', 'sam_3.png', 'sam_4.png'],
         ['', 'copter_1.png', 'copter_2.png', 'copter_3.png', 'copter_4.png'],
         ['', 'interceptor_1.png', 'interceptor_2.png', 'interceptor_3.png', 'interceptor_4.png'],
         ['', 'bomber_1.png', 'bomber_2.png', 'bomber_3.png', 'bomber_4.png'],
         ['', 'apc_1.png', 'apc_2.png', 'apc_3.png', 'apc_4.png'],
         ['', 'transport_copter_1.png', 'transport_copter_2.png', 'transport_copter_3.png', 'transport_copter_4.png'],
         ['', 'cargo_ship_1.png', 'cargo_ship_2.png', 'cargo_ship_3.png', 'cargo_ship_4.png'],
         ['', 'gunboat_1.png', 'gunboat_2.png', 'gunboat_3.png', 'gunboat_4.png'],
         ['', 'aaboat_1.png', 'aaboat_2.png', 'aaboat_3.png', 'aaboat_4.png'],
         ['', 'cruiser_1.png', 'cruiser_2.png', 'cruiser_3.png', 'cruiser_4.png'],]

other_path = 'gui/'
other = [['health_0.png', 'health_1.png', 'health_2.png', 'health_3.png', 'health_4.png',
          'health_5.png', 'health_6.png', 'health_7.png', 'health_8.png', 'health_9.png']]

tiles = add_path(tiles, tiles_path)
units = add_path(units, units_path)
other = add_path(other, other_path)

all_images = [tiles, units, other]

count_images = lambda x: (1 if x else 0) if type(x) is not list else sum(map(count_images, x))

num_images = count_images(all_images)

# Calculate sprite sheet size
sheet_width_in_tiles = int(sqrt(num_images) + 0.5)
empty_space = num_images
for w in range(sheet_width_in_tiles, sheet_width_in_tiles/2, -1):
    empty = w - (num_images % w)
    if empty < empty_space:
        sheet_width_in_tiles = w
        empty_space = empty
sheet_height_in_tiles = int(float(num_images) / sheet_width_in_tiles + 0.5)

sheet_width = sheet_width_in_tiles * TILE_WIDTH
sheet_height = sheet_height_in_tiles * TILE_HEIGHT

# Create image
sheet = Image.new('RGBA', (sheet_width, sheet_height))

def add_image_to_sheet(filename, i):
    image = Image.open(filename)
    x = i % sheet_width_in_tiles
    y = i / sheet_width_in_tiles
    sheet.paste(image, (x * TILE_WIDTH, y * TILE_HEIGHT))
    return (x, y)
    
def handle_node(node, map_pos, i=0):
    if type(node) is list:
        new_pos = []
        map_pos.append(new_pos)
        for j, child in enumerate(node):
            i = handle_node(child, new_pos, i)
        return i
    else:
        if node:
            x, y = add_image_to_sheet(node, i)
            map_pos.append((x, y, node))
            return i + 1
        else:
            map_pos.append(None)
            return i

image_map = []
handle_node(all_images, image_map)
image_map = image_map[0] # Remove extra list at root

def print_map(node, depth=0):
    if type(node) is list:
        for i, child in enumerate(node):
            return '\n' + ' ' * depth + '['  + ', '.join((print_map(child, depth+1) for child in node)) + ']'
    else:
        return '{x:%i, y:%i, img:"%s"}' % node if node else 'null'

            

sheet.save(SPRITE_SHEET_FILE)

mapfile = open(SPRITE_SHEET_MAP_FILE, 'w')
mapfile.write('var SPRITE_SHEET_MAP =')
mapfile.write(print_map(image_map))
mapfile.write(';')
mapfile.close()

print 

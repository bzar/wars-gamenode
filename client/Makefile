ECTC=nodejs bin/ectc
LESSC=nodejs lib/less/bin/lessc
COFFEEC=coffee

PAGES=www/game.html www/mygames.html www/opengames.html www/login.html www/publicgames.html www/mymaps.html www/mapeditor.html www/creategame.html www/pregame.html www/manual.html www/info.html www/profile.html www/register.html www/gamestatistics.html
STYLES=www/common.css www/game.css www/maplist.css www/mapeditor.css www/login.css www/creategame.css www/pregame.css www/info.css
SOURCES= www/register.js www/base.js www/gamenode.js www/mygames.js www/Color.js www/gamestatistics.js www/mymaps.js www/settings.js www/skeleton.js www/common.js www/info.js www/opengames.js www/Theme.js www/login.js www/pregame.js www/creategame.js www/manual.js www/profile.js www/publicgames.js www/ticker.js www/Map.js www/AnimatedMap.js www/game.js www/GameLogic.js

all: pages styles sources
	
clean:
	rm -f $(PAGES) $(STYLES) $(SOURCES)
pages: $(PAGES)
	
www/%.html : template/%.ect template/base.ect
	$(ECTC) $< > $@
styles: $(STYLES)
	
www/%.css : less/%.less
	$(LESSC) $< > $@
sources: $(SOURCES)
	
www/%.js : src/%.coffee
	$(COFFEEC) -o www $<

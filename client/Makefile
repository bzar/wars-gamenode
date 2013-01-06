ECTC=nodejs bin/ectc
LESSC=nodejs lib/less/bin/lessc
COFFEEC=coffee

PAGES=www/game.html www/mygames.html www/opengames.html www/login.html www/publicgames.html www/mymaps.html www/mapeditor.html
STYLES=www/common.css www/game.css www/maplist.css www/mapeditor.css
SOURCES=www/common.js www/Color.js

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

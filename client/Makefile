ECTC=nodejs bin/ectc
LESSC=nodejs node_modules/less/bin/lessc
COFFEEC=coffee

PAGES=www/game.html www/mymaps.html www/publicgames.html www/mygames.html www/opengames.html
STYLES=www/styles.css
SOURCES=www/base.js

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

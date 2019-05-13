# configuration
PORT ?= 8080
VAULT_CSS ?= vault.css
VAULT_INDEX ?= vault.html
VAULT_SCRIPT ?= vault.js
VAULT_CSCRIPT ?= $(VAULT_SCRIPT:.js=.min.js)
VAULT_SCRIPT_TEMPLATE ?= vault.njk
VAULT_CONFIG_PROD ?= production.json
VAULT_CONFIG_DEV ?= developer.json

# install dependencies
install:
	./utils/install.sh

# serve locally
serve: $(VAULT_CSCRIPT)
	./utils/server.py $(PORT) $(VAULT_INDEX)

# purge production edge caches
purge:
	./utils/vault.sh --zone "$(CLOUDFLARE_ZONE_ID)" purge

# build dev script file
developer: src/$(VAULT_SCRIPT_TEMPLATE) config/$(VAULT_CONFIG_DEV)
	./utils/vault.js --config config/$(VAULT_CONFIG_DEV) \
		--in-file src/$(VAULT_SCRIPT_TEMPLATE) \
		--out-file src/$(VAULT_SCRIPT)

# build production script file
production: src/$(VAULT_SCRIPT_TEMPLATE) config/$(VAULT_CONFIG_PROD)
	./utils/vault.js --config config/$(VAULT_CONFIG_PROD) \
		--in-file src/$(VAULT_SCRIPT_TEMPLATE) \
		--out-file src/$(VAULT_SCRIPT)

# minify dev script file
minify: src/$(VAULT_SCRIPT)
	./utils/vault.sh --script $(VAULT_SCRIPT:.js=) \
		--index $(VAULT_INDEX:.html=) minify

# lint source codes
lint:
	./node_modules/.bin/eslint -c .eslintrc.json src

# clean build files
clean:
	rm -f dist/$(VAULT_CSS) \
		dist/$(VAULT_INDEX) \
		dist/$(VAULT_CSCRIPT) \
		src/$(VAULT_SCRIPT)

# build dev dependencies
src/$(VAULT_SCRIPT): src/$(VAULT_SCRIPT_TEMPLATE)
	$(MAKE) developer

# compile JavaScript source
$(VAULT_CSCRIPT): src/$(VAULT_SCRIPT)
	$(MAKE) minify

# configuration
PORT ?= 8080
VAULT_INDEX ?= vault.html
VAULT_SCRIPT ?= vault.js
VAULT_CSCRIPT ?= $(VAULT_SCRIPT:.js=.min.js)
VAULT_SCRIPT_TEMPLATE ?= vault.njk
VAULT_CONFIG_PROD ?= production.json
VAULT_CONFIG_DEV ?= developer.json

# install dependencies
install:
	./utils/install.sh

# serve localy
serve: $(VAULT_CSCRIPT)
	./utils/server.py $(PORT) $(VAULT_INDEX)

# deploy to production
deploy:
	./utils/vault.sh --no-compile --zone "$(CLOUDFLARE_ZONE_ID)" \
		--distribution "$(AWS_CLOUDFRONT_DISTRIBUTION)" deploy

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
	rm -f $(VAULT_CSCRIPT) \
		src/$(VAULT_SCRIPT)

# build dev dependencies
src/$(VAULT_SCRIPT): src/$(VAULT_SCRIPT_TEMPLATE)
	$(MAKE) developer

# compile JavaScript source
$(VAULT_CSCRIPT): src/$(VAULT_SCRIPT)
	$(MAKE) minify

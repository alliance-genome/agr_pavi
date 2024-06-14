CONTAINER_NAME=agr_pavi/webui
ADDITIONAL_BUILD_ARGS=
SUPPORTED_NODE := ^v20\.
PAVI_API_PORT ?= 8000
PAVI_API_BASE_URL ?= http://localhost:${PAVI_API_PORT}

clean:
	$(eval ADDITIONAL_BUILD_ARGS := --no-cache)
	@rm -rf node_modules/

check-node:
	@$(eval NODE_VERSION=$(shell node --version))
ifeq ($(shell node --version | grep -P "${SUPPORTED_NODE}"),)
	@echo 'Node version "${NODE_VERSION}" not supported!'\
		  'Change the active node version (use nvm) to match "${SUPPORTED_NODE}".'
	@exit 1
else
	@:
endif

container-image:
	docker build ${ADDITIONAL_BUILD_ARGS} -t ${CONTAINER_NAME} .

deps: check-node
	npm install

deps-lock-update: check-node
	npm update --package-lock-only

run-container-dev:
	docker-compose -f docker-compose-dev.yml --env-file dev.env up agr.pavi.dev-local.webui

run-server-dev: check-node deps
	@export PAVI_API_BASE_URL=${PAVI_API_BASE_URL} && \
	 npm run dev

run-style-checks: check-node deps
	npm run lint

run-type-checks: check-node deps
	npm run typecheck

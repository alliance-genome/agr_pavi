CONTAINER_NAME=agr_pavi/webui
ADDITIONAL_BUILD_ARGS=
SUPPORTED_NODE := ^v20\.

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

dependencies: check-node
	npm install

dependencies-lock-update: check-node
	npm update --package-lock-only

run-container-dev:
	docker-compose -f docker-compose.yml --env-file dev.env up agr.pavi.webui

run-server-dev: check-node dependencies
	npm run dev

run-style-check: check-node dependencies
	npm run lint

run-type-check: check-node dependencies
	npm run typecheck

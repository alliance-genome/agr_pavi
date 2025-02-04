mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

CONTAINER_NAME=agr_pavi/webui
ADDITIONAL_BUILD_ARGS=
PAVI_API_PORT ?= 8000
PAVI_API_BASE_URL ?= http://localhost:${PAVI_API_PORT}
PAVI_API_BASE_DOCKER_URL ?= http://agr.pavi.dev-local.api.server:${PAVI_API_PORT}

AWS_DEFAULT_REGION := us-east-1
AWS_ACCT_NR=100225593120
REG=${AWS_ACCT_NR}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com

.nvmrc:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)../Makefile -C $(mkfile_dir) .nvmrc

clean:
	$(eval ADDITIONAL_BUILD_ARGS := --no-cache)
	@rm -rf .next/
	@rm -rf node_modules/

container-image: .nvmrc
	docker build --build-arg NODE_VERSION=$(shell cat .nvmrc) ${ADDITIONAL_BUILD_ARGS} -t ${CONTAINER_NAME} .

push-container-image: registry-docker-login
	docker tag ${CONTAINER_NAME} ${REG}/${CONTAINER_NAME}:${TAG_NAME}
	docker push ${REG}/${CONTAINER_NAME}:${TAG_NAME}

install-deps: package-lock.json
	@$(MAKE) --no-print-directory -f $(mkfile_dir)../Makefile -C $(mkfile_dir) install-node-deps

install-test-deps: package-lock.json
	@$(MAKE) --no-print-directory -f $(mkfile_dir)../Makefile -C $(mkfile_dir) install-node-test-deps

install-deps-all: install-test-deps
	@:

install-cypress-deps:
	sudo apt-get install libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libnss3 libxss1 libasound2 libxtst6 xauth xvfb

install-node: .nvmrc
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile -C $(mkfile_dir) install-node

update-install-node: .nvmrc
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile -C $(mkfile_dir) update-install-node

package-lock.json:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile -C $(mkfile_dir) package-lock.json

update-deps-lock:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile -C $(mkfile_dir) update-node-deps-lock

update-deps-locks-all: update-deps-lock
	@:

registry-docker-login:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile registry-docker-login

run-container-dev:
	@export PAVI_API_BASE_URL=${PAVI_API_BASE_DOCKER_URL} && \
	 docker compose -f docker-compose-dev.yml --env-file dev.env up -d agr.pavi.dev-local.webui

run-server-dev: install-deps-all
	$(eval NPM_EXEC:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)../Makefile _vars-node-npm-exec))
	@export PAVI_API_BASE_URL=${PAVI_API_BASE_URL} && \
	 ${NPM_EXEC} run dev

run-style-checks: install-test-deps
	$(eval NPM_EXEC:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)../Makefile _vars-node-npm-exec))
	${NPM_EXEC} run lint

run-type-checks: install-test-deps
	$(eval NPM_EXEC:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)../Makefile _vars-node-npm-exec))
	${NPM_EXEC} run typecheck

run-unit-tests: install-test-deps
	$(eval NPM_EXEC:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)../Makefile _vars-node-npm-exec))
	${NPM_EXEC} run test

run-unit-tests-dev: install-test-deps
	$(eval NPM_EXEC:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)../Makefile _vars-node-npm-exec))
	${NPM_EXEC} run test:watch

run-e2e-tests: install-test-deps
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)../Makefile _vars-node-npx-exec))
	$(MAKE) --no-print-directory run-container-dev
	${NPX_EXEC} cypress run --e2e --env API_BASE_URL=${PAVI_API_BASE_URL} || true
	$(MAKE) --no-print-directory stop-container-dev

run-e2e-tests-dev: install-test-deps
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)../Makefile _vars-node-npx-exec))
	${NPX_EXEC} cypress open --e2e --env API_BASE_URL=${PAVI_API_BASE_URL}

stop-container-dev:
	@docker compose -f docker-compose-dev.yml --env-file dev.env down agr.pavi.dev-local.webui

mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

# DEBUG=1

CONTAINER_IMAGE_NAME_WEBUI=agr_pavi/webui
CONTAINER_IMAGE_NAME_CYPRESS=agr_pavi/cypress_testing
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
	docker build --build-arg NODE_VERSION=$(shell cat .nvmrc) ${ADDITIONAL_BUILD_ARGS} -t ${CONTAINER_IMAGE_NAME_WEBUI} .

container-image-cypress: .nvmrc
	docker build --build-arg NODE_VERSION=$(shell cat .nvmrc) ${ADDITIONAL_BUILD_ARGS} -t ${CONTAINER_IMAGE_NAME_CYPRESS} -f Dockerfile-cypress-testing .

google-chrome:
	sudo apt install -y xdg-utils fonts-liberation
	wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
	sudo dpkg -i google-chrome-stable_current_amd64.deb

push-container-image: registry-docker-login
	docker tag ${CONTAINER_IMAGE_NAME_WEBUI} ${REG}/${CONTAINER_IMAGE_NAME_WEBUI}:${TAG_NAME}
	docker push ${REG}/${CONTAINER_IMAGE_NAME_WEBUI}:${TAG_NAME}

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

open-cypress-image-diff-html-report: install-test-deps
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)../Makefile _vars-node-npx-exec))
	${NPX_EXEC} cypress-image-diff-html-report start -c cypress-image-diff.config.cjs --rd cypress/visual-tests/cypress-image-diff-html-report/

package-lock.json:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile -C $(mkfile_dir) package-lock.json

update-deps-lock:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile -C $(mkfile_dir) update-node-deps-lock

test-resources/:
	@cp -r $(mkfile_dir)../tests/resources/ $(mkfile_dir)/test-resources/

update-deps-locks-all: update-deps-lock
	@:

registry-docker-login:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile registry-docker-login

run-container-dev:
	@export PAVI_API_BASE_URL=${PAVI_API_BASE_URL} && \
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

run-e2e-tests: test-resources/
	API_BASE_URL=${PAVI_API_BASE_URL} docker compose -f docker-compose-dev.yml --env-file dev.env up agr.pavi.cypress-e2e-testing

run-e2e-tests-dev: install-test-deps test-resources/
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) --no-print-directory -f $(mkfile_dir)../Makefile _vars-node-npx-exec))
ifneq ($(DEBUG),)
	$(eval NPX_EXEC:=export ELECTRON_ENABLE_LOGGING=1  && ${NPX_EXEC})
endif
	${NPX_EXEC} cypress open --e2e --env API_BASE_URL=${PAVI_API_BASE_URL}

stop-container-dev:
	@docker compose -f docker-compose-dev.yml --env-file dev.env down agr.pavi.dev-local.webui

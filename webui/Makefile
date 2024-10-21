mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

CONTAINER_NAME=agr_pavi/webui
ADDITIONAL_BUILD_ARGS=
PAVI_API_PORT ?= 8000
PAVI_API_BASE_URL ?= http://localhost:${PAVI_API_PORT}

AWS_DEFAULT_REGION := us-east-1
AWS_ACCT_NR=100225593120
REG=${AWS_ACCT_NR}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com

clean:
	$(eval ADDITIONAL_BUILD_ARGS := --no-cache)
	@rm -rf .next/
	@rm -rf node_modules/

container-image:
	docker build ${ADDITIONAL_BUILD_ARGS} -t ${CONTAINER_NAME} .

push-container-image: registry-docker-login
	docker tag ${CONTAINER_NAME} ${REG}/${CONTAINER_NAME}:${TAG_NAME}
	docker push ${REG}/${CONTAINER_NAME}:${TAG_NAME}

install-deps:
	npm install

install-cypress-deps:
	sudo apt-get install libgtk2.0-0 libgtk-3-0 libgbm-dev libnotify-dev libnss3 libxss1 libasound2 libxtst6 xauth xvfb

update-deps-lock:
	npm update --package-lock-only

update-deps-locks-all: update-deps-lock
	@:

registry-docker-login:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../Makefile registry-docker-login

run-container-dev:
	@export PAVI_API_BASE_URL=${PAVI_API_BASE_URL} && \
	 docker compose -f docker-compose-dev.yml --env-file dev.env up -d agr.pavi.dev-local.webui

run-server-dev: install-deps
	@export PAVI_API_BASE_URL=${PAVI_API_BASE_URL} && \
	 npm run dev

run-style-checks: install-deps
	npm run lint

run-type-checks: install-deps
	npm run typecheck

run-unit-tests: install-deps
	npm run test

run-e2e-tests: install-deps
	$(MAKE) --no-print-directory run-container-dev
	npx cypress run --e2e --env API_BASE_URL=${PAVI_API_BASE_URL} || true
	$(MAKE) --no-print-directory stop-container-dev

run-e2e-tests-dev: install-deps
	npx cypress open --e2e --env API_BASE_URL=${PAVI_API_BASE_URL}

stop-container-dev:
	@docker compose -f docker-compose-dev.yml --env-file dev.env down agr.pavi.dev-local.webui

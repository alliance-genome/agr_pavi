CONTAINER_NAME=agr_pavi/webui
ADDITIONAL_BUILD_ARGS=
SUPPORTED_NODE := ^v20\.
PAVI_API_PORT ?= 8000
PAVI_API_BASE_URL ?= http://localhost:${PAVI_API_PORT}

AWS_DEFAULT_REGION := us-east-1
AWS_ACCT_NR=100225593120
REG=${AWS_ACCT_NR}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com

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

install-deps: check-node
	npm install

update-deps-lock: check-node
	npm update --package-lock-only

registry-docker-login:
ifneq ($(shell echo ${REG} | egrep "ecr\..+\.amazonaws\.com"),)
	@$(eval DOCKER_LOGIN_CMD=docker run --rm -it -v ~/.aws:/root/.aws amazon/aws-cli)
ifneq (${AWS_PROFILE},)
	@$(eval DOCKER_LOGIN_CMD=${DOCKER_LOGIN_CMD} --profile ${AWS_PROFILE})
endif
	@$(eval DOCKER_LOGIN_CMD=${DOCKER_LOGIN_CMD} ecr get-login-password --region=${AWS_DEFAULT_REGION} | docker login -u AWS --password-stdin https://${REG})
	${DOCKER_LOGIN_CMD}
endif

run-container-dev:
	@export PAVI_API_BASE_URL=${PAVI_API_BASE_URL} && \
	 docker-compose -f docker-compose-dev.yml --env-file dev.env up agr.pavi.dev-local.webui

run-server-dev: check-node install-deps
	@export PAVI_API_BASE_URL=${PAVI_API_BASE_URL} && \
	 npm run dev

run-style-checks: check-node install-deps
	npm run lint

run-type-checks: check-node install-deps
	npm run typecheck

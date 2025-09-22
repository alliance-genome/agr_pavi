mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
include $(mkfile_dir)/../../common_make

PAVI_DEPLOY_VERSION_LABEL ?= $(shell git describe --tags --dirty)-$(shell git rev-parse --abbrev-ref HEAD)-$(shell date +%Y%m%d-%H%M%S)
EB_ENV_CDK_STACK_NAME ?= PaviApiEbDevStack
VALIDATE_ENV_STACK_NAME ?= PaviApiEbMainStack
PAVI_IMAGE_TAG ?= main
IMAGE_REPO_CDK_STACK_NAME ?= PaviApiImageRepoCdkStack
EB_APP_CDK_STACK_NAME ?= PaviApiEbApplicationCdkStack
ADD_CDK_ARGS ?=

.PHONY: deploy-% install-% run-% update-% validate-%

clean:
	rm -rf .venv/ || true
	rm -rf node_modules/ || true

update-deps-lock: update-python-deps-lock

update-test-deps-lock: update-python-test-deps-lock

update-deps-lock-shared-aws-only: update-python-deps-lock-shared-aws-only

update-test-deps-lock-shared-aws-only: update-python-test-deps-lock-shared-aws-only

update-cdk-cli-lock: update-node-deps-lock

update-deps-locks-all: update-deps-lock update-test-deps-lock update-cdk-cli-lock
	@:

install-cdk-cli: install-node-deps

install-cdk-cli-update-dev:
	@$(MAKE) --no-print-directory update-cdk-cli-lock
	@$(MAKE) --no-print-directory install-cdk-cli

install-deps: install-python-deps

install-deps-update-dev: .venv/
	.venv/bin/pip uninstall -y pavi_shared_aws
	@$(MAKE) --no-print-directory update-deps-lock
	@$(MAKE) --no-print-directory install-deps

install-test-deps: install-python-test-deps

install-test-deps-update-dev: .venv/
	.venv/bin/pip uninstall -y pavi_shared_aws
	@$(MAKE) --no-print-directory update-test-deps-lock
	@$(MAKE) --no-print-directory install-test-deps

install-deps-all:
	@$(MAKE) --no-print-directory install-deps
	@$(MAKE) --no-print-directory install-test-deps
	@$(MAKE) --no-print-directory install-cdk-cli

install-deps-update-all:
	@$(MAKE) --no-print-directory update-deps-locks-all
	.venv/bin/pip uninstall -y pavi_shared_aws
	@$(MAKE) --no-print-directory install-deps-all

run-unit-tests: install-test-deps
	.venv/bin/python -m pytest

run-unit-tests-dev: install-test-deps
	.venv/bin/python -m pytest -v

run-type-checks: install-test-deps
	.venv/bin/mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: install-test-deps
	.venv/bin/flake8 ./

validate-image-stack: install-deps run-unit-tests install-cdk-cli
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) _vars-node-npx-exec))
	. .venv/bin/activate && \
	${NPX_EXEC} cdk diff ${IMAGE_REPO_CDK_STACK_NAME}

validate-application-stack: install-deps run-unit-tests install-cdk-cli
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) _vars-node-npx-exec))
	. .venv/bin/activate && \
	${NPX_EXEC} cdk diff ${EB_APP_CDK_STACK_NAME}

validate-environment-stack: install-deps run-unit-tests install-cdk-cli
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) _vars-node-npx-exec))
	export PAVI_DEPLOY_VERSION_LABEL=${PAVI_DEPLOY_VERSION_LABEL} && \
	  export PAVI_IMAGE_TAG=${PAVI_IMAGE_TAG} && \
	  export PAVI_IMAGE_REGISTRY=${REG} && \
	  export PAVI_API_STACK_NAME=${PAVI_API_STACK_NAME} && \
	  . .venv/bin/activate && \
	  ${NPX_EXEC} cdk diff ${VALIDATE_ENV_STACK_NAME}

validate-environment-stack-dev: VALIDATE_ENV_STACK_NAME := ${EB_ENV_CDK_STACK_NAME}
validate-environment-stack-dev: validate-environment-stack
	@:

validate-all: run-unit-tests validate-image-stack validate-application-stack validate-environment-stack
	@:

validate-all-dev: VALIDATE_ENV_STACK_NAME := ${EB_ENV_CDK_STACK_NAME}
validate-all-dev: validate-all
	@:

deploy-image-stack: install-deps install-cdk-cli
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) _vars-node-npx-exec))
	. .venv/bin/activate && \
	${NPX_EXEC} cdk deploy ${IMAGE_REPO_CDK_STACK_NAME} ${ADD_CDK_ARGS}

deploy-application: install-deps install-cdk-cli
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) _vars-node-npx-exec))
	. .venv/bin/activate && \
	${NPX_EXEC} cdk deploy ${EB_APP_CDK_STACK_NAME} ${ADD_CDK_ARGS}
	.venv/bin/python -m pavi_shared_aws.aws_helpers.deploy_eb_app_version --eb_app_name PAVI-api --version_label ${PAVI_DEPLOY_VERSION_LABEL}

deploy-environment: install-deps install-cdk-cli
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) _vars-node-npx-exec))
	export PAVI_DEPLOY_VERSION_LABEL=${PAVI_DEPLOY_VERSION_LABEL} && \
	  export PAVI_IMAGE_TAG=${PAVI_IMAGE_TAG} && \
	  export PAVI_IMAGE_REGISTRY=${REG} && \
	  . .venv/bin/activate && \
	  ${NPX_EXEC} cdk deploy ${EB_ENV_CDK_STACK_NAME} ${ADD_CDK_ARGS}

destroy-environment: install-deps install-cdk-cli
	$(eval NPX_EXEC:=)
	$(eval $(shell $(MAKE) _vars-node-npx-exec))
	. .venv/bin/activate && \
	  ${NPX_EXEC} cdk destroy ${EB_ENV_CDK_STACK_NAME} ${ADD_CDK_ARGS}

print-deploy-version-label:
	@echo ${PAVI_DEPLOY_VERSION_LABEL}

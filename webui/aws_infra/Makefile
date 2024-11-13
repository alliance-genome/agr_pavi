mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

AWS_DEFAULT_REGION := us-east-1
AWS_ACCT_NR := 100225593120

PAVI_DEPLOY_VERSION_LABEL ?= $(shell git describe --tags --dirty)-$(shell git rev-parse --abbrev-ref HEAD)-$(shell date +%Y%m%d-%H%M%S)
EB_ENV_CDK_STACK_NAME ?= PaviWebUiEbDevStack
VALIDATE_ENV_STACK_NAME ?= PaviWebUiEbMainStack
PAVI_API_STACK_NAME ?= PaviApiEbDevStack
PAVI_IMAGE_TAG ?= main
PAVI_IMAGE_REGISTRY ?= ${AWS_ACCT_NR}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/
IMAGE_REPO_CDK_STACK_NAME ?= PaviWebUiImageRepoCdkStack
EB_APP_CDK_STACK_NAME ?= PaviWebUiEbApplicationCdkStack
ADD_CDK_ARGS ?=
EXTRA_PIP_COMPILE_ARGS ?=

ifdef NVM_DIR
NPM_EXEC=. ${NVM_DIR}/nvm.sh && nvm exec npm
NPX_EXEC=. ${NVM_DIR}/nvm.sh && nvm exec npx
else
NPM_EXEC=npm
NPX_EXEC=npx
endif

.PHONY: deploy-% install-% print-% run-% update-% validate-%

.venv/:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) .venv/

clean:
	rm -rf .venv/ || true
	rm -rf node_modules/ || true

requirements.txt:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) requirements.txt

tests/requirements.txt:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) tests/requirements.txt

package-lock.json:
	${NPM_EXEC} install --package-lock-only

update-deps-lock:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) update-python-deps-lock

update-test-deps-lock:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) update-python-test-deps-lock

update-deps-lock-shared-aws-only:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) update-python-deps-lock-shared-aws-only

update-test-deps-lock-shared-aws-only:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) update-python-test-deps-lock-shared-aws-only

update-cdk-cli-lock: package-lock.json
	${NPM_EXEC} update --package-lock-only

update-deps-locks-all: update-deps-lock update-test-deps-lock update-cdk-cli-lock
	@:

install-cdk-cli: package-lock.json
	${NPM_EXEC} install

install-cdk-cli-update-dev:
	@$(MAKE) --no-print-directory update-cdk-cli-lock
	@$(MAKE) --no-print-directory install-cdk-cli

install-deps:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) install-python-deps

install-deps-update-dev: .venv/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only
	.venv/bin/pip uninstall -y pavi_shared_aws
	@$(MAKE) --no-print-directory update-deps-lock
	@$(MAKE) --no-print-directory install-deps

install-test-deps:
	@$(MAKE) --no-print-directory -f $(mkfile_dir)/../../Makefile -C $(mkfile_dir) install-python-test-deps

install-test-deps-update-dev: .venv/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only
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
	. .venv/bin/activate && \
	${NPX_EXEC} cdk diff ${IMAGE_REPO_CDK_STACK_NAME}

validate-application-stack: install-deps run-unit-tests install-cdk-cli
	. .venv/bin/activate && \
	${NPX_EXEC} cdk diff ${EB_APP_CDK_STACK_NAME}

validate-environment-stack: install-deps run-unit-tests install-cdk-cli
	export PAVI_DEPLOY_VERSION_LABEL=${PAVI_DEPLOY_VERSION_LABEL} && \
	  export PAVI_IMAGE_TAG=${PAVI_IMAGE_TAG} && \
	  export PAVI_IMAGE_REGISTRY=${PAVI_IMAGE_REGISTRY} && \
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
	. .venv/bin/activate && \
	${NPX_EXEC} cdk deploy ${IMAGE_REPO_CDK_STACK_NAME} ${ADD_CDK_ARGS}

deploy-application: install-deps install-cdk-cli
	. .venv/bin/activate && \
	${NPX_EXEC} cdk deploy ${EB_APP_CDK_STACK_NAME} ${ADD_CDK_ARGS}
	.venv/bin/python -m pavi_shared_aws.aws_helpers.deploy_eb_app_version --eb_app_name PAVI-webui --version_label ${PAVI_DEPLOY_VERSION_LABEL}

deploy-environment: install-deps install-cdk-cli
	export PAVI_DEPLOY_VERSION_LABEL=${PAVI_DEPLOY_VERSION_LABEL} && \
	  export PAVI_IMAGE_TAG=${PAVI_IMAGE_TAG} && \
	  export PAVI_IMAGE_REGISTRY=${PAVI_IMAGE_REGISTRY} && \
	  export PAVI_API_STACK_NAME=${PAVI_API_STACK_NAME} && \
	  . .venv/bin/activate && \
	  ${NPX_EXEC} cdk deploy ${EB_ENV_CDK_STACK_NAME} ${ADD_CDK_ARGS}

destroy-environment: install-deps install-cdk-cli
	. .venv/bin/activate && \
	  ${NPX_EXEC} cdk destroy ${EB_ENV_CDK_STACK_NAME} ${ADD_CDK_ARGS}

print-deploy-version-label:
	@echo ${PAVI_DEPLOY_VERSION_LABEL}

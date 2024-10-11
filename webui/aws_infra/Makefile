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

.PHONY: deploy-% install-% print-% run-% update-% validate-% _vars-% _write-lock-file

.venv/:
	python3.12 -m venv .venv/

clean:
	rm -rf .venv/ || true
	rm -rf node_modules/ || true

.venv-build/:
	python3.12 -m venv .venv-build/
	.venv-build/bin/pip install pip-tools==7.4.1

requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-no-upgrade))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

tests/requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-no-upgrade))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-upgrade-all))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"
	npm update --package-lock-only

update-test-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-upgrade-all))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-deps-lock-shared-aws-only:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-upgrade-shared-aws-only))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-test-deps-lock-shared-aws-only:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-upgrade-shared-aws-only))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

install-cdk-cli:
	npm install

install-deps: .venv/ requirements.txt
	.venv/bin/pip install -r requirements.txt

install-deps-update-dev: .venv/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only
	.venv/bin/pip uninstall -y pavi_shared_aws
	.venv/bin/pip install -U -r requirements.txt

install-test-deps: .venv/ tests/requirements.txt
	.venv/bin/pip install -r tests/requirements.txt

install-test-deps-update-dev: .venv/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only
	.venv/bin/pip uninstall -y pavi_shared_aws
	.venv/bin/pip install -U -r tests/requirements.txt

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
	npx cdk diff ${IMAGE_REPO_CDK_STACK_NAME}

validate-application-stack: install-deps run-unit-tests install-cdk-cli
	. .venv/bin/activate && \
	npx cdk diff ${EB_APP_CDK_STACK_NAME}

validate-environment-stack: install-deps run-unit-tests install-cdk-cli
	export PAVI_DEPLOY_VERSION_LABEL=${PAVI_DEPLOY_VERSION_LABEL} && \
	  export PAVI_IMAGE_TAG=${PAVI_IMAGE_TAG} && \
	  export PAVI_IMAGE_REGISTRY=${PAVI_IMAGE_REGISTRY} && \
	  export PAVI_API_STACK_NAME=${PAVI_API_STACK_NAME} && \
	  . .venv/bin/activate && \
	  npx cdk diff ${VALIDATE_ENV_STACK_NAME}

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
	npx cdk deploy ${IMAGE_REPO_CDK_STACK_NAME} ${ADD_CDK_ARGS}

deploy-application: install-deps install-cdk-cli
	. .venv/bin/activate && \
	npx cdk deploy ${EB_APP_CDK_STACK_NAME} ${ADD_CDK_ARGS}
	.venv/bin/python -m pavi_shared_aws.aws_helpers.deploy_eb_app_version --eb_app_name PAVI-webui --version_label ${PAVI_DEPLOY_VERSION_LABEL}

deploy-environment: install-deps install-cdk-cli
	export PAVI_DEPLOY_VERSION_LABEL=${PAVI_DEPLOY_VERSION_LABEL} && \
	  export PAVI_IMAGE_TAG=${PAVI_IMAGE_TAG} && \
	  export PAVI_IMAGE_REGISTRY=${PAVI_IMAGE_REGISTRY} && \
	  export PAVI_API_STACK_NAME=${PAVI_API_STACK_NAME} && \
	  . .venv/bin/activate && \
	  npx cdk deploy ${EB_ENV_CDK_STACK_NAME} ${ADD_CDK_ARGS}

print-deploy-version-label:
	@echo ${PAVI_DEPLOY_VERSION_LABEL}

_vars-main-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=-o requirements.txt"

_vars-test-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--extra=test -o tests/requirements.txt"

_vars-no-upgrade:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--no-upgrade"

_vars-upgrade-all:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--upgrade"

_vars-upgrade-shared-aws-only:
	@echo "EXTRA_PIP_COMPILE_ARGS+=-P pavi_shared_aws"

_write-lock-file: .venv-build/
	.venv-build/bin/pip-compile --generate-hashes --no-strip-extras -q ${EXTRA_PIP_COMPILE_ARGS}

SUPPORTED_NODE := ^v18\.

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

.PHONY: check-% deploy-% install-% pip-tools print-% run-% update-% validate-% _vars-% _write-lock-file

.venv/:
	python3.12 -m venv .venv/

check-venv-active:
ifeq ($(VIRTUAL_ENV),)
	@echo 'No active python virtual environment found.'\
		  'Please active the virtual environment first by running `source .venv/bin/activate`,'\
		  'or read README.md for instructions on how to set up a new one.'
	@exit 1
else
	@:
endif

clean:
	rm -rf node_modules/ || true

pip-tools:
	pip install pip-tools==7.4.1

requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-no-upgrade))
	$(eval $(shell $(MAKE) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

tests/requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-no-upgrade))
	$(eval $(shell $(MAKE) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-upgrade-all))
	$(eval $(shell $(MAKE) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"
	npm update --package-lock-only

update-test-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-upgrade-all))
	$(eval $(shell $(MAKE) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-deps-lock-shared-aws-infra-only:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-upgrade-shared-aws-infra-only))
	$(eval $(shell $(MAKE) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-test-deps-lock-shared-aws-infra-only:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) _vars-upgrade-shared-aws-infra-only))
	$(eval $(shell $(MAKE) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

install-cdk-cli:
	npm install

install-deps: requirements.txt
	pip install -r requirements.txt

install-deps-update-dev: check-venv-active update-deps-lock-shared-aws-infra-only update-test-deps-lock-shared-aws-infra-only
	pip uninstall -y pavi_shared_aws_infra
	pip install -U -r requirements.txt

install-test-deps: tests/requirements.txt
	pip install -r tests/requirements.txt

install-test-deps-update-dev: check-venv-active update-deps-lock-shared-aws-infra-only update-test-deps-lock-shared-aws-infra-only
	pip uninstall -y pavi_shared_aws_infra
	pip install -U -r tests/requirements.txt

run-unit-tests: install-test-deps
	python -m pytest

run-unit-tests-dev: check-venv-active install-test-deps
	python -m pytest -v

run-type-checks: install-test-deps
	mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: install-test-deps
	flake8 ./

validate-image-stack: run-unit-tests install-cdk-cli
	npx cdk diff ${IMAGE_REPO_CDK_STACK_NAME}

validate-application-stack: run-unit-tests install-cdk-cli
	npx cdk diff ${EB_APP_CDK_STACK_NAME}

validate-environment-stack: run-unit-tests install-cdk-cli
	export PAVI_DEPLOY_VERSION_LABEL=${PAVI_DEPLOY_VERSION_LABEL} && \
	  export PAVI_IMAGE_TAG=${PAVI_IMAGE_TAG} && \
	  export PAVI_IMAGE_REGISTRY=${PAVI_IMAGE_REGISTRY} && \
	  export PAVI_API_STACK_NAME=${PAVI_API_STACK_NAME} && \
	  npx cdk diff ${VALIDATE_ENV_STACK_NAME}

validate-environment-stack-dev: VALIDATE_ENV_STACK_NAME := ${EB_ENV_CDK_STACK_NAME}
validate-environment-stack-dev: validate-environment-stack
	@:

validate-all: run-unit-tests validate-image-stack validate-application-stack validate-environment-stack
	@:

validate-all-dev: VALIDATE_ENV_STACK_NAME := ${EB_ENV_CDK_STACK_NAME}
validate-all-dev: check-venv-active validate-all
	@:

deploy-image-stack: install-cdk-cli
	npx cdk deploy ${IMAGE_REPO_CDK_STACK_NAME} ${ADD_CDK_ARGS}

deploy-application: install-cdk-cli
	npx cdk deploy ${EB_APP_CDK_STACK_NAME} ${ADD_CDK_ARGS}
	python -m pavi_shared_aws_infra.aws_helpers.deploy_eb_app_version --eb_app_name PAVI-webui --version_label ${PAVI_DEPLOY_VERSION_LABEL}

deploy-environment: install-cdk-cli
	export PAVI_DEPLOY_VERSION_LABEL=${PAVI_DEPLOY_VERSION_LABEL} && \
	  export PAVI_IMAGE_TAG=${PAVI_IMAGE_TAG} && \
	  export PAVI_IMAGE_REGISTRY=${PAVI_IMAGE_REGISTRY} && \
	  export PAVI_API_STACK_NAME=${PAVI_API_STACK_NAME} && \
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

_vars-upgrade-shared-aws-infra-only:
	@echo "EXTRA_PIP_COMPILE_ARGS+=-P pavi_shared_aws_infra"

_write-lock-file:
	pip-compile --generate-hashes --no-strip-extras -q ${EXTRA_PIP_COMPILE_ARGS}

.PHONY: check-venv-active check-node

SUPPORTED_NODE := ^v18\.

AWS_DEFAULT_REGION := us-east-1
AWS_ACCT_NR := 100225593120

PAVI_DEPLOY_VERSION_LABEL ?= $(shell git describe --tags --dirty)-$(shell git rev-parse --abbrev-ref HEAD)-$(shell date +%Y%m%d-%H%M%S)
DEPLOY_ENVIRONMENT ?= PaviApiEbDevStack
PAVI_IMAGE_TAG ?= main
PAVI_IMAGE_REGISTRY ?= ${AWS_ACCT_NR}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com/
ADD_CDK_ARGS ?=

check-venv-active:
ifeq ($(VIRTUAL_ENV),)
	@echo 'No active python virtual environment found.'\
		  'Please active the virtual environment first by running `source venv/bin/activate`,'\
		  'or read README.md for instructions on how to set up a new one.'
	@exit 1
else
	@:
endif

check-node:
	@$(eval NODE_VERSION=$(shell node --version))
ifeq ($(shell node --version | grep -P "${SUPPORTED_NODE}"),)
	@echo 'Node version "${NODE_VERSION}" not supported!'\
		  'Change the active node version (use nvm) to match "${SUPPORTED_NODE}".'
	@exit 1
else
	@:
endif

python-dependencies:
	pip install -r requirements.txt

python-test-dependencies:
	pip install -r tests/requirements.txt

run-unit-tests: python-dependencies python-test-dependencies check-node
	python -m pytest

run-unit-tests-dev: check-venv-active run-unit-tests
	@:

run-python-type-check: python-dependencies python-test-dependencies
	mypy --install-types --non-interactive --warn-unused-config ./

run-python-style-check: python-dependencies python-test-dependencies
	flake8 ./

validate-image-stack: check-node run-unit-tests
	cdk diff PaviApiImageRepoCdkStack

validate-application-stack: check-node run-unit-tests
	cdk diff PaviApiEbApplicationCdkStack

validate-environment-stack: check-node run-unit-tests
	export PAVI_DEPLOY_VERSION_LABEL=${PAVI_DEPLOY_VERSION_LABEL} && \
	  export PAVI_IMAGE_TAG=${PAVI_IMAGE_TAG} && \
	  export PAVI_IMAGE_REGISTRY=${PAVI_IMAGE_REGISTRY} && \
	  cdk diff PaviApiEbDevStack

validate-all: check-node run-unit-tests validate-image-stack validate-application-stack validate-environment-stack
	@:

validate-all-dev: check-venv-active validate-all
	@:

deploy-application:
	cdk deploy PaviApiEbApplicationCdkStack ${ADD_CDK_ARGS}
	python -m aws_helpers.deploy_eb_app_version --eb_app_name PAVI-api --version_label ${PAVI_DEPLOY_VERSION_LABEL}

deploy-environment:
	export PAVI_DEPLOY_VERSION_LABEL=${PAVI_DEPLOY_VERSION_LABEL} && \
	  export PAVI_IMAGE_TAG=${PAVI_IMAGE_TAG} && \
	  export PAVI_IMAGE_REGISTRY=${PAVI_IMAGE_REGISTRY} && \
	  cdk deploy ${DEPLOY_ENVIRONMENT} ${ADD_CDK_ARGS}

print-deploy-version-label:
	@echo ${PAVI_DEPLOY_VERSION_LABEL}

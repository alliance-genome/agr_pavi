mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
include $(mkfile_dir)/common_make

LAST_MODIFIED_TIMESTAMP ?= $(shell find . -type f -printf '%T@\n' | sort -nr | head -1 | xargs -I £ date -d @£ -u +%Y%m%d-%H%M%S)
BRANCH_NAME ?= $(shell git rev-parse --abbrev-ref HEAD)
# Overall release version (plain v* tags, e.g. v0.5.0). Component tags
# (api-v*, webui-v*) start with a letter so "v*" never matches them.
PAVI_DEPLOY_VERSION_LABEL ?= $(shell git describe --tags --match "v[0-9]*" --dirty=-dirty_${BRANCH_NAME}_${LAST_MODIFIED_TIMESTAMP})
PAVI_CONTAINER_IMAGE_TAG ?= ${PAVI_DEPLOY_VERSION_LABEL}

# Independent per-component versions, auto-derived from component-scoped tags.
# Bump a component by tagging api-vX.Y.Z or webui-vX.Y.Z; the version then
# auto-increments as "api-vX.Y.Z-<N>-g<sha>" for the N commits since that tag.
# Hyphenated (not slashed) so they are valid container image tags.
API_VERSION ?= $(shell git describe --tags --match "api-v*" --dirty=-dirty_${BRANCH_NAME}_${LAST_MODIFIED_TIMESTAMP})
WEBUI_VERSION ?= $(shell git describe --tags --match "webui-v*" --dirty=-dirty_${BRANCH_NAME}_${LAST_MODIFIED_TIMESTAMP})

.PHONY: install-% run-% update-% _vars-%

print-deploy-version-label:
	@echo ${PAVI_DEPLOY_VERSION_LABEL}

print-api-version:
	@echo ${API_VERSION}

print-webui-version:
	@echo ${WEBUI_VERSION}

update-install-shared-aws:
	make -C shared_aws/py_package/ clean build install
	make -C shared_aws/aws_infra/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only install-deps-update-dev
	make -C pipeline_components/aws_infra/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only install-deps-update-dev
	make -C api/aws_infra/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only install-deps-update-dev
	make -C webui/aws_infra/ update-deps-lock-shared-aws-only install-deps-update-dev

# Reminder: below validate- deploy- and destroy- targets requires AWS env variables (such as AWS_PROFILE) to be exported for successful execution

validate-dev:
	make -C pipeline_components/aws_infra/ validate deploy
	make -C api/aws_infra validate-application-stack validate-environment-stack PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" \
	                                                                            PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
																				VALIDATE_ENV_STACK_NAME=PaviApiEbDevStack
	make -C webui/aws_infra validate-application-stack validate-environment-stack PAVI_API_STACK_NAME="PaviApiEbDevStack" \
                                                                                  PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" \
																				  PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
																				  VALIDATE_ENV_STACK_NAME=PaviWebUiEbDevStack

deploy-dev:
	make -C pipeline_components/aws_infra/ validate deploy
	make -C pipeline_components/seq_retrieval/ container-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
	make -C pipeline_components/alignment/ container-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
	make -C api/ container-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
	make -C webui/ container-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
	make -C api/aws_infra deploy-application PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" ADD_CDK_ARGS="--require-approval any-change"
	make -C api/aws_infra deploy-environment PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" \
	                                         PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
                                             EB_ENV_CDK_STACK_NAME=PaviApiEbDevStack \
											 ADD_CDK_ARGS="--require-approval any-change"
	make -C webui/aws_infra deploy-application PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" ADD_CDK_ARGS="--require-approval any-change"
	make -C webui/aws_infra deploy-environment PAVI_API_STACK_NAME="PaviApiEbDevStack" \
                                               PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
                                               EB_ENV_CDK_STACK_NAME=PaviWebUiEbDevStack \
											   ADD_CDK_ARGS="--require-approval any-change"

destroy-dev:
	make -C webui/aws_infra destroy-environment EB_ENV_CDK_STACK_NAME=PaviWebUiEbDevStack
	make -C api/aws_infra destroy-environment EB_ENV_CDK_STACK_NAME=PaviApiEbDevStack

update-deps-locks-all:
	$(MAKE) -C pipeline_components/seq_retrieval/ update-deps-locks-all
	$(MAKE) -C api/ update-deps-locks-all
	$(MAKE) -C webui/ update-deps-locks-all
	$(MAKE) -C shared_aws/py_package/ update-deps-locks-all
	$(MAKE) -C shared_aws/py_package/ clean build install
	$(MAKE) -C shared_aws/aws_infra/ update-deps-locks-all
	$(MAKE) -C pipeline_components/aws_infra/ update-deps-locks-all
	$(MAKE) -C api/aws_infra/ update-deps-locks-all
	$(MAKE) -C webui/aws_infra/ update-deps-locks-all

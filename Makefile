LAST_MODIFIED_TIMESTAMP ::= $(shell find . -type f -printf '%T@\n' | sort -nr | head -1 | xargs -I £ date -d @£ -u +%Y%m%d-%H%M%S)
BRANCH_NAME ::= $(shell git rev-parse --abbrev-ref HEAD)
PAVI_DEPLOY_VERSION_LABEL ?= $(shell git describe --tags --dirty=-dirty_${BRANCH_NAME}_${LAST_MODIFIED_TIMESTAMP})
PAVI_CONTAINER_IMAGE_TAG ?= ${PAVI_DEPLOY_VERSION_LABEL}

print-deploy-version-label:
	@echo ${PAVI_DEPLOY_VERSION_LABEL}

update-install-shared-aws:
	make -C shared_aws/py_package/ clean build install
	make -C shared_aws/aws_infra/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only install-deps-update-dev
	make -C pipeline/aws_infra/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only install-deps-update-dev
	make -C api/aws_infra/ update-deps-lock-shared-aws-only update-test-deps-lock-shared-aws-only install-deps-update-dev
	make -C webui/aws_infra/ update-deps-lock-shared-aws-only install-deps-update-dev

# Reminder: below targets requires AWS env variables (such as AWS_PROFILE) to be exported for successful execution

validate-dev:
	make -C pipeline/aws_infra/ validate deploy
	make -C api/aws_infra validate-application-stack validate-environment-stack PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" \
	                                                                            PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
																				VALIDATE_ENV_STACK_NAME=PaviApiEbDevStack
	make -C webui/aws_infra validate-application-stack validate-environment-stack PAVI_API_ENV_NAME="PAVI-api-dev" \
                                                                                  PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" \
																				  PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
																				  VALIDATE_ENV_STACK_NAME=PaviWebUiEbDevStack

deploy-dev:
	make -C pipeline/aws_infra/ validate deploy
#	make -C pipeline/seq_retrieval/ docker-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
#	make -C pipeline/alignment/ docker-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
#	make -C api/ docker-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
#	make -C webui/ docker-image push-container-image TAG_NAME=${PAVI_DEPLOY_VERSION_LABEL}
	make -C api/aws_infra deploy-application PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" ADD_CDK_ARGS="--require-approval any-change"
	make -C api/aws_infra deploy-environment PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" \
	                                         PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
                                             EB_ENV_CDK_STACK_NAME=PaviApiEbDevStack \
											 ADD_CDK_ARGS="--require-approval any-change"
	make -C webui/aws_infra deploy-application PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" ADD_CDK_ARGS="--require-approval any-change"
	make -C webui/aws_infra deploy-environment PAVI_API_ENV_NAME="PAVI-api-dev" \
                                               PAVI_DEPLOY_VERSION_LABEL="${PAVI_DEPLOY_VERSION_LABEL}" PAVI_IMAGE_TAG="${PAVI_CONTAINER_IMAGE_TAG}" \
                                               EB_ENV_CDK_STACK_NAME=PaviWebUiEbDevStack \
											   ADD_CDK_ARGS="--require-approval any-change"
